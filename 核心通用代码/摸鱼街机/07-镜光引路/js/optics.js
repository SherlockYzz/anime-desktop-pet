/**
 * 🔦 Laser Optics (镜光引路) - 核心游戏引擎
 * 纯原生 Canvas 2D 高精度射线追踪 + 多层霓虹激光辉光 + 晶核充能共振
 * 8 个严格数学唯一解关卡 + 机械转镜触感 + 完整接入 UniversalBridge
 */
(function(window) {
    'use strict';

    // 8 关严谨可解关卡配置
    const LEVELS = [
        {
            id: 1,
            name: '第 1 关: 初光·折射启蒙',
            rows: 5, cols: 5,
            targetCount: 1,
            emitters: [{ r: 0, c: 1, dr: 1, dc: 0 }],
            items: [
                { r: 0, c: 1, type: 'emitter', dr: 1, dc: 0 },
                { r: 3, c: 1, type: 'mirror', state: 1, rotatable: true },
                { r: 3, c: 4, type: 'target', id: 't1' }
            ]
        },
        {
            id: 2,
            name: '第 2 关: 迂回·双镜引途',
            rows: 5, cols: 5,
            targetCount: 1,
            emitters: [{ r: 1, c: 0, dr: 0, dc: 1 }],
            items: [
                { r: 1, c: 0, type: 'emitter', dr: 0, dc: 1 },
                { r: 1, c: 3, type: 'mirror', state: 0, rotatable: true },
                { r: 4, c: 3, type: 'mirror', state: 1, rotatable: true },
                { r: 1, c: 4, type: 'wall' },
                { r: 4, c: 4, type: 'target', id: 't1' }
            ]
        },
        {
            id: 3,
            name: '第 3 关: 回环·声索回路',
            rows: 6, cols: 6,
            targetCount: 1,
            emitters: [{ r: 0, c: 0, dr: 1, dc: 0 }],
            items: [
                { r: 0, c: 0, type: 'emitter', dr: 1, dc: 0 },
                { r: 4, c: 0, type: 'mirror', state: 1, rotatable: true },
                { r: 4, c: 4, type: 'mirror', state: 0, rotatable: true },
                { r: 1, c: 4, type: 'mirror', state: 1, rotatable: true },
                { r: 1, c: 1, type: 'target', id: 't1' },
                { r: 2, c: 2, type: 'wall' },
                { r: 3, c: 2, type: 'wall' }
            ]
        },
        {
            id: 4,
            name: '第 4 关: 连珠·一苇双芯',
            rows: 6, cols: 6,
            targetCount: 2,
            emitters: [{ r: 1, c: 0, dr: 0, dc: 1 }],
            items: [
                { r: 1, c: 0, type: 'emitter', dr: 0, dc: 1 },
                { r: 1, c: 2, type: 'target', id: 't1' },
                { r: 1, c: 4, type: 'mirror', state: 0, rotatable: true },
                { r: 4, c: 4, type: 'mirror', state: 1, rotatable: true },
                { r: 4, c: 1, type: 'mirror', state: 0, rotatable: true },
                { r: 2, c: 1, type: 'target', id: 't2' },
                { r: 3, c: 3, type: 'wall' }
            ]
        },
        {
            id: 5,
            name: '第 5 关: 裂光·分光化形',
            rows: 6, cols: 6,
            targetCount: 2,
            emitters: [{ r: 0, c: 2, dr: 1, dc: 0 }],
            items: [
                { r: 0, c: 2, type: 'emitter', dr: 1, dc: 0 },
                { r: 2, c: 2, type: 'splitter' },
                { r: 5, c: 2, type: 'target', id: 't1' },
                { r: 2, c: 4, type: 'mirror', state: 0, rotatable: true },
                { r: 5, c: 4, type: 'target', id: 't2' },
                { r: 3, c: 1, type: 'wall' }
            ]
        },
        {
            id: 6,
            name: '第 6 关: 迷阵·重峦叠嶂',
            rows: 7, cols: 7,
            targetCount: 2,
            emitters: [{ r: 0, c: 1, dr: 1, dc: 0 }],
            items: [
                { r: 0, c: 1, type: 'emitter', dr: 1, dc: 0 },
                { r: 2, c: 1, type: 'mirror', state: 0, rotatable: true },
                { r: 2, c: 5, type: 'mirror', state: 0, rotatable: true },
                { r: 3, c: 5, type: 'target', id: 't1' },
                { r: 5, c: 5, type: 'mirror', state: 1, rotatable: true },
                { r: 5, c: 2, type: 'mirror', state: 0, rotatable: true },
                { r: 4, c: 2, type: 'target', id: 't2' },
                { r: 3, c: 3, type: 'wall' },
                { r: 4, c: 4, type: 'wall' }
            ]
        },
        {
            id: 7,
            name: '第 7 关: 双流·日月同辉',
            rows: 7, cols: 7,
            targetCount: 2,
            emitters: [
                { r: 0, c: 2, dr: 1, dc: 0 },
                { r: 6, c: 4, dr: -1, dc: 0 }
            ],
            items: [
                { r: 0, c: 2, type: 'emitter', dr: 1, dc: 0 },
                { r: 4, c: 2, type: 'mirror', state: 1, rotatable: true },
                { r: 4, c: 5, type: 'target', id: 't1' },
                { r: 6, c: 4, type: 'emitter', dr: -1, dc: 0 },
                { r: 2, c: 4, type: 'mirror', state: 0, rotatable: true },
                { r: 2, c: 1, type: 'target', id: 't2' },
                { r: 3, c: 3, type: 'wall' }
            ]
        },
        {
            id: 8,
            name: '第 8 关: 终章·万象归元',
            rows: 7, cols: 7,
            targetCount: 3,
            emitters: [{ r: 6, c: 0, dr: -1, dc: 0 }],
            items: [
                { r: 6, c: 0, type: 'emitter', dr: -1, dc: 0 },
                { r: 1, c: 0, type: 'mirror', state: 0, rotatable: true },
                { r: 1, c: 3, type: 'target', id: 't1' },
                { r: 1, c: 5, type: 'mirror', state: 1, rotatable: true },
                { r: 3, c: 5, type: 'mirror', state: 0, rotatable: true },
                { r: 3, c: 2, type: 'mirror', state: 1, rotatable: true },
                { r: 5, c: 2, type: 'target', id: 't2' },
                { r: 6, c: 2, type: 'mirror', state: 0, rotatable: true },
                { r: 6, c: 6, type: 'target', id: 't3' },
                { r: 2, c: 1, type: 'wall' },
                { r: 2, c: 4, type: 'wall' },
                { r: 4, c: 3, type: 'wall' },
                { r: 5, c: 5, type: 'wall' }
            ]
        }
    ];

    class OpticsGame {
        constructor() {
            this.canvas = document.getElementById('optics-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.audio = new AudioEngine();
            this.bridge = new UniversalBridge('laser-optics');
            this.bridge.bindGame(this);

            this.currentLevelIdx = 0;
            this.grid = [];
            this.rows = 5;
            this.cols = 5;
            this.emitters = [];
            this.targetCount = 1;
            this.litTargets = new Set();
            this.beamSegments = [];
            this.isWon = false;
            this.rotations = []; // 镜子视觉平滑旋转动画

            // 粒子系统
            this.particles = [];

            this._loadSavedProgress();
            this._initDOM();
            this._bindEvents();
            this._startLevel(this.currentLevelIdx);

            this.animLoop = this.animLoop.bind(this);
            requestAnimationFrame(this.animLoop);
        }

        _loadSavedProgress() {
            const saved = this.bridge.loadProgress({ level: 0 });
            if (saved && typeof saved.level === 'number' && saved.level >= 0 && saved.level < LEVELS.length) {
                this.currentLevelIdx = saved.level;
            }
        }

        _initDOM() {
            this.dom = {
                levelLabel: document.getElementById('level-label-val'),
                targetsVal: document.getElementById('targets-val'),
                btnRestart: document.getElementById('btn-restart'),
                btnMute: document.getElementById('btn-mute'),
                btnHelp: document.getElementById('btn-help'),
                btnPrev: document.getElementById('btn-prev-lvl'),
                btnNext: document.getElementById('btn-next-lvl'),
                victoryModal: document.getElementById('victory-modal'),
                helpModal: document.getElementById('help-modal'),
                btnNextModal: document.getElementById('btn-next-modal'),
                btnCloseHelp: document.getElementById('btn-close-help')
            };
        }

        _bindEvents() {
            window.addEventListener('resize', () => this._resizeCanvas());

            const getCanvasPos = (evt) => {
                const rect = this.canvas.getBoundingClientRect();
                const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
                const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
                return {
                    x: clientX - rect.left,
                    y: clientY - rect.top
                };
            };

            const handlePointerDown = (evt) => {
                evt.preventDefault();
                const pos = getCanvasPos(evt);
                const cell = this._posToCell(pos.x, pos.y);
                if (cell) {
                    this._onCellClicked(cell.r, cell.c);
                }
            };

            this.canvas.addEventListener('mousedown', handlePointerDown);
            this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });

            // 快捷键
            window.addEventListener('keydown', (e) => {
                if (e.key === 'r' || e.key === 'R') {
                    this.restart();
                } else if (e.key === '?' || e.key === 'h' || e.key === 'H') {
                    this.showHelp(true);
                } else if (e.key === 'ArrowLeft') {
                    this.switchLevel(this.currentLevelIdx - 1);
                } else if (e.key === 'ArrowRight') {
                    this.switchLevel(this.currentLevelIdx + 1);
                } else if (e.key === 'Escape') {
                    this.showHelp(false);
                    this._hideModals();
                }
            });

            // 按钮事件
            if (this.dom.btnRestart) this.dom.btnRestart.addEventListener('click', () => this.restart());
            if (this.dom.btnMute) {
                this.dom.btnMute.addEventListener('click', () => {
                    const muted = this.audio.toggleMute();
                    this.dom.btnMute.textContent = muted ? '🔇' : '🔊';
                });
            }
            if (this.dom.btnHelp) this.dom.btnHelp.addEventListener('click', () => this.showHelp(true));
            if (this.dom.btnCloseHelp) this.dom.btnCloseHelp.addEventListener('click', () => this.showHelp(false));
            if (this.dom.btnPrev) this.dom.btnPrev.addEventListener('click', () => this.switchLevel(this.currentLevelIdx - 1));
            if (this.dom.btnNext) this.dom.btnNext.addEventListener('click', () => this.switchLevel(this.currentLevelIdx + 1));
            if (this.dom.btnNextModal) {
                this.dom.btnNextModal.addEventListener('click', () => {
                    this._hideModals();
                    this.switchLevel(this.currentLevelIdx + 1);
                });
            }
        }

        _startLevel(idx) {
            if (idx < 0) idx = 0;
            if (idx >= LEVELS.length) idx = LEVELS.length - 1;
            this.currentLevelIdx = idx;
            const lvl = LEVELS[idx];

            this.rows = lvl.rows;
            this.cols = lvl.cols;
            this.targetCount = lvl.targetCount;
            this.emitters = lvl.emitters;
            this.isWon = false;
            this.particles = [];
            this.rotations = [];

            // 构建网格
            this.grid = [];
            for (let r = 0; r < this.rows; r++) {
                const row = [];
                for (let c = 0; c < this.cols; c++) row.push(null);
                this.grid.push(row);
            }

            lvl.items.forEach(item => {
                this.grid[item.r][item.c] = { ...item };
            });

            this._resizeCanvas();
            this._recalculateRays();
            this._updateHUD();
            this._hideModals();

            this.bridge.saveProgress({ level: this.currentLevelIdx });
        }

        _onCellClicked(r, c) {
            if (this.isWon) return;
            const item = this.grid[r][c];
            if (item && item.type === 'mirror' && item.rotatable !== false) {
                // 切换镜像方向 (0: '/' <-> 1: '\')
                item.state = (item.state === 0) ? 1 : 0;
                this.audio.playRotate();

                // 记录旋转平滑过渡
                this.rotations.push({
                    r, c,
                    angleStart: item.state === 1 ? -Math.PI / 2 : Math.PI / 2,
                    angleCurrent: item.state === 1 ? -Math.PI / 2 : Math.PI / 2,
                    target: 0
                });

                this._recalculateRays();
                this._updateHUD();

                // 检查胜利
                if (this.litTargets.size === this.targetCount) {
                    this.isWon = true;
                    const score = (this.currentLevelIdx + 1) * 1000;
                    this.bridge.recordScore(score);
                    this.bridge.saveProgress({ level: Math.min(this.currentLevelIdx + 1, LEVELS.length - 1) });
                    this.audio.playVictory();
                    this._spawnVictoryParticles();
                    setTimeout(() => this._showVictoryModal(), 600);
                }
            }
        }

        _recalculateRays() {
            const lit = new Set();
            const segments = [];
            const rays = this.emitters.map(e => ({ r: e.r, c: e.c, dr: e.dr, dc: e.dc }));
            const visitedRays = new Set();

            while (rays.length > 0) {
                const ray = rays.shift();
                let cr = ray.r, cc = ray.c, cdr = ray.dr, cdc = ray.dc;

                for (let step = 0; step < 60; step++) {
                    const nr = cr + cdr, nc = cc + cdc;
                    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) {
                        segments.push({ fromR: cr, fromC: cc, toR: nr, toC: nc, outOfBounds: true });
                        break;
                    }

                    segments.push({ fromR: cr, fromC: cc, toR: nr, toC: nc });
                    const cell = this.grid[nr][nc];

                    if (cell && cell.type === 'wall') {
                        break; // 撞墙消逝
                    }
                    if (cell && cell.type === 'target') {
                        lit.add(cell.id);
                        cell.lit = true;
                    }
                    if (cell && cell.type === 'mirror') {
                        const state = cell.state; // 0: '/', 1: '\\'
                        const ndr = (state === 0) ? -cdc : cdc;
                        const ndc = (state === 0) ? -cdr : cdr;
                        cdr = ndr; cdc = ndc;
                    }
                    if (cell && cell.type === 'splitter') {
                        // 90度逆时针分流
                        const sdr = -cdc, sdc = cdr;
                        const rKey = `${nr},${nc},${sdr},${sdc}`;
                        if (!visitedRays.has(rKey)) {
                            visitedRays.add(rKey);
                            rays.push({ r: nr, c: nc, dr: sdr, dc: sdc });
                        }
                    }

                    cr = nr; cc = nc;
                }
            }

            // 更新所有 target 的 lit 状态
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const cell = this.grid[r][c];
                    if (cell && cell.type === 'target') {
                        cell.lit = lit.has(cell.id);
                    }
                }
            }

            this.litTargets = lit;
            this.beamSegments = segments;
        }

        restart() {
            this._startLevel(this.currentLevelIdx);
        }

        switchLevel(idx) {
            if (idx >= 0 && idx < LEVELS.length) {
                this._startLevel(idx);
            }
        }

        _updateHUD() {
            if (this.dom.levelLabel) {
                this.dom.levelLabel.textContent = `${this.currentLevelIdx + 1}/${LEVELS.length}`;
            }
            if (this.dom.targetsVal) {
                this.dom.targetsVal.textContent = `${this.litTargets.size}/${this.targetCount}`;
                if (this.litTargets.size === this.targetCount) {
                    this.dom.targetsVal.classList.add('complete');
                } else {
                    this.dom.targetsVal.classList.remove('complete');
                }
            }
            if (this.dom.btnPrev) this.dom.btnPrev.disabled = (this.currentLevelIdx === 0);
            if (this.dom.btnNext) this.dom.btnNext.disabled = (this.currentLevelIdx === LEVELS.length - 1);
        }

        _resizeCanvas() {
            const container = this.canvas.parentElement;
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            const size = Math.min(w, h, 600);
            const dpr = window.devicePixelRatio || 1;

            this.canvas.width = size * dpr;
            this.canvas.height = size * dpr;
            this.canvas.style.width = `${size}px`;
            this.canvas.style.height = `${size}px`;

            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(dpr, dpr);
            this.viewSize = size;
        }

        _posToCell(px, py) {
            const pad = 16;
            const boardSize = this.viewSize - pad * 2;
            const cellW = boardSize / this.cols;
            const cellH = boardSize / this.rows;

            if (px < pad || px > this.viewSize - pad || py < pad || py > this.viewSize - pad) {
                return null;
            }
            const c = Math.floor((px - pad) / cellW);
            const r = Math.floor((py - pad) / cellH);
            if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                return { r, c };
            }
            return null;
        }

        _cellCenter(r, c) {
            const pad = 16;
            const boardSize = this.viewSize - pad * 2;
            const cellW = boardSize / this.cols;
            const cellH = boardSize / this.rows;
            return {
                x: pad + (c + 0.5) * cellW,
                y: pad + (r + 0.5) * cellH,
                w: cellW,
                h: cellH
            };
        }

        _spawnVictoryParticles() {
            this.particles = [];
            const count = 50;
            const cx = this.viewSize / 2;
            const cy = this.viewSize / 2;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                this.particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: 3 + Math.random() * 3,
                    alpha: 1,
                    decay: 0.015 + Math.random() * 0.02
                });
            }
        }

        _showVictoryModal() {
            if (this.dom.victoryModal) {
                const text = document.getElementById('victory-level-text');
                if (text) {
                    text.innerHTML = `恭喜破解 <strong>${LEVELS[this.currentLevelIdx].name}</strong>！<br>所有能量晶核完美贯通！`;
                }
                this.dom.victoryModal.classList.add('visible');
            }
        }

        _hideModals() {
            if (this.dom.victoryModal) this.dom.victoryModal.classList.remove('visible');
            if (this.dom.helpModal) this.dom.helpModal.classList.remove('visible');
        }

        showHelp(show) {
            if (this.dom.helpModal) {
                if (show) this.dom.helpModal.classList.add('visible');
                else this.dom.helpModal.classList.remove('visible');
            }
        }

        animLoop(now) {
            this._updateAnimations();
            this._render(now);
            requestAnimationFrame(this.animLoop);
        }

        _updateAnimations() {
            // 平滑旋转恢复
            for (let i = this.rotations.length - 1; i >= 0; i--) {
                const rot = this.rotations[i];
                rot.angleCurrent += (rot.target - rot.angleCurrent) * 0.25;
                if (Math.abs(rot.target - rot.angleCurrent) < 0.01) {
                    this.rotations.splice(i, 1);
                }
            }

            // 更新粒子
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.alpha -= p.decay;
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                }
            }
        }

        _render(now) {
            const ctx = this.ctx;
            const size = this.viewSize;
            if (!size) return;

            ctx.clearRect(0, 0, size, size);

            const pad = 16;
            const boardSize = size - pad * 2;
            const cellW = boardSize / this.cols;
            const cellH = boardSize / this.rows;

            // 1. 棋盘底座
            ctx.fillStyle = '#0f141f';
            this._roundRect(ctx, pad - 6, pad - 6, boardSize + 12, boardSize + 12, 12);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 绘制网格线
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let r = 1; r < this.rows; r++) {
                ctx.beginPath();
                ctx.moveTo(pad, pad + r * cellH);
                ctx.lineTo(pad + boardSize, pad + r * cellH);
                ctx.stroke();
            }
            for (let c = 1; c < this.cols; c++) {
                ctx.beginPath();
                ctx.moveTo(pad + c * cellW, pad);
                ctx.lineTo(pad + c * cellW, pad + boardSize);
                ctx.stroke();
            }

            // 2. 绘制多层辉光激光束 (Beam Segments)
            this._drawLaserBeams(now);

            // 3. 绘制各网格元素 (发射器、棱镜、分光器、靶标、暗壁)
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const item = this.grid[r][c];
                    if (!item) continue;
                    const center = this._cellCenter(r, c);

                    switch (item.type) {
                        case 'emitter':
                            this._drawEmitter(ctx, center, item.dr, item.dc, now);
                            break;
                        case 'mirror':
                            this._drawMirror(ctx, center, item, r, c);
                            break;
                        case 'splitter':
                            this._drawSplitter(ctx, center, now);
                            break;
                        case 'target':
                            this._drawTarget(ctx, center, item.lit, now);
                            break;
                        case 'wall':
                            this._drawWall(ctx, center);
                            break;
                    }
                }
            }

            // 4. 绘制粒子
            for (const p of this.particles) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.fillStyle = '#00f0ff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        _drawLaserBeams(now) {
            const ctx = this.ctx;
            ctx.save();
            ctx.lineCap = 'round';

            // 外层柔光层
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
            ctx.lineWidth = 8;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;

            for (const seg of this.beamSegments) {
                const p1 = this._cellCenter(seg.fromR, seg.fromC);
                const p2 = seg.outOfBounds
                    ? this._cellBorderPoint(seg.fromR, seg.fromC, seg.toR, seg.toC)
                    : this._cellCenter(seg.toR, seg.toC);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            // 中层高能层
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 4;

            for (const seg of this.beamSegments) {
                const p1 = this._cellCenter(seg.fromR, seg.fromC);
                const p2 = seg.outOfBounds
                    ? this._cellBorderPoint(seg.fromR, seg.fromC, seg.toR, seg.toC)
                    : this._cellCenter(seg.toR, seg.toC);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            // 内核纯白极光
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.shadowBlur = 0;

            for (const seg of this.beamSegments) {
                const p1 = this._cellCenter(seg.fromR, seg.fromC);
                const p2 = seg.outOfBounds
                    ? this._cellBorderPoint(seg.fromR, seg.fromC, seg.toR, seg.toC)
                    : this._cellCenter(seg.toR, seg.toC);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            ctx.restore();
        }

        _cellBorderPoint(fromR, fromC, toR, toC) {
            const c1 = this._cellCenter(fromR, fromC);
            const dr = toR - fromR;
            const dc = toC - fromC;
            return {
                x: c1.x + dc * (c1.w / 2),
                y: c1.y + dr * (c1.h / 2)
            };
        }

        _drawEmitter(ctx, center, dr, dc, now) {
            ctx.save();
            ctx.translate(center.x, center.y);

            // 基座圆盘
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(0, 0, center.w * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 发射枪管朝向
            const angle = Math.atan2(dr, dc);
            ctx.rotate(angle);

            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(0, -center.h * 0.1, center.w * 0.38, center.h * 0.2);

            // 能量核脉冲
            const pulse = 0.8 + Math.sin(now * 0.008) * 0.2;
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, center.w * 0.16, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        _drawMirror(ctx, center, item, r, c) {
            ctx.save();
            ctx.translate(center.x, center.y);

            // 旋转动画偏移
            const rotAnim = this.rotations.find(item => item.r === r && item.c === c);
            const extraAngle = rotAnim ? rotAnim.angleCurrent : 0;
            ctx.rotate(extraAngle);

            // 旋转底盘
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(0, 0, center.w * 0.38, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // 45 度反射镜片
            // state 0: '/', 倾角 -45 deg (-PI/4)
            // state 1: '\', 倾角 45 deg (PI/4)
            const mirrorAngle = (item.state === 0) ? -Math.PI / 4 : Math.PI / 4;
            ctx.rotate(mirrorAngle);

            // 镜面金属背板
            ctx.fillStyle = '#475569';
            ctx.fillRect(-center.w * 0.35, -3, center.w * 0.7, 6);

            // 镀银反射面
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.fillRect(-center.w * 0.35, -1.5, center.w * 0.7, 3);

            ctx.restore();
        }

        _drawSplitter(ctx, center, now) {
            ctx.save();
            ctx.translate(center.x, center.y);

            // 菱形棱镜
            const s = center.w * 0.32;
            ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(s, 0);
            ctx.lineTo(0, s);
            ctx.lineTo(-s, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 棱镜内部星核
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        _drawTarget(ctx, center, isLit, now) {
            ctx.save();
            ctx.translate(center.x, center.y);

            const r = center.w * 0.32;
            if (isLit) {
                // 充能光晕脉冲
                const pulse = 1 + Math.sin(now * 0.01) * 0.15;
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 16;

                ctx.beginPath();
                ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 沉寂状态
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        _drawWall(ctx, center) {
            const w = center.w * 0.8;
            const h = center.h * 0.8;
            ctx.save();
            ctx.fillStyle = '#1e293b';
            this._roundRect(ctx, center.x - w / 2, center.y - h / 2, w, h, 6);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 装饰 X
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.beginPath();
            ctx.moveTo(center.x - w * 0.3, center.y - h * 0.3);
            ctx.lineTo(center.x + w * 0.3, center.y + h * 0.3);
            ctx.moveTo(center.x + w * 0.3, center.y - h * 0.3);
            ctx.lineTo(center.x - w * 0.3, center.y + h * 0.3);
            ctx.stroke();

            ctx.restore();
        }

        _roundRect(ctx, x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.game = new OpticsGame();
    });

})(window);
