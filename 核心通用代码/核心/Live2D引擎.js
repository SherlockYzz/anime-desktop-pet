// 加藤惠桌宠 - Live2D管理器（本地模型版）
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
      const pixiScript = document.createElement('script');
      pixiScript.src = 'https://cdn.jsdelivr.net/npm/pixi.js@7.3.3/dist/pixi.min.js';
      pixiScript.onload = () => {
        const live2dScript = document.createElement('script');
        live2dScript.src = 'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js';
        live2dScript.onload = resolve;
        live2dScript.onerror = reject;
        document.head.appendChild(live2dScript);
      };
      pixiScript.onerror = reject;
      document.head.appendChild(pixiScript);
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

  // 加载当前角色的本地Live2D模型
  async loadCharacterModel() {
    const character = window.characterManager?.getCurrentCharacter();
    if (!character?.live2d?.modelPath) {
      // 没有配置Live2D模型，尝试GIF降级
      const gifLoaded = await this.loadGifFallback();
      if (!gifLoaded) {
        this.showFallback();
      }
      return false;
    }

    const success = await this.loadCustomModel(character.live2d.modelPath, character.name);
    if (!success) {
      // Live2D加载失败，尝试GIF降级
      const gifLoaded = await this.loadGifFallback();
      if (!gifLoaded) {
        this.showFallback();
      }
    }
    return success;
  }

  // 加载指定路径的Live2D模型
  async loadCustomModel(modelPath, characterName) {
    try {
      if (this.model) {
        this.app.stage.removeChild(this.model);
        this.model.destroy();
        this.model = null;
      }

      // 先检查模型文件是否存在
      try {
        const resp = await fetch(modelPath);
        if (!resp.ok) {
          throw new Error(`模型文件不存在: ${resp.status}`);
        }
      } catch (fetchError) {
        this._showModelNotFoundToast(characterName);
        return false;
      }

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
    const tsukkomiWords = ['真是的', '所以说', '脑回路', '是吗', '哦？', '原来', '我倒是无所谓'];
    const gentleWords = ['没关系', '慢慢来', '一直都在', '支持你', '加油', '陪着你', '休息'];
    const jealousWords = ['是谁呀', '无所谓啦', '忘了', '生气', '记着', '算账'];
    const thinkingWords = ['嗯', '呼嗯', '让我想想'];

    if (tsukkomiWords.some(word => text.includes(word))) {
      this.updateMood('annoyed');
      this.playAnimation('tap');
    } else if (jealousWords.some(word => text.includes(word))) {
      this.updateMood('annoyed');
      this.playAnimation('normal');
    } else if (gentleWords.some(word => text.includes(word))) {
      this.updateMood('gentle');
      this.playAnimation('happy');
    } else if (thinkingWords.some(word => text.includes(word))) {
      this.updateMood('thinking');
      this.playAnimation('idle');
    } else {
      this.updateMood('normal');
      this.playAnimation('normal');
    }
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

    // 尝试加载GIF
    const gifLoaded = await this.loadGifFallback();
    if (!gifLoaded) {
      // 如果没有GIF，显示封面图
      this.showFallback();
      return false;
    }
    return true;
  }

  // 切换到网页模式（显示封面图或Live2D）
  switchToWebMode() {
    // 清理GIF模式
    this._cleanupGifMode();

    // 如果有Live2D模型，重新加载
    if (this.isInitialized && this.app) {
      this.loadCharacterModel();
    } else {
      // 显示封面图
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
