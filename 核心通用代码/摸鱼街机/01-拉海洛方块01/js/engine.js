/**
 * 🧊 Lahairo Blocks (拉海洛方块) - 核心引擎
 * 严守规范：8x8 几何网格、不可旋转、防遮挡触控抬升、动态 DPR 映射、微振动与防死局发牌保底
 */
(function(window) {
    'use strict';

    // 经典几何形状库 (不可旋转)
    const SHAPES = [
        // 单点与线段
        { name: 'dot', matrix: [[1]], color: '#00f0ff' },
        { name: 'line2_h', matrix: [[1, 1]], color: '#38bdf8' },
        { name: 'line2_v', matrix: [[1], [1]], color: '#38bdf8' },
        { name: 'line3_h', matrix: [[1, 1, 1]], color: '#00f0ff' },
        { name: 'line3_v', matrix: [[1], [1], [1]], color: '#00f0ff' },
        { name: 'line4_h', matrix: [[1, 1, 1, 1]], color: '#818cf8' },
        { name: 'line4_v', matrix: [[1], [1], [1], [1]], color: '#818cf8' },
        { name: 'line5_h', matrix: [[1, 1, 1, 1, 1]], color: '#c084fc' },
        { name: 'line5_v', matrix: [[1], [1], [1], [1], [1]], color: '#c084fc' },
        
        // 正方矩阵
        { name: 'square2', matrix: [[1, 1], [1, 1]], color: '#fbbf24' },
        { name: 'square3', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: '#f59e0b' },
        
        // L 形与反 L 形
        { name: 'L2_1', matrix: [[1, 0], [1, 1]], color: '#f43f5e' },
        { name: 'L2_2', matrix: [[0, 1], [1, 1]], color: '#f43f5e' },
        { name: 'L2_3', matrix: [[1, 1], [1, 0]], color: '#f43f5e' },
        { name: 'L2_4', matrix: [[1, 1], [0, 1]], color: '#f43f5e' },
        { name: 'L3_1', matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: '#ec4899' },
        { name: 'L3_2', matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: '#ec4899' },
        { name: 'L3_3', matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: '#ec4899' },
        { name: 'L3_4', matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: '#ec4899' },
        
        // T 形与十字
        { name: 'T1', matrix: [[1, 1, 1], [0, 1, 0]], color: '#a855f7' },
        { name: 'T2', matrix: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
        { name: 'T3', matrix: [[1, 0], [1, 1], [1, 0]], color: '#a855f7' },
        { name: 'T4', matrix: [[0, 1], [1, 1], [0, 1]], color: '#a855f7' }
    ];

    class LahairoGame {
        constructor() {
            this.GRID_SIZE = 8;
            this.board = Array(8).fill(null).map(() => Array(8).fill(null));
            
            this.score = 0;
            this.highScore = window.SafeStorage.get('lahairo_high_score', 0);
            this.combo = 0;
            this.isGameOver = false;
            this.isPaused = false;

            this.audio = new window.AudioEngine();
            this.bridge = new window.UniversalBridge('lahairo-blocks');
            this.bridge.bindGame(this);

            // 视口屏幕震颤状态
            this.shake = { intensity: 0, duration: 0, startTime: 0 };

            // 候选手牌
            this.docks = [null, null, null];
            
            // 粒子与悬浮文字系统
            this.particles = [];
            this.floatingTexts = [];
            
            // 拖拽状态
            this.dragState = {
                active: false,
                slotIndex: -1,
                piece: null,
                startX: 0,
                startY: 0,
                currX: 0,
                currY: 0,
                isTouch: false,
                liftOffset: 70 // 手机防遮挡上移像素
            };

            this.canvas = document.getElementById('board-canvas');
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

            this.bridge.emit('ON_READY', { game: 'lahairo-blocks' });
        }

        _initDPI() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = rect.width > 0 ? rect.width : (this.canvas.clientWidth || 360);
            const h = rect.height > 0 ? rect.height : (this.canvas.clientHeight || 360);
            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.dpr = dpr;
            this.cellSize = this.canvas.width / this.GRID_SIZE;
            this.dragState.liftOffset = 70 * dpr; // 动态乘以 DPR 防手指遮挡
        }

        restart() {
            this.board = Array(8).fill(null).map(() => Array(8).fill(null));
            this.score = 0;
            this.combo = 0;
            this.isGameOver = false;
            this.isPaused = false;
            this.particles = [];
            this.floatingTexts = [];
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
         * 发牌保底算法 (Fair Spawner) - 确保至少 1 个手牌在当前盘面有处可放
         */
        _spawnDocks() {
            const availableSpaces = this._getAvailablePlacements();
            
            for (let i = 0; i < 3; i++) {
                if (i === 0 && availableSpaces.length > 0) {
                    // 第一个槽位保底刷出有合法位置的形状
                    const validShapes = SHAPES.filter(s => this._canPlaceAnywhere(s.matrix));
                    this.docks[i] = validShapes.length > 0
                        ? validShapes[Math.floor(Math.random() * validShapes.length)]
                        : SHAPES[Math.floor(Math.random() * SHAPES.length)];
                } else {
                    this.docks[i] = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                }
            }
            this._renderDockElements();
            this._checkGameOver();
        }

        _renderDockElements() {
            this.dockElements.forEach((el, idx) => {
                el.innerHTML = '';
                const piece = this.docks[idx];
                if (!piece) return;

                const pieceCanvas = document.createElement('canvas');
                const pCols = piece.matrix[0].length;
                const pRows = piece.matrix.length;
                const maxDim = Math.max(pCols, pRows);
                
                const boxSize = 75;
                pieceCanvas.width = boxSize * this.dpr;
                pieceCanvas.height = boxSize * this.dpr;
                pieceCanvas.style.width = `${boxSize}px`;
                pieceCanvas.style.height = `${boxSize}px`;

                const pCtx = pieceCanvas.getContext('2d');
                pCtx.scale(this.dpr, this.dpr);
                const bs = (boxSize - 10) / maxDim;
                const startX = (boxSize - pCols * bs) / 2;
                const startY = (boxSize - pRows * bs) / 2;

                for (let r = 0; r < pRows; r++) {
                    for (let c = 0; c < pCols; c++) {
                        if (piece.matrix[r][c]) {
                            this._drawRoundedRect(
                                pCtx, 
                                startX + c * bs + 1, 
                                startY + r * bs + 1, 
                                bs - 2, 
                                bs - 2, 
                                4, 
                                piece.color,
                                true
                            );
                        }
                    }
                }
                el.appendChild(pieceCanvas);
            });
        }

        _bindEvents() {
            window.addEventListener('resize', () => {
                this._initDPI();
            });

            // 绑定手牌槽位 Pointerdown
            this.dockElements.forEach((slotEl, idx) => {
                slotEl.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    if (this.isGameOver || this.isPaused || !this.docks[idx]) return;

                    this.dragState.active = true;
                    this.dragState.slotIndex = idx;
                    this.dragState.piece = this.docks[idx];
                    this.dragState.isTouch = e.pointerType === 'touch';

                    const pt = this._getCanvasPoint(e);
                    this.dragState.currX = pt.x;
                    this.dragState.currY = pt.y - (this.dragState.isTouch ? this.dragState.liftOffset : 0);
                    
                    slotEl.style.opacity = '0.3';
                });
            });

            // 全局移动监听 (带防遮挡与事件穿透隔离)
            window.addEventListener('pointermove', (e) => {
                if (!this.dragState.active) return;
                e.stopPropagation();
                const pt = this._getCanvasPoint(e);
                this.dragState.currX = pt.x;
                this.dragState.currY = pt.y - (this.dragState.isTouch ? this.dragState.liftOffset : 0);
            }, { passive: false });

            // 松手放置监听
            window.addEventListener('pointerup', (e) => {
                if (!this.dragState.active) return;
                e.stopPropagation();
                this._handleDrop();
            });

            // ⚠️ 终极防线：pointercancel 异常中断回弹保护
            window.addEventListener('pointercancel', (e) => {
                if (!this.dragState.active) return;
                e.stopPropagation();
                this._cancelDrag();
            });

            // 按钮事件
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
            this.dragState.piece = null;
            this.dragState.slotIndex = -1;
        }

        _handleDrop() {
            const piece = this.dragState.piece;
            const slotIdx = this.dragState.slotIndex;
            const snap = this._getSnapTarget();

            if (snap && this._canPlaceAt(piece.matrix, snap.row, snap.col)) {
                // 合法放置
                this._placePiece(piece, snap.row, snap.col);
                this.docks[slotIdx] = null;
                this.dockElements[slotIdx].innerHTML = '';
                this.dockElements[slotIdx].style.opacity = '1';
                this.audio.playPlace();

                // 执行消除检查
                this._checkClears();

                // 若 3 个手牌全放空，刷新下一轮
                if (this.docks.every(d => d === null)) {
                    this._spawnDocks();
                } else {
                    this._checkGameOver();
                }
            } else {
                // 放下失败，弹回原位
                this._cancelDrag();
            }

            this.dragState.active = false;
            this.dragState.piece = null;
            this.dragState.slotIndex = -1;
        }

        _getSnapTarget() {
            if (!this.dragState.piece) return null;
            const piece = this.dragState.piece;
            const pCols = piece.matrix[0].length;
            const pRows = piece.matrix.length;

            const gridX = this.dragState.currX - (pCols * this.cellSize) / 2;
            const gridY = this.dragState.currY - (pRows * this.cellSize) / 2;

            const col = Math.round(gridX / this.cellSize);
            const row = Math.round(gridY / this.cellSize);

            if (row >= 0 && row + pRows <= this.GRID_SIZE && col >= 0 && col + pCols <= this.GRID_SIZE) {
                return { row, col };
            }
            return null;
        }

        _canPlaceAt(matrix, startRow, startCol) {
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[0].length; c++) {
                    if (matrix[r][c]) {
                        const tr = startRow + r;
                        const tc = startCol + c;
                        if (tr < 0 || tr >= this.GRID_SIZE || tc < 0 || tc >= this.GRID_SIZE) return false;
                        if (this.board[tr][tc] !== null) return false;
                    }
                }
            }
            return true;
        }

        _canPlaceAnywhere(matrix) {
            for (let r = 0; r <= this.GRID_SIZE - matrix.length; r++) {
                for (let c = 0; c <= this.GRID_SIZE - matrix[0].length; c++) {
                    if (this._canPlaceAt(matrix, r, c)) return true;
                }
            }
            return false;
        }

        _getAvailablePlacements() {
            const list = [];
            for (let r = 0; r < this.GRID_SIZE; r++) {
                for (let c = 0; c < this.GRID_SIZE; c++) {
                    if (this.board[r][c] === null) list.push({ r, c });
                }
            }
            return list;
        }

        _placePiece(piece, startRow, startCol) {
            let cellsCount = 0;
            for (let r = 0; r < piece.matrix.length; r++) {
                for (let c = 0; c < piece.matrix[0].length; c++) {
                    if (piece.matrix[r][c]) {
                        this.board[startRow + r][startCol + c] = piece.color;
                        cellsCount++;
                    }
                }
            }
            this.score += cellsCount * 10;
            this._updateScoreUI();
        }

        /**
         * 行列满格消除与多米诺连击判定
         */
        _checkClears() {
            const fullRows = [];
            const fullCols = [];

            // 检查行
            for (let r = 0; r < this.GRID_SIZE; r++) {
                if (this.board[r].every(cell => cell !== null)) {
                    fullRows.push(r);
                }
            }
            // 检查列
            for (let c = 0; c < this.GRID_SIZE; c++) {
                let full = true;
                for (let r = 0; r < this.GRID_SIZE; r++) {
                    if (this.board[r][c] === null) { full = false; break; }
                }
                if (full) fullCols.push(c);
            }

            const totalLines = fullRows.length + fullCols.length;

            if (totalLines > 0) {
                this.combo++;
                const bonus = totalLines * 100 * this.combo;
                this.score += bonus;
                this._updateScoreUI();

                // 物理屏幕阻尼微震颤与悬浮得分飘字
                this.triggerShake(totalLines > 1 ? 5 : 3.5, 120);
                this.floatingTexts.push({
                    text: `+${bonus}${this.combo > 1 ? ` 🔥x${this.combo}` : ''}`,
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2,
                    alpha: 1.0,
                    vy: -1.2,
                    color: this.combo > 1 ? '#f43f5e' : '#fbbf24'
                });

                // 播放阶梯音阶与触觉震动
                this.audio.playClear(totalLines, this.combo);
                this.bridge.vibrate(this.combo > 1 ? [15, 30, 20] : 15);

                // 产生全屏粒子爆炸
                fullRows.forEach(r => {
                    for (let c = 0; c < this.GRID_SIZE; c++) {
                        this._createParticles(c * this.cellSize + this.cellSize / 2, r * this.cellSize + this.cellSize / 2, this.board[r][c]);
                        this.board[r][c] = null;
                    }
                });
                fullCols.forEach(c => {
                    for (let r = 0; r < this.GRID_SIZE; r++) {
                        if (this.board[r][c]) {
                            this._createParticles(c * this.cellSize + this.cellSize / 2, r * this.cellSize + this.cellSize / 2, this.board[r][c]);
                            this.board[r][c] = null;
                        }
                    }
                });

                // 广播连击事件给宿主 (桌宠喝彩/主页互动)
                this.bridge.emit('ON_COMBO_TRIGGER', {
                    comboCount: this.combo,
                    lines: totalLines,
                    scoreGained: bonus,
                    currentScore: this.score
                });

                this._showComboBanner(this.combo, totalLines);
            } else {
                this.combo = 0;
            }
        }

        _showComboBanner(combo, lines) {
            const banner = document.getElementById('combo-banner');
            if (!banner) return;
            banner.textContent = combo > 1 ? `🔥 COMBO x${combo} (+${lines}行)` : `⚡ CLEAR (+${lines}行)`;
            banner.classList.add('show');
            setTimeout(() => {
                banner.classList.remove('show');
            }, 800);
        }

        triggerShake(intensity = 4, duration = 120) {
            this.shake = { intensity, duration, startTime: performance.now() };
        }

        _checkGameOver() {
            // 校验手牌中是否仍有至少一个方块能在当前盘面放下
            const remaining = this.docks.filter(p => p !== null);
            if (remaining.length === 0) return;

            const canAnyFit = remaining.some(p => this._canPlaceAnywhere(p.matrix));
            if (!canAnyFit) {
                this.isGameOver = true;
                this.audio.playGameOver();
                this.bridge.vibrate([40, 60, 40]);

                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    window.SafeStorage.set('lahairo_high_score', this.highScore);
                }
                this._updateScoreUI();

                document.getElementById('final-score-val').textContent = this.score;
                document.getElementById('game-over-modal')?.classList.add('active');

                const overPayload = {
                    finalScore: this.score,
                    score: this.score,
                    highScore: this.highScore,
                    current: this.score,
                    best: this.highScore
                };
                this.bridge.emit('GAME_OVER', overPayload);
                this.bridge.emit('ON_GAME_OVER', overPayload);
            }
        }

        _updateScoreUI() {
            document.getElementById('score-val').textContent = this.score;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                window.SafeStorage.set('lahairo_high_score', this.highScore);
            }
            document.getElementById('high-score-val').textContent = this.highScore;

            const payload = {
                current: this.score,
                best: this.highScore,
                currentScore: this.score,
                highScore: this.highScore
            };
            this.bridge.emit('SCORE_UPDATE', payload);
            this.bridge.emit('ON_SCORE_UPDATE', payload);
        }

        _createParticles(x, y, color) {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6 + 2;
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 4 + 2,
                    color: color || '#00f0ff',
                    alpha: 1,
                    life: 1
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

            // 1. 绘制 8x8 网格背景
            for (let r = 0; r < this.GRID_SIZE; r++) {
                for (let c = 0; c < this.GRID_SIZE; c++) {
                    const x = c * this.cellSize;
                    const y = r * this.cellSize;
                    
                    // 默认底盘单元格
                    this._drawRoundedRect(this.ctx, x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 6, 'rgba(255, 255, 255, 0.04)', false);

                    // 已有固定方块
                    if (this.board[r][c]) {
                        this._drawRoundedRect(this.ctx, x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 6, this.board[r][c], true);
                    }
                }
            }

            // 2. 绘制拖拽时的吸附高亮预览 (Ghost Preview)
            if (this.dragState.active && this.dragState.piece) {
                const snap = this._getSnapTarget();
                if (snap && this._canPlaceAt(this.dragState.piece.matrix, snap.row, snap.col)) {
                    const matrix = this.dragState.piece.matrix;
                    for (let r = 0; r < matrix.length; r++) {
                        for (let c = 0; c < matrix[0].length; c++) {
                            if (matrix[r][c]) {
                                const tr = snap.row + r;
                                const tc = snap.col + c;
                                this._drawRoundedRect(
                                    this.ctx,
                                    tc * this.cellSize + 2,
                                    tr * this.cellSize + 2,
                                    this.cellSize - 4,
                                    this.cellSize - 4,
                                    6,
                                    'rgba(0, 240, 255, 0.35)',
                                    true
                                );
                            }
                        }
                    }
                }

                // 3. 绘制正在跟随手指/光标移动的方块
                const pCols = this.dragState.piece.matrix[0].length;
                const pRows = this.dragState.piece.matrix.length;
                const drawStartX = this.dragState.currX - (pCols * this.cellSize) / 2;
                const drawStartY = this.dragState.currY - (pRows * this.cellSize) / 2;

                for (let r = 0; r < pRows; r++) {
                    for (let c = 0; c < pCols; c++) {
                        if (this.dragState.piece.matrix[r][c]) {
                            this._drawRoundedRect(
                                this.ctx,
                                drawStartX + c * this.cellSize + 2,
                                drawStartY + r * this.cellSize + 2,
                                this.cellSize - 4,
                                this.cellSize - 4,
                                6,
                                this.dragState.piece.color,
                                true,
                                true
                            );
                        }
                    }
                }
            }

            // 4. 渲染与更新粒子
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

            // 绘制浮动得分文字
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy;
                ft.alpha -= 0.02;
                if (ft.alpha <= 0) {
                    this.floatingTexts.splice(i, 1);
                } else {
                    this.ctx.save();
                    this.ctx.globalAlpha = ft.alpha;
                    this.ctx.font = `900 ${22 * this.dpr}px -apple-system, sans-serif`;
                    this.ctx.fillStyle = ft.color;
                    this.ctx.shadowColor = ft.color;
                    this.ctx.shadowBlur = 10;
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(ft.text, ft.x, ft.y);
                    this.ctx.restore();
                }
            }

            this.ctx.restore();
        }

        _drawRoundedRect(ctx, x, y, width, height, radius, color, isFill = true, glow = false) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();

            if (glow) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 14;
            }

            if (isFill) {
                ctx.fillStyle = color;
                ctx.fill();
                // 顶部晶核高光细线
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    // 页面加载自动实例化并暴露到全局
    window.addEventListener('DOMContentLoaded', () => {
        window.LahairoGame = new LahairoGame();
    });

})(window);
