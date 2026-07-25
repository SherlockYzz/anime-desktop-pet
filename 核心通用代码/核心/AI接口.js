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
    this._responseMode = 'instant';
    this._promptMode = 'auto';
    this._maxRetries = 2;
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
    const p = window.getProvider?.(this.provider);
    return p ? p.needsKey : true;
  }

  _buildHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  _buildSystemPrompt(isCodeMode) {
    let sys = this.getSystemPrompt();
    if (isCodeMode) {
      const name = window.characterManager.getCurrentCharacter()?.name || '我';
      sys += `\n\n用户正在请求代码帮助。用${name}的说话方式提供完整的代码示例，用代码块包裹。`;
    }
    return sys;
  }

  _buildMessages(message, isCodeMode) {
    this._lastMessageLen = message.length;
    const sys = this._buildSystemPrompt(isCodeMode);
    return [{ role: 'system', content: sys }, ...this.conversationHistory];
  }

  _getRequestParams(isCodeMode) {
    const mode = this._responseMode;
    const params = { temperature: 0.7, max_tokens: 2048 };

    switch (mode) {
      case 'instant':
        params.temperature = 0.5;
        params.max_tokens = isCodeMode ? 4096 : 2048;
        break;
      case 'balanced':
        params.temperature = 0.7;
        params.max_tokens = isCodeMode ? 8192 : 2048;
        break;
      case 'deep':
        params.temperature = 0.8;
        params.max_tokens = isCodeMode ? 16384 : 4096;
        break;
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
    if (this.conversationHistory.length > this.maxHistory) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
    }

    const rp = this._getRequestParams(isCodeMode);
    const body = {
      model: this.model,
      messages: this._buildMessages(message, isCodeMode),
      temperature: rp.temperature,
      max_tokens: rp.max_tokens,
      stream: false,
    };

    try {
      const res = await this._fetchWithRetry(`${this.baseUrl}/chat/completions`, {
        method: 'POST', headers: this._buildHeaders(), body: JSON.stringify(body)
      }, 1); // 非流式只重试1次

      const data = await res.json();
      const msg = data.choices[0]?.message || {};
      const apiThinking = msg.reasoning_content || msg.reasoning || '';
      const rawContent = msg.content || '';

      if (!rawContent) {
        this.conversationHistory.pop();
        throw new Error('模型返回了空内容，请检查模型是否正常工作');
      }

      let displayThinking = apiThinking;
      let displayContent = rawContent;
      if (!displayThinking && rawContent.length > 30) {
        const split = this._splitThink(rawContent);
        displayThinking = split.think;
        displayContent = split.answer || rawContent;
      }

      this.conversationHistory.push({ role: 'assistant', content: rawContent });
      return { thinking: displayThinking, content: displayContent };
    } catch (err) { throw err; }
  }

  // ★ 流式（带自动重试）
  async sendMessageStream(message, isCodeMode = false, onChunk) {
    if (!this.apiKey && this.needsApiKey()) throw new Error('请先在设置中配置API Key');

    this.conversationHistory.push({ role: 'user', content: message });
    if (this.conversationHistory.length > this.maxHistory) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
    }

    const rp = this._getRequestParams(isCodeMode);
    const body = {
      model: this.model,
      messages: this._buildMessages(message, isCodeMode),
      temperature: rp.temperature,
      max_tokens: rp.max_tokens,
      stream: true,
    };

    let attempt = 0;
    const maxRetries = this._maxRetries;

    while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
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

        return await this._readStream(res, onChunk);
      } catch (err) {
        if (err.name === 'AbortError') {
          err = new Error('请求超时，请检查网络或API地址是否正确');
        }
        if (attempt < maxRetries) {
          onChunk?.('content', `\n\n[重试第 ${attempt + 1} 次...]\n\n`, '');
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          attempt++;
          continue;
        }
        this.conversationHistory.pop();
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

    if (!displayThinking && displayContent.length > 30) {
      const split = this._splitThink(displayContent);
      displayThinking = split.think;
      displayContent = split.answer || displayContent;
    }

    this.conversationHistory.push({ role: 'assistant', content: fullRaw });
    return { thinking: displayThinking, content: displayContent };
  }

  // ★ 友好的中文错误信息
  _friendlyError(err, modelName) {
    const msg = err.message || '';
    if (msg.includes('401') || msg.includes('Unauthorized')) return new Error('API Key 无效，请在设置中检查');
    if (msg.includes('403') || msg.includes('Forbidden')) return new Error('API 权限不足，请检查 Key 是否有权限');
    if (msg.includes('404') || msg.includes('Not Found')) return new Error(`模型「${modelName}」不存在或 API 地址有误`);
    if (msg.includes('429') || msg.includes('Rate')) return new Error('请求过于频繁，请稍后再试');
    if (msg.includes('超时') || msg.includes('timeout') || msg.includes('abort')) return new Error('连接超时，请检查网络或API地址');
    if (msg.includes('fetch')) return new Error('无法连接到 API 服务器，请检查地址和网络');
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

  async testConnection() {
    const body = { model: this.model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 10, stream: false };
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST', headers: this._buildHeaders(), body: JSON.stringify(body)
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error?.message || `HTTP ${res.status}`);
      }
      await res.json();
      return { success: true, message: '连接成功' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  clearHistory() { this.conversationHistory = []; }
  exportHistory() { return JSON.stringify(this.conversationHistory, null, 2); }
  importHistory(j) { try { this.conversationHistory = JSON.parse(j); return true; } catch { return false; } }
}

window.mimoAPI = new MimoAPI();
