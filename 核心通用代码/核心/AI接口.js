// 二次元桌宠 - AI接口（增强版）
// ★ 核心原则：
//   - 流式实时显示全部文本 → 结束后智能分割 → 思考放折叠框，只留答案在正文
//   - 对话历史存完整原文，分割只影响显示
//   - 自动重试 + 更健壮的流式解析
class MimoAPI {
  constructor() {
    this.apiKey = '';
    this.model = 'doubao-pro-32k';
    this.baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
    this.provider = 'doubao';
    this.conversationHistory = [];
    this.maxHistory = 30;
    this.maxHistoryChars = 8000; // 上下文软预算（防止大代码块或本地模型溢出）
    this._responseMode = 'instant';
    this._promptMode = 'auto';
    this._maxRetries = 2;
  }

  // ★ 上下文预算滑动窗口：兼顾条数与总字符数软上限，成对淘汰保证对话严格交替
  _trimHistory() {
    if (this.conversationHistory.length > this.maxHistory) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
    }
    let totalChars = this.conversationHistory.reduce((sum, msg) => sum + (msg.content ? msg.content.length : 0), 0);
    while (totalChars > this.maxHistoryChars && this.conversationHistory.length > 2) {
      if (this.conversationHistory[0].role === 'user' && this.conversationHistory[1]?.role === 'assistant') {
        const removedUser = this.conversationHistory.shift();
        const removedAssistant = this.conversationHistory.shift();
        totalChars -= (removedUser.content?.length || 0) + (removedAssistant.content?.length || 0);
      } else {
        const removed = this.conversationHistory.shift();
        totalChars -= (removed.content?.length || 0);
      }
    }
    if (this.conversationHistory.length > 0 && this.conversationHistory[0].role === 'assistant') {
      this.conversationHistory.shift();
    }
  }

  getSystemPrompt() { return window.characterManager.getSystemPrompt(); }
  getRandomLine(s) { return window.characterManager.getRandomLine(s); }

  setApiKey(key) { this.apiKey = key; }
  setBaseUrl(url) { this.baseUrl = url; }
  setModel(model) { this.model = model; }
  setProvider(provider) { this.provider = provider; }
  switchCharacter(id) { this.clearHistory(); return window.characterManager.switchCharacter(id); }
  setResponseMode(mode) { this._responseMode = mode || 'instant'; }
  setPromptMode(mode) { this._promptMode = mode || 'auto'; }

  needsApiKey() {
    if (this.provider === 'local' || this.provider === 'lmstudio') return false;
    const p = window.getProvider?.(this.provider);
    return p ? p.needsKey : true;
  }

  _buildHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  abort() {
    if (this._currentController) {
      this._abortedByUser = true;
      this._currentController.abort();
      this._currentController = null;
    }
  }

  _buildSystemPrompt(isCodeMode) {
    let sys = this.getSystemPrompt();

    // ★ 注入动态时空与现实世界感知信标
    const now = new Date();
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    let timePeriod = '白天';
    const h = now.getHours();
    if (h >= 0 && h < 6) timePeriod = '凌晨/深夜';
    else if (h >= 6 && h < 11) timePeriod = '上午';
    else if (h >= 11 && h < 14) timePeriod = '中午';
    else if (h >= 14 && h < 18) timePeriod = '下午';
    else timePeriod = '夜晚';

    sys += `\n\n[当前时空信标]\n- 当前现实时间：${timeStr} (${timePeriod})\n- 宿主环境：Windows 桌面桌宠客户端\n请在回复中自然流露时间感知（例如深夜关心休息、上午元气问候），保持人设亲和力。`;

    if (isCodeMode) {
      const name = window.characterManager.getCurrentCharacter()?.name || '我';
      sys += `\n\n用户正在请求代码帮助。用${name}的说话方式提供完整的代码示例，用代码块包裹。`;
    }

    // ★ 注入最高优先级交互与任务执行铁律（利用提示词末尾近因效应，强化逻辑、人设与直觉秒回速度）
    sys += `\n\n[交互与任务执行铁律 - 最高优先级]
1. 逻辑与任务第一：首要前提是【正面、清晰、有逻辑地回应用户的话】！若含具体任务（翻译、解答、计算、写代码等），立刻给出准确结论，严禁答非所问或装傻反问。
2. 深度融入人设：将自身专属的人设性格、说话口吻、特有称呼及动作神态（用英文小括号包裹）自然融入回复，做到“有脑子、有性格、鲜活真实”。
3. 语速与直觉秒回：除代码和深度分析外，日常回复必须【精炼利落】（常规交流 2~4 句话，60~140 字内）；日常寒暄与简单提问请凭角色本能直接秒回，切勿在思考链中长篇分析人设规则。
4. 语言规范铁律：所有回复必须【全程使用规范中文交流】！绝对严禁整句输出日语或其他外语。`;

    return sys;
  }

  _buildMessages(message, isCodeMode) {
    this._lastMessageLen = message.length;
    const sys = this._buildSystemPrompt(isCodeMode);
    return [{ role: 'system', content: sys }, ...this.conversationHistory];
  }

  // ★ 智能判断是否跳过推理模型的冗长人设思考链（实现日常对话秒回，深度/代码问题保留推理）
  _shouldSkipReasoning(message, isCodeMode) {
    if (isCodeMode || this._responseMode === 'deep') return false;
    const isLocalOllama = this.provider === 'local' || (this.baseUrl && this.baseUrl.includes('11434'));
    if (!isLocalOllama) return false;
    if (this._responseMode === 'instant' || this._promptMode === 'compact') return true;
    const msg = (message || '').trim();
    const isComplexQuery = msg.length > 80 || /(?:为什么|怎么实现|原理|分析一下|详细说说|写个|写一段|代码|算法|推理|计算|步骤|方案)/.test(msg);
    return !isComplexQuery;
  }

  _getRequestParams(isCodeMode) {
    const mode = this._responseMode;
    const params = { temperature: 0.7, max_tokens: 1024 };

    switch (mode) {
      case 'instant':
        params.temperature = 0.5;
        params.max_tokens = isCodeMode ? 4096 : 600;
        break;
      case 'balanced':
        params.temperature = 0.7;
        params.max_tokens = isCodeMode ? 8192 : 1200;
        break;
      case 'deep':
        params.temperature = 0.8;
        params.max_tokens = isCodeMode ? 16384 : 2048;
        break;
    }

    // 本地模型或推理模型（如 DeepSeek-R1）适当收敛温度上限至 0.6，防止思考后转入正式回复时发散跑题，并收敛 max_tokens 提升输出速度
    const isLocalOrR1 = this.provider === 'local' || (this.model && this.model.toLowerCase().includes('r1'));
    if (isLocalOrR1) {
      if (params.temperature > 0.6) params.temperature = 0.6;
      if (!isCodeMode && params.max_tokens > 1024) params.max_tokens = 1024;
    }

    return params;
  }

  // ★ 通用带重试的 fetch
  async _fetchWithRetry(url, options, retries) {
    const maxRetries = retries ?? this._maxRetries;
    let lastErr;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s 超时
        options.signal = controller.signal;

        const res = await fetch(url, options);
        clearTimeout(timeoutId);

        if (res.ok) return res;

        // 服务端错误才重试，4xx 不重试
        if (res.status < 500) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }

        // 5xx 重试
        throw new Error(`服务器错误 HTTP ${res.status}`);
      } catch (err) {
        lastErr = err;
        if (err.name === 'AbortError') {
          lastErr = new Error('请求超时，请检查网络或API地址是否正确');
        }
        if (attempt < maxRetries) {
          // 指数退避：1s, 2s
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
      }
    }
    throw lastErr;
  }

  // 非流式（兜底）
  async sendMessage(message, isCodeMode = false) {
    if (!this.apiKey && this.needsApiKey()) throw new Error('请先在设置中配置API Key');

    this.conversationHistory.push({ role: 'user', content: message });
    this._trimHistory();

    const rp = this._getRequestParams(isCodeMode);
    const body = {
      model: this.model,
      messages: this._buildMessages(message, isCodeMode),
      temperature: rp.temperature,
      max_tokens: rp.max_tokens,
      stream: false,
    };
    if (this._shouldSkipReasoning(message, isCodeMode)) {
      body.reasoning_effort = 'none';
    }

    try {
      const res = await this._fetchWithRetry(`${this.baseUrl}/chat/completions`, {
        method: 'POST', headers: this._buildHeaders(), body: JSON.stringify(body)
      }, 1); // 非流式只重试1次

      const data = await res.json();
      const msg = data.choices[0]?.message || {};
      const apiThinking = msg.reasoning_content || msg.reasoning || '';
      const rawContent = msg.content || '';

      if (!rawContent && !apiThinking) {
        this.conversationHistory.pop();
        throw new Error('模型返回了空内容，请检查模型是否正常工作');
      }

      let displayThinking = apiThinking;
      let displayContent = rawContent || apiThinking;
      if (!displayThinking && displayContent.length > 30) {
        const split = this._splitThink(displayContent);
        displayThinking = split.think;
        displayContent = split.answer || displayContent;
      }

      this.conversationHistory.push({ role: 'assistant', content: rawContent || apiThinking });
      this._trimHistory();
      return { thinking: displayThinking, content: displayContent };
    } catch (err) { throw err; }

  }

  // ★ 流式（带自动重试）
  async sendMessageStream(message, isCodeMode = false, onChunk) {
    if (!this.apiKey && this.needsApiKey()) throw new Error('请先在设置中配置API Key');

    this.conversationHistory.push({ role: 'user', content: message });
    this._trimHistory();

    const rp = this._getRequestParams(isCodeMode);
    const body = {
      model: this.model,
      messages: this._buildMessages(message, isCodeMode),
      temperature: rp.temperature,
      max_tokens: rp.max_tokens,
      stream: true,
    };
    if (this._shouldSkipReasoning(message, isCodeMode)) {
      body.reasoning_effort = 'none';
    }

    let attempt = 0;
    const maxRetries = this._maxRetries;

    while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
        this._currentController = controller;
        this._abortedByUser = false;
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s 超时

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: this._buildHeaders(),
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          // 4xx 不重试
          if (res.status < 500) {
            const err = await res.json().catch(() => ({}));
            this.conversationHistory.pop();
            throw new Error(err.error?.message || `HTTP ${res.status}`);
          }
          // 5xx 继续重试
          throw new Error(`服务器错误 HTTP ${res.status}`);
        }

        const streamResult = await this._readStream(res, onChunk);
        this._currentController = null;
        return streamResult;
      } catch (err) {
        if (err.name === 'AbortError') {
          if (this._abortedByUser) {
            err = new Error('已停止生成');
            this.conversationHistory.pop();
            this._currentController = null;
            throw err;
          }
          err = new Error('请求超时，请检查网络或API地址是否正确');
        }
        if (attempt < maxRetries && !this._abortedByUser) {
          onChunk?.('content', `\n\n[重试第 ${attempt + 1} 次...]\n\n`, '');
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          attempt++;
          continue;
        }
        this.conversationHistory.pop();
        this._currentController = null;
        // 转成友好的中文错误信息
        throw this._friendlyError(err, this.model);
      }
    }
  }

  // ★ 读取流式响应
  async _readStream(res, onChunk) {
    let reasoningText = '';
    let contentText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data:')) continue;

        // ★ 兼容各种 SSE 格式：data: {...} 或 data:{"..."}
        const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const choices = parsed.choices;
          if (!choices || choices.length === 0) continue;

          const delta = choices[0]?.delta || {};

          // 处理 reasoning
          const reasoningDelta = delta.reasoning_content || delta.reasoning || delta.thinking;
          if (reasoningDelta) {
            reasoningText += reasoningDelta;
            onChunk?.('thinking', reasoningDelta, reasoningText);
          }

          // 处理 content
          if (delta.content) {
            contentText += delta.content;
            onChunk?.('content', delta.content, contentText);
          }
        } catch (e) {
          // ★ 跳过解析失败的行（某些模型会发非标准 JSON 行）
          console.warn('[MimoAPI] 流式解析跳过:', e.message);
        }
      }
    }

    const fullRaw = contentText || reasoningText || '';
    if (!fullRaw) {
      throw new Error(`模型返回为空，请检查模型名称是否匹配（当前: ${this.model}）`);
    }

    // 分割显示用的 thinking/content
    let displayThinking = reasoningText;
    let displayContent = contentText;

    if (!displayContent && displayThinking) {
      // 兼容仅输出了思考内容的推理模型
      displayContent = displayThinking;
      displayThinking = '';
    } else if (!displayThinking && displayContent.length > 30) {
      const split = this._splitThink(displayContent);
      displayThinking = split.think;
      displayContent = split.answer || displayContent;
    }

    this.conversationHistory.push({ role: 'assistant', content: fullRaw });
    this._trimHistory();
    return { thinking: displayThinking, content: displayContent };
  }

  // ★ 友好的中文错误信息
  _friendlyError(err, modelName) {
    const msg = err.message || '';
    if (msg.includes('401') || msg.includes('Unauthorized')) return new Error('API Key 无效或未授权，请在设置中检查密钥');
    if (msg.includes('403') || msg.includes('Forbidden')) return new Error('API Key 权限不足或已被服务商限制');
    if (msg.includes('404') || msg.includes('Not Found')) {
      if (this.provider === 'local') {
        return new Error(`本地 Ollama 未找到模型「${modelName}」，请点击【刷新模型】选择本机已下载模型`);
      }
      return new Error(`模型「${modelName}」不存在或 API 地址有误`);
    }
    if (msg.includes('429') || msg.includes('Rate')) return new Error('请求频次超限或账户余额不足，请稍后再试');
    if (msg.includes('超时') || msg.includes('timeout') || msg.includes('abort')) return new Error('连接超时，请检查网络或 API 地址');
    if (msg.includes('fetch') || msg.includes('Failed to fetch')) {
      if (this.provider === 'local') return new Error('无法连接本地 Ollama 服务 (11434 端口)，请点击【启动本地服务】');
      if (this.provider === 'lmstudio') return new Error('无法连接本地 LM Studio 服务 (1234 端口)，请在 LM Studio 中开启 Server');
      return new Error('无法连接到 API 服务器，请检查网络环境或中转地址');
    }
    return err;
  }

  // ★ 分割思考/答案（保留你的原始逻辑）
  _splitThink(text) {
    if (!text || text.length < 30) return { think: '', answer: text };

    // 1. <think> 标签
    const tag = text.match(/<think>([\s\S]*?)<\/think>/);
    if (tag) return { think: tag[1].trim(), answer: text.replace(/<think>[\s\S]*?<\/think>/g, '').trim() };

    // 2. 显式标签 Think:/Answer:
    const t = text.match(/Think[：:]\s*([\s\S]*?)(?:Answer[：:]|$)/i);
    const a = text.match(/Answer[：:]\s*([\s\S]*)/i);
    if (t && a) return { think: t[1].trim(), answer: a[1].trim() };

    // 3. ★ 段落分割：思考最后一段以"最后"开头，其下的段落才是答案
    const paras = text.split(/\n\s*\n/).filter(p => p.trim());
    if (paras.length >= 3) {
      for (let i = 0; i < paras.length - 1; i++) {
        if (paras[i].trim().startsWith('最后')) {
          const think = paras.slice(0, i + 1).join('\n\n').trim();
          const answer = paras.slice(i + 1).join('\n\n').trim();
          if (answer.length > 5) return { think, answer };
          break; // 答案太短不成立，放弃
        }
      }
    }

    // 4. ★ 两段式：第一段以"最后"开头
    if (paras.length === 2) {
      if (paras[0].trim().startsWith('最后')) {
        const answer = paras[1].trim();
        if (answer.length > 5) return { think: paras[0].trim(), answer };
      }
    }

    // 5. 强结论标记："答案是"、"回答："、"答："
    const strongMarkers = ['答案是', '回答：', '答：'];
    for (const w of strongMarkers) {
      const idx = text.indexOf(w);
      if (idx > text.length * 0.25 && idx < text.length - 10) {
        return { think: text.substring(0, idx).trim(), answer: text.substring(idx).trim() };
      }
    }

    // 分割不了就全部当答案
    return { think: '', answer: text };
  }

  // ★ 深度连通性测试（毫秒级测速 + 精确中文诊断）
  async testConnection() {
    const startTime = Date.now();
    const isLocalOllama = this.provider === 'local' || (this.baseUrl && this.baseUrl.includes('11434'));

    if (this.needsApiKey() && !this.apiKey) {
      return { success: false, message: '请先填写 API Key' };
    }

    // 1. 本地 Ollama 专属连通与模型嗅探
    if (isLocalOllama) {
      const rawRoot = this.baseUrl.replace(/\/v1\/?$/, '');
      try {
        const tagRes = await fetch(`${rawRoot}/api/tags`, { method: 'GET' });
        if (!tagRes.ok) {
          throw new Error(`Ollama 端口响应异常 HTTP ${tagRes.status}`);
        }
        const tagData = await tagRes.json();
        const models = (tagData.models || []).map(m => m.model || m.name);
        const latency = Date.now() - startTime;

        if (models.length === 0) {
          return {
            success: false,
            message: '本地 Ollama 服务已启动，但本机尚未安装任何模型！请先在终端运行 ollama pull qwen3:8b 下载模型。'
          };
        }

        const currentModel = this.model || '';
        const found = models.some(m => m === currentModel || m.startsWith(currentModel + ':') || currentModel.startsWith(m.split(':')[0]));
        if (!found) {
          return {
            success: false,
            message: `Ollama 连接成功但未找到模型「${currentModel}」。本机已安装: [${models.join(', ')}]，请点击【刷新模型】重新选择。`
          };
        }

        return {
          success: true,
          message: `✓ 连接成功！已连通本地 Ollama（检测到 ${models.length} 个本地模型，响应延迟: ${latency}ms）`
        };
      } catch (err) {
        return {
          success: false,
          message: '无法连接本地 11434 端口。本地 Ollama 服务未启动，请点击下方【🚀 启动本地服务】或先打开 Ollama。'
        };
      }
    }

    // 2. 外部供应商及其他服务商测试
    const body = {
      model: this.model,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 15,
      stream: false
    };

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this._buildHeaders(),
        body: JSON.stringify(body)
      });
      const latency = Date.now() - startTime;

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const rawErrMsg = e.error?.message || `HTTP ${res.status}`;
        if (res.status === 401) {
          throw new Error('API Key 无效或未授权，请检查密钥是否正确');
        } else if (res.status === 403) {
          throw new Error('API Key 权限不足或被限制访问');
        } else if (res.status === 404) {
          throw new Error(`模型「${this.model}」不存在或 API 地址不正确`);
        } else if (res.status === 429) {
          throw new Error('请求频次超限或账户余额不足 (HTTP 429)');
        }
        throw new Error(rawErrMsg);
      }

      await res.json().catch(() => ({}));
      return { success: true, message: `✓ 连接成功！模型响应正常（响应延迟: ${latency}ms）` };
    } catch (err) {
      let msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
        if (this.provider === 'lmstudio') {
          msg = '无法连接本地 1234 端口。请在 LM Studio 中进入 Local Server 页面并点击 Start Server。';
        } else if (this.provider === 'openai' || this.provider === 'gemini') {
          msg = '网络连接失败。如果您在中国大陆直连境外官方接口，请检查代理环境，或将 API 地址修改为国内中转代理。';
        } else {
          msg = '网络连接失败，请检查 API 地址是否拼写正确以及网络是否畅通。';
        }
      }
      return { success: false, message: msg };
    }
  }


  abort() {
    if (this._currentController) {
      this._abortedByUser = true;
      this._currentController.abort();
      this._currentController = null;
      return true;
    }
    return false;
  }

  clearHistory() { this.conversationHistory = []; }
  exportHistory() { return JSON.stringify(this.conversationHistory, null, 2); }
  importHistory(j) { try { this.conversationHistory = JSON.parse(j); return true; } catch { return false; } }
}

window.mimoAPI = new MimoAPI();
