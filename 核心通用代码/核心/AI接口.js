// 二次元桌宠 - AI接口
// ★ 核心原则：
//   - 流式实时显示全部文本 → 结束后智能分割 → 思考放折叠框，只留答案在正文
//   - 对话历史存完整原文，分割只影响显示
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
    // ★ 不再截断提示词

    if (isCodeMode) {
      const name = window.characterManager.getCurrentCharacter()?.name || '我';
      sys += `\n\n用户正在请求代码帮助。用${name}的说话方式提供完整的代码示例，用代码块包裹。`;
    }

    // （不强行限制语言——各角色的提示词已包含了其自然的语言习惯）

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
        params.temperature = 0.7;
        params.max_tokens = isCodeMode ? 2048 : 512;
        break;
      case 'balanced':
        params.temperature = 0.7;
        params.max_tokens = isCodeMode ? 4096 : 1024;
        break;
      case 'deep':
        params.temperature = 0.8;
        params.max_tokens = isCodeMode ? 8192 : 2048;
        break;
    }
    return params;
  }

  // ★ 非流式（兜底）
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
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST', headers: this._buildHeaders(), body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.conversationHistory.pop();
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const msg = data.choices[0]?.message || {};
      const apiThinking = msg.reasoning_content || msg.reasoning || '';
      const rawContent = msg.content || '';

      if (!rawContent) {
        this.conversationHistory.pop();
        throw new Error('模型返回了空内容，请检查模型是否正常工作');
      }

      // ★ 有 API 单独的 reasoning 字段就用它；否则尝试分割
      let displayThinking = apiThinking;
      let displayContent = rawContent;
      if (!displayThinking && rawContent.length > 30) {
        const split = this._splitThink(rawContent);
        displayThinking = split.think;
        displayContent = split.answer || rawContent;
      }

      // ★ 对话历史存完整原文
      this.conversationHistory.push({ role: 'assistant', content: rawContent });
      return { thinking: displayThinking, content: displayContent };
    } catch (err) { throw err; }
  }

  // ★ 流式
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

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST', headers: this._buildHeaders(), body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.conversationHistory.pop();
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      let reasoningText = '';   // API 单独给的 reasoning_content
      let contentText = '';     // content 字段内容
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

          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta || {};

            // ★ API 明确分开了 reasoning 和 content
            if (delta.reasoning_content || delta.reasoning || delta.thinking) {
              const t = delta.reasoning_content || delta.reasoning || delta.thinking;
              reasoningText += t;
              onChunk?.('thinking', t, reasoningText);
            }
            if (delta.content) {
              contentText += delta.content;
              onChunk?.('content', delta.content, contentText);
            }
          } catch (e) {
            console.warn('[MimoAPI] 流式解析跳过一行:', e.message);
          }
        }
      }

      const fullRaw = contentText || reasoningText || '';
      if (!fullRaw) {
        this.conversationHistory.pop();
        throw new Error(`模型返回为空，请检查模型名称是否匹配（当前: ${this.model}）`);
      }

      // ★ 分割显示用的 thinking/content
      let displayThinking = reasoningText;
      let displayContent = contentText;

      // ★ 如果 API 没给单独的 reasoning，且内容够长 → 智能分割
      if (!displayThinking && displayContent.length > 30) {
        const split = this._splitThink(displayContent);
        displayThinking = split.think;
        displayContent = split.answer || displayContent;
      }

      // ★ 对话历史存完整原文
      this.conversationHistory.push({ role: 'assistant', content: fullRaw });
      return { thinking: displayThinking, content: displayContent };
    } catch (err) { throw err; }
  }

  // ★ 分割思考/答案（基于你的模型输出规律）
  //   规律：思考的最后一段以"最后"开头，之后的内容才是真正答案
  //   策略：显式标签 > "最后"段落分割 > 兜底
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
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
      await res.json();
      return { success: true, message: '连接成功' };
    } catch (err) { return { success: false, message: err.message }; }
  }

  clearHistory() { this.conversationHistory = []; }
  exportHistory() { return JSON.stringify(this.conversationHistory, null, 2); }
  importHistory(j) { try { this.conversationHistory = JSON.parse(j); return true; } catch { return false; } }
}

window.mimoAPI = new MimoAPI();
