// 二次元桌宠 - 桌宠模式（形态一：极简悬浮挂件）
// 优化：模型文件缓存检查减少HTTP请求 + 新增鼠标追踪（角色视线跟随鼠标）
class PetMode {
  constructor(app) {
    this.app = app;
    this._clickCount = 0;
    this._clickTimer = null;
    this._dragging = false;
    this._dragStart = { x: 0, y: 0, cx: 0, cy: 0 };
    this._moved = false;
    this._transitioning = false;
    this._everTransitioned = false;
    this._model = null;
    this._pixiApp = null;
    this._renderMode = null; // 'live2d' | 'vrm' | 'gif'
    this._idleTimer = null;
    this._lastInteraction = Date.now();
    // ★ 鼠标追踪
    this._mouseTrackHandler = null;
    this._mouseTrackEnabled = true; // 可配置
  }

  init(skipTransition) {
    this._bindEvents();
    this.enter(skipTransition);
  }

  // === 永久事件绑定 ===
  _bindEvents() {
    const area = document.getElementById('pet-character-area');
    if (!area) return;

    // 拖拽
    area.addEventListener('mousedown', (e) => {
      if (document.body.classList.contains('web-mode-active')) return;
      const r = area.getBoundingClientRect();
      this._dragStart = { x: e.clientX, y: e.clientY, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      this._dragging = true; this._moved = false;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - this._dragStart.x, dy = e.clientY - this._dragStart.y;
      if (!this._moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      this._moved = true;
      area.style.margin = '0';
      area.style.left = (this._dragStart.cx + dx - area.clientWidth / 2) + 'px';
      area.style.top = (this._dragStart.cy + dy - area.clientHeight / 2) + 'px';
    });

    document.addEventListener('mouseup', () => { this._dragging = false; });

    document.getElementById('btn-back-pet')?.addEventListener('click', () => this.enter(false, true));
    document.getElementById('btn-switch-web')?.addEventListener('click', () => this.exit(true));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('web-mode-active')) this.enter();
    });
  }

  // === 形态切换 ===
  // ★ 安全解锁：防止 _transitioning 卡住导致模式切换永久失效
  _safeUnlockTransition() {
    this._transitioning = false;
    if (this._transitionTimer) {
      clearTimeout(this._transitionTimer);
      this._transitionTimer = null;
    }
  }

  // ★ 启动超时锁：超过5秒强制解锁，防止异常卡死
  _armTransitionLock() {
    if (this._transitionTimer) clearTimeout(this._transitionTimer);
    this._transitionTimer = setTimeout(() => {
      if (this._transitioning) {
        console.warn('[PetMode] 过渡锁超时，强制解锁');
        this._transitioning = false;
      }
      this._transitionTimer = null;
    }, 5000);
  }

  async enter(skipTransition, force) {
    if (this._transitioning && !force) return;
    // ★ 如果是强制进入，先解锁再继续
    if (force) this._transitioning = false;
    this._transitioning = true;
    this._armTransitionLock();
    this.app.hideSettings?.();
    this.app.hideCharacterSelector?.();

    try {
      if (skipTransition || !this._everTransitioned) {
        document.body.classList.remove('web-mode-active');
        await this._loadCharacter();
        this._bindClickEvents();
        this._startIdleTimer();
        this._showBubble(window.characterManager.getRandomLine('boot'));
        this._startMouseTracking();
        this._everTransitioned = true;
        this._safeUnlockTransition();
        return;
      }

      document.body.classList.remove('web-mode-active');
      await this._loadCharacter();
      this._bindClickEvents();
      this._startIdleTimer();
      this._showBubble(window.characterManager.getRandomLine('boot'));
      this._startMouseTracking();
      requestAnimationFrame(() => { this._safeUnlockTransition(); });
    } catch (e) {
      console.warn('[PetMode] 进入桌宠模式出错:', e);
      // 即使出错也确保解锁，避免永久卡死
      document.body.classList.remove('web-mode-active');
      this._safeUnlockTransition();
    }
  }

  async exit(force) {
    if (this._transitioning && !force) return;
    // ★ 如果是强制退出，先解锁再继续
    if (force) this._transitioning = false;
    this._transitioning = true;
    this._armTransitionLock();
    this._stopMouseTracking();

    try {
      this.app.hideSettings?.();
      this.app.hideCharacterSelector?.();
      this._stopIdleTimer();
      this._clearBubbles();

      document.body.classList.add('web-mode-active');

      setTimeout(() => {
        this._cleanupLive2D();
        this._cleanupVRM();
        this._renderMode = null;
        const gif = document.getElementById('pet-gif');
        if (gif) { gif.src = ''; gif.style.display = 'none'; }
        const canvas = document.getElementById('pet-canvas');
        if (canvas) canvas.style.display = '';
        window.live2dManager?.showFallback();
        this._safeUnlockTransition();
      }, 350);
    } catch (e) {
      console.warn('[PetMode] 退出桌宠模式出错:', e);
      document.body.classList.add('web-mode-active');
      this._safeUnlockTransition();
    }
  }

  // === ★ 鼠标追踪：角色视线/头部跟随鼠标 ===
  _startMouseTracking() {
    this._stopMouseTracking();
    const area = document.getElementById('pet-character-area');
    if (!area) return;

    this._mouseTrackHandler = (e) => {
      if (!this._mouseTrackEnabled) return;
      const r = area.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (r.width / 2);  // -1 ~ 1
      const dy = (e.clientY - cy) / (r.height / 2); // -1 ~ 1

      if (this._renderMode === 'vrm' && window.vrmManager?.vrm) {
        // VRM：转动头部骨骼
        const head = window.vrmManager.vrm.humanoid?.getNormalizedBoneNode('head');
        if (head) {
          head.rotation.y = dx * 0.3;
          head.rotation.x = dy * 0.15;
        }
      } else if (this._renderMode === 'live2d' && this._model) {
        // Live2D：聚焦视线
        try { this._model.focus(e.clientX - r.left, e.clientY - r.top); } catch (e) {}
      }
    };

    document.addEventListener('mousemove', this._mouseTrackHandler);
  }

  _stopMouseTracking() {
    if (this._mouseTrackHandler) {
      document.removeEventListener('mousemove', this._mouseTrackHandler);
      this._mouseTrackHandler = null;
    }
  }

  // === 角色加载（自动降级：Live2D > VRM > GIF，使用缓存检查）===
  async _loadCharacter() {
    await window.live2dManager.loadScripts();
    const char = window.characterManager?.getCurrentCharacter();
    if (!char) return;

    const area = document.getElementById('pet-character-area');
    if (area) {
      area.style.margin = ''; area.style.left = '50%'; area.style.top = '50%';
      area.style.marginLeft = '-140px'; area.style.marginTop = '-170px';
    }

    const canvas = document.getElementById('pet-canvas');
    const gif = document.getElementById('pet-gif');
    if (!canvas || !area) return;

    let loaded = false;

    // Live2D — 使用缓存检查
    if (char.live2d?.modelPath) {
      const exists = await window.characterManager.checkModelFileExists(char.live2d.modelPath);
      if (exists) {
        try {
          this._pixiApp = new PIXI.Application({
            view: canvas, width: area.clientWidth, height: area.clientHeight,
            transparent: true, backgroundAlpha: 0, resizeTo: area,
          });
          this._model = await PIXI.live2d.Live2DModel.from(char.live2d.modelPath, { autoInteract: false, autoUpdate: true });
          const s = Math.min(area.clientWidth / this._model.width, area.clientHeight / this._model.height) * 0.8;
          this._model.scale.set(s); this._model.anchor.set(0.5, 0.5);
          this._model.x = area.clientWidth / 2; this._model.y = area.clientHeight / 2;
          this._pixiApp.stage.addChild(this._model);
          canvas.style.display = ''; if (gif) gif.style.display = 'none';
          loaded = true; this._renderMode = 'live2d';
        } catch (e) { loaded = false; }
      }
    }

    // VRM — 使用缓存检查
    if (!loaded && char.vrm?.modelPath && window.vrmManager) {
      const exists = await window.characterManager.checkModelFileExists(char.vrm.modelPath);
      if (exists) {
        try {
          this._cleanupLive2D();
          canvas.style.display = ''; if (gif) gif.style.display = 'none';
          canvas.width = area.clientWidth; canvas.height = area.clientHeight;
          const ok = await window.vrmManager.initPet(canvas, area.clientWidth, area.clientHeight);
          if (ok) {
            const modelOk = await window.vrmManager.loadModel(char.vrm.modelPath);
            if (modelOk) { loaded = true; this._renderMode = 'vrm'; }
          }
        } catch (e) { loaded = false; }
      }
    }

    // GIF
    if (!loaded) { this._renderMode = 'gif'; await this._loadGif(); }
  }

  async _loadGif() {
    const path = window.live2dManager._getGifPath();
    const canvas = document.getElementById('pet-canvas');
    const gif = document.getElementById('pet-gif');
    if (!path || !gif) return;
    if (canvas) canvas.style.display = 'none';
    const ok = await new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 8000);
      gif.onload = () => { clearTimeout(timer); resolve(true); };
      gif.onerror = () => { clearTimeout(timer); resolve(false); };
      gif.src = path;
    });
    if (ok) { gif.style.display = 'block'; gif.style.visibility = 'visible'; gif.style.opacity = '1'; }
    else { gif.style.display = 'none'; }
  }

  // === 点击交互 ===
  _bindClickEvents() {
    const canvas = document.getElementById('pet-canvas');
    const gif = document.getElementById('pet-gif');

    const handler = (e) => {
      if (this._moved) return;
      this._clickCount++;
      if (this._clickTimer) clearTimeout(this._clickTimer);

      if (this._clickCount >= 3) {
        this._clickCount = 0;
        const s = Math.random() > 0.5 ? 'tsukkomi' : 'jealous';
        this._showBubble(window.characterManager.getRandomLine(s));
        this._playTap();
        this._lastInteraction = Date.now();
      } else if (this._clickCount === 2) {
        this._clickCount = 0;
        this.exit(true); // ★ 强制退出，避免transition锁卡住
      } else {
        this._clickTimer = setTimeout(() => {
          if (this._clickCount === 1) {
            this._showBubble(window.characterManager.getRandomLine('click'));
            this._playTap();
            this._lastInteraction = Date.now();
          }
          this._clickCount = 0;
        }, 300);
      }
    };

    if (canvas) canvas.addEventListener('mousedown', handler);
    if (gif) gif.addEventListener('mousedown', handler);
  }

  _playTap() {
    if (this._renderMode === 'vrm' && window.vrmManager) {
      window.vrmManager.playAnimation('tap');
    } else if (this._model) {
      this._model.motion('TapBody');
    }
  }

  // === 气泡系统 ===
  _showBubble(text) {
    const c = document.getElementById('pet-bubble-container');
    if (!c) return;
    const b = document.createElement('div');
    b.className = 'pet-bubble'; b.textContent = text;
    c.appendChild(b);
    setTimeout(() => { b.classList.add('bubble-fade-out'); setTimeout(() => b.remove(), 400); }, 3500);
    while (c.children.length > 3) c.firstChild?.remove();
  }

  _clearBubbles() {
    const c = document.getElementById('pet-bubble-container');
    if (c) c.innerHTML = '';
  }

  // === 闲置检测 ===
  _startIdleTimer() {
    this._stopIdleTimer();
    this._lastInteraction = Date.now();
    this._idleTimer = setInterval(() => {
      if (Date.now() - this._lastInteraction >= 30000) {
        this._showBubble(window.characterManager.getRandomLine('idle'));
        this._lastInteraction = Date.now();
      }
    }, 10000);
  }

  _stopIdleTimer() {
    if (this._idleTimer) { clearInterval(this._idleTimer); this._idleTimer = null; }
  }

  resetIdle() { this._lastInteraction = Date.now(); }

  // === 资源清理 ===
  _cleanupLive2D() {
    if (this._pixiApp) {
      if (this._model) { this._pixiApp.stage.removeChild(this._model); this._model.destroy(); this._model = null; }
      this._pixiApp.destroy(true); this._pixiApp = null;
    }
  }

  _cleanupVRM() {
    if (this._renderMode === 'vrm' && window.vrmManager) {
      window.vrmManager.destroy();
    }
  }
}
