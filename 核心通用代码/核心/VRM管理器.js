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
    this._loadSeq = 0;
    this._vrmCache = new Map();
    this._activeAnim = null;
    this._nextGestureAt = 8 + Math.random() * 6;
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

      let canvas = document.getElementById('vrm-canvas');
      const container = document.getElementById('live2d-container');
      if (!canvas && container) {
        canvas = document.createElement('canvas');
        canvas.id = 'vrm-canvas';
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:auto;cursor:pointer;';
        container.appendChild(canvas);
      }
      if (!canvas || !container) return false;

      const live2dCanvas = document.getElementById('live2d-canvas');
      if (live2dCanvas) live2dCanvas.style.display = 'none';
      const spriteCanvas = document.getElementById('sprite-canvas');
      if (spriteCanvas) spriteCanvas.style.display = 'none';
      canvas.style.display = 'block';

      this._setupRenderer(canvas, container.clientWidth, container.clientHeight);
      this._setupScene(container.clientWidth, container.clientHeight);
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

      let canvas = petCanvas || document.getElementById('pet-vrm-canvas');
      const area = document.getElementById('pet-character-area');
      if (!canvas && area) {
        canvas = document.createElement('canvas');
        canvas.id = 'pet-vrm-canvas';
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:auto;cursor:pointer;';
        area.appendChild(canvas);
      }
      if (!canvas) return false;

      const pLive2d = document.getElementById('pet-canvas');
      if (pLive2d) pLive2d.style.display = 'none';
      const pSprite = document.getElementById('pet-sprite-canvas');
      if (pSprite) pSprite.style.display = 'none';
      canvas.style.display = 'block';

      this._setupRenderer(canvas, width, height);
      this._setupScene(width, height);
      this._startLoop();

      this.isInitialized = true;
      return true;
    } catch (e) {
      console.error('[VRM] 桌宠模式初始化失败:', e);
      return false;
    }
  }

  _setupRenderer(canvas, width, height) {
    const w = Math.max(200, width || 380);
    const h = Math.max(300, height || 570);
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setClearColor(0x000000, 0);
  }

  _setupScene(width, height) {
    this.scene = new THREE.Scene();
    const w = Math.max(200, width || 380);
    const h = Math.max(300, height || 570);
    const aspect = w / h;
    this.camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 20);
    this.camera.position.set(0, 1.2, 2.5);
    this.camera.lookAt(0, 1, 0);

    // ★ 清爽冷白柔光：中和皮肤贴图暖黄底色，白皙通透且不过曝
    const ambientLight = new THREE.AmbientLight(0xf6f9ff, 0.94);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf8fbff, 0.42);
    keyLight.position.set(0.8, 2.0, 2.8);
    this.scene.add(keyLight);

    this.clock = new THREE.Clock();
    this._idleTime = 0;
    this._nextBlinkAt = 2.5 + Math.random() * 2.5;
    this._blinkProgress = -1;
    this._armBaseZ = 1.32;
    this._nodAnim = null;
  }

  // 加载 VRM 模型（带内存缓存：面板↔桌宠切换与二次切换实现秒级加载）
  async loadModel(modelPath) {
    if (!this.isInitialized || !this.scene) return false;

    const currentSeq = ++this._loadSeq;

    try {
      // 从场景摘下旧模型（保留在缓存中不销毁，避免重复 4~5 秒解析）
      if (this.vrm) {
        if (this.scene && this.vrm.scene) this.scene.remove(this.vrm.scene);
        this.vrm = null;
      }

      // ★ 命中内存缓存：直接复用已解析的 VRM 实例（< 50ms 秒切）
      if (this._vrmCache.has(modelPath)) {
        this.vrm = this._vrmCache.get(modelPath);
        if (this.vrm && this.scene) {
          this.scene.add(this.vrm.scene);
          this._applyNaturalIdlePose();
          this._fitCameraToModel();
          return true;
        }
      }

      const loader = new THREE.GLTFLoader();
      // 注册 VRM 插件
      loader.register((parser) => new THREE_VRM.VRMLoaderPlugin(parser));

      const gltf = await new Promise((resolve, reject) => {
        loader.load(modelPath, resolve, undefined, reject);
      });

      // 如果加载过程中已经被销毁或有新请求，安全放弃
      if (this._loadSeq !== currentSeq || !this.isInitialized || !this.scene) {
        if (gltf.userData?.vrm) {
          try { gltf.userData.vrm.dispose(); } catch (e) {}
        }
        return false;
      }

      this.vrm = gltf.userData.vrm;

      if (this.vrm && this.scene) {
        // VRM 0.0 模型默认背对 +Z，按规范旋转 180° 面向相机（仅首次加载旋转一次）
        if (window.THREE_VRM?.VRMUtils?.rotateVRM0) {
          THREE_VRM.VRMUtils.rotateVRM0(this.vrm);
        }
        this._vrmCache.set(modelPath, this.vrm);
        this.scene.add(this.vrm.scene);
        this._applyNaturalIdlePose();
        this._fitCameraToModel();
        return true;
      }

      return false;
    } catch (e) {
      if (this._loadSeq === currentSeq) {
        console.error('[VRM] 模型加载失败:', e);
      }
      return false;
    }
  }

  /** 将默认僵硬 T-pose 调整为柔和贴身自然站姿 + 十指微蜷 */
  _applyNaturalIdlePose() {
    const h = this.vrm?.humanoid;
    if (!h) return;
    try {
      // 目标最终贴身垂手角度约 1.32 rad (~76°)，告别大字外斜僵硬感
      this._armBaseZ = 1.32;

      const lUpper = h.getNormalizedBoneNode('leftUpperArm');
      const rUpper = h.getNormalizedBoneNode('rightUpperArm');
      const lLower = h.getNormalizedBoneNode('leftLowerArm');
      const rLower = h.getNormalizedBoneNode('rightLowerArm');
      const lHand = h.getNormalizedBoneNode('leftHand');
      const rHand = h.getNormalizedBoneNode('rightHand');
      // ★ 在 VRM 0.0 规范 + rotateVRM0 面向 +Z 下：左臂 +Z 向下贴近身侧、右臂 -Z 向下贴近身侧
      if (lUpper) { lUpper.rotation.set(0.08, 0.06, this._armBaseZ); }
      if (rUpper) { rUpper.rotation.set(0.08, -0.06, -this._armBaseZ); }
      if (lLower) { lLower.rotation.set(0.06, -0.22, 0.14); }
      if (rLower) { rLower.rotation.set(0.06, 0.22, -0.14); }
      if (lHand) { lHand.rotation.set(0.04, 0, 0.08); }
      if (rHand) { rHand.rotation.set(0.04, 0, -0.08); }

      // ★ 十指自然微蜷（彻底告别僵直摊手掌）
      const fingers = ['Index', 'Middle', 'Ring', 'Little'];
      for (const side of ['left', 'right']) {
        const sign = side === 'left' ? 1 : -1;
        for (let i = 0; i < fingers.length; i++) {
          const curl = 0.22 + i * 0.06;
          const p = h.getNormalizedBoneNode(`${side}${fingers[i]}Proximal`);
          const m = h.getNormalizedBoneNode(`${side}${fingers[i]}Intermediate`);
          const d = h.getNormalizedBoneNode(`${side}${fingers[i]}Distal`);
          if (p) p.rotation.z = sign * curl;
          if (m) m.rotation.z = sign * (curl * 1.1);
          if (d) d.rotation.z = sign * (curl * 0.6);
        }
        const thumbP = h.getNormalizedBoneNode(`${side}ThumbProximal`);
        const thumbD = h.getNormalizedBoneNode(`${side}ThumbDistal`);
        if (thumbP) { thumbP.rotation.y = -sign * 0.25; thumbP.rotation.z = sign * 0.12; }
        if (thumbD) { thumbD.rotation.y = -sign * 0.18; }
      }

      this.vrm.update(0.016);
      // ★ 重置物理弹簧骨（消除 rotateVRM0 瞬转 180° 导致的头发甩到脸上与裙摆飞起）
      try {
        this.vrm.springBoneManager?.reset?.();
        this.vrm.update(0.016);
      } catch (e) {}
    } catch (e) {}
  }

  _fitCameraToModel() {
    if (!this.vrm || !this.camera) return;
    this.vrm.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 按人物身高精确计算全身居框距离，确保饱满居中、不裁头不裁脚
    const vFovRad = (this.camera.fov * Math.PI) / 180;
    const fitHeightDist = (size.y * 0.56) / Math.tan(vFovRad / 2);
    const distance = Math.max(fitHeightDist, 1.5);

    this.camera.position.set(center.x, center.y + size.y * 0.02, center.z + distance);
    this.camera.lookAt(center.x, center.y, center.z);
    this.camera.updateProjectionMatrix();
  }

  /** 供桌宠模式缩放滑动窗口实时同步 VRM 画布尺寸（严格等比，修复放大反缩小） */
  resize(width, height) {
    if (!this.renderer || !this.camera) return;
    const w = Math.max(200, Math.round(width || 380));
    const h = Math.max(300, Math.round(height || 570));
    this.renderer.setSize(w, h, true);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _startLoop() {
    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
    const animate = () => {
      if (this._paused) {
        this._animFrameId = null;
        return;
      }
      this._animFrameId = requestAnimationFrame(animate);
      const delta = Math.min(0.05, this.clock ? this.clock.getDelta() : 0.016);

      if (this.vrm) {
        this._idleTime = (this._idleTime || 0) + delta;
        const t = this._idleTime;
        // ★ 极度稳定柔和的微呼吸（绝不左右摇晃抽搐、绝不乱抬手）
        const breath = Math.sin(t * 1.6);
        const baseZ = this._armBaseZ ?? 1.32;
        const h = this.vrm.humanoid;

        if (h) {
          const chest = h.getNormalizedBoneNode('chest') || h.getNormalizedBoneNode('spine');
          const lUpper = h.getNormalizedBoneNode('leftUpperArm');
          const rUpper = h.getNormalizedBoneNode('rightUpperArm');

          if (chest) {
            chest.rotation.x = breath * 0.014;
          }
          if (lUpper) {
            lUpper.rotation.z = baseZ - breath * 0.012;
          }
          if (rUpper) {
            rUpper.rotation.z = -baseZ + breath * 0.012;
          }

          // ★ 点击分部位零开销自然反馈（摸头歪头蹭 / 戳身俏皮微扭 / 连击鼓嘴轻跳，全部严格限幅在自然关节角度内）
          if (this._nodAnim) {
            this._nodAnim.t += delta;
            const p = Math.min(1, this._nodAnim.t / this._nodAnim.dur);
            const env = Math.sin(p * Math.PI);
            const mode = this._nodAnim.part || 'body';
            const spine = h.getNormalizedBoneNode('spine');
            const head = h.getNormalizedBoneNode('head');
            const lLower = h.getNormalizedBoneNode('leftLowerArm');
            const rLower = h.getNormalizedBoneNode('rightLowerArm');

            if (mode === 'head') {
              // 摸头：温柔歪头 + 轻柔舒展
              if (head) head.rotation.z = env * 0.14;
              if (chest) chest.rotation.x = breath * 0.014 - env * 0.03;
              this.vrm.scene.position.y = env * 0.01;
            } else if (mode === 'rage') {
              // 连点暴走：鼓嘴抗议 + 轻微左右摇头 + 小跳
              if (head) head.rotation.y = Math.sin(p * Math.PI * 4) * 0.14 * env;
              this.vrm.scene.position.y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.028;
              if (lUpper) lUpper.rotation.z = baseZ - env * 0.12;
              if (rUpper) rUpper.rotation.z = -baseZ + env * 0.12;
            } else {
              // 戳身体：轻俏微扭腰 + 轻点头 + 前臂柔和微收（绝不折臂）
              if (spine) spine.rotation.y = Math.sin(p * Math.PI * 2) * 0.08 * env;
              if (chest) chest.rotation.x = breath * 0.014 + env * 0.04;
              if (lLower) lLower.rotation.y = -0.22 - env * 0.18;
              if (rLower) rLower.rotation.y = 0.22 + env * 0.18;
              this.vrm.scene.position.y = env * 0.016;
            }

            if (p >= 1) {
              this.vrm.scene.position.y = 0;
              if (head) head.rotation.z = 0;
              if (spine) spine.rotation.y = 0;
              if (lLower) lLower.rotation.y = -0.22;
              if (rLower) rLower.rotation.y = 0.22;
              this._nodAnim = null;
            }
          }
        }
        // 自然随机眨眼（每 2.8~6 秒轻眨一次）
        const em = this.vrm.expressionManager;
        if (em) {
          if (this._blinkProgress < 0 && this._idleTime >= (this._nextBlinkAt || 3)) {
            this._blinkProgress = 0;
          }
          if (this._blinkProgress >= 0) {
            this._blinkProgress += delta / 0.16;
            const w = this._blinkProgress <= 1
              ? Math.sin(this._blinkProgress * Math.PI)
              : 0;
            try { em.setValue('blink', Math.max(0, Math.min(1, w))); } catch (e) {}
            if (this._blinkProgress >= 1) {
              this._blinkProgress = -1;
              this._nextBlinkAt = this._idleTime + 2.8 + Math.random() * 3.2;
            }
          }
        }
        this.vrm.update(delta);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  /** 窗口隐藏/显示时暂停或恢复 VRM 渲染循环 */
  setPaused(paused) {
    this._paused = !!paused;
    if (this._paused) {
      if (this._animFrameId) {
        cancelAnimationFrame(this._animFrameId);
        this._animFrameId = null;
      }
    } else if (this.vrm && !this._animFrameId) {
      if (this.clock) this.clock.getDelta();
      this._startLoop();
    }
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

  /** 零开销分部位点击互动（摸头 head / 戳身 body / 连击 rage），不加载额外文件 */
  playPartAnimation(part = 'body') {
    if (!this.vrm || !this.vrm.humanoid) return;
    const durMap = { head: 0.9, body: 0.75, rage: 0.95 };
    this._nodAnim = { part, t: 0, dur: durMap[part] || 0.75 };
    const expr = part === 'rage' ? 'annoyed' : 'happy';
    this.playExpression(expr);
    if (this._exprResetTimer) clearTimeout(this._exprResetTimer);
    this._exprResetTimer = setTimeout(() => this.playExpression('idle'), 1500);
  }

  // 播放柔和反馈动画（轻点头 + 微笑表情，绝不鬼畜折臂）
  playAnimation(type) {
    if (!this.vrm || !this.vrm.humanoid) return;
    if (type === 'idle') {
      this._nodAnim = null;
      return;
    }
    this.playPartAnimation(type === 'rage' ? 'rage' : (type === 'head' ? 'head' : 'body'));
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
    // ★ 仅从当前场景摘下 VRM，保留在 _vrmCache 中，避免模式切换时重复 4~5 秒重载
    if (this.vrm) {
      if (this.scene && this.vrm.scene) this.scene.remove(this.vrm.scene);
      this.vrm = null;
    }
    if (this.renderer) {
      try { this.renderer.dispose(); } catch (e) {}
      this.renderer = null;
    }
    const canvas = document.getElementById('vrm-canvas');
    if (canvas) canvas.style.display = 'none';
    const petCanvas = document.getElementById('pet-vrm-canvas');
    if (petCanvas) petCanvas.style.display = 'none';
    this.scene = null;
    this.camera = null;
    this.isInitialized = false;
  }
}

window.vrmManager = new VRMManager();
