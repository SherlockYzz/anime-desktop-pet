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
    this._spriteAtlas = null;
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
    // ★ 严守纪律：每次重新登录/打开程序时，必须强制恢复为默认窗口大小（1.0，即 400x600）
    try { localStorage.removeItem('pet-scale'); } catch (e) {}
    this._petScale = 1.0;
    this._scaleMenuOpen = false;
  }

  init(skipTransition) {
    try { localStorage.removeItem('pet-scale'); } catch (e) {}
    this._petScale = 1.0;
    this._bindEvents();
    this.setPetScale(1.0);
    this.enter(skipTransition);
  }

  // === 永久事件绑定 ===
  _bindEvents() {
    const area = document.getElementById('pet-character-area');
    if (!area) return;

    // ★ 确保桌宠模式永远不穿透，保持 100% 鼠标交互捕获
    window.electronAPI?.setIgnoreMouseEvents?.(false);
    this._mouseIgnored = false;

    // ★ 统一的鼠标按下/拖拽/点击状态机（彻底解耦拖拽与触碰交互）
    let isDown = false;
    let isDragging = false;
    let startScreen = { x: 0, y: 0 };
    let startWindow = { x: 0, y: 0 };
    let downPart = 'body';

    area.addEventListener('mousedown', async (e) => {
      if (document.body.classList.contains('web-mode-active')) return;
      if (e.button !== 0) return; // 仅左键拖拽与点击，右键保留给动作百宝箱
      isDown = true;
      isDragging = false;
      this._dragging = false;
      this._moved = false;

      const rect = area.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      downPart = (clickY < rect.height * 0.38) ? 'head' : 'body';

      startScreen = { x: e.screenX, y: e.screenY };
      try {
        const b = await window.electronAPI?.getWindowBounds?.();
        if (b) { startWindow = { x: b.x, y: b.y }; }
      } catch (err) {}
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const dx = e.screenX - startScreen.x;
      const dy = e.screenY - startScreen.y;
      const dist = Math.hypot(dx, dy);

      // 位移超过 8 像素，判定为真正的主动拖拽
      if (!isDragging && dist >= 8) {
        isDragging = true;
        this._dragging = true;
        this._moved = true;
        if (this._clickTimer) {
          clearTimeout(this._clickTimer);
          this._clickTimer = null;
        }
        this._clickCount = 0;
      }

      if (isDragging) {
        window.electronAPI?.setWindowPosition?.(startWindow.x + dx, startWindow.y + dy);
        if (dx < -2) this._setMoveAnim(-1, 0);
        else if (dx > 2) this._setMoveAnim(1, 0);
        this._lastInteraction = Date.now();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (!isDown) return;
      const wasDragging = isDragging;
      isDown = false;
      isDragging = false;
      this._dragging = false;

      if (wasDragging) {
        this._endMove();
        return;
      }

      // 未拖动：100% 立即触发点击事件（零延迟响应 + 多语音不重复循环 + 快速连点暴走）
      if (e.target.closest('#pet-controls') || e.target.closest('#pet-action-menu') || e.target.closest('#pet-scale-menu') || e.target.closest('#pet-shortcuts-menu') || e.target.closest('.pet-bubble')) return;

      this._clickCount = (this._clickCount || 0) + 1;
      if (this._clickTimer) clearTimeout(this._clickTimer);

      if (this._clickCount >= 4) {
        // 快速连点 4 下及以上：触发暴走抗议反馈并重置连击计数
        const cnt = this._clickCount;
        this._clickCount = 0;
        this._playTap('rage', cnt);
      } else {
        // 正常点击（摸头或戳身）：立即从触碰语音池中不重复抽取下一段语音与对应字幕
        this._playTap(downPart, this._clickCount);
        this._clickTimer = setTimeout(() => {
          this._clickCount = 0;
        }, 650);
      }
      this._lastInteraction = Date.now();
    });

    document.getElementById('btn-back-pet')?.addEventListener('click', () => this.enter(false, true));
    document.getElementById('btn-switch-web')?.addEventListener('click', () => this.exit(true));
    document.getElementById('btn-toggle-wander')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleWander(); });
    document.getElementById('btn-toggle-work')?.addEventListener('click', (e) => { e.stopPropagation(); this._spriteCall('toggleWork'); });
    document.getElementById('btn-toggle-sleep')?.addEventListener('click', (e) => { e.stopPropagation(); this._spriteCall('toggleSleep'); });
    document.getElementById('btn-pet-actions')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleActionMenu(); });
    document.getElementById('btn-pet-scale')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleScaleMenu(); });
    document.getElementById('btn-close-scale')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleScaleMenu(false); });
    document.getElementById('btn-pet-shortcuts')?.addEventListener('click', (e) => {
      e.stopPropagation();
      window.shortcutManager?.toggleMenu?.();
    });
    document.getElementById('pet-scale-slider')?.addEventListener('input', (e) => {
      this.setPetScale(parseFloat(e.target.value));
    });
    document.getElementById('pet-scale-menu')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const preset = e.target.closest('.scale-preset-btn');
      if (preset && preset.dataset.scale) {
        this.setPetScale(parseFloat(preset.dataset.scale));
      }
    });
    document.getElementById('btn-pet-action-scale')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleActionMenu(false);
      this._toggleScaleMenu(true);
    });
    document.getElementById('btn-toggle-hd')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      this._toggleActionMenu(false);
      const isHd = await window.spriteAtlasManager?.toggleHdMode?.();
      this._showBubble(isHd ? '若曦已切换到超清 2X 模态 ✨' : '若曦已切换到标准 1X 模态 🌸');
    });

    // 右键桌宠呼出姿态百宝箱
    area.addEventListener('contextmenu', (e) => {
      if (document.body.classList.contains('web-mode-active')) return;
      e.preventDefault();
      e.stopPropagation();
      this._toggleActionMenu(true);
    });

    // 动作百宝箱点击项兜底分发（仅在未挂载 actionMenuManager 时生效，避免与 renderMenu 的 onclick 重复触发导致自由漫步被瞬间二次反转关闭）
    document.getElementById('pet-action-menu')?.addEventListener('click', (e) => {
      if (window.actionMenuManager) return;
      e.stopPropagation();
      const item = e.target.closest('.pet-action-item');
      if (!item) return;
      const action = item.dataset.action;
      if (!action) return;
      if (action === 'wander') {
        this._toggleWander();
      } else {
        this._spriteCall(action);
      }
      this._toggleActionMenu(false);
    });

    // 点击外部关闭动作百宝箱、大小滑动窗口与快捷键面板
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#pet-action-menu') && !e.target.closest('#btn-pet-actions')) {
        this._toggleActionMenu(false);
      }
      if (!e.target.closest('#pet-scale-menu') && !e.target.closest('#btn-pet-scale') && !e.target.closest('#btn-pet-action-scale')) {
        this._toggleScaleMenu(false);
      }
      if (!e.target.closest('#pet-shortcuts-menu') && 
          !e.target.closest('#btn-pet-shortcuts') && 
          !e.target.closest('.btn-open-shortcuts-from-menu') &&
          !e.target.closest('#btn-shortcuts-titlebar') &&
          !e.target.closest('#btn-open-shortcuts-settings')) {
        window.shortcutManager?.toggleMenu?.(false);
      }
    });

    // ★ 托盘菜单模式切换直达响应
    window.electronAPI?.onToggleModeRequest?.(() => {
      if (document.body.classList.contains('web-mode-active')) {
        this.enter(false, true);
      } else {
        this.exit(true);
      }
    });

    // ★ 键盘快捷键系统（深度集成 ShortcutManager，支持一键解除/防打字模式/全键自定义）：
    const MOVE_KEYS = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down'
    };
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('pet-memory-diary-modal')) { window.emotionMemory?.closeMemoryDiary?.(); return; }
        if (window.shortcutManager?._menuOpen) { window.shortcutManager.toggleMenu(false); return; }
        if (this._scaleMenuOpen) { this._toggleScaleMenu(false); return; }
        if (this._actionMenuOpen) { this._toggleActionMenu(false); return; }
        if (!document.body.classList.contains('web-mode-active')) {
          this.exit(true);
          return;
        } else {
          this.enter();
          return;
        }
      }
      if (e.key === 'F2') {
        if (!document.body.classList.contains('web-mode-active')) {
          this.exit(true);
        } else {
          this.enter();
        }
        return;
      }
      if (document.body.classList.contains('web-mode-active')) return;
      if (document.getElementById('pet-memory-diary-modal')) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;

      // ★ 正在录制新自定义按键时，不触发桌宠动作
      if (window.shortcutManager?.isRecording) return;

      // ★ 核心功能：解除快捷键！如果用户已解除/停用快捷键，100% 阻断所有键盘响应，自由打字不冲突
      if (window.shortcutManager && !window.shortcutManager.isEnabled()) return;

      // 1. 移动键匹配（支持自定义快捷键与防打字模式过滤）
      const moveDir = window.shortcutManager 
        ? window.shortcutManager.getMovementDirection(e.key) 
        : (MOVE_KEYS[e.key] || MOVE_KEYS[e.key?.toLowerCase?.()]);

      if (moveDir) {
        this._keys[moveDir] = true;
        e.preventDefault();
        this._lastInteraction = Date.now();
        return;
      }

      // 2. 交互动作与姿态直达（支持自定义快捷键）
      const act = window.shortcutManager ? window.shortcutManager.getAction(e.key) : null;
      if (act) {
        e.preventDefault();
        this._lastInteraction = Date.now();
        this._handleShortcutAction(act);
        return;
      }

      // 兜底原生键（若未挂载 shortcutManager）
      if (!window.shortcutManager) {
        if (e.key === ' ') { e.preventDefault(); this._handleShortcutAction('jump'); }
        else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); this._handleShortcutAction('work'); }
        else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); this._handleShortcutAction('sleep'); }
        else if (e.key === 't' || e.key === 'T') { e.preventDefault(); this._handleShortcutAction('wander'); }
        else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); this._handleShortcutAction('bubble'); }
        else if (e.key === '1') { this._handleShortcutAction('anim1'); }
        else if (e.key === '2') { this._handleShortcutAction('anim2'); }
        else if (e.key === '3') { this._handleShortcutAction('anim3'); }
        else if (e.key === '4') { this._handleShortcutAction('anim4'); }
        else if (e.key === '5') { this._handleShortcutAction('anim5'); }
        else if (e.key === '6') { this._handleShortcutAction('anim6'); }
        else if (e.key === '7') { this._handleShortcutAction('anim7'); }
        else if (e.key === '8') { this._handleShortcutAction('anim8'); }
      }
    });

    document.addEventListener('keyup', (e) => {
      const dir = window.shortcutManager 
        ? window.shortcutManager.getMovementDirection(e.key) 
        : (MOVE_KEYS[e.key] || MOVE_KEYS[e.key?.toLowerCase?.()]);
      if (dir) this._keys[dir] = false;
    });
    window.addEventListener('blur', () => { this._keys = { left: false, right: false, up: false, down: false }; });
  }

  /** 动作调用入口 */
  triggerAction(act) {
    return this._handleShortcutAction(act);
  }

  _handleActionClick(act) {
    return this._handleShortcutAction(act);
  }

  /** 分发并执行快捷键触发的动作姿态（全面联动动画、气泡与原生CV语音） */
  _handleShortcutAction(act) {
    const char = window.characterManager?.getCurrentCharacter();
    const charId = char?.id || 'ruoxi';
    const menuMgr = window.actionMenuManager;
    const actionsData = menuMgr?.getCharacterActions?.(charId);
    const actionsList = actionsData?.actions || [];

    // 1. 处理数字键姿态直达 (anim1 ~ anim8) -> 直接映射到当前角色百宝箱对应索引动作并播放语音
    const animMatch = act.match(/^anim(\d+)$/);
    if (animMatch) {
      const idx = parseInt(animMatch[1], 10) - 1; // 0 ~ 7
      if (menuMgr && actionsList[idx]) {
        menuMgr.executeAction(charId, actionsList[idx].id, { model: this._model });
        return;
      }
    }

    // 2. 处理核心动作 (jump, work, sleep, wander, bubble)
    switch (act) {
      case 'jump': {
        const found = actionsList.find(a => a.id === 'jump' || a.id.includes('jump') || a.id.includes('bound') || a.id.includes('happy'));
        if (found && menuMgr) {
          menuMgr.executeAction(charId, found.id, { model: this._model });
        } else if (this._renderMode === 'sprite') {
          this._spriteCall('jump');
        } else {
          this._showBubble('嘿呀！轻巧一跃~ ⚡');
          window.characterManager?.playRandomVoice?.(charId);
        }
        break;
      }
      case 'work': {
        const found = actionsList.find(a => a.id === 'work' || a.id.includes('work') || a.id.includes('fist') || a.id.includes('read'));
        if (found && menuMgr && this._renderMode !== 'sprite') {
          menuMgr.executeAction(charId, found.id, { model: this._model });
        } else {
          this._spriteCall('toggleWork');
          if (this._renderMode !== 'sprite') {
            this._showBubble('进入专注工作状态啦！💼');
            window.characterManager?.playRandomVoice?.(charId);
          }
        }
        break;
      }
      case 'sleep': {
        const found = actionsList.find(a => a.id === 'sleep' || a.id.includes('sleep') || a.id.includes('tired'));
        if (found && menuMgr && this._renderMode !== 'sprite') {
          menuMgr.executeAction(charId, found.id, { model: this._model });
        } else {
          this._spriteCall('toggleSleep');
          if (this._renderMode !== 'sprite') {
            this._showBubble('呼噜噜……进入休息睡眠状态啦🌙');
            window.characterManager?.playRandomVoice?.(charId);
          }
        }
        break;
      }
      case 'wander': {
        this._toggleWander();
        break;
      }
      case 'bubble': {
        const on = this._toggleBubble();
        if (on) {
          this._showBubble('气泡台词已开启 💬');
          window.characterManager?.playRandomVoice?.(charId);
        }
        break;
      }
      default: {
        if (menuMgr && actionsList.find(a => a.id === act)) {
          menuMgr.executeAction(charId, act, { model: this._model });
        } else if (this._renderMode === 'sprite') {
          this._spriteCall(act);
        } else {
          window.characterManager?.playRandomVoice?.(charId);
        }
        break;
      }
    }
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
      window.electronAPI?.setIgnoreMouseEvents?.(false);
      this._mouseIgnored = false;
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

      const doCleanup = () => {
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
      };

      if (force) {
        doCleanup();
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
        doCleanup();
      }
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

    this._targetTrackX = 0;
    this._targetTrackY = 0;
    this._smoothTrackX = 0;
    this._smoothTrackY = 0;
    this._lastPetMouseMove = Date.now();

    this._mouseTrackHandler = (e) => {
      if (!this._mouseTrackEnabled) return;
      this._lastPetMouseMove = Date.now();
      const r = area.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      this._targetTrackX = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2)));
      this._targetTrackY = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height / 2)));
    };

    this._mouseLeaveHandler = () => {
      this._targetTrackX = 0;
      this._targetTrackY = 0;
    };

    // ★ 视线与头部阻尼插值循环（Lerp）：平滑过渡与出界柔和回正
    const tickTrack = () => {
      if (!this._mouseTrackHandler) return;

      // 超过 3.5 秒无鼠标移动，视线缓缓自动回归正中
      if (Date.now() - this._lastPetMouseMove > 3500) {
        this._targetTrackX = 0;
        this._targetTrackY = 0;
      }

      const lerp = 0.18;
      this._smoothTrackX += (this._targetTrackX - this._smoothTrackX) * lerp;
      this._smoothTrackY += (this._targetTrackY - this._smoothTrackY) * lerp;

      const dx = this._smoothTrackX;
      const dy = this._smoothTrackY;

      if (this._renderMode === 'vrm' && window.vrmManager?.vrm) {
        // VRM：平滑转动头部骨骼
        const head = window.vrmManager.vrm.humanoid?.getNormalizedBoneNode('head');
        if (head) {
          head.rotation.y = dx * 0.3;
          head.rotation.x = dy * 0.15;
        }
      } else if (this._renderMode === 'live2d' && this._model) {
        // Live2D：全版本双轨平滑视线与头部跟踪
        try {
          if (this._model.internalModel?.focusController) {
            this._model.internalModel.focusController.focus(dx, -dy);
          }
          const cm = this._model.internalModel?.coreModel;
          if (cm) {
            // Cubism 2 (加藤惠, 蕾姆, 初音未来)
            if (typeof cm.setParamFloat === 'function') {
              cm.setParamFloat('PARAM_EYE_BALL_X', dx * 0.85);
              cm.setParamFloat('PARAM_EYE_BALL_Y', -dy * 0.85);
              cm.setParamFloat('PARAM_ANGLE_X', dx * 18);
              cm.setParamFloat('PARAM_ANGLE_Y', -dy * 15);
            }
            // Cubism 4 / 5 (惠惠, 高木同学)
            if (typeof cm.setParameterValueById === 'function' && typeof cm.getParameterIndex === 'function') {
              const eyeX = cm.getParameterIndex('ParamEyeBallX') >= 0 ? 'ParamEyeBallX' : 'PARAM_EYE_BALL_X';
              const eyeY = cm.getParameterIndex('ParamEyeBallY') >= 0 ? 'ParamEyeBallY' : 'PARAM_EYE_BALL_Y';
              const angX = cm.getParameterIndex('ParamAngleX') >= 0 ? 'ParamAngleX' : 'PARAM_ANGLE_X';
              const angY = cm.getParameterIndex('ParamAngleY') >= 0 ? 'ParamAngleY' : 'PARAM_ANGLE_Y';
              cm.setParameterValueById(eyeX, dx * 0.85);
              cm.setParameterValueById(eyeY, -dy * 0.85);
              cm.setParameterValueById(angX, dx * 18);
              cm.setParameterValueById(angY, -dy * 15);
            }
          }
        } catch (e) {}
      }

      this._mouseTrackRaf = requestAnimationFrame(tickTrack);
    };

    document.addEventListener('mousemove', this._mouseTrackHandler);
    document.addEventListener('mouseleave', this._mouseLeaveHandler);
    this._mouseTrackRaf = requestAnimationFrame(tickTrack);
  }

  _stopMouseTracking() {
    if (this._mouseTrackHandler) {
      document.removeEventListener('mousemove', this._mouseTrackHandler);
      this._mouseTrackHandler = null;
    }
    if (this._mouseLeaveHandler) {
      document.removeEventListener('mouseleave', this._mouseLeaveHandler);
      this._mouseLeaveHandler = null;
    }
    if (this._mouseTrackRaf) {
      cancelAnimationFrame(this._mouseTrackRaf);
      this._mouseTrackRaf = null;
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

      // ★ 当打开百宝箱菜单、缩放菜单、快捷键面板、手账弹窗或正在鼠标拖拽时，立即暂停自动漫步位移，防止按钮从鼠标下滑走
      const menuBlocking = this._actionMenuOpen || this._scaleMenuOpen || this._dragging ||
        window.shortcutManager?._menuOpen || !!document.getElementById('pet-memory-diary-modal');
      if (menuBlocking) {
        accX = 0;
        accY = 0;
        if (this._moving && !this._dragging) {
          this._endMove();
        }
        return;
      }

      const k = this._keys;
      let dx = 0, dy = 0;
      if (k.left) dx -= 1;
      if (k.right) dx += 1;
      if (k.up) dy -= 1;
      if (k.down) dy += 1;
      // 无键盘输入时走自动漫步（带屏幕左右边界智能转身反弹）
      if (!dx && !dy && this._wanderActive && this._wanderDir) {
        const scrX = typeof window.screenX === 'number' ? window.screenX : 0;
        const scrW = window.screen?.availWidth || 1920;
        const winW = window.outerWidth || Math.round(400 * (this._petScale || 1));
        if (this._wanderDir > 0 && scrX + winW >= scrW - 20) {
          this._wanderDir = -1;
        } else if (this._wanderDir < 0 && scrX <= 20) {
          this._wanderDir = 1;
        }
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
    const m = this._spriteAtlas || window.spriteAtlasManager;
    if (this._renderMode !== 'sprite' || !m || !m.ready) return;
    const cur = m.S.anim;
    // 除一次性跳跃/挥手动作外，均可顺畅切入奔跑动画
    if (cur === 'jumping' || cur === 'greet-row-7') return;
    if (dx < 0) { m.setAnim('running-left'); this._facing = 'left'; }
    else if (dx > 0) { m.setAnim('running-right'); this._facing = 'right'; }
    else if (dy !== 0) { m.setAnim(this._facing === 'left' ? 'running-left' : 'running-right'); }
  }

  /** 移动结束：回到待机（若处于工作状态则恢复工作姿态） */
  _endMove() {
    this._moving = false;
    const m = this._spriteAtlas || window.spriteAtlasManager;
    if (this._renderMode === 'sprite' && m && m.ready) {
      if (m.S.work) {
        m.work();
      } else if (m.S.sleep) {
        m.sleep();
      } else {
        m.goIdle();
      }
    }
    this._updateControlButtons();
  }

  /** 调用精灵引擎动作（跳跃/工作/睡觉/挥手/验收/受阻/等待等全套动作） */
  _spriteCall(action) {
    // ★ 核心修复：只要用户触发了任何非漫步姿态（如待机呼吸、工作、睡觉、挥手等），立即退出桌面漫步状态！
    if (action !== 'wander' && this._wanderActive) {
      this._stopWander();
    }

    const m = this._spriteAtlas || window.spriteAtlasManager;
    if (!m || !m.ready) return;
    const char = window.characterManager?.getCurrentCharacter();
    const charId = char?.id || 'ruoxi';

    let voiceIdx = '01';
    if (action === 'jump') {
      m.jump();
      voiceIdx = '06';
    } else if (action === 'toggleWork' || action === 'work') {
      const isWork = (action === 'work') ? (m.work(), true) : m.toggleWork();
      voiceIdx = isWork ? '02' : '01';
    } else if (action === 'toggleSleep' || action === 'sleep') {
      const isSleep = (action === 'sleep') ? (m.sleep(), true) : m.toggleSleep();
      voiceIdx = isSleep ? '03' : '05';
    } else if (action === 'wave') {
      m.wave();
      voiceIdx = '05';
    } else if (action === 'review') {
      m.review();
      voiceIdx = '07';
    } else if (action === 'fail') {
      m.fail();
      voiceIdx = '08';
    } else if (action === 'wait') {
      m.wait();
      voiceIdx = '09';
    } else if (action === 'idle') {
      if (m.S) {
        m.S.work = false;
        m.S.sleep = false;
      }
      m.goIdle();
      voiceIdx = '01';
    }

    const exactBubble = window.actionMenuManager?.getVoiceTranscript?.(charId, voiceIdx);
    if (exactBubble) {
      this._showBubble(exactBubble);
    }

    // ★ 触发原生CV语音联动（与气泡台词 100% 严格对应）
    if (window.characterManager?.playVoice) {
      window.characterManager.playVoice(charId, voiceIdx);
    }

    this._lastInteraction = Date.now();
    this._updateControlButtons();
  }

  /** 切换动作百宝箱显示（动态渲染当前角色专属姿态与动作列表） */
  _toggleActionMenu(show) {
    const menu = document.getElementById('pet-action-menu');
    if (!menu) return;
    const next = (typeof show === 'boolean') ? show : !this._actionMenuOpen;
    this._actionMenuOpen = next;
    if (next) this._toggleScaleMenu(false);
    if (next && window.actionMenuManager) {
      const char = window.characterManager?.getCurrentCharacter();
      window.actionMenuManager.renderMenu('pet-action-menu', char?.id, (actionId) => {
        window.actionMenuManager.executeAction(char?.id, actionId, { model: this._model });
        this._toggleActionMenu(false);
      });
    }
    menu.classList.toggle('show', next);
  }

  /** 计算当前屏幕的安全缩放上限，绝不允许窗口超出屏幕工作区导致切换键出屏 */
  _calcMaxSafeScale() {
    const availH = (window.screen?.availHeight || 900);
    // 留出至少 70px 安全边距（顶部 20px，底部 50px 视觉缓冲），确保底部的控制栏和切换键 100% 在屏幕内可见
    const maxSafeH = Math.max(480, availH - 70);
    const scaleByScreen = Math.floor((maxSafeH / 600) * 100) / 100;
    // 封顶在 1.35，且下限不低于 1.0
    return Math.min(1.35, Math.max(1.0, scaleByScreen));
  }

  /** 同步缩放面板 UI 状态（滑动条与预设按钮） */
  _syncScaleUI(s, maxSafe) {
    const slider = document.getElementById('pet-scale-slider');
    const valText = document.getElementById('pet-scale-val');
    if (slider) {
      slider.min = '0.75';
      slider.max = maxSafe.toFixed(2);
      slider.step = '0.05';
      slider.value = s.toString();
    }
    if (valText) {
      valText.textContent = Math.round(s * 100) + '%';
    }

    document.querySelectorAll('.scale-preset-btn').forEach(b => {
      const bScale = parseFloat(b.dataset.scale);
      if (bScale > maxSafe + 0.02) {
        b.style.display = 'none';
      } else {
        b.style.display = '';
        b.classList.toggle('active', Math.abs(bScale - s) < 0.04);
      }
    });
  }

  /** 切换大小滑动窗口显示 */
  _toggleScaleMenu(show) {
    const menu = document.getElementById('pet-scale-menu');
    if (!menu) return;
    const next = (typeof show === 'boolean') ? show : !this._scaleMenuOpen;
    this._scaleMenuOpen = next;
    if (next) {
      this._toggleActionMenu(false);
      this._syncScaleUI(this._petScale, this._calcMaxSafeScale());
    }
    menu.classList.toggle('show', next);
  }

  /** 恢复默认 100% 原始尺寸 */
  resetPetScale() {
    return this.setPetScale(1.0);
  }

  /** 设置桌宠整体显示尺寸（大小滑动窗口核心实现 · 严格等比例 + 屏幕安全保护） */
  setPetScale(scale) {
    const maxSafe = this._calcMaxSafeScale();
    // 严格限制在 [0.75, maxSafe] 范围内，绝不允许越界
    const s = Math.max(0.75, Math.min(maxSafe, parseFloat(scale) || 1.0));
    this._petScale = s;
    document.documentElement.style.setProperty('--pet-scale', s.toString());

    // 同步 UI 状态
    this._syncScaleUI(s, maxSafe);

    // 计算外框与舞台画布的像素尺寸
    const targetW = Math.round(400 * s);
    const targetH = Math.round(600 * s);
    const stageW = Math.round(380 * s);
    const stageH = Math.round(570 * s);

    // 1. 动态调整 Electron 窗口外框尺寸（保持底部居中对齐）
    window.electronAPI?.setWindowBounds?.({ width: targetW, height: targetH });

    // 2. 同步 WebGL 视口与物理画布像素尺寸（由 Pixi/精灵引擎全权管理高分屏 DPR，杜绝硬设 canvas.width 导致显存腰斩）
    if (this._pixiApp && this._pixiApp.renderer) {
      this._pixiApp.renderer.resize(stageW, stageH);
    }
    const canvas = document.getElementById('pet-canvas');
    if (canvas && (!this._pixiApp || !this._pixiApp.renderer)) {
      canvas.style.width = stageW + 'px';
      canvas.style.height = stageH + 'px';
    }
    const spriteCanvas = document.getElementById('pet-sprite-canvas');
    if (spriteCanvas) {
      spriteCanvas.style.width = stageW + 'px';
      spriteCanvas.style.height = stageH + 'px';
    }

    // 3. 对当前活跃模型应用严格等比例缩放（Uniform Scale），杜绝局部衣服/光影撕裂
    if (this._renderMode === 'live2d' && this._model) {
      const im = this._model.internalModel;
      if (!this._model._origDesignWidth) {
        const rawW = (im && im.originalWidth > 0) ? im.originalWidth : (this._model.width > 0 ? this._model.width : 1000);
        const rawH = (im && im.originalHeight > 0) ? im.originalHeight : (this._model.height > 0 ? this._model.height : 1000);
        this._model._origDesignWidth = rawW;
        this._model._origDesignHeight = rawH;
        this._model._baseFitScale = Math.min(380 / rawW, 570 / rawH) * 0.95;
      }

      const baseFit = this._model._baseFitScale || (Math.min(380 / (this._model._origDesignWidth || 1000), 570 / (this._model._origDesignHeight || 1000)) * 0.95);
      const uniformScale = baseFit * s;

      // X 与 Y 轴严格等比例
      this._model.scale.set(uniformScale, uniformScale);
      this._model.anchor.set(0.5, 0.5);
      this._model.position.set(stageW / 2, stageH / 2);

      // 立即刷新 Live2D 投影矩阵与蒙版管理器（Clipping Manager）
      if (im) {
        try {
          if (typeof im.resize === 'function') {
            im.resize(stageW, stageH);
          }
          im.update(0, 0);
        } catch (e) {}
      }
      if (this._model.parent && typeof this._model.updateTransform === 'function') {
        try { this._model.updateTransform(); } catch (e) {}
      }
    } else if (this._renderMode === 'sprite') {
      const m = this._spriteAtlas || window.spriteAtlasManager;
      if (m && m.ready) {
        m.resize();
        m.draw();
      }
    }
  }

  /** 更新控制栏按钮激活状态（桌面保留缩放窗、切回网页与动作百宝箱；漫步激活时额外亮起停止漫步快捷按钮） */
  _updateControlButtons() {
    const btnWork = document.getElementById('btn-toggle-work');
    const btnSleep = document.getElementById('btn-toggle-sleep');
    const btnWander = document.getElementById('btn-toggle-wander');
    const btnScale = document.getElementById('btn-pet-scale');
    const btnActions = document.getElementById('btn-pet-actions');
    const btnSwitchWeb = document.getElementById('btn-switch-web');

    if (btnWork) btnWork.style.display = 'none';
    if (btnSleep) btnSleep.style.display = 'none';
    if (btnWander) {
      if (this._wanderActive) {
        btnWander.classList.add('active');
        btnWander.style.setProperty('display', 'flex', 'important');
        btnWander.title = '正在桌面漫步中 · 点击立即停止漫步恢复正常状态';
      } else {
        btnWander.classList.remove('active');
        btnWander.style.setProperty('display', 'none', 'important');
        btnWander.title = '自动漫步（T / 快捷键 4）';
      }
    }
    if (btnScale) btnScale.style.display = 'flex';
    if (btnActions) btnActions.style.display = 'flex';
    if (btnSwitchWeb) btnSwitchWeb.style.display = 'flex';
  }

  /** 自动漫步：随机左右走动（新功能） */
  _toggleWander(on) {
    const next = (typeof on === 'boolean') ? on : !this._wanderActive;
    if (next) this._startWander(); else this._stopWander();
    this._updateControlButtons();
    const char = window.characterManager?.getCurrentCharacter();
    const charId = char?.id || 'ruoxi';
    if (window.actionMenuManager?.playWanderFeedback) {
      window.actionMenuManager.playWanderFeedback(charId, this._wanderActive);
    } else {
      this._showBubble(this._wanderActive ? '好耶，若曦可以在主人的桌面上尽情溜达啦！ 🐾' : '乖乖待命呼吸中，随时听候主人差遣。 🌸');
      if (window.characterManager?.playVoice) {
        window.characterManager.playVoice(charId, this._wanderActive ? '04' : '01');
      }
    }
  }

  _startWander() {
    if (this._wanderActive) return;
    this._wanderActive = true;

    // 解除精灵图工作/睡眠锁定，立即进入可奔跑状态
    const m = this._spriteAtlas || window.spriteAtlasManager;
    if (this._renderMode === 'sprite' && m && m.ready) {
      if (m.S) {
        m.S.work = false;
        m.S.sleep = false;
      }
      m.goIdle();
    }

    // 确保移动主循环处于激活状态
    if (!this._moveRaf) {
      this._startMovementLoop();
    }

    const tick = () => {
      if (!this._wanderActive) return;
      const scrX = typeof window.screenX === 'number' ? window.screenX : 0;
      const scrW = window.screen?.availWidth || 1920;
      const winW = window.outerWidth || Math.round(400 * (this._petScale || 1));

      // 若靠近屏幕右边缘（如初始出生点），优先向左溜达；若靠近左边缘，优先向右溜达
      if (scrX + winW >= scrW - 120) {
        this._wanderDir = -1;
      } else if (scrX <= 120) {
        this._wanderDir = 1;
      } else {
        this._wanderDir = Math.random() > 0.5 ? 1 : -1;
      }
      this._wanderSpeed = 1.6 + Math.random() * 1.1;

      this._wanderTimer = setTimeout(() => {
        if (!this._wanderActive) return;
        this._wanderDir = 0;
        this._endMove();
        this._wanderTimer = setTimeout(tick, 1000 + Math.random() * 2000);
      }, 2200 + Math.random() * 2600);
    };
    tick();
  }

  _stopWander() {
    this._wanderActive = false;
    this._wanderDir = 0;
    this._keys = { left: false, right: false, up: false, down: false };
    if (this._wanderTimer) { clearTimeout(this._wanderTimer); this._wanderTimer = null; }
    const m = this._spriteAtlas || window.spriteAtlasManager;
    if (this._renderMode === 'sprite' && m && m.ready && m.S) {
      m.S.work = false;
      m.S.sleep = false;
    }
    this._endMove();
    if (this._renderMode === 'live2d' && this._model && window.actionMenuManager?.playIdle) {
      const cid = window.characterManager?.getCurrentCharacter()?.id;
      window.actionMenuManager.playIdle(cid, { model: this._model });
    } else if (this._renderMode === 'vrm' && window.vrmManager) {
      window.vrmManager.playAnimation?.('idle');
    }
    this._updateControlButtons();
  }

  // ★ 画布保活与双画布物理隔离：若曦独占 pet-sprite-canvas，Live2D 独占 pet-canvas
  _ensureCanvases() {
    const area = document.getElementById('pet-character-area');
    if (!area) return null;
    let canvas = document.getElementById('pet-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'pet-canvas';
      canvas.style.cssText = 'width:100%;height:100%;pointer-events:auto;cursor:pointer;';
      area.prepend(canvas);
    }
    let vrmCanvas = document.getElementById('pet-vrm-canvas');
    if (!vrmCanvas) {
      vrmCanvas = document.createElement('canvas');
      vrmCanvas.id = 'pet-vrm-canvas';
      vrmCanvas.style.cssText = 'display:none;position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:auto;cursor:pointer;';
      area.insertBefore(vrmCanvas, canvas.nextSibling);
    }
    let spriteCanvas = document.getElementById('pet-sprite-canvas');
    if (!spriteCanvas) {
      spriteCanvas = document.createElement('canvas');
      spriteCanvas.id = 'pet-sprite-canvas';
      spriteCanvas.style.cssText = 'display:none;position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:auto;cursor:pointer;';
      area.insertBefore(spriteCanvas, vrmCanvas.nextSibling);
    }
    let gif = document.getElementById('pet-gif');
    if (!gif) {
      gif = document.createElement('img');
      gif.id = 'pet-gif';
      gif.className = 'pet-gif-img';
      gif.src = '';
      gif.alt = '';
      area.appendChild(gif);
    }
    return { area, canvas, vrmCanvas, spriteCanvas, gif };
  }

  // === 角色加载（双画布物理隔离 + 2048超清抗锯齿渲染 + 彻底清空旧残留） ===
  async _loadCharacter() {
    const nodes = this._ensureCanvases();
    if (!nodes) return;
    const { area, canvas, vrmCanvas, spriteCanvas, gif } = nodes;

    // ★ 切换角色第一毫秒：彻底清空静态封面与残留遮盖层
    const oldFallback = area.querySelector('.pet-fallback-img');
    if (oldFallback) oldFallback.remove();
    if (gif) { gif.src = ''; gif.style.display = 'none'; }

    const char = window.characterManager?.getCurrentCharacter();
    if (!char) return;

    // 显示当前角色静态封面作为无缝过渡（模型或精灵加载成功后立即清除）
    this._showPetFallback();

    let loaded = false;

    // ① 精灵表角色（若曦）：白狐仙精灵帧桌宠 · 专用 2D 画布隔离
    if (!loaded && window.spriteAtlasManager && SpriteAtlasManager.isSpriteCharacter(char)) {
      try {
        this._cleanupLive2D();
        this._cleanupVRM();
        if (canvas) canvas.style.display = 'none';
        if (gif) gif.style.display = 'none';
        spriteCanvas.style.display = 'block';

        if (!this._spriteAtlas) {
          this._spriteAtlas = new SpriteAtlasManager();
        }
        window.spriteAtlasManager = this._spriteAtlas;

        const ok = await this._spriteAtlas.loadFor(char, spriteCanvas);
        if (ok) {
          loaded = true;
          this._renderMode = 'sprite';
          this._clearAllFallbacks(area);
        }
      } catch (e) {
        console.warn('[PetMode] 精灵表加载异常:', e);
        loaded = false;
      }
    }

    // ② Live2D 模型（原画级 2048 超清抗锯齿渲染）
    if (!loaded && char.live2d?.modelPath) {
      const exists = await window.characterManager.checkModelFileExists(char.live2d.modelPath);
      if (exists) {
        try {
          this._cleanupSprite();
          this._cleanupVRM();
          if (spriteCanvas) spriteCanvas.style.display = 'none';
          if (gif) gif.style.display = 'none';
          canvas.style.display = 'block';

          await window.live2dManager.loadScripts();

          const sFactor = this._petScale || 1.0;
          const stageW = Math.round(380 * sFactor);
          const stageH = Math.round(570 * sFactor);
          canvas.style.width = stageW + 'px';
          canvas.style.height = stageH + 'px';

          if (!this._pixiApp) {
            this._pixiApp = new PIXI.Application({
              view: canvas,
              width: stageW,
              height: stageH,
              transparent: true,
              backgroundAlpha: 0,
              antialias: true,
              autoDensity: true,
              resolution: window.devicePixelRatio || 1,
            });
          } else if (this._pixiApp.renderer) {
            this._pixiApp.renderer.resize(stageW, stageH);
          }

          if (this._model) {
            try { this._model.internalModel?.motionManager?.stopAllMotions?.(); } catch (e) {}
            if (this._pixiApp.stage) this._pixiApp.stage.removeChild(this._model);
            this._model.destroy({ children: true });
            this._model = null;
          }

          this._model = await PIXI.live2d.Live2DModel.from(char.live2d.modelPath, {
            autoInteract: true,
            autoUpdate: true
          });

          // 固化原始固有设计尺寸（严禁以动态变化中的包围盒为基准）
          const im = this._model.internalModel;
          const rawW = (im && im.originalWidth > 0) ? im.originalWidth : (this._model.width > 0 ? this._model.width : 1000);
          const rawH = (im && im.originalHeight > 0) ? im.originalHeight : (this._model.height > 0 ? this._model.height : 1000);
          this._model._origDesignWidth = rawW;
          this._model._origDesignHeight = rawH;
          this._model._baseFitScale = Math.min(380 / rawW, 570 / rawH) * 0.95;

          // 全身优雅比例渲染（严格等比例，X与Y完全一致，杜绝图层撕裂）
          const uniformScale = this._model._baseFitScale * sFactor;
          this._model.scale.set(uniformScale, uniformScale);
          this._model.anchor.set(0.5, 0.5);
          this._model.position.set(stageW / 2, stageH / 2);
          this._model.interactive = true;

          // 先将模型加入 stage，确保拥有有效父级节点
          this._pixiApp.stage.addChild(this._model);

          // 立即同步投影矩阵与蒙版系统
          if (im) {
            try {
              if (typeof im.resize === 'function') {
                im.resize(stageW, stageH);
              }
              im.update(0, 0);
            } catch (e) {}
          }
          if (this._model.parent && typeof this._model.updateTransform === 'function') {
            try { this._model.updateTransform(); } catch (e) {}
          }

          // 动态修复 Cubism 4/5 内部参数名映射（如惠惠等大写规范模型）
          if (im && im.idParamEyeBallX && im.coreModel?.getParameterIndex) {
            try {
              if (im.coreModel.getParameterIndex('ParamEyeBallX') < 0 && im.coreModel.getParameterIndex('PARAM_EYE_BALL_X') >= 0) {
                im.idParamEyeBallX = 'PARAM_EYE_BALL_X';
                im.idParamEyeBallY = 'PARAM_EYE_BALL_Y';
                im.idParamAngleX = 'PARAM_ANGLE_X';
                im.idParamAngleY = 'PARAM_ANGLE_Y';
                im.idParamAngleZ = 'PARAM_ANGLE_Z';
                im.idParamBodyAngleX = 'PARAM_BODY_ANGLE_X';
              }
            } catch (e) {}
          }

          // 载入即启动待机呼吸与眨眼
          if (window.actionMenuManager) {
            window.actionMenuManager.playIdle(char.id, { model: this._model });
          } else if (typeof this._model.motion === 'function') {
            for (const idleName of ['idle', 'Idle', 'IDLING_01', 'Live2D_remu_idle', 'miku_idle_01', '']) {
              try {
                if (this._model.motion(idleName) !== false) break;
              } catch (e) {}
            }
          }

          loaded = true;
          this._renderMode = 'live2d';
          this._clearAllFallbacks(area);
        } catch (e) {
          console.warn('[PetMode] Live2D 加载异常:', e);
          loaded = false;
        }
      }
    }

    // ③ VRM 模型
    if (!loaded && char.vrm?.modelPath && window.vrmManager) {
      const exists = await window.characterManager.checkModelFileExists(char.vrm.modelPath);
      if (exists) {
        try {
          this._cleanupLive2D();
          this._cleanupSprite();
          if (canvas) canvas.style.display = 'none';
          if (spriteCanvas) spriteCanvas.style.display = 'none';
          if (gif) gif.style.display = 'none';
          const petW = Math.max(200, area.clientWidth || 380);
          const petH = Math.max(300, area.clientHeight || 570);
          if (vrmCanvas) {
            vrmCanvas.style.display = 'block';
            vrmCanvas.width = petW;
            vrmCanvas.height = petH;
          }
          const ok = await window.vrmManager.initPet(vrmCanvas, petW, petH);
          if (ok) {
            const modelOk = await window.vrmManager.loadModel(char.vrm.modelPath);
            if (modelOk) {
              loaded = true;
              this._renderMode = 'vrm';
              const fb = area.querySelector('.pet-fallback-img');
              if (fb) fb.remove();
            }
          }
        } catch (e) {
          console.error('[PetMode VRM Error]', e);
          loaded = false;
        }
      }
    }

    // ④ GIF
    if (!loaded) {
      this._cleanupLive2D();
      this._cleanupSprite();
      this._cleanupVRM();
      if (canvas) canvas.style.display = 'none';
      if (spriteCanvas) spriteCanvas.style.display = 'none';
      this._renderMode = 'gif';
      await this._loadGif();
    }

    this._updateControlButtons();
  }

  async _loadGif() {
    const path = window.live2dManager?._getGifPath?.();
    const canvas = document.getElementById('pet-canvas');
    const gif = document.getElementById('pet-gif');
    if (!path || !gif) {
      this._showPetFallback();
      return;
    }
    if (canvas) canvas.style.display = 'none';

    const ok = await new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 3000);
      gif.onload = () => { clearTimeout(timer); resolve(true); };
      gif.onerror = () => { clearTimeout(timer); resolve(false); };
      gif.src = path;
    });
    if (ok) {
      gif.style.display = 'block'; gif.style.visibility = 'visible'; gif.style.opacity = '1';
      // ★ GIF 加载成功，彻底移除静态占位与遮盖层
      this._clearAllFallbacks();
    } else {
      if (gif) { gif.src = ''; gif.style.display = 'none'; }
      this._showPetFallback();
    }
  }

  /** 彻底清理一切降级封面与遮盖层，消灭残留图层遮挡 */
  _clearAllFallbacks(area) {
    const a = area || document.getElementById('pet-character-area');
    if (a) {
      a.querySelectorAll('.pet-fallback-img').forEach(el => el.remove());
    }
    const oldWebFb = document.getElementById('live2d-fallback');
    if (oldWebFb) oldWebFb.remove();
    const oldGif = document.getElementById('gif-fallback-container');
    if (oldGif) oldGif.remove();
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
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;position:absolute;top:0;left:0;pointer-events:none;z-index:10;display:block;';
    const canvas = document.getElementById('pet-canvas');
    if (canvas) canvas.style.display = 'none';
    const spriteCanvas = document.getElementById('pet-sprite-canvas');
    if (spriteCanvas) spriteCanvas.style.display = 'none';
    const gif = document.getElementById('pet-gif');
    if (gif) gif.style.display = 'none';
    area.appendChild(img);
  }

  // === 点击交互 ===
  _bindClickEvents() {
    // 统一点击与拖拽状态机已在 _bindEvents 中一次性完成绑定，此处保持幂等空实现
  }

  _playTap(part = 'body', clickCount = 1) {
    const char = window.characterManager?.getCurrentCharacter();
    const charId = char?.id || 'ruoxi';

    // ★ 动作百宝箱触碰响应系统（摸头 / 戳身体 / 连击暴走）
    if (window.actionMenuManager) {
      window.actionMenuManager.handleTouch(charId, part, clickCount, { model: this._model });
      return;
    }

    // 基础回退逻辑
    window.characterManager?.playRandomVoice();
    if (this._renderMode === 'vrm' && window.vrmManager) {
      window.vrmManager.playAnimation('tap');
    } else if (this._renderMode === 'sprite' && window.spriteAtlasManager) {
      window.spriteAtlasManager.wave();
    } else if (this._model) {
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

  // === 气泡系统（位置下移醒目展示、点击即消、支持全局开关、连点防早退） ===
  _showBubble(text) {
    if (this._bubbleEnabled === false) return;
    const c = document.getElementById('pet-bubble-container');
    if (!c || !text) return;
    // 杜绝堆叠与旧计时器干扰：每次只保留最新单条气泡
    this._clearBubbles();
    const b = document.createElement('div');
    b.className = 'pet-bubble';
    b.textContent = text;
    b.title = '点击即可关闭气泡';
    // 点击即刻消除
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      b.classList.add('bubble-fade-out');
      setTimeout(() => b.remove(), 250);
    });
    c.appendChild(b);
    this._bubbleHideTimer = setTimeout(() => {
      if (b.parentNode) {
        b.classList.add('bubble-fade-out');
        this._bubbleRemoveTimer = setTimeout(() => b.remove(), 250);
      }
    }, 4200);
  }

  /** 切换气泡台词显示/静音 */
  _toggleBubble() {
    this._bubbleEnabled = !this._bubbleEnabled;
    if (!this._bubbleEnabled) {
      this._clearBubbles();
    }
    return this._bubbleEnabled;
  }

  _clearBubbles() {
    if (this._bubbleHideTimer) {
      clearTimeout(this._bubbleHideTimer);
      this._bubbleHideTimer = null;
    }
    if (this._bubbleRemoveTimer) {
      clearTimeout(this._bubbleRemoveTimer);
      this._bubbleRemoveTimer = null;
    }
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

  // === 资源清理（安全垃圾回收，显存清道夫，绝不物理删除 DOM 画布，保持 PIXI Application 单例复用） ===
  _cleanupLive2D(destroyPixi = false) {
    if (this._model) {
      if (this._pixiApp?.stage) this._pixiApp.stage.removeChild(this._model);
      this._model.destroy({ children: true });
      this._model = null;
    }
    // ★ WebGL 显存主动垃圾回收：清空 Pixi 纹理缓存并触发 Texture GC，杜绝多角色高频切换时的显存慢增
    if (window.PIXI?.utils?.clearTextureCache) {
      try { window.PIXI.utils.clearTextureCache(); } catch (e) {}
    }
    if (this._pixiApp?.renderer?.textureGC?.run) {
      try { this._pixiApp.renderer.textureGC.run(); } catch (e) {}
    }
    if (destroyPixi && this._pixiApp) {
      this._pixiApp.destroy(false); // ★ 绝对传 false，保留 DOM 画布节点！
      this._pixiApp = null;
    }
  }

  _cleanupSprite() {
    if (this._spriteAtlas) {
      this._spriteAtlas.destroy();
      this._spriteAtlas = null;
    } else if (window.spriteAtlasManager) {
      window.spriteAtlasManager.destroy();
    }
    const sc = document.getElementById('pet-sprite-canvas');
    if (sc) sc.style.display = 'none';
  }

  _cleanupVRM() {
    if (window.vrmManager) {
      window.vrmManager.destroy();
    }
    const vc = document.getElementById('pet-vrm-canvas');
    if (vc) vc.style.display = 'none';
  }
}
