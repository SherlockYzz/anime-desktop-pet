/**
 * ❄️ Lahairo Blocks 02 (拉海洛方块·下落重力版) - 核心引擎
 * 严守规范：下落重力系统、左右平移、90°旋转、水平/垂直翻转(大小形状不变)、落点虚影、暂存Hold与全端自适应
 */
(function(window) {
    'use strict';

    // 核心形状库
    const PIECE_SHAPES = [
        { name: 'I', matrix: [[1, 1, 1, 1]], color: '#00f0ff' },
        { name: 'O', matrix: [[1, 1], [1, 1]], color: '#fbbf24' },
        { name: 'T', matrix: [[1, 1, 1], [0, 1, 0]], color: '#a855f7' },
        { name: 'S', matrix: [[0, 1, 1], [1, 1, 0]], color: '#10b981' },
        { name: 'Z', matrix: [[1, 1, 0], [0, 1, 1]], color: '#f43f5e' },
        { name: 'J', matrix: [[1, 0, 0], [1, 1, 1]], color: '#38bdf8' },
        { name: 'L', matrix: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },
        { name: 'C', matrix: [[1, 1], [1, 0]], color: '#ec4899' } // 拉海洛特色小角块
    ];

    class LahairoFallingGame {
        constructor() {
            this.COLS = 10;
            this.ROWS = 20;

            this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
            this.score = 0;
            this.highScore = window.SafeStorage.get('lahairo_falling_high_score', 0);
            this.linesCleared = 0;
            this.level = 1;
            this.combo = 0;

            this.isGameOver = false;
            this.isPaused = false;
            this.canHold = true;

            this.currentPiece = null;
            this.pieceX = 0;
            this.pieceY = 0;
            this.nextPiece = null;
            this.heldPiece = null;

            // 重力下落定时器
            this.dropInterval = 800; // ms
            this.lastDropTime = 0;
            this.lockDelay = 500;
            this.lockTimer = 0;

            this.particles = [];
            this.floatingTexts = [];
            this.shake = { intensity: 0, duration: 0, startTime: 0 };

            this.audio = new window.AudioEngine();
            this.bridge = new window.UniversalBridge('lahairo-blocks-02');
            this.bridge.bindGame(this);

            this.canvas = document.getElementById('well-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.nextCanvas = document.getElementById('next-canvas');
            this.nextCtx = this.nextCanvas.getContext('2d');
            this.holdCanvas = document.getElementById('hold-canvas');
            this.holdCtx = this.holdCanvas.getContext('2d');

            this._initDPI();
            this._bindEvents();
            this.restart();
            this._startLoop();

            this.bridge.emit('ON_READY', { game: 'lahairo-blocks-02' });
        }

        _initDPI() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = rect.width > 0 ? rect.width : (this.canvas.clientWidth || 240);
            const h = rect.height > 0 ? rect.height : (this.canvas.clientHeight || 480);
            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.dpr = dpr;
            this.cellSize = this.canvas.width / this.COLS;

            // 侧边小预览 Canvas DPI
            [this.nextCanvas, this.holdCanvas].forEach(cvs => {
                cvs.width = 60 * dpr;
                cvs.height = 60 * dpr;
            });
        }

        restart() {
            this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
            this.score = 0;
            this.linesCleared = 0;
            this.level = 1;
            this.combo = 0;
            this.isGameOver = false;
            this.isPaused = false;
            this.canHold = true;
            this.heldPiece = null;
            this.particles = [];
            this.floatingTexts = [];
            this.dropInterval = 800;

            this.nextPiece = this._randomPiece();
            this._spawnPiece();
            this._updateScoreUI();
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

        _randomPiece() {
            const tmpl = PIECE_SHAPES[Math.floor(Math.random() * PIECE_SHAPES.length)];
            return {
                name: tmpl.name,
                matrix: tmpl.matrix.map(row => [...row]),
                color: tmpl.color
            };
        }

        _spawnPiece() {
            this.currentPiece = this.nextPiece || this._randomPiece();
            this.nextPiece = this._randomPiece();
            this.canHold = true;

            const pCols = this.currentPiece.matrix[0].length;
            this.pieceX = Math.floor((this.COLS - pCols) / 2);
            this.pieceY = 0;
            this.lockTimer = 0;

            // 检查开局暴毙 (若一出生就重叠)
            if (!this._isValidPosition(this.currentPiece.matrix, this.pieceX, this.pieceY)) {
                this._gameOver();
            }

            this._renderSidePanels();
        }

        _isValidPosition(matrix, px, py) {
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[0].length; c++) {
                    if (matrix[r][c]) {
                        const nx = px + c;
                        const ny = py + r;
                        if (nx < 0 || nx >= this.COLS || ny >= this.ROWS) return false;
                        if (ny >= 0 && this.board[ny][nx] !== null) return false;
                    }
                }
            }
            return true;
        }

        /**
         * 左右平移
         */
        move(dir) {
            if (this.isGameOver || this.isPaused || !this.currentPiece) return;
            if (this._isValidPosition(this.currentPiece.matrix, this.pieceX + dir, this.pieceY)) {
                this.pieceX += dir;
                this.audio.playMove();
                this.lockTimer = 0; // 移动刷新锁定延迟
            }
        }

        /**
         * 顺时针 90° 旋转 (改变左右方位，带踢墙与踢地保护)
         */
        rotate() {
            if (this.isGameOver || this.isPaused || !this.currentPiece) return;
            const orig = this.currentPiece.matrix;
            const rows = orig.length;
            const cols = orig[0].length;

            const rotated = Array(cols).fill(null).map((_, c) => 
                Array(rows).fill(null).map((_, r) => orig[rows - 1 - r][c])
            );

            // 踢墙与踢地尝试 (Wall & Floor Kicks)
            const kicks = [
                { x: 0, y: 0 },
                { x: -1, y: 0 },
                { x: 1, y: 0 },
                { x: 0, y: -1 },
                { x: -2, y: 0 },
                { x: 2, y: 0 },
                { x: 0, y: -2 }
            ];
            for (let k of kicks) {
                if (this._isValidPosition(rotated, this.pieceX + k.x, this.pieceY + k.y)) {
                    this.currentPiece.matrix = rotated;
                    this.pieceX += k.x;
                    this.pieceY += k.y;
                    this.audio.playRotate();
                    this.lockTimer = 0;
                    return;
                }
            }
        }

        /**
         * 水平镜像翻转 (左右翻转，保持大小形状不变)
         */
        flipHorizontal() {
            if (this.isGameOver || this.isPaused || !this.currentPiece) return;
            const flipped = this.currentPiece.matrix.map(row => [...row].reverse());

            const kicks = [
                { x: 0, y: 0 },
                { x: -1, y: 0 },
                { x: 1, y: 0 },
                { x: -2, y: 0 },
                { x: 2, y: 0 }
            ];
            for (let k of kicks) {
                if (this._isValidPosition(flipped, this.pieceX + k.x, this.pieceY + k.y)) {
                    this.currentPiece.matrix = flipped;
                    this.pieceX += k.x;
                    this.pieceY += k.y;
                    this.audio.playFlip();
                    this.lockTimer = 0;
                    return;
                }
            }
        }

        /**
         * 垂直翻转 (上下翻转，保持大小形状不变，带踢地保护)
         */
        flipVertical() {
            if (this.isGameOver || this.isPaused || !this.currentPiece) return;
            const flipped = [...this.currentPiece.matrix].reverse().map(row => [...row]);

            const kicks = [
                { x: 0, y: 0 },
                { x: 0, y: -1 },
                { x: -1, y: 0 },
                { x: 1, y: 0 },
                { x: 0, y: -2 }
            ];
            for (let k of kicks) {
                if (this._isValidPosition(flipped, this.pieceX + k.x, this.pieceY + k.y)) {
                    this.currentPiece.matrix = flipped;
                    this.pieceX += k.x;
                    this.pieceY += k.y;
                    this.audio.playFlip();
                    this.lockTimer = 0;
                    return;
                }
            }
        }

        /**
         * 软下落 (向下加速一格)
         */
        softDrop() {
            if (this.isGameOver || this.isPaused || !this.currentPiece) return;
            if (this._isValidPosition(this.currentPiece.matrix, this.pieceX, this.pieceY + 1)) {
                this.pieceY++;
                this.score += 1;
                this._updateScoreUI();
                this.lockTimer = 0;
            } else {
                this._lockPiece();
            }
        }

        /**
         * 硬下落 (瞬间击穿到底)
         */
        hardDrop() {
            if (this.isGameOver || this.isPaused || !this.currentPiece) return;
            let dropDist = 0;
            while (this._isValidPosition(this.currentPiece.matrix, this.pieceX, this.pieceY + 1)) {
                this.pieceY++;
                dropDist++;
            }
            this.score += dropDist * 2;
            this.audio.playDrop();
            this.bridge.vibrate(dropDist > 4 ? 25 : 15);
            // 硬下落强击震屏与火花冲击
            this.triggerShake(dropDist > 4 ? 4.5 : 2.5, 80);
            this._createImpactSparks();
            this._lockPiece();
        }

        /**
         * 暂存/置换手牌 (Hold)
         */
        hold() {
            if (this.isGameOver || this.isPaused || !this.canHold || !this.currentPiece) return;

            const cur = {
                name: this.currentPiece.name,
                matrix: PIECE_SHAPES.find(s => s.name === this.currentPiece.name).matrix.map(r => [...r]),
                color: this.currentPiece.color
            };

            if (this.heldPiece) {
                const temp = this.heldPiece;
                this.heldPiece = cur;
                this.currentPiece = temp;
                const pCols = this.currentPiece.matrix[0].length;
                this.pieceX = Math.floor((this.COLS - pCols) / 2);
                this.pieceY = 0;
            } else {
                this.heldPiece = cur;
                this._spawnPiece();
            }

            this.canHold = false;
            this.audio.playMove();
            this._renderSidePanels();
        }

        /**
         * 计算落点虚影 (Ghost Piece)
         */
        _getGhostY() {
            if (!this.currentPiece) return this.pieceY;
            let gy = this.pieceY;
            while (this._isValidPosition(this.currentPiece.matrix, this.pieceX, gy + 1)) {
                gy++;
            }
            return gy;
        }

        _lockPiece() {
            const matrix = this.currentPiece.matrix;
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[0].length; c++) {
                    if (matrix[r][c]) {
                        const tr = this.pieceY + r;
                        const tc = this.pieceX + c;
                        if (tr >= 0 && tr < this.ROWS && tc >= 0 && tc < this.COLS) {
                            this.board[tr][tc] = this.currentPiece.color;
                        }
                    }
                }
            }

            this._checkLineClears();
            this._spawnPiece();
        }

        _checkLineClears() {
            const fullRows = [];
            for (let r = 0; r < this.ROWS; r++) {
                if (this.board[r].every(cell => cell !== null)) {
                    fullRows.push(r);
                }
            }

            if (fullRows.length > 0) {
                this.combo++;
                this.linesCleared += fullRows.length;

                // 经典打行分数倍率
                const baseScores = [0, 100, 300, 500, 800];
                const gained = (baseScores[fullRows.length] || 1000) * this.combo;
                this.score += gained;

                this.level = Math.floor(this.linesCleared / 10) + 1;
                this.dropInterval = Math.max(150, 800 - (this.level - 1) * 65);

                this.audio.playClear(fullRows.length, this.combo);
                this.bridge.vibrate(this.combo > 1 ? [15, 30, 20] : 15);
                this.triggerShake(fullRows.length > 1 ? 5 : 3.5, 120);

                // 粒子飞散
                fullRows.forEach(r => {
                    for (let c = 0; c < this.COLS; c++) {
                        this._createCellParticles(c, r, this.board[r][c]);
                    }
                });

                // 浮动跳字
                const midRow = fullRows[Math.floor(fullRows.length / 2)];
                this._addFloatingText(
                    `+${gained}${this.combo > 1 ? ` (x${this.combo})` : ''}`,
                    this.canvas.width / 2,
                    midRow * this.cellSize + this.cellSize / 2,
                    this.combo > 1 ? '#ffea00' : '#00f0ff'
                );

                // 优雅下落消除：保留未被消除的行，在顶部补全空行 (彻底根除多行并发消除跳行 Bug)
                const newBoard = this.board.filter((_, idx) => !fullRows.includes(idx));
                while (newBoard.length < this.ROWS) {
                    newBoard.unshift(Array(this.COLS).fill(null));
                }
                this.board = newBoard;

                this._showComboBanner(this.combo, fullRows.length);

                this.bridge.emit('ON_COMBO_TRIGGER', {
                    comboCount: this.combo,
                    lines: fullRows.length,
                    scoreGained: gained,
                    currentScore: this.score
                });
            } else {
                this.combo = 0;
            }

            this._updateScoreUI();
        }

        _addFloatingText(text, x, y, color = '#00f0ff') {
            this.floatingTexts.push({
                text,
                x,
                y,
                alpha: 1,
                vy: -1.2 * this.dpr,
                color
            });
        }

        _showComboBanner(combo, lines) {
            const banner = document.getElementById('combo-banner');
            if (!banner) return;
            banner.textContent = combo > 1 ? `🔥 COMBO x${combo} (+${lines}行)` : `⚡ CLEAR (+${lines}行)`;
            banner.classList.add('show');
            setTimeout(() => banner.classList.remove('show'), 700);
        }

        triggerShake(intensity = 4, duration = 120) {
            this.shake = { intensity, duration, startTime: performance.now() };
        }

        _gameOver() {
            this.isGameOver = true;
            this.audio.playGameOver();
            this.bridge.vibrate([40, 60, 40]);

            if (this.score > this.highScore) {
                this.highScore = this.score;
                window.SafeStorage.set('lahairo_falling_high_score', this.highScore);
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

        _updateScoreUI() {
            document.getElementById('score-val').textContent = this.score;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                window.SafeStorage.set('lahairo_falling_high_score', this.highScore);
            }
            document.getElementById('high-score-val').textContent = this.highScore;
            document.getElementById('level-val').textContent = this.level;
            document.getElementById('lines-val').textContent = this.linesCleared;

            const payload = {
                current: this.score,
                best: this.highScore,
                currentScore: this.score,
                highScore: this.highScore,
                level: this.level,
                lines: this.linesCleared
            };
            this.bridge.emit('SCORE_UPDATE', payload);
            this.bridge.emit('ON_SCORE_UPDATE', payload);
        }

        _bindEvents() {
            window.addEventListener('resize', () => this._initDPI());

            // 键盘事件支持 (PC/Mac)
            window.addEventListener('keydown', (e) => {
                if (this.isGameOver) return;
                switch (e.code) {
                    case 'ArrowLeft':
                    case 'KeyA':
                        e.preventDefault();
                        this.move(-1);
                        break;
                    case 'ArrowRight':
                    case 'KeyD':
                        e.preventDefault();
                        this.move(1);
                        break;
                    case 'ArrowDown':
                    case 'KeyS':
                        e.preventDefault();
                        this.softDrop();
                        break;
                    case 'Space':
                        e.preventDefault();
                        this.hardDrop();
                        break;
                    case 'ArrowUp':
                    case 'KeyW':
                        e.preventDefault();
                        this.rotate();
                        break;
                    case 'KeyQ':
                    case 'KeyF':
                        e.preventDefault();
                        this.flipHorizontal();
                        break;
                    case 'KeyE':
                    case 'KeyV':
                        e.preventDefault();
                        this.flipVertical();
                        break;
                    case 'KeyC':
                    case 'ShiftLeft':
                    case 'ShiftRight':
                        e.preventDefault();
                        this.hold();
                        break;
                }
            });

            // 触控手柄按钮监听 (移动端/平板)
            const bindBtn = (id, action) => {
                const btn = document.getElementById(id);
                if (!btn) return;
                btn.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    action();
                });
            };

            bindBtn('btn-left', () => this.move(-1));
            bindBtn('btn-right', () => this.move(1));
            bindBtn('btn-down', () => this.softDrop());
            bindBtn('btn-hard-drop', () => this.hardDrop());
            bindBtn('btn-rotate', () => this.rotate());
            bindBtn('btn-flip-h', () => this.flipHorizontal());
            bindBtn('btn-flip-v', () => this.flipVertical());
            bindBtn('btn-hold', () => this.hold());

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

        _createImpactSparks() {
            if (!this.currentPiece) return;
            const gy = this._getGhostY();
            const cx = (this.pieceX + this.currentPiece.matrix[0].length / 2) * this.cellSize;
            const cy = (gy + this.currentPiece.matrix.length) * this.cellSize;

            for (let i = 0; i < 12; i++) {
                const angle = Math.PI + (Math.random() - 0.5) * Math.PI;
                const spd = Math.random() * 6 + 2;
                this.particles.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    color: '#00f0ff',
                    alpha: 1
                });
            }
        }

        _createCellParticles(c, r, color) {
            const cx = c * this.cellSize + this.cellSize / 2;
            const cy = r * this.cellSize + this.cellSize / 2;
            for (let i = 0; i < 6; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = Math.random() * 5 + 2;
                this.particles.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    color: color || '#00f0ff',
                    alpha: 1
                });
            }
        }

        _startLoop() {
            const loop = (time) => {
                if (!this.isPaused && !this.isGameOver) {
                    if (time - this.lastDropTime > this.dropInterval) {
                        this.lastDropTime = time;
                        if (this._isValidPosition(this.currentPiece.matrix, this.pieceX, this.pieceY + 1)) {
                            this.pieceY++;
                        } else {
                            this._lockPiece();
                        }
                    }
                }

                this._render();
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }

        _renderSidePanels() {
            // 渲染 Next
            this._renderMiniPiece(this.nextCtx, this.nextPiece, 60);
            // 渲染 Hold
            this._renderMiniPiece(this.holdCtx, this.heldPiece, 60);
        }

        _renderMiniPiece(ctx, piece, boxSize) {
            ctx.clearRect(0, 0, boxSize * this.dpr, boxSize * this.dpr);
            if (!piece) return;

            const pCols = piece.matrix[0].length;
            const pRows = piece.matrix.length;
            const bs = Math.floor((boxSize - 12) / Math.max(pCols, pRows));
            const startX = ((boxSize - pCols * bs) / 2) * this.dpr;
            const startY = ((boxSize - pRows * bs) / 2) * this.dpr;

            for (let r = 0; r < pRows; r++) {
                for (let c = 0; c < pCols; c++) {
                    if (piece.matrix[r][c]) {
                        this._drawBlock(ctx, startX + c * bs * this.dpr, startY + r * bs * this.dpr, bs * this.dpr, piece.color);
                    }
                }
            }
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

            // 1. 绘制网格线
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            this.ctx.lineWidth = 1;
            for (let r = 0; r < this.ROWS; r++) {
                for (let c = 0; c < this.COLS; c++) {
                    this.ctx.strokeRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
                }
            }

            // 2. 绘制已固定的方块
            for (let r = 0; r < this.ROWS; r++) {
                for (let c = 0; c < this.COLS; c++) {
                    if (this.board[r][c]) {
                        this._drawBlock(this.ctx, c * this.cellSize, r * this.cellSize, this.cellSize, this.board[r][c]);
                    }
                }
            }

            // 3. 绘制落点虚影 (Ghost Piece)
            if (this.currentPiece && !this.isGameOver) {
                const ghostY = this._getGhostY();
                const matrix = this.currentPiece.matrix;
                for (let r = 0; r < matrix.length; r++) {
                    for (let c = 0; c < matrix[0].length; c++) {
                        if (matrix[r][c]) {
                            const gx = (this.pieceX + c) * this.cellSize;
                            const gy = (ghostY + r) * this.cellSize;
                            this._drawGhostBlock(this.ctx, gx, gy, this.cellSize, this.currentPiece.color);
                        }
                    }
                }

                // 4. 绘制当前下落中的方块
                for (let r = 0; r < matrix.length; r++) {
                    for (let c = 0; c < matrix[0].length; c++) {
                        if (matrix[r][c]) {
                            const x = (this.pieceX + c) * this.cellSize;
                            const y = (this.pieceY + r) * this.cellSize;
                            this._drawBlock(this.ctx, x, y, this.cellSize, this.currentPiece.color, true);
                        }
                    }
                }
            }

            // 5. 粒子渲染
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.03;
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                } else {
                    this.ctx.save();
                    this.ctx.globalAlpha = p.alpha;
                    this.ctx.fillStyle = p.color;
                    this.ctx.shadowColor = p.color;
                    this.ctx.shadowBlur = 8;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, 3 * this.dpr, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }

            // 6. 浮动得分跳字渲染
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy;
                ft.alpha -= 0.02;
                if (ft.alpha <= 0) {
                    this.floatingTexts.splice(i, 1);
                } else {
                    this.ctx.save();
                    this.ctx.globalAlpha = ft.alpha;
                    this.ctx.fillStyle = ft.color || '#ffea00';
                    this.ctx.font = `bold ${Math.round(16 * this.dpr)}px system-ui, -apple-system, sans-serif`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.shadowColor = ft.color || '#ffea00';
                    this.ctx.shadowBlur = 8;
                    this.ctx.fillText(ft.text, ft.x, ft.y);
                    this.ctx.restore();
                }
            }

            this.ctx.restore();
        }

        _drawBlock(ctx, x, y, size, color, glow = false) {
            ctx.save();
            if (glow) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
            }
            ctx.fillStyle = color;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x + 1.5, y + 1.5, size - 3, size - 3, 4 * this.dpr);
            } else {
                ctx.rect(x + 1.5, y + 1.5, size - 3, size - 3);
            }
            ctx.fill();

            // 顶部晶体高光
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        }

        _drawGhostBlock(ctx, x, y, size, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4 * this.dpr, 3 * this.dpr]);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x + 2, y + 2, size - 4, size - 4, 3 * this.dpr);
            } else {
                ctx.rect(x + 2, y + 2, size - 4, size - 4);
            }
            ctx.stroke();
            ctx.fill();
            ctx.restore();
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.LahairoFallingGame = new LahairoFallingGame();
    });

})(window);
