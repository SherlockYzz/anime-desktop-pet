// ========================================
//  二次元桌宠 - 精灵表渲染引擎（SpriteAtlasManager）
//  为「若曦」等基于 ChatGPT Pets v2 精灵表的角色提供
//  逐帧动画 + 16 向视线追踪 + 状态机渲染。
//  与 Codex 网页版运行时（若曦桌宠-网页版.html）同源逻辑。
//  自动降级：Live2D > VRM > 精灵表(sprite) > GIF > 静态图
// ========================================
class SpriteAtlasManager {
  constructor() {
    this.ready = false;
    this.loading = false;
    this.charId = null;

    this.atlas = null;
    this.sleepStrip = null;

    this.canvas = null;
    this.ctx = null;
    this._raf = null;
    this._last = 0;
    this._acc = 0;
    this._frames = 0;

    // 渲染尺寸（设备像素）
    this._vw = 0;
    this._vh = 0;
    this._dpr = 1;

    // 状态机
    this.S = {
      anim: 'idle', frame: 0, elapsed: 0, speed: 1,
      paused: false, work: false,
      lastInput: performance.now(),
      look: true, lookDeg: null, lookIdx: null,
      onDone: null,
    };

    // 默认清单（与 pet_manifest.json 同源，作为加载失败时的兜底）
    this.MANIFEST = null;
    this.LANE = null;
    this.CW = 192; this.CH = 208;
    this.AW = 1536; this.AH = 2288;
    this.COLS = 8; this.ROWS = 11;
    this.IDLE_TIMEOUT = 30000;
    this.LOOK_RADIUS = 420;

    this._onMouseMove = null;
    this._onInput = null;
    this._resizeObserver = null;
  }

  /** 当前角色是否配置了精灵表 */
  static isSpriteCharacter(character) {
    return !!(character && character.sprite && (character.sprite.atlas || character.sprite.manifest));
  }

  // ============ 素材加载（静态内存缓存：切模式/切画布时 0ms 瞬间复用） ============
  _loadImg(src) {
    if (!src) return Promise.resolve(null);
    if (SpriteAtlasManager._imgCache.has(src)) {
      return Promise.resolve(SpriteAtlasManager._imgCache.get(src));
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        SpriteAtlasManager._imgCache.set(src, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  _loadManifest(character) {
    const url = character?.sprite?.manifest;
    if (!url) return Promise.resolve(this._defaultManifest());
    if (SpriteAtlasManager._manifestCache.has(url)) {
      return Promise.resolve(SpriteAtlasManager._manifestCache.get(url));
    }
    return fetch(url, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        const res = (json && json.animations ? json : this._defaultManifest());
        SpriteAtlasManager._manifestCache.set(url, res);
        return res;
      })
      .catch(() => this._defaultManifest());
  }

  _defaultManifest() {
    return {
      pet: { id: 'ruoxi', displayName: '若曦', spriteVersionNumber: 2 },
      atlas: { size: { w: 1536, h: 2288 }, grid: { cols: 8, rows: 11 }, cell: { w: 192, h: 208 } },
      defaultAnimation: 'idle',
      lookTracking: { enabled: true, radiusPx: 420, stepDegrees: 22.5 },
      animations: {
        'idle':          { label: '待机呼吸', row: 0, startCol: 0, frames: 6, durations: [280,110,110,140,140,340], loop: true },
        'running-right': { label: '向右移动', row: 1, startCol: 0, frames: 8, durations: [110,110,110,110,110,110,110,190], loop: true },
        'running-left':  { label: '向左移动', row: 2, startCol: 0, frames: 8, durations: [110,110,110,110,110,110,110,190], loop: true },
        'waving':        { label: '挥手问候', row: 3, startCol: 0, frames: 4, durations: [140,140,140,300], loop: false, returnTo: 'idle' },
        'jumping':       { label: '蓄力跳跃', row: 4, startCol: 0, frames: 5, durations: [150,150,150,150,300], loop: false, returnTo: 'idle' },
        'failed':        { label: '受阻沮丧', row: 5, startCol: 0, frames: 8, durations: [160,160,160,160,160,160,160,320], loop: true },
        'waiting':       { label: '等待确认', row: 6, startCol: 0, frames: 6, durations: [170,170,170,170,170,340], loop: true },
        'running':       { label: '专注工作', row: 7, startCol: 0, frames: 6, durations: [120,120,120,120,120,240], loop: true },
        'review':        { label: '验收成果', row: 8, startCol: 0, frames: 6, durations: [200,200,200,200,200,380], loop: false, returnTo: 'idle' },
        'look-row-9':    { label: '视线 000-157.5', row: 9, startCol: 0, frames: 8, durations: [120,120,120,120,120,120,120,120], loop: false, kind: 'look' },
        'look-row-10':   { label: '视线 180-337.5', row: 10, startCol: 0, frames: 8, durations: [120,120,120,120,120,120,120,120], loop: false, kind: 'look' },
      },
      privateRows: { sleep: { source: 'sleep.png', frames: 6, durations: [340,340,340,340,340,700], label: '抱尾睡觉', loop: true } },
    };
  }

  /**
   * 为当前角色加载精灵表并绑定到指定 canvas
   * @param {object} character 角色注册对象（需含 sprite 字段）
   * @param {HTMLCanvasElement} canvas 目标画布
   * @returns {Promise<boolean>}
   */
  async loadFor(character, canvas) {
    if (!SpriteAtlasManager.isSpriteCharacter(character) || !canvas) return false;
    const cfg = character.sprite;
    this.loading = true;
    this.charId = character.id || null;
    this.setCanvas(canvas);

    const manifest = await this._loadManifest(character);
    this.MANIFEST = manifest;

    const a = manifest.atlas || {};
    this.AW = a.size?.w || 1536;
    this.AH = a.size?.h || 2288;
    this.COLS = a.grid?.cols || 8;
    this.ROWS = a.grid?.rows || 11;
    this.CW = a.cell?.w || cfg.cell?.w || 192;
    this.CH = a.cell?.h || cfg.cell?.h || 208;

    this.LANE = Object.assign({}, manifest.animations || {});
    const priv = (manifest.privateRows && manifest.privateRows.sleep) || {};
    this.LANE['sleep'] = {
      label: priv.label || '抱尾睡觉', row: -1, startCol: 0,
      frames: priv.frames || 6, durations: priv.durations || [340,340,340,340,340,700],
      loop: true, kind: 'private',
    };

    const look = manifest.lookTracking || {};
    this.LOOK_RADIUS = look.radiusPx || 420;

    const atlasUrl = cfg.atlas || (manifest.atlas && manifest.atlas.file);
    const sleepUrl = cfg.sleepStrip || (priv.source ? priv.source : null);

    const [atlasImg, sleepImg] = await Promise.all([
      this._loadImg(atlasUrl),
      sleepUrl ? this._loadImg(sleepUrl) : Promise.resolve(null),
    ]);

    if (!atlasImg) {
      this.loading = false;
      this.ready = false;
      return false;
    }

    this.atlas = atlasImg;
    this.sleepStrip = sleepImg;
    this.ready = true;
    this.loading = false;

    this.S.anim = manifest.defaultAnimation && this.LANE[manifest.defaultAnimation] ? manifest.defaultAnimation : 'idle';
    this.S.frame = 0; this.S.elapsed = 0; this.S.paused = false;
    this.S.lastInput = performance.now();

    this.bindInput();
    this.bindResizeObserver();
    this.resize();
    // ★ 容器若在隐藏/过渡状态，宽度会测成 0 而回退为单元格尺寸；延迟再测一次确保按真实容器铺满
    requestAnimationFrame(() => this.resize());
    setTimeout(() => this.resize(), 400);
    this._last = performance.now();
    this.startLoop();
    return true;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const parentRect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
    // 优先用自身尺寸；自身为 0（隐藏态）时退回父容器尺寸；仍为 0 才用单元格尺寸兜底
    const rawW = rect.width || this.canvas.clientWidth || (parentRect && parentRect.width) || this.CW;
    const rawH = rect.height || this.canvas.clientHeight || (parentRect && parentRect.height) || this.CH;
    const cssW = Math.max(1, Math.round(rawW));
    const cssH = Math.max(1, Math.round(rawH));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pxW = Math.round(cssW * dpr), pxH = Math.round(cssH * dpr);
    // 尺寸未变则不重建画布（避免每帧 clear）
    if (this._vw === cssW && this._vh === cssH && this.canvas.width === pxW && this.canvas.height === pxH) return;
    this._dpr = dpr;
    this._vw = cssW; this._vh = cssH;
    this.canvas.width = pxW;
    this.canvas.height = pxH;
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.draw();
  }

  /** 监听画布尺寸变化（窗口缩放、模式切换显隐）自动重绘 */
  bindResizeObserver() {
    this.unbindResizeObserver();
    if (typeof ResizeObserver === 'undefined') return;
    const target = this.canvas ? (this.canvas.parentElement || this.canvas) : null;
    if (!target) return;
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(target);
  }

  unbindResizeObserver() {
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
  }

  // ============ 渲染 ============
  _cellBox(lane, frame) {
    const a = this.LANE[lane] || this.LANE['idle'];
    const col = (a.startCol || 0) + frame;
    if (a.kind === 'private') return { img: this.sleepStrip, sx: col * this.CW, sy: 0 };
    return { img: this.atlas, sx: col * this.CW, sy: a.row * this.CH };
  }

  draw() {
    if (!this.ready || !this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const dpr = this._dpr;
    const vw = this._vw * dpr, vh = this._vh * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const { img, sx, sy } = this._cellBox(this.S.anim, this.S.frame);
    if (!img) return;

    // 等比缩放，居中；留少量安全边距
    const pad = 0.06;
    const scale = Math.min(vw / this.CW, vh / this.CH) * (1 - pad);
    const dw = this.CW * scale, dh = this.CH * scale;
    const dx = (vw - dw) / 2, dy = (vh - dh) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, this.CW, this.CH, dx, dy, dw, dh);
  }

  // ============ 状态机 ============
  hasAnim(name) { return !!(this.LANE && this.LANE[name]); }

  setAnim(name, onDone) {
    if (!this.hasAnim(name)) return;
    this.S.anim = name;
    this.S.frame = 0;
    this.S.elapsed = 0;
    this.S.onDone = null;
    const a = this.LANE[name];
    if (!a.loop) this.S.onDone = onDone || (() => this.goIdle());
    this.draw();
  }

  goIdle() { this.S.work = false; this.setAnim('idle'); }
  wave() { this.S.work = false; this.setAnim('waving'); }
  jump() { this.S.work = false; this.setAnim('jumping'); }
  review() { this.S.work = false; this.setAnim('review'); }
  fail() { this.setAnim('failed'); }
  wait() { this.setAnim('waiting'); }

  toggleWork(on) {
    this.S.work = (typeof on === 'boolean') ? on : !this.S.work;
    this.setAnim(this.S.work ? 'running' : 'idle');
  }

  advance() {
    const a = this.LANE[this.S.anim];
    if (!a) return;
    if (this.S.frame < a.frames - 1) this.S.frame++;
    else if (a.loop) this.S.frame = 0;
    else { const cb = this.S.onDone; this.S.onDone = null; if (cb) cb(); }
  }

  markInput() {
    this.S.lastInput = performance.now();
    if (this.S.anim === 'sleep') this.goIdle();
  }

  startLoop() {
    this.stopLoop();
    this._last = performance.now();
    const tick = (now) => {
      this._raf = requestAnimationFrame(tick);
      this._step(now);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stopLoop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _step(now) {
    if (!this.ready) return;
    this.resize();
    const dt = Math.min(now - this._last, 100);
    this._last = now;
    if (!this.S.paused) {
      const a = this.LANE[this.S.anim];
      if (a) {
        if (a.kind !== 'look') {
          const dur = (a.durations[Math.min(this.S.frame, a.durations.length - 1)] || 120) / this.S.speed;
          this.S.elapsed += dt;
          if (this.S.elapsed >= dur) { this.S.elapsed -= dur; if (this.S.elapsed > dur) this.S.elapsed = 0; this.advance(); }
        }
        if (this.S.anim === 'idle' && !this.S.work && now - this.S.lastInput > this.IDLE_TIMEOUT) {
          this.setAnim('sleep');
        }
      }
    }
    this.draw();
  }

  // ============ 16 向视线追踪 ============
  lookStep(mx, my) {
    if (!this.canvas) return null;
    const r = this.canvas.getBoundingClientRect();
    const dx = mx - (r.left + r.width / 2);
    const dy = my - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) > this.LOOK_RADIUS) return null;
    const deg = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    const idx = Math.round(deg / 22.5) % 16;
    return { deg, idx, lane: idx < 8 ? 'look-row-9' : 'look-row-10', frame: idx < 8 ? idx : idx - 8 };
  }

  bindInput() {
    this.unbindInput();
    this._onMouseMove = (e) => {
      if (!this.ready || !this.S.look || this.S.paused) return;
      if (!['idle', 'look-row-9', 'look-row-10'].includes(this.S.anim)) return;
      const r = this.lookStep(e.clientX, e.clientY);
      if (!r) {
        if (this.S.anim !== 'idle') { this.S.anim = 'idle'; this.S.frame = 0; this.S.onDone = null; }
        this.S.lookDeg = null; this.S.lookIdx = null;
        return;
      }
      this.S.lookDeg = r.deg; this.S.lookIdx = r.idx;
      if (this.S.anim !== r.lane || this.S.frame !== r.frame) {
        this.S.anim = r.lane; this.S.frame = r.frame; this.S.onDone = null; this.S.elapsed = 0;
      }
    };
    this._onInput = () => this.markInput();
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onInput);
    document.addEventListener('keydown', this._onInput);
  }

  unbindInput() {
    if (this._onMouseMove) document.removeEventListener('mousemove', this._onMouseMove);
    if (this._onInput) {
      document.removeEventListener('mousedown', this._onInput);
      document.removeEventListener('keydown', this._onInput);
    }
    this._onMouseMove = null; this._onInput = null;
  }

  // ============ 与现有 Live2D/VRM 接口对齐 ============
  /** 情绪动画映射：复用 Live2D 的动作语义 */
  playAnimation(type) {
    if (!this.ready) return;
    const map = {
      'tap': 'waving', 'happy': 'jumping', 'idle': 'idle',
      'wave': 'waving', 'sleep': 'sleep', 'surprised': 'jumping',
      'wakeup': 'idle', 'normal': 'idle', 'review': 'review',
      'running': 'running', 'failed': 'failed', 'waiting': 'waiting',
    };
    const target = map[type] || 'idle';
    // 非循环动作若正在播放，不打断
    const cur = this.LANE[this.S.anim];
    if (cur && !cur.loop && this.S.anim !== 'look-row-9' && this.S.anim !== 'look-row-10') return;
    this.setAnim(target);
  }

  updateByAIResponse(text) {
    if (!this.ready || typeof analyzeAIContent !== 'function') return;
    const emotion = analyzeAIContent(text || '');
    const map = {
      tsukkomi: 'failed', jealous: 'failed', gentle: 'review',
      thinking: 'waiting', happy: 'jumping', sad: 'idle',
      surprised: 'jumping', playful: 'waving', normal: 'idle',
    };
    const cur = this.LANE[this.S.anim];
    if (cur && !cur.loop) return;
    this.setAnim(map[emotion] || 'idle');
  }

  triggerIdle() { this.goIdle(); }

  destroy() {
    this.stopLoop();
    this.unbindInput();
    this.unbindResizeObserver();
    this.ready = false;
    this.loading = false;
    // 不强制清空 atlas/sleepStrip，保留给全局缓存复用
    this.canvas = null;
    this.ctx = null;
  }
}

// 静态资源缓存池（单例内存常驻，毫秒级跨画布迁移）
SpriteAtlasManager._imgCache = new Map();
SpriteAtlasManager._manifestCache = new Map();

// 显式挂到 window：class 是词法全局，不挂 window 属性（兼容性与明确性）
window.SpriteAtlasManager = SpriteAtlasManager;
window.spriteAtlasManager = new SpriteAtlasManager();
