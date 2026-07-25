// 二次元桌宠 - 聊天管理器（增强版）
// 负责消息渲染、流式输出、聊天历史、角色点击事件
class ChatManager {
  constructor(app) {
    this.app = app;
    this.maxMessages = 50;
    this._kaomojiInterval = null;
    this._isNearBottom = true; // 追踪用户是否在底部
  }

  // === 消息渲染 ===

  addMessage(type, content, thinking) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    content = content || '';
    if (thinking === undefined || thinking === null) thinking = '';

    const div = document.createElement('div');
    div.className = `message ${type}`;

    let avatar = '你';
    if (type === 'ai') {
      const path = window.characterManager.getAvatarPath();
      const name = window.characterManager.getCurrentCharacter()?.name || '';
      avatar = `<img src="${path}" alt="${name}">`;
    }

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
    this._scrollToBottom(container);
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
    this._scrollToBottom(container);
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

  // ★ 追踪用户是否在底部（自动滚动用）
  _trackScroll(container) {
    const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    this._isNearBottom = isNear;
  }

  _scrollToBottom(container, smooth) {
    if (!container) container = document.getElementById('chat-messages');
    if (!container) return;
    // 如果用户手动滚上去了，不强制滚动（不影响用户阅读历史）
    this._trackScroll(container);
    if (!this._isNearBottom && !smooth) return;
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }

  // === 流式消息（增强版） ===

  createStreamMessage() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message ai';
    const path = window.characterManager.getAvatarPath();
    const name = window.characterManager.getCurrentCharacter()?.name || '';
    div.innerHTML = `<div class="message-avatar"><img src="${path}" alt="${name}"></div><div class="message-content"><div class="thinking-block streaming"><button class="thinking-toggle" onclick="this.parentElement.classList.toggle('expanded')"><span class="thinking-arrow">&#9654;</span><span class="thinking-label">思考中...</span></button><div class="thinking-content"></div></div><div class="message-text"><span class="streaming-cursor"></span></div></div>`;
    container.appendChild(div);
    this._scrollToBottom(container);

    // 监听滚动，用户手动翻看历史时停止自动滚
    container.addEventListener('scroll', () => this._trackScroll(container), { passive: true });

    return {
      el: div,
      tb: div.querySelector('.thinking-block'),
      tl: div.querySelector('.thinking-label'),
      tc: div.querySelector('.thinking-content'),
      mt: div.querySelector('.message-text'),
      _thinkingStarted: false,
      _contentStarted: false,
      _kaomojiInterval: null,
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
      el.mt.textContent = '';
      el.mt.appendChild(document.createTextNode(full));
      const cursor = el.mt.querySelector('.streaming-cursor') || document.createElement('span');
      cursor.className = 'streaming-cursor';
      el.mt.appendChild(cursor);
    }
    // ★ 只在用户靠近底部时自动滚
    if (this._isNearBottom) {
      this._scrollToBottom(null, true);
    }
  }

  finalizeStream(el, content, thinking) {
    if (el._kaomojiInterval) { clearInterval(el._kaomojiInterval); el._kaomojiInterval = null; }

    content = content || '';
    thinking = thinking || '';

    if (thinking) {
      el.tc.innerHTML = this._renderMarkdown(thinking);
      el.tl.textContent = '思考过程';
      el.tb.classList.remove('streaming', 'expanded');
      el.tb.style.display = '';
    } else {
      el.tb.classList.remove('streaming');
      el.tb.style.display = 'none';
    }
    el.mt.innerHTML = this._renderMarkdown(content);
    this._scrollToBottom(null, true);
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
    this._scrollToBottom(c);
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
