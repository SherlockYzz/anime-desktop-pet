// 二次元桌宠 - 聊天管理器（增强版）
// 负责消息渲染、流式输出、聊天历史、角色点击事件、关键词触发台词
class ChatManager {
  constructor(app) {
    this.app = app;
    this.maxMessages = 50;
    this._kaomojiInterval = null;
    this._isNearBottom = true; // 追踪用户是否在底部
  }

  // ===== 关键词触发台词系统 =====
  // 用户输入命中关键词时，秒级优先推送匹配台词，之后AI照常回复
  // 关键词覆盖面要广，用同义词/近义词降低触发门槛
  static KEYWORD_TRIGGERS = [
    { keywords: ['天气', '下雨', '下雪', '晴天', '阴天', '台风', '热死了', '冷死了', '好热', '好冷', '降温', '升温', '出太阳', '打雷', '刮风', '下雨了', '下雪了', '天晴', '雾霾', '潮湿', '干燥'], situation: 'weather' },
    { keywords: ['晚安', '睡觉', '睡了', '困了', '好困', '我要睡', '该睡了', '好晚', '不早了', '熬夜', '失眠', '做梦', '打瞌睡', '犯困', '想睡', '先睡了', '睡不着'], situation: 'bedtime' },
    { keywords: ['加油', '鼓励', '好累', '坚持不下去', '做不到', '好难', '不想干', '放弃', '撑不住', '累了', '疲惫', '心累', '好辛苦', '太难了', '没动力', '不想努力', '想放弃', '压力大', '受不了', '崩溃', '烦躁', '烦死了', '怎么办', '我不行', '没信心', '沮丧', '丧', 'emo', '心态崩了'], situation: 'encouragement' },
    { keywords: ['好吃', '美食', '好饿', '吃啥', '吃什么', '零食', '甜点', '蛋糕', '火锅', '烧烤', '饿了', '肚子饿', '想吃', '嘴馋', '夜宵', '下午茶', '奶茶', '冰淇淋', '巧克力', '拉面', '寿司', '披萨', '汉堡', '炸鸡', '薯条', '吃饭', '干饭', '觅食', '大餐', '美味', '馋了'], situation: 'food' },
    { keywords: ['做饭', '料理', '烹饪', '下厨', '菜谱', '做饭', '做菜', '煮饭', '炒菜', '烤面包', '烘焙', '便当', '便当', '厨艺', '手艺', '掌勺'], situation: 'cooking' },
    { keywords: ['夸我', '表扬', '厉害', '我很棒', '夸奖', '赞赏', '赞美', '称赞', '鼓励我', '认可', '肯定', '真棒', '太强了', '优秀', '完美', '做得好', '不错嘛', '好样的', '了不起', '真厉害'], situation: 'praise' },
    { keywords: ['孤单', '孤独', '寂寞', '一个人', '没人陪', '好无聊', '无聊', '空虚', '冷清', '没人理', '没人说话', '没人聊天', '发呆', '没事干', '闲得慌', '好寂寞', '独自', '单着', '没有朋友'], situation: 'loneliness' },
    { keywords: ['怀疑自己', '我不行', '没用', '废物', '一无是处', '自我怀疑', '否定自己', '自卑', '不够好', '配不上', '差劲', '没价值', '没意义', '活着干嘛', '讨厌自己', '恨自己', '不争气', '太差了', '我太菜', '不自信'], situation: 'self_doubt' },
  ];

  /**
   * 检查用户输入是否命中关键词触发台词
   * @param {string} msg 用户消息
   * @returns {string|null} 触发的台词，无匹配返回null
   */
  checkKeywordTrigger(msg) {
    if (!msg) return null;
    const lower = msg.toLowerCase();
    for (const trigger of ChatManager.KEYWORD_TRIGGERS) {
      for (const kw of trigger.keywords) {
        if (lower.includes(kw)) {
          return window.characterManager.getRandomLine(trigger.situation);
        }
      }
    }
    return null;
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
        rendered = escapeHtml(content || '').replace(/\n/g, '<br>');
      }
    } catch (e) {
      rendered = escapeHtml(content || '').replace(/\n/g, '<br>');
    }

    let tb = '';
    if (thinking && type === 'ai') {
      let rt;
      try {
        rt = window.marked
          ? marked.parse(thinking)
          : escapeHtml(thinking).replace(/\n/g, '<br>');
      } catch (e) {
        rt = escapeHtml(thinking).replace(/\n/g, '<br>');
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
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  // escapeHtml 已在 工具函数.js 中全局定义

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
