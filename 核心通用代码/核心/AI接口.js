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

    // ★ Dynamic time beacon and reality perception
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeStr = `${now.toDateString()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    let timePeriod = 'Daytime';
    const h = now.getHours();
    if (h >= 0 && h < 6) timePeriod = 'Late Night / Early Morning';
    else if (h >= 6 && h < 11) timePeriod = 'Morning';
    else if (h >= 11 && h < 14) timePeriod = 'Noon';
    else if (h >= 14 && h < 18) timePeriod = 'Afternoon';
    else timePeriod = 'Evening / Night';

    sys += `\n\n[Current Time & Context Beacon]\n- Current Local Time: ${timeStr} (${timePeriod})\n- Environment: Windows AI Desktop Pet Client\nPlease subtly reflect time awareness in responses (e.g. late night care, morning greetings) while keeping character personality.`;

    if (isCodeMode) {
      const name = window.characterManager.getCurrentCharacter()?.name || 'me';
      sys += `\n\nUser is requesting code assistance. Provide complete code examples enclosed in markdown code blocks in ${name}'s speaking style.`;
    }

    // ★ Highest priority interaction and task execution directives
    sys += `\n\n[Interaction & Task Directives - Highest Priority]
1. Logic & Tasks First: Always respond directly, clearly, and logically to user requests! If given specific tasks (coding, translation, calculations, explanations), deliver accurate solutions without hesitation.
2. In-Character Immersion: Naturally blend your character personality, speaking tone, custom addressing terms, and expressive actions (in parentheses) into responses.
3. Natural & Concise: Keep casual daily chat lively and concise (2-4 sentences); reply intuitively without robotic prompt repetition.
4. Language Directive: Always communicate in natural English (or match the user's primary language)!`;

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

        // 5xx retry
        throw new Error(`Server error HTTP ${res.status}`);
      } catch (err) {
        lastErr = err;
        if (err.name === 'AbortError') {
          lastErr = new Error('Request timeout, please check network or API URL');
        }
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
      }
    }
    throw lastErr;
  }

  // Non-streaming fallback
  async sendMessage(message, isCodeMode = false) {
    if (!this.apiKey && this.needsApiKey()) throw new Error('Please configure your API Key in Settings first');

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
      }, 1);

      const data = await res.json();
      const msg = data.choices[0]?.message || {};
      const apiThinking = msg.reasoning_content || msg.reasoning || '';
      const rawContent = msg.content || '';

      if (!rawContent && !apiThinking) {
        this.conversationHistory.pop();
        throw new Error('Model returned empty content, please check if model is functioning properly');
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

  // ★ Streaming (with auto-retry)
  async sendMessageStream(message, isCodeMode = false, onChunk) {
    if (!this.apiKey && this.needsApiKey()) throw new Error('Please configure your API Key in Settings first');

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
          // 5xx retry
          throw new Error(`Server error HTTP ${res.status}`);
        }

        const streamResult = await this._readStream(res, onChunk);
        this._currentController = null;
        return streamResult;
      } catch (err) {
        if (err.name === 'AbortError') {
          if (this._abortedByUser) {
            err = new Error('Generation stopped');
            this.conversationHistory.pop();
            this._currentController = null;
            throw err;
          }
          err = new Error('Request timeout, please check network or API URL');
        }
        if (attempt < maxRetries && !this._abortedByUser) {
          onChunk?.('content', `\n\n[Retrying attempt ${attempt + 1}...]\n\n`, '');
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          attempt++;
          continue;
        }
        this.conversationHistory.pop();
        this._currentController = null;
        // Convert to friendly English error message
        throw this._friendlyError(err, this.model);
      }
    }
  }

  // ★ Read stream response
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

        // Compatible with SSE formats: data: {...} or data:{"..."}
        const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const choices = parsed.choices;
          if (!choices || choices.length === 0) continue;

          const delta = choices[0]?.delta || {};

          // Reasoning
          const reasoningDelta = delta.reasoning_content || delta.reasoning || delta.thinking;
          if (reasoningDelta) {
            reasoningText += reasoningDelta;
            onChunk?.('thinking', reasoningDelta, reasoningText);
          }

          // Content
          if (delta.content) {
            contentText += delta.content;
            onChunk?.('content', delta.content, contentText);
          }
        } catch (e) {
          console.warn('[MimoAPI] Stream parse skipped:', e.message);
        }
      }
    }

    const fullRaw = contentText || reasoningText || '';
    if (!fullRaw) {
      throw new Error(`Model returned empty output. Please verify model name (Current: ${this.model})`);
    }

    // Split thinking / content
    let displayThinking = reasoningText;
    let displayContent = contentText;

    if (!displayContent && displayThinking) {
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

  // ★ Friendly error messages
  _friendlyError(err, modelName) {
    const msg = err.message || '';
    if (msg.includes('401') || msg.includes('Unauthorized')) return new Error('API Key is invalid or unauthorized. Please verify in Settings.');
    if (msg.includes('403') || msg.includes('Forbidden')) return new Error('API Key lacks permissions or has been restricted by provider.');
    if (msg.includes('404') || msg.includes('Not Found')) {
      if (this.provider === 'local') {
        return new Error(`Local Ollama model "${modelName}" not found. Please click [Refresh Models] to select an installed model.`);
      }
      return new Error(`Model "${modelName}" not found or API URL is incorrect.`);
    }
    if (msg.includes('429') || msg.includes('Rate')) return new Error('Rate limit exceeded or quota exhausted. Please try again later.');
    if (msg.includes('timeout') || msg.includes('abort') || msg.includes('超时')) return new Error('Connection timed out. Please check your network or API URL.');
    if (msg.includes('fetch') || msg.includes('Failed to fetch')) {
      if (this.provider === 'local') return new Error('Cannot connect to local Ollama (port 11434). Please click [Start Local Service].');
      if (this.provider === 'lmstudio') return new Error('Cannot connect to local LM Studio (port 1234). Please start Server in LM Studio.');
      return new Error('Cannot connect to API server. Please check your internet or proxy configuration.');
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
      return { success: false, message: 'Please enter API Key first' };
    }

    // 1. Local Ollama connection test & model sniffing
    if (isLocalOllama) {
      const rawRoot = this.baseUrl.replace(/\/v1\/?$/, '');
      try {
        const tagRes = await fetch(`${rawRoot}/api/tags`, { method: 'GET' });
        if (!tagRes.ok) {
          throw new Error(`Ollama port abnormal HTTP ${tagRes.status}`);
        }
        const tagData = await tagRes.json();
        const models = (tagData.models || []).map(m => m.model || m.name);
        const latency = Date.now() - startTime;

        if (models.length === 0) {
          return {
            success: false,
            message: 'Local Ollama service is running, but no models are installed! Run "ollama pull qwen3:8b" in your terminal first.'
          };
        }

        const currentModel = this.model || '';
        const found = models.some(m => m === currentModel || m.startsWith(currentModel + ':') || currentModel.startsWith(m.split(':')[0]));
        if (!found) {
          return {
            success: false,
            message: `Ollama connected but model "${currentModel}" not found. Installed: [${models.join(', ')}]. Click [Refresh Models] to select.`
          };
        }

        return {
          success: true,
          message: `✓ Connected! Reached local Ollama (${models.length} models detected, latency: ${latency}ms)`
        };
      } catch (err) {
        return {
          success: false,
          message: 'Cannot connect to port 11434. Local Ollama is not running. Please click [🚀 Start Local Service] below or open Ollama.'
        };
      }
    }

    // 2. External providers test
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
          throw new Error('API Key invalid or unauthorized. Please verify your key.');
        } else if (res.status === 403) {
          throw new Error('API Key lacks permissions or access restricted.');
        } else if (res.status === 404) {
          throw new Error(`Model "${this.model}" not found or API URL is incorrect.`);
        } else if (res.status === 429) {
          throw new Error('Rate limit exceeded or insufficient quota (HTTP 429).');
        }
        throw new Error(rawErrMsg);
      }

      await res.json().catch(() => ({}));
      return { success: true, message: `✓ Connected! Model response verified (latency: ${latency}ms)` };
    } catch (err) {
      let msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
        if (this.provider === 'lmstudio') {
          msg = 'Cannot connect to port 1234. In LM Studio, go to Local Server tab and click Start Server.';
        } else {
          msg = 'Network connection failed. Please check your API URL, internet connection, or proxy settings.';
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
