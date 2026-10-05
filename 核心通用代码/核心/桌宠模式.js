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
    this._renderMode = null; // 'live2d' | 'vrm' | 'sprite' | 'gif'
    this._idleTimer = null;
    this._lastInteraction = Date.now();
    // ★ 鼠标追踪
    this._mouseTrackHandler = null;
    this._mouseTrackEnabled = true; // 可配置

    // ★ 移动系统（精灵帧桌宠：跑/跳/四向移动/自动漫步）
    this._keys = { left: false, right: false, up: false, down: false };
    this._moveRaf = null;
    this._moving = false;
    this._facing = 'right';
    this._wanderActive = false;
    this._wanderDir = 0;
    this._wanderSpeed = 1.4;
    this._wanderTimer = null;
    this._moveSpeed = 5;
    this._mouseIgnored = false;
  }

  init(skipTransition) {
    this._bindEvents();
    this.enter(skipTransition);
  }

  // === 永久事件绑定 ===
  _bindEvents() {
    const area = document.getElementById('pet-character-area');
    if (!area) return;

    // ★ 鼠标透明穿透判定：光标位于桌宠角色、气泡或功能按钮上时正常接收事件；位于透明背景时直接穿透给底层桌面
    window.addEventListener('mousemove', (e) => {
      if (document.body.classList.contains('web-mode-active')) {
        if (this._mouseIgnored) {
          window.electronAPI?.setIgnoreMouseEvents?.(false);
          this._mouseIgnored = false;
        }
        return;
      }
      if (this._dragging) {
        if (this._mouseIgnored) {
          window.electronAPI?.setIgnoreMouseEvents?.(false);
          this._mouseIgnored = false;
        }
        return;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const isInteractive = target && (
        target.closest('#pet-character-area') ||
        target.closest('#pet-bubble-container') ||
        target.closest('#pet-controls') ||
        target.closest('#pet-action-menu') ||
        target.closest('.pet-control-btn') ||
        target.closest('.pet-action-item') ||
        target.closest('#btn-switch-web') ||
        target.closest('#btn-toggle-wander') ||
        target.closest('#btn-toggle-work') ||
        target.closest('#btn-toggle-sleep') ||
        target.closest('#btn-pet-actions') ||
        target.closest('.pet-bubble')
      );

      if (isInteractive) {
        if (this._mouseIgnored) {
          window.electronAPI?.setIgnoreMouseEvents?.(false);
          this._mouseIgnored = false;
        }
      } else {
        if (!this._mouseIgnored) {
          window.electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
          this._mouseIgnored = true;
        }
      }
    });

    // ★ 拖拽 = 拖动整个桌宠窗口（桌面宠物应该跟随鼠标在整个桌面移动）
    area.addEventListener('mousedown', async (e) => {
      if (document.body.classList.contains('web-mode-active')) return;
      if (e.button !== 0) return; // 仅左键拖动，右键留给百宝箱菜单
      e.preventDefault();
      this._dragging = true; this._moved = false;
      if (this._mouseIgnored) {
        window.electronAPI?.setIgnoreMouseEvents?.(false);
        this._mouseIgnored = false;
      }
      this._dragStart = { sx: e.screenX, sy: e.screenY, wx: 0, wy: 0 };
      try {
        const b = await window.electronAPI?.getWindowBounds?.();
        if (b) { this._dragStart.wx = b.x; this._dragStart.wy = b.y; }
      } catch (err) { /* 忽略 */ }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this._dragging) return;
      // 用屏幕坐标计算位移，避免窗口移动后 clientX 反馈抖动
      const dx = e.screenX - this._dragStart.sx, dy = e.screenY - this._dragStart.sy;
      if (!this._moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      this._moved = true;
      window.electronAPI?.setWindowPosition?.(this._dragStart.wx + dx, this._dragStart.wy + dy);
      if (dx < -2) this._setMoveAnim(-1, 0);
      else if (dx > 2) this._setMoveAnim(1, 0);
      this._lastInteraction = Date.now();
    });

    document.addEventListener('mouseup', () => {
      if (this._dragging && this._moved) this._endMove();
      this._dragging = false;
    });

    document.getElementById('btn-back-pet')?.addEventListener('click', () => this.enter(false, true));
    document.getElementById('btn-switch-web')?.addEventListener('click', () => this.exit(true));
    document.getElementById('btn-toggle-wander')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleWander(); });
    document.getElementById('btn-toggle-work')?.addEventListener('click', (e) => { e.stopPropagation(); this._spriteCall('toggleWork'); });
    document.getElementById('btn-toggle-sleep')?.addEventListener('click', (e) => { e.stopPropagation(); this._spriteCall('toggleSleep'); });
    document.getElementById('btn-pet-actions')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleActionMenu(); });

    // 右键桌宠呼出姿态百宝箱
    area.addEventListener('contextmenu', (e) => {
      if (document.body.classList.contains('web-mode-active')) return;
      e.preventDefault();
      e.stopPropagation();
      this._toggleActionMenu(true);
    });

    // 动作百宝箱点击项分发
    document.getElementById('pet-action-menu')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = e.target.closest('.pet-action-item');
      if (!item) return;
      const action = item.dataset.action;
      if (action === 'wander') {
        this._toggleWander();
      } else {
        this._spriteCall(action);
      }
      this._toggleActionMenu(false);
    });

    // 点击外部关闭动作百宝箱
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#pet-action-menu') && !e.target.closest('#btn-pet-actions')) {
        this._toggleActionMenu(false);
      }
    });

    // ★ 键盘快捷键：
    // - 方向键 / WASD 四向移动
    // - 空格：跳跃
    // - E：工作切换
    // - Z：睡觉切换
    // - T：自动漫步
    // - 1~8：各种姿态切换
    const MOVE_KEYS = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down'
    };
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this._actionMenuOpen) { this._toggleActionMenu(false); return; }
        if (document.body.classList.contains('web-mode-active')) { this.enter(); return; }
      }
      if (document.body.classList.contains('web-mode-active')) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;

      const dir = MOVE_KEYS[e.key] || MOVE_KEYS[e.key?.toLowerCase?.()];
      if (dir) { this._keys[dir] = true; e.preventDefault(); this._lastInteraction = Date.now(); return; }
      if (e.key === ' ') { e.preventDefault(); this._spriteCall('jump'); }
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); this._spriteCall('toggleWork'); }
      else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); this._spriteCall('toggleSleep'); }
      else if (e.key === 't' || e.key === 'T') { e.preventDefault(); this._toggleWander(); }
      else if (e.key === '1') { this._spriteCall('idle'); }
      else if (e.key === '2') { this._spriteCall('wave'); }
      else if (e.key === '3') { this._spriteCall('jump'); }
      else if (e.key === '4') { this._toggleWander(); }
      else if (e.key === '5') { this._spriteCall('wait'); }
      else if (e.key === '6') { this._spriteCall('work'); }
      else if (e.key === '7') { this._spriteCall('review'); }
      else if (e.key === '8') { this._spriteCall('sleep'); }
    });
    document.addEventListener('keyup', (e) => {
      const dir = MOVE_KEYS[e.key] || MOVE_KEYS[e.key?.toLowerCase?.()];
      if (dir) this._keys[dir] = false;
    });
    window.addEventListener('blur', () => { this._keys = { left: false, right: false, up: false, down: false }; });
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
        this._startMovementLoop();
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
      this._startMovementLoop();
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
    this._stopMovementLoop();
    this._stopWander();
    const wanderBtn = document.getElementById('btn-toggle-wander');
    if (wanderBtn) wanderBtn.classList.remove('active');

    try {
      this.app.hideSettings?.();
      this.app.hideCharacterSelector?.();
      this._stopIdleTimer();
      this._clearBubbles();

      // 退出桌宠模式时，确保全局恢复鼠标交互（全窗口响应）
      if (this._mouseIgnored) {
        window.electronAPI?.setIgnoreMouseEvents?.(false);
        this._mouseIgnored = false;
      }

      document.body.classList.add('web-mode-active');

      setTimeout(() => {
        this._cleanupLive2D();
        this._cleanupVRM();
        this._cleanupSprite();
        this._renderMode = null;
        const gif = document.getElementById('pet-gif');
        if (gif) { gif.src = ''; gif.style.display = 'none'; }
        const canvas = document.getElementById('pet-canvas');
        if (canvas) canvas.style.display = '';
        // ★ 切回网页模式时刷新聊天页角色显示（精灵表/模型/GIF），不要只显示封面
        window.live2dManager?.switchToWebMode?.();
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
      } else if (this._renderMode === 'sprite' && window.spriteAtlasManager) {
        // 精灵表：16 向视线由引擎内部 document mousemove 处理，此处无需重复
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

  // === ★ 移动系统：精灵帧桌宠的跑/跳/四向移动 ===
  /** 主循环：每帧根据按键/自动漫步计算位移并移动窗口（整像素平滑节流） */
  _startMovementLoop() {
    if (this._moveRaf) return;
    let accX = 0, accY = 0;
    let lastSendTime = 0;

    const step = (timestamp) => {
      this._moveRaf = requestAnimationFrame(step);
      if (document.body.classList.contains('web-mode-active')) return;
      const k = this._keys;
      let dx = 0, dy = 0;
      if (k.left) dx -= 1;
      if (k.right) dx += 1;
      if (k.up) dy -= 1;
      if (k.down) dy += 1;
      // 无键盘输入时走自动漫步
      if (!dx && !dy && this._wanderActive && this._wanderDir) {
        dx = this._wanderDir * (this._wanderSpeed / this._moveSpeed);
      }
      if (dx || dy) {
        this._setMoveAnim(dx, dy);
        this._moving = true;
        accX += dx * this._moveSpeed;
        accY += dy * this._moveSpeed;

        // 积累达到至少 1 像素且距离上次发送至少 16ms 时提交 IPC，有效避免高刷屏幕下每秒上百次 IPC 系统调用
        if ((Math.abs(accX) >= 1 || Math.abs(accY) >= 1) && (timestamp - lastSendTime >= 16)) {
          const moveX = Math.round(accX);
          const moveY = Math.round(accY);
          accX -= moveX;
          accY -= moveY;
          lastSendTime = timestamp;
          window.electronAPI?.moveWindowBy?.(moveX, moveY);
        }
      } else if (this._moving) {
        if (Math.abs(accX) >= 0.5 || Math.abs(accY) >= 0.5) {
          window.electronAPI?.moveWindowBy?.(Math.round(accX), Math.round(accY));
          accX = 0;
          accY = 0;
        }
        this._endMove();
      }
    };
    this._moveRaf = requestAnimationFrame(step);
  }

  _stopMovementLoop() {
    if (this._moveRaf) { cancelAnimationFrame(this._moveRaf); this._moveRaf = null; }
    this._moving = false;
    this._keys = { left: false, right: false, up: false, down: false };
  }

  /** 移动时切换对应方向的跑步动画；方向键上下移动也复用跑步姿态 */
  _setMoveAnim(dx, dy) {
    const m = window.spriteAtlasManager;
    if (this._renderMode !== 'sprite' || !m || !m.ready) return;
    const cur = m.S.anim;
    const movable = ['idle', 'sleep', 'look-row-9', 'look-row-10', 'running-left', 'running-right', 'running'];
    if (!movable.includes(cur)) return; // 不打断挥手/跳跃等一次性动作
    if (dx < 0) { m.setAnim('running-left'); this._facing = 'left'; }
    else if (dx > 0) { m.setAnim('running-right'); this._facing = 'right'; }
    else if (dy !== 0) { m.setAnim(this._facing === 'left' ? 'running-left' : 'running-right'); }
  }

  /** 移动结束：回到待机（若处于工作状态则恢复工作姿态） */
  _endMove() {
    this._moving = false;
    const m = window.spriteAtlasManager;
    if (this._renderMode === 'sprite' && m && m.ready) {
      if (m.S.work) {
        m.work();
      } else {
        m.goIdle();
      }
    }
    this._updateControlButtons();
  }

  /** 调用精灵引擎动作（跳跃/工作/睡觉/挥手/验收/受阻/等待等全套动作） */
  _spriteCall(action) {
    const m = window.spriteAtlasManager;
    if (!m || !m.ready) return;
    if (action === 'jump') {
      m.jump();
      this._showBubble('嘿呀！轻巧一跃~ ⚡');
    } else if (action === 'toggleWork' || action === 'work') {
      const isWork = (action === 'work') ? (m.work(), true) : m.toggleWork();
      this._showBubble(isWork ? '进入专注工作模式啦，主人也要加油哦！💼' : '工作暂停，伸个懒腰休息下~ 🌸');
    } else if (action === 'toggleSleep' || action === 'sleep') {
      const isSleep = (action === 'sleep') ? (m.sleep(), true) : m.toggleSleep();
      this._showBubble(isSleep ? '抱紧暖暖的狐狸尾巴，呼噜噜入睡咯……🌙' : '揉揉眼睛，主人我醒来啦！☀️');
    } else if (action === 'wave') {
      m.wave();
      this._showBubble('主人好呀！若曦随时都在呢~ 👋');
    } else if (action === 'review') {
      m.review();
      this._showBubble('成果已经准备好啦，主人请检阅！📜');
    } else if (action === 'fail') {
      m.fail();
      this._showBubble('呜……受阻了，容若曦抱头缓一缓。😿');
    } else if (action === 'wait') {
      m.wait();
      this._showBubble('歪头等待主人的新指令中……💭');
    } else if (action === 'idle') {
      m.goIdle();
      this._showBubble('乖乖待命呼吸中~ 🌸');
    }
    this._lastInteraction = Date.now();
    this._updateControlButtons();
  }

  /** 切换动作百宝箱显示 */
  _toggleActionMenu(show) {
    const menu = document.getElementById('pet-action-menu');
    if (!menu) return;
    const next = (typeof show === 'boolean') ? show : !this._actionMenuOpen;
    this._actionMenuOpen = next;
    menu.classList.toggle('show', next);
  }

  /** 更新控制栏按钮激活状态（非精灵角色时自动精简工具栏） */
  _updateControlButtons() {
    const char = window.characterManager?.getCurrentCharacter();
    const isSprite = char && window.spriteAtlasManager && SpriteAtlasManager.isSpriteCharacter(char);
    const m = window.spriteAtlasManager;
    const btnWork = document.getElementById('btn-toggle-work');
    const btnSleep = document.getElementById('btn-toggle-sleep');
    const btnWander = document.getElementById('btn-toggle-wander');
    const btnActions = document.getElementById('btn-pet-actions');

    if (btnWork) {
      btnWork.style.display = isSprite ? '' : 'none';
      btnWork.classList.toggle('active', !!(isSprite && m && m.ready && m.S.work));
    }
    if (btnSleep) {
      btnSleep.style.display = isSprite ? '' : 'none';
      btnSleep.classList.toggle('active', !!(isSprite && m && m.ready && m.S.anim === 'sleep'));
    }
    if (btnActions) {
      btnActions.style.display = isSprite ? '' : 'none';
    }
    if (btnWander) {
      btnWander.classList.toggle('active', !!this._wanderActive);
    }
  }

  /** 自动漫步：随机左右走动（新功能） */
  _toggleWander(on) {
    const next = (typeof on === 'boolean') ? on : !this._wanderActive;
    if (next) this._startWander(); else this._stopWander();
    this._updateControlButtons();
    this._showBubble(this._wanderActive ? '好耶，我可以在桌面上溜达啦~' : '那我乖乖待着。');
  }

  _startWander() {
    if (this._wanderActive) return;
    this._wanderActive = true;
    const tick = () => {
      if (!this._wanderActive) return;
      this._wanderDir = Math.random() > 0.5 ? 1 : -1;
      this._wanderSpeed = 0.9 + Math.random() * 0.9;
      this._wanderTimer = setTimeout(() => {
        if (!this._wanderActive) return;
        this._wanderDir = 0;
        this._endMove();
        this._wanderTimer = setTimeout(tick, 1500 + Math.random() * 3500);
      }, 1200 + Math.random() * 2500);
    };
    tick();
  }

  _stopWander() {
    this._wanderActive = false;
    this._wanderDir = 0;
    if (this._wanderTimer) { clearTimeout(this._wanderTimer); this._wanderTimer = null; }
  }

  // === 角色加载（自动降级：Live2D > VRM > GIF，使用缓存检查）
  // ★ 优化：先检查模型文件是否存在，再加载 CDN 脚本，避免无谓的 CDN 加载
  async _loadCharacter() {
    // 清理之前的 fallback
    const oldFallback = document.querySelector('.pet-fallback-img');
    if (oldFallback) oldFallback.remove();

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

    // ★ 立即显示静态封面，让用户立刻看到角色（模型/GIF 加载完成后会自动替换）
    this._showPetFallback();

    let loaded = false;

    // ★ 精灵表角色（若曦）：ChatGPT Pets v2 精灵表 + 状态机 + 16 向视线
    if (!loaded && window.spriteAtlasManager && SpriteAtlasManager.isSpriteCharacter(char)) {
      try {
        this._cleanupLive2D();
        this._cleanupVRM();
        const ok = await window.spriteAtlasManager.loadFor(char, canvas);
        if (ok) {
          canvas.style.display = '';
          if (gif) gif.style.display = 'none';
          loaded = true; this._renderMode = 'sprite';
          const fb = document.querySelector('.pet-fallback-img');
          if (fb) fb.remove();
        }
      } catch (e) { loaded = false; }
    }

    // ★ 先检查 Live2D 模型文件是否存在，再决定是否加载 PIXI CDN
    if (char.live2d?.modelPath) {
      const exists = await window.characterManager.checkModelFileExists(char.live2d.modelPath);
      if (exists) {
        // 只有模型存在才加载 PIXI CDN
        try {
          await window.live2dManager.loadScripts();
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
          // ★ 移除静态占位
          const fb = document.querySelector('.pet-fallback-img');
          if (fb) fb.remove();
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
            // ★ 移除静态占位
            const fb2 = document.querySelector('.pet-fallback-img');
            if (fb2) fb2.remove();
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
    if (ok) {
      gif.style.display = 'block'; gif.style.visibility = 'visible'; gif.style.opacity = '1';
      // ★ GIF 加载成功，移除静态占位
      const fb = document.querySelector('.pet-fallback-img');
      if (fb) fb.remove();
    }
  }

  /** GIF 加载失败时显示静态封面 */
  _showPetFallback() {
    const area = document.getElementById('pet-character-area');
    if (!area) return;
    const coverPath = window.characterManager?.getCoverPath?.();
    if (!coverPath) return;
    // 移除旧 fallback
    const old = area.querySelector('.pet-fallback-img');
    if (old) old.remove();
    const img = document.createElement('img');
    img.className = 'pet-fallback-img';
    img.src = coverPath;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;position:absolute;top:0;left:0;pointer-events:none;';
    const canvas = document.getElementById('pet-canvas');
    if (canvas) canvas.style.display = 'none';
    const gif = document.getElementById('pet-gif');
    if (gif) gif.style.display = 'none';
    area.appendChild(img);
  }

  // === 点击交互 ===
  _bindClickEvents() {
    const area = document.getElementById('pet-character-area');
    const canvas = document.getElementById('pet-canvas');
    const gif = document.getElementById('pet-gif');

    // ★ 幂等绑定：先移除上一次的监听器，避免多次进出桌宠模式后点击重复触发
    if (this._clickHandler) {
      area?.removeEventListener('mousedown', this._clickHandler);
      canvas?.removeEventListener('mousedown', this._clickHandler);
      gif?.removeEventListener('mousedown', this._clickHandler);
    }

    const handler = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('#pet-controls') || e.target.closest('#pet-action-menu')) return;
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
        if (this._renderMode === 'sprite' && window.spriteAtlasManager) {
          window.spriteAtlasManager.jump();
          this._lastInteraction = Date.now();
        } else {
          this.exit(true); // ★ 强制退出，避免transition锁卡住
        }
      } else {
        this._clickTimer = setTimeout(() => {
          if (this._clickCount === 1 && !this._moved) {
            this._showBubble(window.characterManager.getRandomLine('click'));
            this._playTap();
            this._lastInteraction = Date.now();
          }
          this._clickCount = 0;
        }, 300);
      }
    };

    this._clickHandler = handler;
    // 绑定至 area 容器，确保无论是 精灵表 / Live2D / VRM / GIF 还是静态降级封面，均可正常点击与双击
    if (area) area.addEventListener('mousedown', handler);
  }

  _playTap() {
    // ★ 触发角色原生CV随机语音（如蕾姆26段原生语音包）
    window.characterManager?.playRandomVoice();

    if (this._renderMode === 'vrm' && window.vrmManager) {
      window.vrmManager.playAnimation('tap');
    } else if (this._renderMode === 'sprite' && window.spriteAtlasManager) {
      window.spriteAtlasManager.wave();
    } else if (this._model) {
      // ★ 兼容不同 Live2D 模型的动作分组命名（高木/加藤惠/蕾姆/惠惠/初音）
      const candidates = ['TapBody', 'tap_body', 'tap_head', 'Poke', 'Tease', '', 'null', 'idle', 'Idle'];
      if (typeof this._model.motion === 'function') {
        for (const anim of candidates) {
          try {
            const played = this._model.motion(anim);
            if (played !== false) break;
          } catch (e) {}
        }
      }
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
        if (this._renderMode !== 'sprite') this._lastInteraction = Date.now();
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

  _cleanupSprite() {
    if (window.spriteAtlasManager && this._renderMode === 'sprite') {
      window.spriteAtlasManager.destroy();
    }
  }

  _cleanupVRM() {
    if (this._renderMode === 'vrm' && window.vrmManager) {
      window.vrmManager.destroy();
    }
  }
}
