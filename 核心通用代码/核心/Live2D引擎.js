// 加藤惠桌宠 - Live2D管理器（本地模型版 + VRM支持）
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
        resizeTo: container
      });

      await this.loadCharacterModel();
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
        .then(() => addScript(window.CDN_CONFIG.pixiLive2d))
        .then(resolve)
        .catch(reject);
    });
  }

  // 获取当前角色的GIF路径
  _getGifPath() {
    const character = window.characterManager?.getCurrentCharacter();
    if (!character) return null;
    // 从avatar或cover路径推导GIF路径
    // avatar格式: ../../角色-加藤惠/图片素材/头像.png
    const refPath = character.avatar || character.cover;
    if (refPath) {
      const match = refPath.match(/^(.*[/\\])[^/\\]+$/);
      if (match) {
        return match[1] + '动态形象.gif';
      }
    }
    return null;
  }

  // 加载GIF作为降级方案
  async loadGifFallback() {
    const gifPath = this._getGifPath();
    if (!gifPath) return false;

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
    const character = window.characterManager?.getCurrentCharacter();
    if (!character) {
      this.showFallback();
      return false;
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
      // 清理之前的模式
      this._cleanupVrmMode();
      this._cleanupGifMode();

      // 关键：销毁 pixi.js 的 Application，释放 canvas 上的 WebGL 上下文
      // 否则 three.js 无法在同一个 canvas 上创建新的 WebGL context
      if (this.app) {
        if (this.model) {
          this.app.stage.removeChild(this.model);
          this.model.destroy();
          this.model = null;
        }
        // destroy(false) = 保留 canvas 元素在 DOM 中，只销毁 WebGL context
        this.app.destroy(false);
        this.app = null;
      }

      // canvas 被 pixi destroy 后需要重新获取或确保元素还在
      const canvas = document.getElementById('live2d-canvas');
      const container = document.getElementById('live2d-container');
      if (!canvas || !container) return false;

      // 重置 canvas 尺寸，强制浏览器释放旧的 WebGL context
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      if (!canvas || !container) return false;

      // 初始化 VRM 管理器
      const vrmManager = window.vrmManager;
      if (!vrmManager) return false;

      const success = await vrmManager.init();
      if (!success) return false;

      const loaded = await vrmManager.loadModel(modelPath);
      if (!loaded) return false;

      // 设置鼠标追踪
      vrmManager.setupMouseTracking(container);

      this.isVrmMode = true;
      return true;
    } catch (e) {
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
  }

  // 加载指定路径的Live2D模型
  async loadCustomModel(modelPath, characterName) {
    try {
      if (this.model) {
        this.app.stage.removeChild(this.model);
        this.model.destroy();
        this.model = null;
      }

      // 文件存在性已在上游缓存检查过
      this.model = await PIXI.live2d.Live2DModel.from(modelPath, {
        autoInteract: true,
        autoUpdate: true
      });

      // Live2D加载成功，清理GIF模式
      this._cleanupGifMode();

      this.setupModel();
      this.app.stage.addChild(this.model);
      this.setupInteraction();
      return true;
    } catch (error) {
      this._showModelNotFoundToast(characterName);
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
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scaleX = containerWidth / this.model.width;
    const scaleY = containerHeight / this.model.height;
    const scale = Math.min(scaleX, scaleY) * 0.8;

    this.model.scale.set(scale);
    this.model.anchor.set(0.5, 0.5);
    this.model.x = containerWidth / 2;
    this.model.y = containerHeight / 2;
  }

  setupInteraction() {
    if (!this.model) return;

    this.model.interactive = true;
    this.model.buttonMode = true;

    this.model.on('pointerdown', () => {
      this.playAnimation('tap');
    });

    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
    }
    this._onMouseMove = (e) => {
      if (this.model && this.app) {
        const rect = this.app.view.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.model.focus(x, y);
      }
    };
    document.addEventListener('mousemove', this._onMouseMove);
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

    const animations = {
      'tap': ['TapBody', 'TapHead', ''],
      'happy': ['Idle', ''],
      'idle': ['Idle', ''],
      'wave': [''],
      'normal': ['Idle', '']
    };

    const animationList = animations[type] || animations['normal'];
    const animation = animationList[Math.floor(Math.random() * animationList.length)];

    if (animation && this.model.motion) {
      this.model.motion(animation);
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

    const expressions = {
      'happy': 'f01',
      'normal': 'f01',
      'annoyed': 'f02',
      'thinking': 'f04',
      'idle': 'f01'
    };

    const expression = expressions[type] || expressions['normal'];

    try {
      if (this.model.internalModel.motionManager) {
        this.model.expression(expression);
      }
    } catch (e) {}
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
    const container = document.getElementById('live2d-container');
    const coverPath = window.characterManager?.getCoverPath() || '封面.png';

    // 移除已有的fallback元素
    const existingFallback = document.getElementById('live2d-fallback');
    if (existingFallback) existingFallback.remove();

    // 移除已有的GIF容器
    const existingGif = document.getElementById('gif-fallback-container');
    if (existingGif) existingGif.remove();

    // 隐藏canvas
    const canvas = document.getElementById('live2d-canvas');
    if (canvas) canvas.style.display = 'none';

    // 创建overlay方式的fallback图片
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
    `;
    fallbackDiv.innerHTML = `<img src="${coverPath}" style="
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    ">`;
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
    // 清理GIF相关
    this.gifElement = null;
    this.isGifMode = false;
    const gifContainer = document.getElementById('gif-fallback-container');
    if (gifContainer) gifContainer.remove();

    if (this.model) this.model.destroy();
    if (this.app) this.app.destroy(true);
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
    // 清理Live2D模型
    if (this.model) {
      this.app.stage.removeChild(this.model);
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

    // 重新加载模型（自动降级）
    if (this.isInitialized && this.app) {
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
