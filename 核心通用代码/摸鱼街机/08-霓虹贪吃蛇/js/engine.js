/**
 * 🐍 Neon Snake (霓虹贪吃蛇) - 核心引擎
 * 20x20 赛博霓虹网格、穿墙/经典双模式、双步方向缓冲防误触、限时金核、连击倍率与粒子特效
 */
(function(window) {
    'use strict';

    const DIRS = {
        up:    { x: 0,  y: -1 },
        down:  { x: 0,  y: 1  },
        left:  { x: -1, y: 0  },
        right: { x: 1,  y: 0  }
    };

    class NeonSnakeGame {
        constructor() {
            this.GRID = 20;
            this.score = 0;
            this.highScore = window.SafeStorage.get('neon_snake_high_score', 0);
            this.wrapWalls = window.SafeStorage.get('neon_snake_wrap_mode', true);
            this.combo = 1;
            this.lastEatTime = 0;
            this.eatenCount = 0;

            this.isRunning = false;
            this.isPaused = false;
            this.isGameOver = false;
            this.boosting = false;

            this.snake = [];
            this.dir = { x: 1, y: 0 };
            this.dirQueue = [];
            this.food = null;
            this.bonusFood = null; // { x, y, expireAt }
            this.particles = [];
            this.shake = { intensity: 0, until: 0 };

            this.lastStepTime = 0;
            this.rafId = null;

            this.audio = new window.AudioEngine();
            this.bridge = new window.UniversalBridge('neon-snake');
            this.bridge.bindGame(this);

            this.canvas = document.getElementById('snake-canvas');
            this.ctx = this.canvas.getContext('2d');

            this._initDPI();
            this._bindEvents();
            this._updateModeBtn();
            this.restart();
            this._startLoop();

            this.bridge.emit('ON_READY', { game: 'neon-snake' });
        }

        _initDPI() {
            const container = this.canvas.parentElement;
            const dpr = window.devicePixelRatio || 1;
            let side = 360;
            if (container) {
                const rect = container.getBoundingClientRect();
                side = Math.floor(Math.min(Math.max(180, rect.width), Math.max(180, rect.height - 4), 420));
            }
            this.canvas.style.width = `${side}px`;
            this.canvas.style.height = `${side}px`;
            this.canvas.width = side * dpr;
            this.canvas.height = side * dpr;
            this.dpr = dpr;
            this.cellSize = this.canvas.width / this.GRID;
        }

        restart() {
            const mid = Math.floor(this.GRID / 2);
            this.snake = [
                { x: mid,     y: mid },
                { x: mid - 1, y: mid },
                { x: mid - 2, y: mid }
            ];
            this.dir = { x: 1, y: 0 };
            this.dirQueue = [];
            this.score = 0;
            this.combo = 1;
            this.lastEatTime = 0;
            this.eatenCount = 0;
            this.isRunning = false;
            this.isPaused = false;
            this.isGameOver = false;
            this.boosting = false;
            this.bonusFood = null;
            this.particles = [];
            this.lastStepTime = performance.now();

            this._spawnFood();
            this._updateScoreUI();
            this._updatePauseUI();
            document.getElementById('game-over-modal')?.classList.remove('active');
            document.getElementById('pause-modal')?.classList.remove('active');
            document.getElementById('start-hint')?.classList.remove('hidden');
        }

        pause() {
            if (this.isGameOver) return;
            this.isPaused = true;
            this._updatePauseUI();
            document.getElementById('pause-modal')?.classList.add('active');
        }

        resume() {
            if (this.isGameOver) return;
            this.isPaused = false;
            this.lastStepTime = performance.now();
            this._updatePauseUI();
            document.getElementById('pause-modal')?.classList.remove('active');
        }

        togglePause() {
            if (this.isGameOver) return;
            if (this.isPaused) this.resume();
            else this.pause();
        }

        _updatePauseUI() {
            const btn = document.getElementById('btn-pause-toggle');
            if (btn) btn.textContent = this.isPaused ? '▶' : '⏸';
        }

        _updateModeBtn() {
            const btn = document.getElementById('btn-mode');
            if (!btn) return;
            btn.textContent = this.wrapWalls ? '穿墙' : '经典';
            btn.classList.toggle('classic', !this.wrapWalls);
            btn.title = this.wrapWalls ? '当前：穿墙模式（点击切为经典撞墙模式）' : '当前：经典模式（点击切为穿墙模式）';
        }

        _queueDirection(dirName) {
            const next = DIRS[dirName];
            if (!next || this.isGameOver) return;
            if (this.isPaused) this.resume();
            if (!this.isRunning) {
                this.isRunning = true;
                this.lastStepTime = performance.now();
                document.getElementById('start-hint')?.classList.add('hidden');
            }
            const lastPlanned = this.dirQueue.length > 0 ? this.dirQueue[this.dirQueue.length - 1] : this.dir;
            // 禁止直接 180 度掉头或重复同向
            if ((lastPlanned.x + next.x === 0 && lastPlanned.y + next.y === 0) ||
                (lastPlanned.x === next.x && lastPlanned.y === next.y)) {
                return;
            }
            if (this.dirQueue.length < 2) {
                this.dirQueue.push(next);
            }
        }

        _getEmptyCell() {
            const occupied = new Set(this.snake.map(s => `${s.x},${s.y}`));
            if (this.food) occupied.add(`${this.food.x},${this.food.y}`);
            if (this.bonusFood) occupied.add(`${this.bonusFood.x},${this.bonusFood.y}`);

            const free = [];
            for (let y = 0; y < this.GRID; y++) {
                for (let x = 0; x < this.GRID; x++) {
                    if (!occupied.has(`${x},${y}`)) free.push({ x, y });
                }
            }
            if (!free.length) return null;
            return free[Math.floor(Math.random() * free.length)];
        }

        _spawnFood() {
            this.food = this._getEmptyCell();
        }

        _spawnBonusFood() {
            const cell = this._getEmptyCell();
            if (cell) {
                this.bonusFood = { x: cell.x, y: cell.y, expireAt: performance.now() + 7500 };
            }
        }

        _getStepInterval() {
            // 随长度缓慢加速：基础 135ms -> 最快 78ms；按住 Shift 冲刺时提速 38%
            const base = Math.max(78, 135 - Math.floor((this.snake.length - 3) * 1.6));
            return this.boosting ? Math.max(52, Math.floor(base * 0.62)) : base;
        }

        _step(now) {
            if (this.bonusFood && now > this.bonusFood.expireAt) {
                this.bonusFood = null;
            }
            if (this.combo > 1 && now - this.lastEatTime > 4200) {
                this.combo = 1;
                this._updateScoreUI();
            }

            if (this.dirQueue.length > 0) {
                this.dir = this.dirQueue.shift();
            }

            const head = this.snake[0];
            let nx = head.x + this.dir.x;
            let ny = head.y + this.dir.y;

            if (this.wrapWalls) {
                nx = (nx + this.GRID) % this.GRID;
                ny = (ny + this.GRID) % this.GRID;
            } else if (nx < 0 || nx >= this.GRID || ny < 0 || ny >= this.GRID) {
                this._triggerGameOver();
                return;
            }

            const willEatNormal = this.food && nx === this.food.x && ny === this.food.y;
            const willEatBonus = this.bonusFood && nx === this.bonusFood.x && ny === this.bonusFood.y;
            const growing = willEatNormal || willEatBonus;

            // 检查是否撞到自身（若不生长则尾巴会移走，不计入碰撞）
            const checkLen = growing ? this.snake.length : this.snake.length - 1;
            for (let i = 0; i < checkLen; i++) {
                if (this.snake[i].x === nx && this.snake[i].y === ny) {
                    this._triggerGameOver();
                    return;
                }
            }

            this.snake.unshift({ x: nx, y: ny });
            if (!growing) {
                this.snake.pop();
            }

            if (willEatNormal) {
                this._onEat(nx, ny, false, now);
            } else if (willEatBonus) {
                this._onEat(nx, ny, true, now);
            }
        }

        _onEat(gx, gy, isBonus, now) {
            if (now - this.lastEatTime <= 4200 && this.lastEatTime > 0) {
                this.combo = Math.min(8, this.combo + 1);
            } else {
                this.combo = 1;
            }
            this.lastEatTime = now;

            const basePoints = isBonus ? 30 : 10;
            const gained = basePoints * this.combo;
            this.score += gained;

            if (isBonus) {
                this.bonusFood = null;
                this.audio.playBonus();
                this._spawnParticles(gx, gy, '#fbbf24', 22);
                this._showComboBanner(`✨ OVERDRIVE +${gained}`);
                this.bridge.emit('ON_COMBO_TRIGGER', { combo: Math.max(2, this.combo) });
            } else {
                this.eatenCount++;
                this.audio.playEat(this.combo);
                this._spawnParticles(gx, gy, '#00f0ff', 12);
                if (this.combo >= 3) {
                    this._showComboBanner(`⚡ COMBO x${this.combo}`);
                    this.bridge.emit('ON_COMBO_TRIGGER', { combo: this.combo });
                }
                this._spawnFood();
                if (this.eatenCount % 5 === 0 && !this.bonusFood) {
                    this._spawnBonusFood();
                }
            }

            if (this.score > this.highScore) {
                this.highScore = this.score;
                window.SafeStorage.set('neon_snake_high_score', this.highScore);
            }
            this._updateScoreUI();
            this.bridge.recordScore(this.score);
            this.bridge.vibrate(isBonus ? 25 : 10);
        }

        _triggerGameOver() {
            this.isGameOver = true;
            this.isRunning = false;
            this.audio.playGameOver();
            this.shake = { intensity: 7 * this.dpr, until: performance.now() + 260 };
            this._spawnParticles(this.snake[0].x, this.snake[0].y, '#ff3388', 26);

            const finalScore = document.getElementById('final-score-val');
            const finalLen = document.getElementById('final-len-val');
            if (finalScore) finalScore.textContent = String(this.score);
            if (finalLen) finalLen.textContent = String(this.snake.length);

            document.getElementById('game-over-modal')?.classList.add('active');
            this.bridge.emit('ON_GAME_OVER', { score: this.score, length: this.snake.length });
            this.bridge.vibrate([30, 40, 30]);
        }

        _updateScoreUI() {
            const s = document.getElementById('score-val');
            const c = document.getElementById('combo-val');
            const h = document.getElementById('high-score-val');
            if (s) s.textContent = String(this.score);
            if (c) c.textContent = `x${this.combo}`;
            if (h) h.textContent = String(this.highScore);
        }

        _showComboBanner(text) {
            const el = document.getElementById('combo-banner');
            if (!el) return;
            el.textContent = text;
            el.classList.add('show');
            clearTimeout(this._bannerTimer);
            this._bannerTimer = setTimeout(() => el.classList.remove('show'), 950);
        }

        _spawnParticles(gx, gy, color, count) {
            const cx = (gx + 0.5) * this.cellSize;
            const cy = (gy + 0.5) * this.cellSize;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = (1.2 + Math.random() * 3.4) * this.dpr;
                this.particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    size: (2 + Math.random() * 2.8) * this.dpr,
                    color
                });
            }
        }

        _bindEvents() {
            window.addEventListener('resize', () => this._initDPI());

            // 键盘控制（支持方向键、WASD、Space 暂停、Shift 加速）
            window.addEventListener('keydown', (e) => {
                const keyMap = {
                    ArrowUp: 'up',    KeyW: 'up',    w: 'up',    W: 'up',
                    ArrowDown: 'down',KeyS: 'down',  s: 'down',  S: 'down',
                    ArrowLeft: 'left',KeyA: 'left',  a: 'left',  A: 'left',
                    ArrowRight: 'right', KeyD: 'right', d: 'right', D: 'right'
                };
                if (e.key === 'Shift') {
                    this.boosting = true;
                    return;
                }
                if (e.code === 'Space') {
                    e.preventDefault();
                    this.togglePause();
                    return;
                }
                const dirName = keyMap[e.code] || keyMap[e.key];
                if (dirName) {
                    e.preventDefault();
                    this._queueDirection(dirName);
                }
            });

            window.addEventListener('keyup', (e) => {
                if (e.key === 'Shift') this.boosting = false;
            });

            // 棋盘滑动手势（支持触控和鼠标拖拽转向）
            let swipeStart = null;
            this.canvas.addEventListener('pointerdown', (e) => {
                this.canvas.focus();
                swipeStart = { x: e.clientX, y: e.clientY };
            });
            window.addEventListener('pointerup', (e) => {
                if (!swipeStart) return;
                const dx = e.clientX - swipeStart.x;
                const dy = e.clientY - swipeStart.y;
                swipeStart = null;
                if (Math.hypot(dx, dy) < 22) return;
                if (Math.abs(dx) > Math.abs(dy)) {
                    this._queueDirection(dx > 0 ? 'right' : 'left');
                } else {
                    this._queueDirection(dy > 0 ? 'down' : 'up');
                }
            });

            // 底部虚拟方向键
            document.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
                btn.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    this.canvas.focus();
                    this._queueDirection(btn.dataset.dir);
                });
            });

            document.getElementById('btn-pause-toggle')?.addEventListener('click', () => this.togglePause());
            document.getElementById('btn-mode')?.addEventListener('click', () => {
                this.wrapWalls = !this.wrapWalls;
                window.SafeStorage.set('neon_snake_wrap_mode', this.wrapWalls);
                this._updateModeBtn();
                this.audio.playClick();
            });
            document.getElementById('btn-restart')?.addEventListener('click', () => this.restart());
            document.getElementById('btn-restart-modal')?.addEventListener('click', () => this.restart());
            document.getElementById('btn-resume')?.addEventListener('click', () => this.resume());
            document.getElementById('btn-mute')?.addEventListener('click', () => {
                const muted = this.audio.toggleMute();
                const btn = document.getElementById('btn-mute');
                if (btn) btn.textContent = muted ? '🔇' : '🔊';
            });
            document.getElementById('btn-help')?.addEventListener('click', () => {
                document.getElementById('help-modal')?.classList.add('active');
            });
            document.getElementById('btn-close-help')?.addEventListener('click', () => {
                document.getElementById('help-modal')?.classList.remove('active');
            });
            document.getElementById('help-modal')?.addEventListener('click', (e) => {
                if (e.target.id === 'help-modal') e.target.classList.remove('active');
            });
        }

        _startLoop() {
            const loop = (now) => {
                if (this.isRunning && !this.isPaused && !this.isGameOver) {
                    if (now - this.lastStepTime >= this._getStepInterval()) {
                        this.lastStepTime = now;
                        this._step(now);
                    }
                }
                this._render(now);
                this.rafId = requestAnimationFrame(loop);
            };
            this.rafId = requestAnimationFrame(loop);
        }

        _render(now) {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;
            const cs = this.cellSize;

            ctx.save();
            if (now < this.shake.until) {
                const dx = (Math.random() - 0.5) * this.shake.intensity;
                const dy = (Math.random() - 0.5) * this.shake.intensity;
                ctx.translate(dx, dy);
            }

            // 背景与微弱网格线
            ctx.fillStyle = '#08101c';
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = 'rgba(0, 240, 255, 0.055)';
            ctx.lineWidth = Math.max(1, this.dpr * 0.7);
            for (let i = 1; i < this.GRID; i++) {
                const p = Math.floor(i * cs) + 0.5;
                ctx.beginPath();
                ctx.moveTo(p, 0); ctx.lineTo(p, h);
                ctx.moveTo(0, p); ctx.lineTo(w, p);
                ctx.stroke();
            }

            // 经典模式下绘制警示霓虹边框
            if (!this.wrapWalls) {
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
                ctx.lineWidth = 3 * this.dpr;
                ctx.strokeRect(1.5 * this.dpr, 1.5 * this.dpr, w - 3 * this.dpr, h - 3 * this.dpr);
            }

            // 绘制普通能量豆
            if (this.food) {
                const pulse = 0.78 + Math.sin(now * 0.008) * 0.16;
                const fx = (this.food.x + 0.5) * cs;
                const fy = (this.food.y + 0.5) * cs;
                ctx.save();
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 14 * this.dpr;
                ctx.fillStyle = '#00f0ff';
                ctx.beginPath();
                ctx.arc(fx, fy, cs * 0.34 * pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(fx, fy, cs * 0.14 * pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 绘制限时金色超频核
            if (this.bonusFood) {
                const remain = Math.max(0, (this.bonusFood.expireAt - now) / 7500);
                const pulse = 0.85 + Math.sin(now * 0.014) * 0.15;
                const bx = (this.bonusFood.x + 0.5) * cs;
                const by = (this.bonusFood.y + 0.5) * cs;
                ctx.save();
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 18 * this.dpr;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(bx, by, cs * 0.38 * pulse, 0, Math.PI * 2);
                ctx.fill();
                // 倒计时光环
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 2 * this.dpr;
                ctx.beginPath();
                ctx.arc(bx, by, cs * 0.46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remain);
                ctx.stroke();
                ctx.restore();
            }

            // 绘制霓虹蛇身（尾 -> 头渐变）
            const len = this.snake.length;
            for (let i = len - 1; i >= 0; i--) {
                const seg = this.snake[i];
                const ratio = len > 1 ? 1 - i / (len - 1) : 1;
                const pad = cs * (i === 0 ? 0.06 : 0.11);
                const x = seg.x * cs + pad;
                const y = seg.y * cs + pad;
                const size = cs - pad * 2;
                const r = Math.min(size * 0.34, 6 * this.dpr);

                ctx.save();
                if (i === 0) {
                    ctx.fillStyle = '#22e3f5';
                    ctx.shadowColor = '#00f0ff';
                    ctx.shadowBlur = 14 * this.dpr;
                } else {
                    const hue = 160 + ratio * 38;
                    ctx.fillStyle = `hsl(${hue}, 90%, ${42 + ratio * 16}%)`;
                    ctx.shadowColor = `hsla(${hue}, 90%, 55%, 0.45)`;
                    ctx.shadowBlur = 6 * this.dpr;
                }
                this._roundRect(ctx, x, y, size, size, r);
                ctx.fill();

                // 蛇头眼睛
                if (i === 0) {
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#050811';
                    const er = Math.max(1.8, cs * 0.09);
                    const cx = seg.x * cs + cs * 0.5;
                    const cy = seg.y * cs + cs * 0.5;
                    const offF = cs * 0.18;
                    const offS = cs * 0.16;
                    const e1x = cx + this.dir.x * offF - this.dir.y * offS;
                    const e1y = cy + this.dir.y * offF + this.dir.x * offS;
                    const e2x = cx + this.dir.x * offF + this.dir.y * offS;
                    const e2y = cy + this.dir.y * offF - this.dir.x * offS;
                    ctx.beginPath(); ctx.arc(e1x, e1y, er, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(e2x, e2y, er, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }

            // 粒子特效更新与绘制
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.life -= 0.04;
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        }

        _roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.neonSnakeGame = new NeonSnakeGame();
    });
})(window);
