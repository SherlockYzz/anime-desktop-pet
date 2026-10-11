// 加藤惠桌宠 - Live2D管理器（本地模型版 + VRM支持）
window.LAppDefine = window.LAppDefine || { DEBUG_LOG: false };

class Live2DManager {
  constructor() {
    this.model = null;
    this.app = null;
    this.mood = 'normal';
    this.isInitialized = false;
    this._onMouseMove = null;
    // GIF降级模式相关
    this.gifElement = null;
    this.isGifMode = false;
    this._onVisibilityChange = null;
    // VRM模式相关
    this.isVrmMode = false;
    // 当前实际使用的渲染模式：'live2d' | 'vrm' | 'gif' | 'static'
    this.currentRenderMode = null;
    // 显示模式：'auto' | 'gif' | 'web'
    this.displayMode = localStorage.getItem('display-mode') || 'auto';
  }

  async init() {
    try {
      // 立即显示封面图作为占位，不等CDN加载
      this.showFallback();

      // 监听窗口可见性变化，控制GIF播放
      this._onVisibilityChange = () => {
        if (this.isGifMode && this.gifElement) {
          if (document.hidden) {
            this.pauseGif();
          } else {
            this.resumeGif();
          }
        }
      };
      document.addEventListener('visibilitychange', this._onVisibilityChange);

      await this.loadScripts();

      const canvas = document.getElementById('live2d-canvas');
      const container = document.getElementById('live2d-container');

      this.app = new PIXI.Application({
        view: canvas,
        width: container.clientWidth,
        height: container.clientHeight,
        transparent: true,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        resizeTo: container
      });

      if (document.body.classList.contains('web-mode-active')) {
        await this.loadCharacterModel();
      }
      this.isInitialized = true;
      window.addEventListener('resize', () => this.handleResize());
      return true;
    } catch (error) {
      this.showFallback();
      return false;
    }
  }

  async loadScripts() {
    if (window.PIXI && window.PIXI.live2d) return;

    return new Promise((resolve, reject) => {
      const addScript = (src) => new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = res;
        s.onerror = () => rej(new Error('Failed: ' + src));
        document.head.appendChild(s);
      });
      addScript(window.CDN_CONFIG.pixi)
        // ★ Cubism2 与 Cubism4 核心必须在 pixi-live2d-display 之前加载完毕
        .then(() => addScript(window.CDN_CONFIG.cubism2Core))
        .then(() => addScript(window.CDN_CONFIG.cubismCore))
        .then(() => addScript(window.CDN_CONFIG.pixiLive2d))
        .then(resolve)
        .catch(reject);
    });
  }

  // 获取当前角色的GIF路径
  _getGifPath() {
    const character = window.characterManager?.getCurrentCharacter();
    if (!character) return null;
    if (character.gif && typeof character.gif === 'string') return character.gif;
    // 仅当角色类型明确包含 gif 时，才尝试从头像路径推导
    if (character.type === 'gif' || character.gif) {
      const refPath = character.avatar || character.cover;
      if (refPath) {
        const match = refPath.match(/^(.*[/\\])[^/\\]+$/);
        if (match) return match[1] + '动态形象.gif';
      }
    }
    return null;
  }

  // 加载GIF作为降级方案
  async loadGifFallback() {
    const gifPath = this._getGifPath();
    if (!gifPath) return false;

    // ★ 检查 GIF 是否存在，使用统一的 IPC / XHR 检测
    const exists = await window.characterManager?.checkModelFileExists(gifPath);
    if (!exists) {
      this.showFallback();
      return false;
    }

    try {
      const container = document.getElementById('live2d-container');

      // 移除已有的fallback元素
      const existingFallback = document.getElementById('live2d-fallback');
      if (existingFallback) existingFallback.remove();

      // 隐藏canvas
      const canvas = document.getElementById('live2d-canvas');
      if (canvas) canvas.style.display = 'none';

      // 移除已有的GIF容器
      const existingGif = document.getElementById('gif-fallback-container');
      if (existingGif) existingGif.remove();

      // 创建GIF容器
      const gifContainer = document.createElement('div');
      gifContainer.id = 'gif-fallback-container';
      gifContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      `;

      // 创建GIF图片元素
      this.gifElement = document.createElement('img');
      this.gifElement.alt = '角色动态形象';
      this.gifElement.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        pointer-events: none;
      `;

      // 等待图片加载完成
      const loadResult = await new Promise((resolve) => {
        this.gifElement.onload = () => resolve(true);
        this.gifElement.onerror = () => resolve(false);
        this.gifElement.src = gifPath;
      });

      if (!loadResult) {
        this.gifElement = null;
        this.showFallback();
        return false;
      }

      gifContainer.appendChild(this.gifElement);
      container.appendChild(gifContainer);

      this.isGifMode = true;

      // 窗口当前不可见时暂停GIF
      if (document.hidden) {
        this.pauseGif();
      }

      return true;
    } catch (error) {
      this.showFallback();
      return false;
    }
  }

  // 暂停GIF播放（通过替换为静态图实现）
  pauseGif() {
    if (!this.gifElement || !this.isGifMode) return;
    // 记录当前src，然后设置为空GIF停止动画
    this.gifElement._originalSrc = this.gifElement.src;
    // 使用1x1透明GIF暂停动画
    this.gifElement.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }

  // 恢复GIF播放
  resumeGif() {
    if (!this.gifElement || !this.isGifMode) return;
    if (this.gifElement._originalSrc) {
      this.gifElement.src = this.gifElement._originalSrc;
    }
  }

  // 加载当前角色的模型（自动降级：Live2D > VRM > GIF > 静态图）
  async loadCharacterModel() {
    // ★ 彻底清空旧角色残留元素，杜绝图层遮挡
    const oldFallback = document.getElementById('live2d-fallback');
    if (oldFallback) oldFallback.remove();
    const oldGif = document.getElementById('gif-fallback-container');
    if (oldGif) oldGif.remove();

    const character = window.characterManager?.getCurrentCharacter();
    if (!character) {
      this.showFallback();
      return false;
    }

    // 清理上一角色的精灵表模式（若曦）
    this._cleanupSpriteMode();

    // 精灵表角色（若曦）：ChatGPT Pets v2 精灵表 + 状态机 + 16 向视线（优先级最高）
    if (window.spriteAtlasManager && SpriteAtlasManager.isSpriteCharacter(character)) {
      const spriteOk = await this.loadSpriteMode(character);
      if (spriteOk) return true;
    }

    // 第一优先：Live2D — 先缓存检查，避免不必要的HTTP请求
    if (character.live2d?.modelPath) {
      const exists = await window.characterManager.checkModelFileExists(character.live2d.modelPath);
      if (exists) {
        const success = await this.loadCustomModel(character.live2d.modelPath, character.name);
        if (success) {
          this.currentRenderMode = 'live2d';
          return true;
        }
      }
    }

    // 第二优先：VRM
    if (character.vrm?.modelPath) {
      const exists = await window.characterManager.checkModelFileExists(character.vrm.modelPath);
      if (exists) {
        const vrmSuccess = await this._loadVrmModel(character.vrm.modelPath);
        if (vrmSuccess) {
          this.currentRenderMode = 'vrm';
          return true;
        }
      }
    }

    // 第三优先：GIF
    const gifLoaded = await this.loadGifFallback();
    if (gifLoaded) {
      this.currentRenderMode = 'gif';
      return true;
    }

    // 最后：静态封面图
    this.currentRenderMode = 'static';
    this.showFallback();
    return false;
  }

  // 加载 VRM 模型
  async _loadVrmModel(modelPath) {
    try {
      this._cleanupVrmMode();
      this._cleanupGifMode();

      // 隐藏 Live2D 与 精灵表画布
      const canvas = document.getElementById('live2d-canvas');
      if (canvas) canvas.style.display = 'none';
      const spriteCanvas = document.getElementById('sprite-canvas');
      if (spriteCanvas) spriteCanvas.style.display = 'none';

      // 初始化 VRM 管理器
      const vrmManager = window.vrmManager;
      if (!vrmManager) return false;

      const success = await vrmManager.init();
      if (!success) return false;

      const loaded = await vrmManager.loadModel(modelPath);
      if (!loaded) return false;

      const container = document.getElementById('live2d-container');
      if (container) vrmManager.setupMouseTracking(container);

      this.isVrmMode = true;
      return true;
    } catch (e) {
      console.warn('[Live2D] 加载 VRM 异常:', e);
      return false;
    }
  }

  // 清理 VRM 模式
  _cleanupVrmMode() {
    if (this.isVrmMode) {
      this.isVrmMode = false;
      if (window.vrmManager) {
        window.vrmManager.destroy();
      }
    }
    const vc = document.getElementById('vrm-canvas');
    if (vc) vc.style.display = 'none';
  }

  // 确保 PIXI.Application 实例有效（从 VRM/精灵表切回时自愈重建）
  _ensurePixiApp() {
    this._cleanupVrmMode();
    const canvas = document.getElementById('live2d-canvas');
    if (canvas) canvas.style.display = 'block';
    if (this.app) return;
    const container = document.getElementById('live2d-container');
    if (!canvas || !container) return;
    try {
      this.app = new PIXI.Application({
        view: canvas,
        width: container.clientWidth || 400,
        height: container.clientHeight || 600,
        transparent: true,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        resizeTo: container
      });
    } catch (e) {
      console.warn('[Live2D] 重建 PIXI Application 失败:', e);
    }
  }

  // 加载指定路径的Live2D模型
  async loadCustomModel(modelPath, characterName) {
    try {
      // ★ 彻底清空旧角色残留元素
      const oldFallback = document.getElementById('live2d-fallback');
      if (oldFallback) oldFallback.remove();
      const oldGif = document.getElementById('gif-fallback-container');
      if (oldGif) oldGif.remove();

      this._cleanupSpriteMode();
      this._ensurePixiApp();
      if (!this.app) throw new Error('PIXI Application 初始化失败');

      // ★ 安全释放旧模型，不摧毁共享底图与着色器
      if (this.model) {
        try { this.model.internalModel?.motionManager?.stopAllMotions?.(); } catch (e) {}
        if (this.app.stage) this.app.stage.removeChild(this.model);
        this.model.destroy({ children: true });
        this.model = null;

        // ★ WebGL 显存主动垃圾回收：清空 Pixi 纹理缓存并触发 Texture GC，杜绝多角色高频切换时的显存慢增
        if (window.PIXI?.utils?.clearTextureCache) {
          try { window.PIXI.utils.clearTextureCache(); } catch (e) {}
        }
        if (this.app?.renderer?.textureGC?.run) {
          try { this.app.renderer.textureGC.run(); } catch (e) {}
        }
      }

      // 文件存在性已在上游缓存检查过
      this.model = await PIXI.live2d.Live2DModel.from(modelPath, {
        autoInteract: true,
        autoUpdate: true
      });

      // Live2D加载成功，清理GIF与Fallback模式
      this._cleanupGifMode();
      const loadedFallback = document.getElementById('live2d-fallback');
      if (loadedFallback) loadedFallback.remove();

      // ★ 彻底根除空白画布 bug：显式恢复 canvas 显示与图层层级
      const canvas = document.getElementById('live2d-canvas');
      if (canvas) {
        canvas.style.display = 'block';
        canvas.style.zIndex = '2';
      }
      const spriteCanvas = document.getElementById('sprite-canvas');
      if (spriteCanvas) spriteCanvas.style.display = 'none';

      this.app.stage.addChild(this.model);
      this.setupModel();
      this.setupInteraction();
      // ★ 载入即启动待机呼吸与眨眼
      this.playAnimation('idle');
      return true;
    } catch (error) {
      console.warn('[Live2D] 加载模型异常:', error);
      // ★ 降级时立即呈现超清封面图与原生交互，绝不留白
      this.showFallback();
      return false;
    }
  }

  // 清理GIF模式相关元素
  _cleanupGifMode() {
    if (this.isGifMode) {
      this.gifElement = null;
      this.isGifMode = false;
      const gifContainer = document.getElementById('gif-fallback-container');
      if (gifContainer) gifContainer.remove();
      // 恢复canvas显示
      const canvas = document.getElementById('live2d-canvas');
      if (canvas) canvas.style.display = '';
    }
  }

  // 清理精灵表模式（若曦）
  _cleanupSpriteMode() {
    if (this.isSpriteMode) {
      this.isSpriteMode = false;
      if (this._spriteAtlas) this._spriteAtlas.destroy();
      // 移除精灵专属画布，恢复 live2d-canvas 显示
      const spriteCanvas = document.getElementById('sprite-canvas');
      if (spriteCanvas) spriteCanvas.style.display = 'none';
      const canvas = document.getElementById('live2d-canvas');
      if (canvas) canvas.style.display = '';
    }
  }

  // 精灵表模式：ChatGPT Pets v2 精灵表（若曦）— 逐帧动画 + 16 向视线
  async loadSpriteMode(character) {
    try {
      if (!window.spriteAtlasManager || !SpriteAtlasManager.isSpriteCharacter(character)) return false;

      // 清理其它渲染模式
      if (this.model) {
        if (this.app?.stage) this.app.stage.removeChild(this.model);
        this.model.destroy({ children: true });
        this.model = null;
        if (window.PIXI?.utils?.clearTextureCache) {
          try { window.PIXI.utils.clearTextureCache(); } catch (e) {}
        }
        if (this.app?.renderer?.textureGC?.run) {
          try { this.app.renderer.textureGC.run(); } catch (e) {}
        }
      }
      // ★ 严禁销毁 this.app！保持全局单例复用，仅隐藏 live2d-canvas，避免 WebGL 上下文耗尽崩溃
      this._cleanupGifMode();
      this._cleanupVrmMode();
      const existingFallback = document.getElementById('live2d-fallback');
      if (existingFallback) existingFallback.remove();

      const canvas = document.getElementById('live2d-canvas');
      const container = document.getElementById('live2d-container');
      if (!container) return false;

      // ★ 精灵表必须用独立的 2D 画布：live2d-canvas 已被 PIXI 创建为 WebGL 上下文，
      //    同一 canvas 无法再获取 '2d' 上下文，会导致精灵画不上去。
      if (canvas) canvas.style.display = 'none';
      let spriteCanvas = document.getElementById('sprite-canvas');
      if (!spriteCanvas) {
        spriteCanvas = document.createElement('canvas');
        spriteCanvas.id = 'sprite-canvas';
        spriteCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;z-index:2;';
        container.appendChild(spriteCanvas);
      }
      spriteCanvas.style.display = 'block';
      spriteCanvas.style.zIndex = '2';

      if (!this._spriteAtlas) {
        this._spriteAtlas = new SpriteAtlasManager();
      }
      window.spriteAtlasManager = this._spriteAtlas;
      const ok = await this._spriteAtlas.loadFor(character, spriteCanvas);
      if (!ok) {
        spriteCanvas.style.display = 'none';
        if (canvas) canvas.style.display = '';
        return false;
      }
      this.isSpriteMode = true;
      this.currentRenderMode = 'sprite';
      return true;
    } catch (e) {
      return false;
    }
  }

  _showModelNotFoundToast(characterName) {
    const name = characterName || '当前角色';
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = `${name}的Live2D模型未找到，请将模型文件放入对应角色的"Live2D模型"文件夹`;
    toast.style.cssText = 'max-width:90%;white-space:normal;text-align:center;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  setupModel() {
    if (!this.model) return;

    const container = document.getElementById('live2d-container');
    const containerWidth = container.clientWidth || 300;
    const containerHeight = container.clientHeight || 400;

    const im = this.model.internalModel;
    if (!this.model._origDesignWidth) {
      const rawW = (im && im.originalWidth > 0) ? im.originalWidth : (this.model.width > 0 ? this.model.width : 1000);
      const rawH = (im && im.originalHeight > 0) ? im.originalHeight : (this.model.height > 0 ? this.model.height : 1000);
      this.model._origDesignWidth = rawW;
      this.model._origDesignHeight = rawH;
    }

    // ★ 严格等比例（两轴完全一致），固化原始设计基准，杜绝任何图层撕裂
    const scale = Math.min(containerWidth / this.model._origDesignWidth, containerHeight / this.model._origDesignHeight) * 0.95;

    this.model.scale.set(scale, scale);
    this.model.anchor.set(0.5, 0.5);
    this.model.x = containerWidth / 2;
    this.model.y = containerHeight / 2;

    if (im) {
      try {
        if (typeof im.resize === 'function') {
          im.resize(containerWidth, containerHeight);
        }
        im.update(0, 0);
      } catch (e) {}
    }
    if (this.model.parent && typeof this.model.updateTransform === 'function') {
      try { this.model.updateTransform(); } catch (e) {}
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
  }

  setupInteraction() {
    if (!this.model) return;

    this.model.interactive = true;
    this.model.buttonMode = true;

    this.model.on('pointerdown', (e) => {
      if (document.body.classList.contains('web-mode-active')) return;
      const char = window.characterManager?.getCurrentCharacter();
      const rect = this.app?.view?.getBoundingClientRect?.();
      const clientY = e?.data?.global?.y || 0;
      const isHead = rect ? (clientY < rect.height * 0.4) : false;
      if (window.actionMenuManager) {
        window.actionMenuManager.handleTouch(char?.id, isHead ? 'head' : 'body', 1, { model: this.model });
      } else {
        this.playAnimation('tap');
      }
    });

    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
    }
    if (this._onMouseLeave) {
      document.removeEventListener('mouseleave', this._onMouseLeave);
    }
    if (this._trackingRaf) {
      cancelAnimationFrame(this._trackingRaf);
      this._trackingRaf = null;
    }

    // 视线平滑阻尼插值（Lerp）与出界回正系统
    this._targetEyeX = 0;
    this._targetEyeY = 0;
    this._smoothEyeX = 0;
    this._smoothEyeY = 0;
    this._lastMouseMoveTime = Date.now();

    this._onMouseMove = (e) => {
      this._lastMouseMoveTime = Date.now();
      if (this.model && this.app && this.app.view) {
        const rect = this.app.view.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          this._targetEyeX = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
          this._targetEyeY = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
        }
      }
    };

    this._onMouseLeave = () => {
      this._targetEyeX = 0;
      this._targetEyeY = 0;
    };

    const updateSmoothTracking = () => {
      if (!this.model) {
        this._trackingRaf = null;
        return;
      }

      // 超过 3.5 秒鼠标无位移，视线柔和回正正中
      if (Date.now() - this._lastMouseMoveTime > 3500) {
        this._targetEyeX = 0;
        this._targetEyeY = 0;
      }

      const lerpFactor = 0.18;
      this._smoothEyeX += (this._targetEyeX - this._smoothEyeX) * lerpFactor;
      this._smoothEyeY += (this._targetEyeY - this._smoothEyeY) * lerpFactor;

      const dx = this._smoothEyeX;
      const dy = this._smoothEyeY;

      try {
        if (this.model.internalModel?.focusController) {
          this.model.internalModel.focusController.focus(dx, -dy);
        }
        const cm = this.model.internalModel?.coreModel;
        if (cm) {
          if (typeof cm.setParamFloat === 'function') {
            cm.setParamFloat('PARAM_EYE_BALL_X', dx * 0.85);
            cm.setParamFloat('PARAM_EYE_BALL_Y', -dy * 0.85);
            cm.setParamFloat('PARAM_ANGLE_X', dx * 18);
            cm.setParamFloat('PARAM_ANGLE_Y', -dy * 15);
          }
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
      } catch (err) {}

      this._trackingRaf = requestAnimationFrame(updateSmoothTracking);
    };

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseleave', this._onMouseLeave);
    this._trackingRaf = requestAnimationFrame(updateSmoothTracking);
  }

  handleResize() {
    if (this.isGifMode) return; // GIF模式下由CSS自动适配，无需处理
    if (!this.app || !this.model) return;
    const container = document.getElementById('live2d-container');
    this.app.renderer.resize(container.clientWidth, container.clientHeight);
    this.setupModel();
  }

  playAnimation(type) {
    // VRM 模式
    if (this.isVrmMode && window.vrmManager) {
      window.vrmManager.playAnimation(type);
      return;
    }

    // Live2D 模式
    if (!this.model) return;

    // ★ 互动时触发角色原生CV语音
    const char = window.characterManager?.getCurrentCharacter();
    const charId = char?.id || 'ruoxi';
    if (type === 'tap' || type === 'happy') {
      window.characterManager?.playRandomVoice(charId);
    }

    if (window.actionMenuManager) {
      const typeMap = {
        tap: 'fun',
        happy: 'fun',
        surprised: 'surprise',
        surprise: 'surprise',
        pout: 'pout',
        angry: 'pout',
        shy: 'shy',
        blush: 'blush',
        sleep: 'sleep',
        idle: 'idle',
        wave: 'wave',
        normal: 'idle'
      };
      const actId = typeMap[type];
      const actList = window.actionMenuManager.getCharacterActions(charId)?.actions;
      if (actId && actList?.some(a => a.id === actId)) {
        window.actionMenuManager.executeAction(charId, actId, { model: this.model });
        return;
      }
    }

    // ★ 动作映射改为“候选列表+逐个回退”：兼容各角色（高木/加藤惠/蕾姆/惠惠/初音未来）不同的动作命名
    const animations = {
      'tap': ['Poke', 'TapBody', 'tap_body', 'tap_head', 'TapHead', 'flick_head', 'I_FUN_W', '00_Happy_01', 'miku_m_01', '', 'null', 'Idle', 'idle'],
      'happy': ['Tease', 'TeaseSmile', 'smile', 'flick_head', 'tap_body', 'I_FUN_W', '00_Happy_01', 'miku_m_02', '', 'null', 'Idle', 'idle'],
      'idle': ['Idle', 'idle', 'IDLING_01', 'Live2D_remu_idle', 'miku_idle_01', 'null', ''],
      'wave': ['Tease', 'wave', 'tap_body', 'miku_m_01', 'Idle', 'idle'],
      'sleep': ['Sleep', 'sleep', 'Live2D_remu_idle', 'Idle', 'idle'],
      'surprised': ['Surprised', 'surprised', 'I_SURPRISE_W', '00_Surprise_01', 'Idle', 'idle'],
      'wakeup': ['WakeUp', 'wakeup', 'Idle', 'idle'],
      'normal': ['Idle', 'idle', 'null', '']
    };

    const animationList = animations[type] || animations['normal'];
    if (window.actionMenuManager) {
      for (const animation of animationList) {
        if (window.actionMenuManager.playModelMotion(this.model, animation)) break;
      }
    } else if (typeof this.model.motion === 'function') {
      for (const animation of animationList) {
        try {
          const res = this.model.motion(animation);
          if (res !== false) break;
        } catch (e) {}
      }
    }

    this.playExpression(type);
  }

  playExpression(type) {
    // VRM 模式
    if (this.isVrmMode && window.vrmManager) {
      window.vrmManager.playExpression(type);
      return;
    }

    // Live2D 模式
    if (!this.model || !this.model.internalModel) return;

    // ★ 表情映射同样改为候选回退：加藤惠使用 F_FUN/F_ANGRY/F_SURPRISE/F_SAD，高木使用 Neutral/TeaseSmile/Wink/Blush，旧模型用 f01/f02/f04
    const expressions = {
      'happy': ['F_FUN', 'TeaseSmile', 'Smug', 'f01'],
      'normal': ['F_NOMAL', 'Neutral', 'f01'],
      'annoyed': ['F_ANGRY', 'Smug', 'Surprised', 'f02'],
      'angry': ['F_ANGRY', 'Smug', 'f02'],
      'thinking': ['F_DOWN', 'Neutral', 'f04'],
      'blush': ['F_FUN', 'Blush', 'f01'],
      'wink': ['F_FUN', 'Wink', 'f01'],
      'sleep': ['Sleepy', 'f01'],
      'surprised': ['F_SURPRISE', 'Surprised', 'f01'],
      'sad': ['F_SAD', 'f03'],
      'idle': ['F_NOMAL', 'Neutral', 'f01']
    };

    const expressionList = expressions[type] || expressions['normal'];

    if (window.actionMenuManager) {
      for (const expression of expressionList) {
        if (window.actionMenuManager.playModelExpression(this.model, expression)) break;
      }
    } else {
      try {
        if (this.model.internalModel.motionManager) {
          for (const expression of expressionList) {
            try { this.model.expression(expression); break; } catch (e) {}
          }
        }
      } catch (e) {}
    }
  }

  updateMood(mood) {
    this.mood = mood;
    const moodIndicator = document.getElementById('mood-indicator');

    const moodTexts = {
      'normal': '',
      'happy': '',
      'annoyed': '...',
      'thinking': '',
      'gentle': ''
    };

    moodIndicator.textContent = moodTexts[mood] || '';
  }

  triggerIdle() {
    if (this.isSpriteMode && window.spriteAtlasManager) {
      window.spriteAtlasManager.triggerIdle();
      this.updateMood('normal');
      return;
    }
    this.playAnimation('idle');
    this.updateMood('normal');
  }

  triggerSpecial(type) {
    if (type === 'birthday') {
      this.updateMood('happy');
      this.playAnimation('happy');
    }
  }

  updateByAIResponse(text) {
    // 精灵表模式（若曦）— 情绪驱动动作
    if (this.isSpriteMode && window.spriteAtlasManager) {
      window.spriteAtlasManager.updateByAIResponse(text);
      return;
    }

    // VRM 模式委托
    if (this.isVrmMode && window.vrmManager) {
      const emotion = analyzeAIContent(text);
      window.vrmManager.playExpression(emotion);
      window.vrmManager.playAnimation(animationFromEmotion(emotion));
      return;
    }

    // Live2D 模式 — 使用共享分析
    const emotion = analyzeAIContent(text);
    this.updateMood(moodFromEmotion(emotion));
    this.playAnimation(animationFromEmotion(emotion));
  }

  showFallback() {
    this._cleanupSpriteMode();
    const container = document.getElementById('live2d-container');
    if (!container) return;
    const coverPath = window.characterManager?.getCoverPath() || '封面.png';

    // 移除已有的fallback元素
    const existingFallback = document.getElementById('live2d-fallback');
    if (existingFallback) existingFallback.remove();

    // 移除已有的GIF容器
    const existingGif = document.getElementById('gif-fallback-container');
    if (existingGif) existingGif.remove();

    // 隐藏canvas与精灵表canvas
    const canvas = document.getElementById('live2d-canvas');
    if (canvas) canvas.style.display = 'none';
    const spriteCanvas = document.getElementById('sprite-canvas');
    if (spriteCanvas) spriteCanvas.style.display = 'none';

    // 创建overlay方式的fallback图片，显式设置 z-index: 2 确保在四角光晕和装饰层之上
    const fallbackDiv = document.createElement('div');
    fallbackDiv.id = 'live2d-fallback';
    fallbackDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      z-index: 2;
    `;
    fallbackDiv.innerHTML = `<img src="${coverPath}" style="
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
      pointer-events: auto;
      cursor: pointer;
    ">`;
    fallbackDiv.onclick = () => {
      if (!document.body.classList.contains('web-mode-active')) {
        this.playAnimation('tap');
      }
    };
    container.appendChild(fallbackDiv);

    // 重置GIF模式状态
    this.isGifMode = false;
    this.gifElement = null;
  }

  destroy() {
    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
      this._onMouseMove = null;
    }
    if (this._onVisibilityChange) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange = null;
    }
    // 清理VRM
    this._cleanupVrmMode();
    // 清理精灵表（若曦）
    this._cleanupSpriteMode();
    // 清理GIF相关
    this.gifElement = null;
    this.isGifMode = false;
    const gifContainer = document.getElementById('gif-fallback-container');
    if (gifContainer) gifContainer.remove();

    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
      this._onMouseMove = null;
    }
    if (this._onMouseLeave) {
      document.removeEventListener('mouseleave', this._onMouseLeave);
      this._onMouseLeave = null;
    }
    if (this._trackingRaf) {
      cancelAnimationFrame(this._trackingRaf);
      this._trackingRaf = null;
    }

    if (this.model) {
      this.model.destroy();
      this.model = null;
    }
    if (window.PIXI?.utils?.clearTextureCache) {
      try { window.PIXI.utils.clearTextureCache(); } catch (e) {}
    }
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }

  // 切换显示模式
  async toggleDisplayMode() {
    if (this.displayMode === 'gif') {
      this.displayMode = 'web';
    } else {
      this.displayMode = 'gif';
    }
    localStorage.setItem('display-mode', this.displayMode);
    await this.applyDisplayMode();
    return this.displayMode;
  }

  // 应用显示模式
  async applyDisplayMode() {
    if (this.displayMode === 'gif') {
      await this.switchToGifMode();
    } else {
      this.switchToWebMode();
    }
  }

  // 切换到GIF模式
  async switchToGifMode() {
    // 清理精灵表（若曦）
    this._cleanupSpriteMode();

    // 清理Live2D模型
    if (this.model) {
      if (this.app?.stage) this.app.stage.removeChild(this.model);
      this.model.destroy();
      this.model = null;
    }
    // 清理VRM
    this._cleanupVrmMode();

    // 尝试加载GIF
    const gifLoaded = await this.loadGifFallback();
    if (!gifLoaded) {
      this.showFallback();
      return false;
    }
    return true;
  }

  // 切换到网页模式（显示封面图或Live2D或VRM）
  switchToWebMode() {
    // 清理GIF模式
    this._cleanupGifMode();
    // 清理VRM
    this._cleanupVrmMode();

    // ★ 精灵表角色（若曦）：单例引擎被桌宠画布重新绑定过，需重新绑定到网页容器
    const character = window.characterManager?.getCurrentCharacter();
    if (window.spriteAtlasManager && SpriteAtlasManager.isSpriteCharacter(character)) {
      this.loadSpriteMode(character);
      return;
    }

    // 重新加载模型（自动降级，会在需要时自愈重建 PIXI.Application）
    if (this.isInitialized) {
      this.loadCharacterModel();
    } else {
      this.showFallback();
    }
  }

  // 获取当前显示模式
  getDisplayMode() {
    return this.displayMode;
  }

  // 检查是否有GIF文件
  async hasGifFile() {
    const gifPath = this._getGifPath();
    if (!gifPath) return false;
    try {
      const resp = await fetch(gifPath);
      return resp.ok;
    } catch (e) {
      return false;
    }
  }
}

window.live2dManager = new Live2DManager();
