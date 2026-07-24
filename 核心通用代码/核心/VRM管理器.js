// VRM管理器 - 使用 three.js + @pixiv/three-vrm 渲染 VRM 模型
// 通过 <script> 标签加载（与 pixi.js 方式一致，兼容 Electron）
class VRMManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.vrm = null;
    this.clock = null;
    this.isInitialized = false;
    this._animFrameId = null;
    this._onMouseMove = null;
    this._scriptsLoaded = false;
  }

  // 通过 script 标签动态加载 three.js 和 three-vrm（UMD 方式）
  async loadScripts() {
    if (this._scriptsLoaded && window.THREE && window.THREE_VRM) return;

    const cdn = window.CDN_CONFIG || {};
    if (!window.THREE) await this._loadScript(cdn.three);
    if (!window.THREE?.GLTFLoader) await this._loadScript(cdn.threeGltfLoader);
    if (!window.THREE_VRM) await this._loadScript(cdn.threeVrm);

    this._scriptsLoaded = true;
  }

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = (e) => reject(new Error('脚本加载失败: ' + src));
      document.head.appendChild(s);
    });
  }

  // 初始化 VRM 渲染器（网页模式）
  async init() {
    try {
      await this.loadScripts();

      const canvas = document.getElementById('live2d-canvas');
      const container = document.getElementById('live2d-container');
      if (!canvas || !container) return false;

      this._setupRenderer(canvas, container.clientWidth, container.clientHeight);
      this._setupScene();
      this._startLoop();

      this._resizeHandler = () => this._handleResize();
      window.addEventListener('resize', this._resizeHandler);
      this.isInitialized = true;
      return true;
    } catch (e) {
      console.error('[VRM] 初始化失败:', e);
      return false;
    }
  }

  // 初始化 VRM 渲染器（桌宠模式）
  async initPet(petCanvas, width, height) {
    try {
      await this.loadScripts();

      this._setupRenderer(petCanvas, width, height);
      this._setupScene();
      this._startLoop();

      this.isInitialized = true;
      return true;
    } catch (e) {
      console.error('[VRM] 桌宠模式初始化失败:', e);
      return false;
    }
  }

  _setupRenderer(canvas, width, height) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    this.camera.position.set(0, 1.2, 2.5);
    this.camera.lookAt(0, 1, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(1, 2, 3);
    this.scene.add(dirLight);

    this.clock = new THREE.Clock();
  }

  // 加载 VRM 模型
  async loadModel(modelPath) {
    if (!this.isInitialized) return false;

    try {
      // 清除旧模型
      if (this.vrm) {
        this.scene.remove(this.vrm.scene);
        this.vrm.dispose();
        this.vrm = null;
      }

      const loader = new THREE.GLTFLoader();
      // 注册 VRM 插件
      loader.register((parser) => new THREE_VRM.VRMLoaderPlugin(parser));

      const gltf = await new Promise((resolve, reject) => {
        loader.load(modelPath, resolve, undefined, reject);
      });

      this.vrm = gltf.userData.vrm;

      if (this.vrm) {
        this.scene.add(this.vrm.scene);
        this._fitCameraToModel();
        return true;
      }

      return false;
    } catch (e) {
      console.error('[VRM] 模型加载失败:', e);
      return false;
    }
  }

  _fitCameraToModel() {
    if (!this.vrm) return;
    const box = new THREE.Box3().setFromObject(this.vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.8;

    this.camera.position.set(center.x, center.y + size.y * 0.2, center.z + distance);
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
  }

  _startLoop() {
    const animate = () => {
      this._animFrameId = requestAnimationFrame(animate);
      const delta = this.clock ? this.clock.getDelta() : 0.016;

      if (this.vrm) {
        this.vrm.update(delta);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  _handleResize() {
    if (!this.renderer || !this.camera) return;
    const container = document.getElementById('live2d-container');
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // 鼠标追踪
  setupMouseTracking(container) {
    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
    }
    this._onMouseMove = (e) => {
      if (!this.vrm || !this.camera) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.vrm.humanoid) {
        const head = this.vrm.humanoid.getNormalizedBoneNode('head');
        if (head) {
          head.rotation.y = x * 0.3;
          head.rotation.x = y * 0.15;
        }
      }
    };
    document.addEventListener('mousemove', this._onMouseMove);
  }

  // 播放表情
  playExpression(type) {
    if (!this.vrm || !this.vrm.expressionManager) return;

    this.vrm.expressionManager.setValue('happy', 0);
    this.vrm.expressionManager.setValue('angry', 0);
    this.vrm.expressionManager.setValue('sad', 0);
    this.vrm.expressionManager.setValue('surprised', 0);

    const expressionMap = {
      'happy': 'happy',
      'normal': 'neutral',
      'annoyed': 'angry',
      'thinking': 'surprised',
      'gentle': 'happy',
      'idle': 'neutral'
    };

    const expr = expressionMap[type] || 'neutral';
    if (expr !== 'neutral') {
      this.vrm.expressionManager.setValue(expr, 1);
    }
  }

  // 播放动画
  playAnimation(type) {
    if (!this.vrm || !this.vrm.humanoid) return;

    const spine = this.vrm.humanoid.getNormalizedBoneNode('spine');
    if (!spine) return;

    switch (type) {
      case 'tap':
        spine.rotation.z = 0.05;
        setTimeout(() => { if (spine) spine.rotation.z = 0; }, 300);
        break;
      case 'happy':
        this.vrm.scene.position.y = 0.03;
        setTimeout(() => { if (this.vrm) this.vrm.scene.position.y = 0; }, 300);
        break;
    }
  }

  // 根据 AI 回复更新表情（由 Live2DManager.updateByAIResponse 委托调用）
  // 不再重复定义关键词逻辑，使用 emotion-analyzer.js 中的共享工具

  destroy() {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
      this._onMouseMove = null;
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    if (this.vrm) {
      this.scene.remove(this.vrm.scene);
      this.vrm.dispose();
      this.vrm = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.isInitialized = false;
  }
}

window.vrmManager = new VRMManager();
