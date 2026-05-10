// 二次元桌宠 - API管理器（多提供商支持版）
class MimoAPI {
  constructor() {
    this.apiKey = '';
    this.model = 'doubao-pro-32k';
    this.baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
    this.provider = 'doubao';
    this.conversationHistory = [];
    this.maxHistory = 30;
  }

  getSystemPrompt() {
    return window.characterManager.getSystemPrompt();
  }

  getRandomLine(situation) {
    return window.characterManager.getRandomLine(situation);
  }

  setApiKey(key) { this.apiKey = key; }
  setBaseUrl(url) { this.baseUrl = url; }
  setModel(model) { this.model = model; }
  setProvider(provider) { this.provider = provider; }

  switchCharacter(characterId) {
    this.clearHistory();
    return window.characterManager.switchCharacter(characterId);
  }

  // 判断当前提供商是否需要API Key
  needsApiKey() {
    const provider = window.getProvider?.(this.provider);
    return provider ? provider.needsKey : true;
  }

  // 构建请求头
  _buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  // 测试连接
  async testConnection() {
    const testBody = {
      model: this.model,
      messages: [
        { role: 'user', content: '你好' }
      ],
      max_tokens: 10,
      stream: false
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this._buildHeaders(),
        body: JSON.stringify(testBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return { success: true, message: '连接成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async sendMessage(message, isCodeMode = false, reasoningEffort) {
    if (!this.apiKey && this.needsApiKey()) {
      throw new Error('请先在设置中配置API Key');
    }

    this.conversationHistory.push({ role: 'user', content: message });

    if (this.conversationHistory.length > this.maxHistory) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
    }

    let systemPrompt = this.getSystemPrompt();
    if (isCodeMode) {
      const charName = window.characterManager.getCurrentCharacter()?.name || '我';
      systemPrompt += `\n\n用户正在请求代码帮助。用${charName}的说话方式提供完整的代码示例，用代码块包裹，保持角色性格的语气。`;
    }

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 8192,
      stream: false
    };

    // 控制推理深度
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this._buildHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const msg = data.choices[0].message;
      let aiResponse = msg.content || '';
      let thinking = '';

      // 从 reasoning/thinking 字段提取思考内容
      if (msg.reasoning_content) thinking = msg.reasoning_content;
      else if (msg.reasoning) thinking = msg.reasoning;
      else if (msg.thinking) thinking = msg.thinking;

      // 从 content 中的 <think> 标签提取思考内容
      const thinkMatch = aiResponse.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        if (!thinking) thinking = thinkMatch[1].trim();
        aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      }

      if (!aiResponse && !thinking) {
        aiResponse = '（模型思考中，但未生成回复内容）';
      }

      // 存入历史时只保留回复内容
      this.conversationHistory.push({ role: 'assistant', content: aiResponse || thinking });
      return { thinking, content: aiResponse || thinking };
    } catch (error) {
      throw error;
    }
  }

  async sendMessageStream(message, isCodeMode = false, onChunk, reasoningEffort) {
    if (!this.apiKey && this.needsApiKey()) {
      throw new Error('请先在设置中配置API Key');
    }

    this.conversationHistory.push({ role: 'user', content: message });

    if (this.conversationHistory.length > this.maxHistory) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
    }

    let systemPrompt = this.getSystemPrompt();
    if (isCodeMode) {
      const charName = window.characterManager.getCurrentCharacter()?.name || '我';
      systemPrompt += `\n\n用户正在请求代码帮助。用${charName}的说话方式提供完整的代码示例，用代码块包裹。`;
    }

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 8192,
      stream: true
    };

    // 控制推理深度
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this._buildHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullThinking = '';
      let fullResponse = '';
      let inThinkTag = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices[0]?.delta || {};

              // 优先从 reasoning/thinking 字段获取思考内容
              const reasoningChunk = delta.reasoning_content || delta.reasoning || delta.thinking || '';
              if (reasoningChunk) {
                fullThinking += reasoningChunk;
                if (onChunk) onChunk('thinking', reasoningChunk, fullThinking);
                continue;
              }

              // 从 content 中解析 <think> 标签
              let content = delta.content || '';

              if (content) {
                // 检测 <think> 标签边界
                while (content.length > 0) {
                  if (!inThinkTag) {
                    const thinkStart = content.indexOf('<think>');
                    if (thinkStart === -1) {
                      // 没有 <think> 标签，全部是回复内容
                      fullResponse += content;
                      if (onChunk) onChunk('content', content, fullResponse);
                      content = '';
                    } else {
                      // <think> 前的内容是回复
                      if (thinkStart > 0) {
                        const before = content.substring(0, thinkStart);
                        fullResponse += before;
                        if (onChunk) onChunk('content', before, fullResponse);
                      }
                      content = content.substring(thinkStart + 7);
                      inThinkTag = true;
                    }
                  } else {
                    const thinkEnd = content.indexOf('</think>');
                    if (thinkEnd === -1) {
                      // 全部是思考内容
                      fullThinking += content;
                      if (onChunk) onChunk('thinking', content, fullThinking);
                      content = '';
                    } else {
                      // <think> 前的内容是思考
                      if (thinkEnd > 0) {
                        const thinking = content.substring(0, thinkEnd);
                        fullThinking += thinking;
                        if (onChunk) onChunk('thinking', thinking, fullThinking);
                      }
                      content = content.substring(thinkEnd + 8);
                      inThinkTag = false;
                    }
                  }
                }
              }
            } catch (e) {}
          }
        }
      }

      if (!fullResponse && !fullThinking) {
        fullResponse = '（模型思考中，但未生成回复内容）';
      }

      this.conversationHistory.push({ role: 'assistant', content: fullResponse || fullThinking });
      return { thinking: fullThinking, content: fullResponse || fullThinking };
    } catch (error) {
      throw error;
    }
  }

  clearHistory() { this.conversationHistory = []; }

  exportHistory() { return JSON.stringify(this.conversationHistory, null, 2); }

  importHistory(json) {
    try {
      this.conversationHistory = JSON.parse(json);
      return true;
    } catch (error) {
      return false;
    }
  }
}

window.mimoAPI = new MimoAPI();
