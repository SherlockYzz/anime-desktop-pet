// ====================================================
// 二次元桌宠 - 渲染进程主逻辑（启动加速版）
// ★ 优化：分阶段启动，第一帧先显示UI shell，数据和重型资源后台加载
// ====================================================

const IDLE_CHECK_INTERVAL = 120000;
const IDLE_TIMEOUT = 30000;
const INACTIVE_THRESHOLD = 300000;

class App {
  constructor() {
    this.currentTab = 'chat';
    this.isLoading = false;
    this.clickCount = 0;
    this.clickTimer = null;
    this.idleTimer = null;
    this.lastInteraction = Date.now();
    this._isThrottled = false;
    this._inactivityTimer = null;
    this._live2dReady = false;
    this._charDataReady = false;

    this.chat = new ChatManager(this);
    this.codeEditor = new CodeEditor(this);
    this.settings = new SettingsManager(this);
    this.petMode = new PetMode(this);

    // 启动：分阶段进行
    this._initPhase1();
  }

  // ★ 阶段1：立即渲染UI shell（不依赖角色数据）
  _initPhase1() {
    // 绑定事件
    this._bindEvents();
    // 设置API配置（从localStorage，微秒级）
    this.settings.apply();
    // Markdown 和 代码编辑器
    this._initMarkdown();
    this.codeEditor.init();
    // 初始化提供商选择器
    this.settings.initProviderSelector();
    // 梦幻星星（纯CSS装饰）
    this._initDreamStars();
    // 显示加载动画
    this.showLoading(true, '正在启动...');

    // ★ 阶段2在下一个宏任务中执行，让UI先完成首帧渲染
    setTimeout(() => this._initPhase2(), 10);
  }

  // ★ 阶段2：加载角色数据（有localStorage缓存则毫秒级）
  async _initPhase2() {
    try {
      await window.characterManager.loadSavedCharacter();
      this._charDataReady = true;
    } catch (e) {
      console.warn('角色数据加载失败:', e);
    }

    // 角色依赖的UI更新
    this._showBootMessage();
    this._checkSpecialDate();
    this._initCharacterSelector();
    this._startIdleTimer();
    this._startInactivityMonitor();

    // 显示封面图
    window.live2dManager?.showFallback();

    // 关闭加载动画
    this.showLoading(false);

    // ★ 阶段3：启动桌宠模式 + 后台Live2D
    setTimeout(() => this._initPhase3(), 50);
  }

  // ★ 阶段3：桌宠模式和重型资源（后台加载，不阻塞）
  async _initPhase3() {
    // 桌宠模式（先显示占位，再加载模型）
    this.petMode.init(true);

    // 后台检查并加载 Live2D
    const char = window.characterManager?.getCurrentCharacter();
    if (char?.live2d?.modelPath) {
      try {
        const exists = await window.characterManager.checkModelFileExists(char.live2d.modelPath);
        if (exists) this._initLive2D();
      } catch (e) { /* 静默 */ }
    }

    // 预检所有角色的模型文件
    window.characterManager.precheckModelFiles();

    // ★ 阶段4：在空闲时加载CDN高亮库（不影响首帧）
    this._initHighlighting();
  }

  // ★ 后台初始化 Live2D（不阻塞 UI）
  async _initLive2D() {
    try {
      await window.live2dManager.init();
      this._live2dReady = true;
      const savedMode = window.live2dManager.getDisplayMode();
      if (savedMode === 'gif') await window.live2dManager.switchToGifMode();
    } catch {
      window.live2dManager?.showFallback();
    }
  }

  // ★ 空闲时加载 highlight.js（不影响首帧）
  _initHighlighting() {
    if (window.hljs) return;
    const script = document.createElement('script');
    script.src = '../第三方库/highlight.min.js';
    script.async = true;
    script.onload = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '../第三方库/代码主题.css';
      document.head.appendChild(link);
    };
    // 等requestIdleCallback或简单setTimeout
    setTimeout(() => document.head.appendChild(script), 2000);
  }

  _initDreamStars() {
    const c = document.getElementById('dream-stars');
    if (!c) return;
    for (let i = 0; i < 12; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = (5 + Math.random() * 90) + '%';
      star.style.top = (5 + Math.random() * 90) + '%';
      star.style.setProperty('--duration', (2 + Math.random() * 4) + 's');
      star.style.setProperty('--delay', (Math.random() * 3) + 's');
      if (Math.random() > 0.7) { star.style.width = '4px'; star.style.height = '4px'; }
      c.appendChild(star);
    }
  }

  _showBootMessage() {
    const text = window.characterManager.getRandomLine('boot');
    const first = document.querySelector('#chat-messages .message-text');
    if (first) first.textContent = text || '';
  }

  _checkSpecialDate() {
    if (window.characterManager.isBirthday()) {
      setTimeout(() => {
        this.chat.addMessage('ai', window.characterManager.getRandomLine('special'));
        window.live2dManager.triggerSpecial('birthday');
      }, 3000);
    }
  }

  _initMarkdown() {
    if (window.marked) {
      this._setupMarked();
      return;
    }
    // ★ 动态加载 marked（不阻塞启动）
    const script = document.createElement('script');
    script.src = '../第三方库/marked.min.js';
    script.async = true;
    script.onload = () => this._setupMarked();
    document.head.appendChild(script);
  }

  _setupMarked() {
    if (this._markedReady) return;
    this._markedReady = true;
    if (!window.marked) return;
    marked.use({
      breaks: true, gfm: true,
      renderer: {
        code({ text, lang }) {
          let h = text;
          if (window.hljs) {
            try { h = lang && hljs.getLanguage(lang) ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value; }
            catch (e) { /* fallback */ }
          }
          return `<pre><code class="hljs language-${lang || ''}">${h}</code></pre>`;
        }
      }
    });
  }

  _bindEvents() {
    document.getElementById('btn-minimize')?.addEventListener('click', () => window.electronAPI.minimizeWindow());
    document.getElementById('btn-close')?.addEventListener('click', () => { window.electronAPI.closeWindow(); });
    document.getElementById('btn-settings')?.addEventListener('click', () => this.settings.show());
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', (e) => this._switchTab(e.target.dataset.tab)));
    document.getElementById('btn-chat-send')?.addEventListener('click', () => this._sendChat());
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendChat(); }
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', () => this.settings.hide());
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.settings.save());
    document.getElementById('opacity-slider')?.addEventListener('input', (e) => {
      document.getElementById('opacity-value').textContent = e.target.value + '%';
    });
    window.electronAPI.onShowSettings(() => this.settings.show());
    document.getElementById('btn-character-select')?.addEventListener('click', () => this._showCharacterSelector());
    document.getElementById('btn-close-character')?.addEventListener('click', () => this._hideCharacterSelector());
    document.getElementById('btn-clear-chat')?.addEventListener('click', () => this.chat.clearWithConfirm());
    document.getElementById('api-provider')?.addEventListener('change', (e) => this.settings.onProviderChange(e.target.value));
    document.getElementById('btn-test-connection')?.addEventListener('click', () => this.settings.testConnection());
    document.getElementById('live2d-container')?.addEventListener('click', () => {
      if (document.body.classList.contains('web-mode-active')) this.chat.handleCharacterClick();
    });
    document.addEventListener('mousemove', () => this._resetIdle());
    document.addEventListener('keydown', () => this._resetIdle());
    document.getElementById('chat-messages')?.addEventListener('click', (e) => {
      if (e.target.closest('.message.ai .message-avatar')) this.chat.handleCharacterClick();
    });
  }

  _initCharacterSelector() {
    if (!this._charDataReady) return;
    const list = window.characterManager.getAllCharacters();
    const curId = window.characterManager.currentCharacterId;
    const grid = document.getElementById('character-grid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(char => {
      const card = document.createElement('div');
      card.className = `character-card ${char.id === curId ? 'active' : ''}`;
      card.dataset.characterId = char.id;
      card.innerHTML = `<div class="character-card-avatar" style="background:${char.theme.primary}20;border-color:${char.theme.primary}40;"><img src="${char.avatar}" alt="${char.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span class="character-card-icon" style="color:${char.theme.primary};display:none;">${char.name.charAt(0)}</span></div><div class="character-card-info"><div class="character-card-name" style="color:${char.theme.primary};">${char.name}</div><div class="character-card-series">${char.series}</div><div class="character-card-tagline">${char.tagline}</div></div>${char.id === curId ? '<div class="character-card-badge">当前</div>' : ''}`;
      card.addEventListener('mouseenter', () => { if (char.id !== curId) window.characterManager.precacheCharacter(char.id); });
      card.addEventListener('click', () => this._switchCharacter(char.id));
      grid.appendChild(card);
    });
  }

  _showCharacterSelector() {
    if (!this._charDataReady) {
      window.characterManager.loadSavedCharacter().then(() => {
        this._charDataReady = true;
        this._initCharacterSelector();
        document.getElementById('character-panel')?.classList.add('show');
      });
      return;
    }
    const p = document.getElementById('character-panel');
    if (p) { this._initCharacterSelector(); p.classList.add('show'); }
  }
  _hideCharacterSelector() { document.getElementById('character-panel')?.classList.remove('show'); }

  async _switchCharacter(characterId) {
    if (this._switchingChar) return;
    const char = window.characterManager.registry[characterId];
    if (!char) return;
    if (window.characterManager.getCurrentCharacter()?.id === characterId) { this._hideCharacterSelector(); return; }
    this._switchingChar = true;
    this.showToast(`正在加载 ${char.name}...`);
    try {
      await window.mimoAPI.switchCharacter(characterId);
      this._hideCharacterSelector();
      this.chat.clearMessages();
      this.chat.addBootMessage(window.characterManager.getRandomLine('boot'));
      this.chat.updateAvatars();
      const mode = window.live2dManager.getDisplayMode();
      if (mode === 'gif') await window.live2dManager.switchToGifMode();
      else await window.live2dManager.loadCharacterModel();
      this.showToast(`已切换到 ${char.name}`);
    } finally { this._switchingChar = false; }
  }

  _switchTab(name) {
    this.currentTab = name;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
  }

  async _sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg || this.isLoading) return;
    this._resetIdle();

    if (!document.body.classList.contains('web-mode-active')) {
      this.petMode?.exit();
    }

    this.chat.addMessage('user', msg);
    input.value = '';
    this.isLoading = true;
    const btn = document.getElementById('btn-chat-send');
    if (btn) btn.disabled = true;
    try {
      const el = this.chat.createStreamMessage();
      const result = await window.mimoAPI.sendMessageStream(msg, false, (type, chunk, full) => {
        this.chat.updateStream(el, type, full);
      });
      const content = typeof result === 'object' ? result.content : result;
      const thinking = typeof result === 'object' ? result.thinking : '';
      if (content) {
        this.chat.finalizeStream(el, content, thinking);
        window.live2dManager.updateByAIResponse(content);
      } else {
        this.chat.finalizeStream(el, '(模型返回为空，请检查模型设置)');
        window.live2dManager.updateByAIResponse('');
      }
    } catch (err) {
      this.chat.addMessage('ai', `出错了: ${err.message}`);
    } finally {
      this.isLoading = false;
      if (btn) btn.disabled = false;
    }
  }

  _startIdleTimer() {
    if (this.idleTimer) clearInterval(this.idleTimer);
    this.idleTimer = setInterval(() => {
      if (Date.now() - this.lastInteraction >= IDLE_TIMEOUT && !this.isLoading) {
        this.chat.addMessage('ai', window.characterManager.getRandomLine('idle'));
        window.live2dManager.triggerIdle();
        this.lastInteraction = Date.now();
      }
    }, IDLE_CHECK_INTERVAL);
  }

  _startInactivityMonitor() {
    this._inactivityTimer = setInterval(() => {
      if (Date.now() - this.lastInteraction >= INACTIVE_THRESHOLD && !this._isThrottled) {
        this._isThrottled = true;
        clearInterval(this.idleTimer);
        this.idleTimer = setInterval(() => {
          if (Date.now() - this.lastInteraction >= IDLE_TIMEOUT && !this.isLoading) {
            this.chat.addMessage('ai', window.characterManager.getRandomLine('idle'));
            window.live2dManager.triggerIdle();
            this.lastInteraction = Date.now();
          }
        }, 300000);
      }
    }, 60000);
  }

  _restoreThrottle() {
    if (this._isThrottled) { this._isThrottled = false; clearInterval(this.idleTimer); this._startIdleTimer(); }
  }

  _resetIdle() { this.lastInteraction = Date.now(); this._restoreThrottle(); }

  showLoading(show, text) {
    this.isLoading = show;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.toggle('show', show);
      const txt = overlay.querySelector('.loading-text');
      if (txt && text) txt.textContent = text;
    }
    const btn = document.getElementById('btn-chat-send');
    if (btn) btn.disabled = show;
  }

  showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  hideSettings() { this.settings.hide(); }
  hideCharacterSelector() { this._hideCharacterSelector(); }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
