/**
 * ⬡ Hex FRVR (六边形消除) - 核心引擎
 * 严守规范：61格轴坐标系(Axial q,r,s)、三向常数线消除、动态DPR、防遮挡触控抬升与防暴毙发牌
 */
(function(window) {
    'use strict';

    // 六边形组合块定义 (坐标为相对 Axial 偏移)
    const HEX_SHAPES = [
        // 1. 单格
        { name: 'single', cells: [{q:0, r:0}], color: '#00f0ff' },
        
        // 2. 双格连线 (3 个方向)
        { name: 'line2_q', cells: [{q:0, r:0}, {q:1, r:0}], color: '#38bdf8' },
        { name: 'line2_r', cells: [{q:0, r:0}, {q:0, r:1}], color: '#38bdf8' },
        { name: 'line2_s', cells: [{q:0, r:0}, {q:1, r:-1}], color: '#38bdf8' },

        // 3. 三格连线 (3 个方向)
        { name: 'line3_q', cells: [{q:0, r:0}, {q:1, r:0}, {q:2, r:0}], color: '#818cf8' },
        { name: 'line3_r', cells: [{q:0, r:0}, {q:0, r:1}, {q:0, r:2}], color: '#818cf8' },
        { name: 'line3_s', cells: [{q:0, r:0}, {q:1, r:-1}, {q:2, r:-2}], color: '#818cf8' },

        // 4. 四格连线 (3 个方向)
        { name: 'line4_q', cells: [{q:0, r:0}, {q:1, r:0}, {q:2, r:0}, {q:3, r:0}], color: '#c084fc' },
        { name: 'line4_r', cells: [{q:0, r:0}, {q:0, r:1}, {q:0, r:2}, {q:0, r:3}], color: '#c084fc' },
        { name: 'line4_s', cells: [{q:0, r:0}, {q:1, r:-1}, {q:2, r:-2}, {q:3, r:-3}], color: '#c084fc' },

        // 5. 三角形 3 格
        { name: 'tri_1', cells: [{q:0, r:0}, {q:1, r:0}, {q:0, r:1}], color: '#fbbf24' },
        { name: 'tri_2', cells: [{q:0, r:0}, {q:1, r:0}, {q:1, r:-1}], color: '#fbbf24' },
        { name: 'tri_3', cells: [{q:0, r:0}, {q:0, r:1}, {q:-1, r:1}], color: '#fbbf24' },

        // 6. 菱形 4 格
        { name: 'rhombus_1', cells: [{q:0, r:0}, {q:1, r:0}, {q:0, r:1}, {q:1, r:1}], color: '#f43f5e' },
        { name: 'rhombus_2', cells: [{q:0, r:0}, {q:1, r:0}, {q:1, r:-1}, {q:2, r:-1}], color: '#f43f5e' },

        // 7. 稀有超级花环 7 格
        { name: 'ring7', cells: [
            {q:0, r:0}, {q:1, r:0}, {q:0, r:1}, 
            {q:-1, r:1}, {q:-1, r:0}, {q:0, r:-1}, {q:1, r:-1}
        ], color: '#ec4899' }
    ];

    class HexGame {
        constructor() {
            this.RADIUS = 4; // 边长为 5，网格半径 4 (共 61 格)
            this.grid = new Map(); // key: "q,r" -> color

            this.score = 0;
            this.highScore = window.SafeStorage.get('hex_frvr_high_score', 0);
            this.combo = 0;
            this.isGameOver = false;
            this.isPaused = false;

            this.audio = new window.AudioEngine();
            this.bridge = new window.UniversalBridge('hex-frvr');
            this.bridge.bindGame(this);

            this.docks = [null, null, null];
            this.particles = [];
            this.shake = { intensity: 0, duration: 0, startTime: 0 };

            this.dragState = {
                active: false,
                slotIndex: -1,
                shape: null,
                currX: 0,
                currY: 0,
                isTouch: false,
                liftOffset: 70
            };

            this.canvas = document.getElementById('hex-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.dockElements = [
                document.getElementById('slot-0'),
                document.getElementById('slot-1'),
                document.getElementById('slot-2')
            ];

            this._initDPI();
            this._bindEvents();
            this.restart();
            this._startLoop();

            this.bridge.emit('ON_READY', { game: 'hex-frvr' });
        }

        _initDPI() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = rect.width > 0 ? rect.width : (this.canvas.clientWidth || 360);
            const h = rect.height > 0 ? rect.height : (this.canvas.clientHeight || 360);
            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.dpr = dpr;

            this.centerX = this.canvas.width / 2;
            this.centerY = this.canvas.height / 2;
            // 61格最大跨度：直径 9 格，自适应半径
            this.hexRadius = (this.canvas.width / 2) / 8.5;
        }

        restart() {
            this.grid.clear();
            // 初始化 61 格蜂巢网格
            for (let q = -this.RADIUS; q <= this.RADIUS; q++) {
                const r1 = Math.max(-this.RADIUS, -q - this.RADIUS);
                const r2 = Math.min(this.RADIUS, -q + this.RADIUS);
                for (let r = r1; r <= r2; r++) {
                    this.grid.set(`${q},${r}`, null);
                }
            }

            this.score = 0;
            this.combo = 0;
            this.isGameOver = false;
            this.isPaused = false;
            this.particles = [];
            this._updateScoreUI();
            this._spawnDocks();
            document.getElementById('game-over-modal')?.classList.remove('active');
        }

        pause() {
            this.isPaused = true;
            document.getElementById('pause-modal')?.classList.add('active');
        }

        resume() {
            this.isPaused = false;
            document.getElementById('pause-modal')?.classList.remove('active');
        }

        /**
         * 发牌保底算法：第 1 个手牌确保能放入当前蜂巢
         */
        _spawnDocks() {
            for (let i = 0; i < 3; i++) {
                if (i === 0) {
                    const validShapes = HEX_SHAPES.filter(s => this._canPlaceAnywhere(s.cells));
                    this.docks[i] = validShapes.length > 0
                        ? validShapes[Math.floor(Math.random() * validShapes.length)]
                        : HEX_SHAPES[Math.floor(Math.random() * HEX_SHAPES.length)];
                } else {
                    this.docks[i] = HEX_SHAPES[Math.floor(Math.random() * HEX_SHAPES.length)];
                }
            }
            this._renderDockElements();
            this._checkGameOver();
        }

        _renderDockElements() {
            this.dockElements.forEach((el, idx) => {
                el.innerHTML = '';
                const shape = this.docks[idx];
                if (!shape) return;

                const pieceCanvas = document.createElement('canvas');
                const boxSize = 75;
                pieceCanvas.width = boxSize * this.dpr;
                pieceCanvas.height = boxSize * this.dpr;
                pieceCanvas.style.width = `${boxSize}px`;
                pieceCanvas.style.height = `${boxSize}px`;

                const pCtx = pieceCanvas.getContext('2d');
                pCtx.scale(this.dpr, this.dpr);

                // 计算手牌形状边界以居中显示
                const previewRadius = 9;
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                shape.cells.forEach(c => {
                    const px = previewRadius * (Math.sqrt(3) * c.q + (Math.sqrt(3) / 2) * c.r);
                    const py = previewRadius * (1.5 * c.r);
                    minX = Math.min(minX, px);
                    maxX = Math.max(maxX, px);
                    minY = Math.min(minY, py);
                    maxY = Math.max(maxY, py);
                });

                const offsetX = (boxSize - (minX + maxX)) / 2;
                const offsetY = (boxSize - (minY + maxY)) / 2;

                shape.cells.forEach(c => {
                    const px = offsetX + previewRadius * (Math.sqrt(3) * c.q + (Math.sqrt(3) / 2) * c.r);
                    const py = offsetY + previewRadius * (1.5 * c.r);
                    this._drawHexagon(pCtx, px, py, previewRadius - 1.2, shape.color, true);
                });

                el.appendChild(pieceCanvas);
            });
        }

        _bindEvents() {
            window.addEventListener('resize', () => this._initDPI());

            this.dockElements.forEach((slotEl, idx) => {
                slotEl.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    if (this.isGameOver || this.isPaused || !this.docks[idx]) return;

                    this.dragState.active = true;
                    this.dragState.slotIndex = idx;
                    this.dragState.shape = this.docks[idx];
                    this.dragState.isTouch = e.pointerType === 'touch';

                    const pt = this._getCanvasPoint(e);
                    this.dragState.currX = pt.x;
                    this.dragState.currY = pt.y - (this.dragState.isTouch ? this.dragState.liftOffset : 0);
                    slotEl.style.opacity = '0.3';
                });
            });

            window.addEventListener('pointermove', (e) => {
                if (!this.dragState.active) return;
                e.stopPropagation();
                const pt = this._getCanvasPoint(e);
                this.dragState.currX = pt.x;
                this.dragState.currY = pt.y - (this.dragState.isTouch ? this.dragState.liftOffset : 0);
            }, { passive: false });

            window.addEventListener('pointerup', (e) => {
                if (!this.dragState.active) return;
                e.stopPropagation();
                this._handleDrop();
            });

            window.addEventListener('pointercancel', (e) => {
                if (!this.dragState.active) return;
                e.stopPropagation();
                this._cancelDrag();
            });

            document.getElementById('btn-restart')?.addEventListener('click', () => this.restart());
            document.getElementById('btn-mute')?.addEventListener('click', () => {
                const isMuted = this.audio.toggleMute();
                document.getElementById('btn-mute').textContent = isMuted ? '🔇' : '🔊';
            });
            document.getElementById('btn-help')?.addEventListener('click', () => {
                document.getElementById('help-modal')?.classList.add('active');
            });
            document.getElementById('btn-close-help')?.addEventListener('click', () => {
                document.getElementById('help-modal')?.classList.remove('active');
            });
            document.getElementById('help-modal')?.addEventListener('click', (e) => {
                if (e.target.id === 'help-modal') {
                    document.getElementById('help-modal').classList.remove('active');
                }
            });
            document.getElementById('btn-restart-modal')?.addEventListener('click', () => this.restart());
            document.getElementById('btn-resume')?.addEventListener('click', () => this.resume());
        }

        _getCanvasPoint(e) {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
                y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
            };
        }

        _cancelDrag() {
            if (this.dragState.slotIndex >= 0) {
                this.dockElements[this.dragState.slotIndex].style.opacity = '1';
            }
            this.dragState.active = false;
            this.dragState.shape = null;
            this.dragState.slotIndex = -1;
        }

        _handleDrop() {
            const shape = this.dragState.shape;
            const slotIdx = this.dragState.slotIndex;
            const targetHex = this._pixelToHex(this.dragState.currX, this.dragState.currY);

            if (targetHex && this._canPlaceAt(shape.cells, targetHex.q, targetHex.r)) {
                this._placePiece(shape, targetHex.q, targetHex.r);
                this.docks[slotIdx] = null;
                this.dockElements[slotIdx].innerHTML = '';
                this.dockElements[slotIdx].style.opacity = '1';
                this.audio.playPlace();

                this._checkClears();

                if (this.docks.every(d => d === null)) {
                    this._spawnDocks();
                } else {
                    this._checkGameOver();
                }
            } else {
                this._cancelDrag();
            }

            this.dragState.active = false;
            this.dragState.shape = null;
            this.dragState.slotIndex = -1;
        }

        _hexToPixel(q, r) {
            const x = this.centerX + this.hexRadius * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
            const y = this.centerY + this.hexRadius * (1.5 * r);
            return { x, y };
        }

        /**
         * 经典 Red Blob Games 立方体四舍五入算法 (Cube Rounding)
         */
        _pixelToHex(px, py) {
            const dx = px - this.centerX;
            const dy = py - this.centerY;
            const q = ((Math.sqrt(3) / 3) * dx - (1 / 3) * dy) / this.hexRadius;
            const r = ((2 / 3) * dy) / this.hexRadius;
            const s = -q - r;

            let rq = Math.round(q);
            let rr = Math.round(r);
            let rs = Math.round(s);

            const q_diff = Math.abs(rq - q);
            const r_diff = Math.abs(rr - r);
            const s_diff = Math.abs(rs - s);

            if (q_diff > r_diff && q_diff > s_diff) {
                rq = -rr - rs;
            } else if (r_diff > s_diff) {
                rr = -rq - rs;
            }

            if (this.grid.has(`${rq},${rr}`)) {
                return { q: rq, r: rr };
            }
            return null;
        }

        _canPlaceAt(cells, baseQ, baseR) {
            for (let c of cells) {
                const tq = baseQ + c.q;
                const tr = baseR + c.r;
                const key = `${tq},${tr}`;
                if (!this.grid.has(key)) return false;
                if (this.grid.get(key) !== null) return false;
            }
            return true;
        }

        _canPlaceAnywhere(cells) {
            for (let [key] of this.grid) {
                const [q, r] = key.split(',').map(Number);
                if (this._canPlaceAt(cells, q, r)) return true;
            }
            return false;
        }

        _placePiece(shape, baseQ, baseR) {
            shape.cells.forEach(c => {
                const key = `${baseQ + c.q},${baseR + c.r}`;
                this.grid.set(key, shape.color);
            });
            this.score += shape.cells.length * 10;
            this._updateScoreUI();
        }

        /**
         * ⬡ 三向轴坐标满行消除算法 (r=const, q=const, s=const)
         */
        _checkClears() {
            const linesToClear = [];

            // 1. 横轴 r = const
            for (let r = -this.RADIUS; r <= this.RADIUS; r++) {
                const keys = [];
                for (let q = -this.RADIUS; q <= this.RADIUS; q++) {
                    const key = `${q},${r}`;
                    if (this.grid.has(key)) keys.push(key);
                }
                if (keys.length > 0 && keys.every(k => this.grid.get(k) !== null)) {
                    linesToClear.push(keys);
                }
            }

            // 2. 左斜轴 q = const
            for (let q = -this.RADIUS; q <= this.RADIUS; q++) {
                const keys = [];
                for (let r = -this.RADIUS; r <= this.RADIUS; r++) {
                    const key = `${q},${r}`;
                    if (this.grid.has(key)) keys.push(key);
                }
                if (keys.length > 0 && keys.every(k => this.grid.get(k) !== null)) {
                    linesToClear.push(keys);
                }
            }

            // 3. 右斜轴 s = const (即 q + r = const)
            for (let s = -this.RADIUS; s <= this.RADIUS; s++) {
                const keys = [];
                for (let [k] of this.grid) {
                    const [q, r] = k.split(',').map(Number);
                    if (-q - r === s) keys.push(k);
                }
                if (keys.length > 0 && keys.every(k => this.grid.get(k) !== null)) {
                    linesToClear.push(keys);
                }
            }

            if (linesToClear.length > 0) {
                this.combo++;
                const bonus = linesToClear.length * 150 * this.combo;
                this.score += bonus;
                this._updateScoreUI();

                this.audio.playClear(linesToClear.length, this.combo);
                this.bridge.vibrate(this.combo > 1 ? [15, 30, 20] : 15);
                this.triggerShake(linesToClear.length > 1 ? 5 : 3.5, 120);

                const clearedSet = new Set();
                linesToClear.forEach(line => {
                    line.forEach(key => clearedSet.add(key));
                });

                clearedSet.forEach(key => {
                    const color = this.grid.get(key);
                    const [q, r] = key.split(',').map(Number);
                    const pt = this._hexToPixel(q, r);
                    this._createParticles(pt.x, pt.y, color);
                    this.grid.set(key, null);
                });

                this.bridge.emit('ON_COMBO_TRIGGER', {
                    comboCount: this.combo,
                    lines: linesToClear.length,
                    scoreGained: bonus,
                    currentScore: this.score
                });

                this._showComboBanner(this.combo, linesToClear.length);
            } else {
                this.combo = 0;
            }
        }

        triggerShake(intensity = 4, duration = 120) {
            this.shake = { intensity, duration, startTime: performance.now() };
        }

        _showComboBanner(combo, lines) {
            const banner = document.getElementById('combo-banner');
            if (!banner) return;
            banner.textContent = combo > 1 ? `🔥 HEX COMBO x${combo} (+${lines}线)` : `⚡ HEX BLAST (+${lines}线)`;
            banner.classList.add('show');
            setTimeout(() => banner.classList.remove('show'), 800);
        }

        _checkGameOver() {
            const remaining = this.docks.filter(s => s !== null);
            if (remaining.length === 0) return;

            const canAnyFit = remaining.some(s => this._canPlaceAnywhere(s.cells));
            if (!canAnyFit) {
                this.isGameOver = true;
                this.audio.playGameOver();
                this.bridge.vibrate([40, 60, 40]);

                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    window.SafeStorage.set('hex_frvr_high_score', this.highScore);
                }
                this._updateScoreUI();

                document.getElementById('final-score-val').textContent = this.score;
                document.getElementById('game-over-modal')?.classList.add('active');

                this.bridge.emit('ON_GAME_OVER', {
                    finalScore: this.score,
                    highScore: this.highScore
                });
            }
        }

        _updateScoreUI() {
            document.getElementById('score-val').textContent = this.score;
            document.getElementById('high-score-val').textContent = Math.max(this.score, this.highScore);
            this.bridge.emit('ON_SCORE_UPDATE', { currentScore: this.score, highScore: this.highScore });
        }

        _createParticles(x, y, color) {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6 + 2;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 4 + 2,
                    color: color || '#a855f7',
                    alpha: 1
                });
            }
        }

        _startLoop() {
            const loop = () => {
                this._render();
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }

        _render() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            let shakeX = 0, shakeY = 0;
            if (this.shake && this.shake.duration > 0) {
                const elapsed = performance.now() - this.shake.startTime;
                if (elapsed < this.shake.duration) {
                    const progress = elapsed / this.shake.duration;
                    const cur = this.shake.intensity * (1 - progress);
                    shakeX = (Math.random() - 0.5) * 2 * cur;
                    shakeY = (Math.random() - 0.5) * 2 * cur;
                } else {
                    this.shake.duration = 0;
                }
            }

            this.ctx.save();
            if (shakeX !== 0 || shakeY !== 0) {
                this.ctx.translate(shakeX, shakeY);
            }

            // 1. 绘制 61 格蜂巢底盘
            for (let [key, color] of this.grid) {
                const [q, r] = key.split(',').map(Number);
                const pt = this._hexToPixel(q, r);

                if (color) {
                    this._drawHexagon(this.ctx, pt.x, pt.y, this.hexRadius - 1.5, color, true);
                } else {
                    this._drawHexagon(this.ctx, pt.x, pt.y, this.hexRadius - 1.5, 'rgba(255, 255, 255, 0.05)', false);
                }
            }

            // 2. 拖拽时的预览
            if (this.dragState.active && this.dragState.shape) {
                const targetHex = this._pixelToHex(this.dragState.currX, this.dragState.currY);
                if (targetHex && this._canPlaceAt(this.dragState.shape.cells, targetHex.q, targetHex.r)) {
                    this.dragState.shape.cells.forEach(c => {
                        const pt = this._hexToPixel(targetHex.q + c.q, targetHex.r + c.r);
                        this._drawHexagon(this.ctx, pt.x, pt.y, this.hexRadius - 1.5, 'rgba(168, 85, 247, 0.4)', true);
                    });
                }

                // 跟随手指的悬浮块
                this.dragState.shape.cells.forEach(c => {
                    const px = this.dragState.currX + this.hexRadius * (Math.sqrt(3) * c.q + (Math.sqrt(3) / 2) * c.r);
                    const py = this.dragState.currY + this.hexRadius * (1.5 * c.r);
                    this._drawHexagon(this.ctx, px, py, this.hexRadius - 1.5, this.dragState.shape.color, true, true);
                });
            }

            // 3. 粒子渲染
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.alpha -= 0.025;

                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                } else {
                    this.ctx.save();
                    this.ctx.globalAlpha = p.alpha;
                    this.ctx.fillStyle = p.color;
                    this.ctx.shadowColor = p.color;
                    this.ctx.shadowBlur = 8;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }

            this.ctx.restore();
        }

        _drawHexagon(ctx, x, y, radius, color, isFill = true, glow = false) {
            ctx.save();
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6; // Pointy-topped
                const hx = x + radius * Math.cos(angle);
                const hy = y + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();

            if (glow) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 12;
            }

            if (isFill) {
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1.2;
                ctx.stroke();
            } else {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.HexGame = new HexGame();
    });

})(window);
