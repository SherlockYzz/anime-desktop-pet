// 二次元桌宠 - 聊天管理器
// 负责消息渲染、流式输出、聊天历史、角色点击事件
class ChatManager {
  constructor(app) {
    this.app = app;
    this.maxMessages = 50;
    this._kaomojiInterval = null;
  }

  // === 消息渲染 ===

  addMessage(type, content, thinking) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    // ★ 容错：null/undefined → 空字符串
    content = content || '';
    if (thinking === undefined || thinking === null) thinking = '';

    // ★ 不试探分割：thinking 只来自 API 明确提供的 reasoning 字段

    const div = document.createElement('div');
    div.className = `message ${type}`;

    let avatar = '你';
    if (type === 'ai') {
      const path = window.characterManager.getAvatarPath();
      const name = window.characterManager.getCurrentCharacter()?.name || '';
      avatar = `<img src="${path}" alt="${name}">`;
    }

    // ★ 渲染 markdown，容错
    let rendered;
    try {
      if (window.marked && type === 'ai') {
        const cleaned = (content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        rendered = marked.parse(cleaned || content || '');
      } else {
        rendered = this._escapeHtml(content || '').replace(/\n/g, '<br>');
      }
    } catch (e) {
      rendered = this._escapeHtml(content || '').replace(/\n/g, '<br>');
    }

    let tb = '';
    if (thinking && type === 'ai') {
      let rt;
      try {
        rt = window.marked
          ? marked.parse(thinking)
          : this._escapeHtml(thinking).replace(/\n/g, '<br>');
      } catch (e) {
        rt = this._escapeHtml(thinking).replace(/\n/g, '<br>');
      }
      tb = `<div class="thinking-block"><button class="thinking-toggle" onclick="this.parentElement.classList.toggle('expanded')"><span class="thinking-arrow">&#9654;</span><span class="thinking-label">思考过程</span></button><div class="thinking-content">${rt}</div></div>`;
    }

    div.innerHTML = `<div class="message-avatar">${avatar}</div><div class="message-content">${tb}<div class="message-text">${rendered}</div></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    this._trimMessages();
  }

  addBootMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const path = window.characterManager.getAvatarPath();
    const name = window.characterManager.getCurrentCharacter()?.name || '';
    const div = document.createElement('div');
    div.className = 'message ai';
    div.innerHTML = `<div class="message-avatar"><img src="${path}" alt="${name}"></div><div class="message-content"><div class="message-text">${text || ''}</div></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  clearMessages() {
    const c = document.getElementById('chat-messages');
    if (c) c.innerHTML = '';
  }

  clearWithConfirm() {
    const c = document.getElementById('chat-messages');
    if (!c) return;
    if (c.querySelectorAll('.message').length <= 1) {
      this.app.showToast('没有聊天记录需要清除');
      return;
    }
    this.clearMessages();
    window.mimoAPI.clearHistory();
    this.addBootMessage(window.characterManager.getRandomLine('boot'));
    this.app.showToast('聊天记录已清除');
  }

  _trimMessages() {
    const c = document.getElementById('chat-messages');
    if (!c) return;
    const msgs = c.querySelectorAll('.message');
    if (msgs.length > this.maxMessages) {
      for (let i = 0; i < msgs.length - this.maxMessages; i++) msgs[i].remove();
    }
  }

  updateAvatars() {
    const path = window.characterManager.getAvatarPath();
    const name = window.characterManager.getCurrentCharacter()?.name || '';
    document.querySelectorAll('.message.ai .message-avatar img').forEach(img => {
      img.src = path; img.alt = name;
    });
  }

  // === 流式消息 ===

  createStreamMessage() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message ai';
    const path = window.characterManager.getAvatarPath();
    const name = window.characterManager.getCurrentCharacter()?.name || '';
    div.innerHTML = `<div class="message-avatar"><img src="${path}" alt="${name}"></div><div class="message-content"><div class="thinking-block streaming"><button class="thinking-toggle" onclick="this.parentElement.classList.toggle('expanded')"><span class="thinking-arrow">&#9654;</span><span class="thinking-label">思考中...</span></button><div class="thinking-content"></div></div><div class="message-text"><span class="streaming-cursor"></span></div></div>`;
    container.appendChild(div);
    return {
      el: div,
      tb: div.querySelector('.thinking-block'),
      tl: div.querySelector('.thinking-label'),
      tc: div.querySelector('.thinking-content'),
      mt: div.querySelector('.message-text'),
    };
  }

  updateStream(el, type, full) {
    if (type === 'thinking') {
      el.tc.textContent = full;
      el.tl.textContent = '思考中...';
      const kaomojis = ['(。･ω･)', '(´･_･`)', '( ￣～￣)', '(。-ω-)', '(￣▽￣*)ゞ', '(。-ω-)ﾉ'];
      if (!el._thinkingStarted) {
        el._thinkingStarted = true;
        el._kaomojiInterval = setInterval(() => {
          if (el._contentStarted) return;
          const i = Math.floor(Date.now() / 400) % kaomojis.length;
          el.mt.textContent = kaomojis[i];
        }, 400);
        el.mt.textContent = kaomojis[0];
      }
    } else if (type === 'content') {
      el._contentStarted = true;
      if (el._kaomojiInterval) { clearInterval(el._kaomojiInterval); el._kaomojiInterval = null; }
      // ★ 保留光标元素：用 textContent 会删掉 cursor span，改用 replaceChildren
      el.mt.textContent = '';
      el.mt.appendChild(document.createTextNode(full));
      const cursor = el.mt.querySelector('.streaming-cursor') || document.createElement('span');
      cursor.className = 'streaming-cursor';
      el.mt.appendChild(cursor);
    }
    const c = document.getElementById('chat-messages');
    if (c) c.scrollTop = c.scrollHeight;
  }

  finalizeStream(el, content, thinking) {
    if (el._kaomojiInterval) { clearInterval(el._kaomojiInterval); el._kaomojiInterval = null; }

    content = content || '';
    thinking = thinking || '';

    // ★ 不试探分割：thinking 只来自 API 明确提供的 reasoning 字段

    if (thinking) {
      el.tc.innerHTML = this._renderMarkdown(thinking);
      el.tl.textContent = '思考过程';
      el.tb.classList.remove('streaming', 'expanded');
      // ★ 清除收起状态的内联样式，让样式表控制
      el.tb.style.display = '';
    } else {
      el.tb.classList.remove('streaming');
      el.tb.style.display = 'none';
    }
    el.mt.innerHTML = this._renderMarkdown(content);
    const c = document.getElementById('chat-messages');
    if (c) c.scrollTop = c.scrollHeight;
  }

  // ★ 分割思考/答案（和 AI接口.js 保持一致）
  //   规律：思考的最后一段以"最后"开头，之后的内容才是答案
  _splitThinking(text) {
    if (!text || text.length < 20) return { thinking: '', content: text || '' };

    // <think> 标签
    const tag = text.match(/<think>([\s\S]*?)<\/think>/);
    if (tag) return { thinking: tag[1].trim(), content: text.replace(/<think>[\s\S]*?<\/think>/g, '').trim() };

    // Think:/Answer:
    const t = text.match(/Think[：:]\s*([\s\S]*?)(?:Answer[：:]|$)/i);
    const a = text.match(/Answer[：:]\s*([\s\S]*)/i);
    if (t && a) return { thinking: t[1].trim(), content: a[1].trim() };

    // ★ 段落分割：以"最后"开头的段落及之前=思考，之后=答案
    const paras = text.split(/\n\s*\n/).filter(p => p.trim());
    if (paras.length >= 2) {
      for (let i = 0; i < paras.length; i++) {
        if (paras[i].trim().startsWith('最后')) {
          const thinking = paras.slice(0, i + 1).join('\n\n').trim();
          const content = paras.slice(i + 1).join('\n\n').trim();
          if (content.length > 5) return { thinking, content };
          break;
        }
      }
    }

    return { thinking: '', content: text };
  }

  // === 加载动画 (颜文字) ===

  showKaomojiLoading() {
    const list = ['(・∀・)', '(´∀`)', '(・ω・)', '(｡◕‿◕｡)', '(◕ᴗ◕✿)', '(◠‿‿◠)', 'ヽ(>∀<☆)ノ'];
    const c = document.getElementById('chat-messages');
    if (!c) return;
    const div = document.createElement('div');
    div.className = 'message ai';
    div.id = 'kaomoji-loading';
    const path = window.characterManager.getAvatarPath();
    const name = window.characterManager.getCurrentCharacter()?.name || '';
    div.innerHTML = `<div class="message-avatar"><img src="${path}" alt="${name}"></div><div class="message-content"><div class="kaomoji-text"></div></div>`;
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
    let i = 0;
    const textEl = div.querySelector('.kaomoji-text');
    this._kaomojiInterval = setInterval(() => { textEl.textContent = list[i % list.length]; i++; }, 400);
    textEl.textContent = list[0];
  }

  hideKaomojiLoading() {
    if (this._kaomojiInterval) { clearInterval(this._kaomojiInterval); this._kaomojiInterval = null; }
    const el = document.getElementById('kaomoji-loading');
    if (el) el.remove();
  }

  // === 工具函数 ===

  _renderMarkdown(text) {
    if (!text) return '';
    if (window.marked) {
      try {
        const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        return marked.parse(cleaned || text);
      } catch (e) { /* fall through */ }
    }
    return this._escapeHtml(text).replace(/\n/g, '<br>');
  }

  _escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  }

  // === 角色点击 ===

  handleCharacterClick() {
    this.app.resetIdleTimer();
    this.app.clickCount++;
    if (this.app.clickTimer) clearTimeout(this.app.clickTimer);

    if (this.app.clickCount >= 3) {
      const s = Math.random() > 0.5 ? 'tsukkomi' : 'jealous';
      this.addMessage('ai', window.characterManager.getRandomLine(s));
      window.live2dManager.updateMood('annoyed');
      this.app.clickCount = 0;
    } else {
      this.addMessage('ai', window.characterManager.getRandomLine('click'));
      window.live2dManager.updateMood('normal');
    }
    this.app.clickTimer = setTimeout(() => { this.app.clickCount = 0; }, 2000);
  }
}
