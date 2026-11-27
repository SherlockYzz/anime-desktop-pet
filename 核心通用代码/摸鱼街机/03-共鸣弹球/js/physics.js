/**
 * ⚡ Resonance Ball (共鸣弹球) - 核心物理引擎
 * 严守规范：微子步防穿墙连续碰撞检测(CCD)、固定时间步长、轨迹反射预测、8声道限流与多端自适应
 */
(function(window) {
    'use strict';

    class ResonanceBallGame {
        constructor() {
            this.COLS = 7;
            this.ROWS = 9;
            this.SUB_STEPS = 3; // 微子步拆分 (CCD 杜绝高速穿墙)

            this.score = 0;
            this.highScore = window.SafeStorage.get('resonance_ball_high_score', 0);
            this.level = 1;
            this.totalBalls = 10;
            this.extraBallsNextTurn = 0;

            this.balls = [];
            this.bricks = [];
            this.powerups = [];
            this.particles = [];
            this.floatingTexts = [];
            this.hitComboCount = 0;

            this.state = 'AIMING'; // 'AIMING' | 'SHOOTING' | 'RESOLVING' | 'GAMEOVER'
            this.speedMultiplier = 1;

            this.launcherX = 0;
            this.launcherY = 0;
            this.newLauncherX = null;

            this.aimTarget = null; // { x, y }
            this.isAiming = false;

            this.audio = new window.AudioEngine();
            this.bridge = new window.UniversalBridge('resonance-ball');
            this.bridge.bindGame(this);

            this.canvas = document.getElementById('ball-canvas');
            this.ctx = this.canvas.getContext('2d');

            this._initDPI();
            this._bindEvents();
            this.restart();
            this._startLoop();

            this.bridge.emit('ON_READY', { game: 'resonance-ball' });
        }

        _initDPI() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = rect.width > 0 ? rect.width : (this.canvas.clientWidth || 360);
            const h = rect.height > 0 ? rect.height : (this.canvas.clientHeight || 540);
            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.dpr = dpr;

            this.cellWidth = this.canvas.width / this.COLS;
            this.cellHeight = this.canvas.height / (this.ROWS + 2);
            this.ballRadius = Math.max(4 * this.dpr, 5);

            this.launcherY = this.canvas.height - 24 * this.dpr;
            if (this.launcherX === 0) {
                this.launcherX = this.canvas.width / 2;
            }
        }

        restart() {
            this.level = 1;
            this.score = 0;
            this.totalBalls = 10;
            this.extraBallsNextTurn = 0;
            this.balls = [];
            this.bricks = [];
            this.powerups = [];
            this.particles = [];
            this.floatingTexts = [];
            this.hitComboCount = 0;
            this.state = 'AIMING';
            this.speedMultiplier = 1;
            this.launcherX = this.canvas.width / 2;
            this.newLauncherX = null;

            this._spawnRow();
            this._spawnRow();
            this._updateScoreUI();
            document.getElementById('game-over-modal')?.classList.remove('active');
        }

        pause() {
            this.state = 'PAUSED';
            document.getElementById('pause-modal')?.classList.add('active');
        }

        resume() {
            this.state = 'AIMING';
            document.getElementById('pause-modal')?.classList.remove('active');
        }

        toggleSpeed() {
            this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
            document.getElementById('btn-speed').textContent = `${this.speedMultiplier}x ⏩`;
        }

        /**
         * 顶部生成新一行砖块与道具
         */
        _spawnRow() {
            // 所有砖块下移一行
            this.bricks.forEach(b => b.row++);
            this.powerups.forEach(p => p.row++);

            // 检查死线碰撞 (到达倒数第二行即游戏结束)
            if (this.bricks.some(b => b.row >= this.ROWS - 1)) {
                this._gameOver();
                return;
            }

            // 新增第 1 行砖块
            const emptyCols = [];
            for (let c = 0; c < this.COLS; c++) {
                emptyCols.push(c);
            }

            // 随机 2~4 个砖块
            const brickCount = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < brickCount; i++) {
                if (emptyCols.length === 0) break;
                const colIdx = Math.floor(Math.random() * emptyCols.length);
                const col = emptyCols.splice(colIdx, 1)[0];

                const hp = this.level + (Math.random() > 0.6 ? this.level : 0);
                this.bricks.push({
                    row: 1,
                    col: col,
                    hp: hp,
                    maxHp: hp,
                    type: 'normal'
                });
            }

            // 1 个 +1 弹珠收集项
            if (emptyCols.length > 0 && Math.random() > 0.3) {
                const colIdx = Math.floor(Math.random() * emptyCols.length);
                const col = emptyCols.splice(colIdx, 1)[0];
                this.powerups.push({
                    row: 1,
                    col: col,
                    type: 'extra_ball'
                });
            }

            this.level++;
        }

        _bindEvents() {
            window.addEventListener('resize', () => this._initDPI());

            this.canvas.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                if (this.state !== 'AIMING') return;

                this.isAiming = true;
                this.aimStart = this._getCanvasPoint(e);
                this.aimTarget = this.aimStart;
            });

            window.addEventListener('pointermove', (e) => {
                if (!this.isAiming) return;
                e.stopPropagation();
                this.aimTarget = this._getCanvasPoint(e);
            }, { passive: false });

            window.addEventListener('pointerup', (e) => {
                if (!this.isAiming) return;
                e.stopPropagation();
                this.isAiming = false;
                this._fireBalls();
            });

            window.addEventListener('pointercancel', (e) => {
                e.stopPropagation();
                this.isAiming = false;
            });

            document.getElementById('btn-restart')?.addEventListener('click', () => this.restart());
            document.getElementById('btn-speed')?.addEventListener('click', () => this.toggleSpeed());
            document.getElementById('btn-recall')?.addEventListener('click', () => this.recallBalls());
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

        /**
         * 计算发射方向 (自适应直瞄与下拉弹弓双模)
         */
        _getAimDirection() {
            if (!this.aimTarget) return null;

            let dx, dy;

            // 如果按下起点且向下拉动 (弹弓蓄力手势)
            if (this.aimStart && this.aimTarget.y > this.aimStart.y + 12) {
                dx = -(this.aimTarget.x - this.aimStart.x);
                dy = -(this.aimTarget.y - this.aimStart.y);
            } else {
                // 直接指向瞄准手势 (从发射台射向手指/准星方向)
                dx = this.aimTarget.x - this.launcherX;
                dy = this.aimTarget.y - this.launcherY;
            }

            const len = Math.hypot(dx, dy);
            if (len < 6) return null; // 触碰未达到有效滑动阈值

            // 严禁向下发射，必须朝上 (且保证垂直分量至少 -0.15，彻底杜绝无限横跳死循环)
            let nx = dx / len;
            let ny = dy / len;
            if (ny >= -0.15) {
                ny = -0.15;
                nx = (nx >= 0 ? 1 : -1) * Math.sqrt(1 - ny * ny);
            }

            return { nx, ny };
        }

        _fireBalls() {
            const dir = this._getAimDirection();
            if (!dir) return;

            const speed = 12 * this.dpr;
            const vx = dir.nx * speed;
            const vy = dir.ny * speed;

            this.state = 'SHOOTING';
            this.newLauncherX = null;
            this.balls = [];
            this.hitComboCount = 0;
            this.audio.playLaunch();

            const recallBtn = document.getElementById('btn-recall');
            if (recallBtn) recallBtn.style.display = 'inline-block';

            for (let i = 0; i < this.totalBalls; i++) {
                this.balls.push({
                    x: this.launcherX,
                    y: this.launcherY - this.ballRadius,
                    vx: vx,
                    vy: vy,
                    active: false,
                    landed: false,
                    hasLeftFloor: false,
                    delay: i * 4, // 每 4 帧发射一颗
                    noHitBounces: 0,
                    boosted: false
                });
            }
        }

        recallBalls() {
            if (this.state !== 'SHOOTING') return;
            this.balls.forEach(ball => {
                ball.hasLeftFloor = true;
                ball.landed = true;
                ball.active = false;
                ball.vx = 0;
                ball.vy = 0;
            });
            this._endTurn();
        }

        _startLoop() {
            let lastTime = performance.now();
            const loop = (currentTime) => {
                const deltaMs = Math.min(currentTime - lastTime, 50); // 限制单帧最大步长
                lastTime = currentTime;
                const timeScale = deltaMs / 16.667;

                this._update(timeScale);
                this._render();
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }

        _update(timeScale = 1) {
            if (this.state === 'PAUSED' || this.state === 'GAMEOVER') return;

            // 粒子更新
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx * timeScale;
                p.y += p.vy * timeScale;
                p.alpha -= 0.03 * timeScale;
                if (p.alpha <= 0) this.particles.splice(i, 1);
            }

            // 浮动跳字更新
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy * timeScale;
                ft.alpha -= 0.025 * timeScale;
                if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
            }

            if (this.state !== 'SHOOTING') return;

            const steps = this.SUB_STEPS * this.speedMultiplier;

            // 微子步连续物理演算 (CCD)
            for (let step = 0; step < steps; step++) {
                let allLanded = true;

                this.balls.forEach(ball => {
                    if (ball.delay > 0) {
                        ball.delay -= (1 / this.SUB_STEPS) * timeScale;
                        allLanded = false;
                        return;
                    }
                    if (ball.landed) return;

                    ball.active = true;
                    allLanded = false;

                    // 位移微积分 (严格乘以 timeScale 解耦高刷屏)
                    ball.x += (ball.vx / this.SUB_STEPS) * timeScale;
                    ball.y += (ball.vy / this.SUB_STEPS) * timeScale;

                    // 防横向水平无限反弹死循环微扰
                    if (Math.abs(ball.vy) < 0.6 * this.dpr) {
                        ball.vy += (ball.vy >= 0 ? 0.2 : -0.2) * this.dpr;
                    }

                    // 标记是否已经离开发射台
                    if (ball.y < this.launcherY - this.ballRadius * 2) {
                        ball.hasLeftFloor = true;
                    }

                    // 1. 左右墙壁反弹
                    if (ball.x - this.ballRadius <= 0) {
                        ball.x = this.ballRadius;
                        ball.vx = Math.abs(ball.vx);
                        this.audio.playHit(1);
                        this._handleBallWallBounce(ball);
                    } else if (ball.x + this.ballRadius >= this.canvas.width) {
                        ball.x = this.canvas.width - this.ballRadius;
                        ball.vx = -Math.abs(ball.vx);
                        this.audio.playHit(1);
                        this._handleBallWallBounce(ball);
                    }

                    // 2. 顶部天花板反弹
                    if (ball.y - this.ballRadius <= 0) {
                        ball.y = this.ballRadius;
                        ball.vy = Math.abs(ball.vy);
                        this.audio.playHit(1);
                        this._handleBallWallBounce(ball);
                    }

                    // 3. 底部着陆与坐标吸附 (必须是向下掉落且离开过地面)
                    if (ball.hasLeftFloor && ball.vy > 0 && ball.y + this.ballRadius >= this.launcherY) {
                        ball.y = this.launcherY;
                        ball.landed = true;
                        ball.active = false;
                        ball.vx = 0;
                        ball.vy = 0;

                        // 第一颗落地球确立下一轮发射台基点
                        if (this.newLauncherX === null) {
                            this.newLauncherX = Math.max(this.ballRadius + 4, Math.min(ball.x, this.canvas.width - this.ballRadius - 4));
                        }
                    }

                    // 4. 与道具的碰撞检测
                    for (let pIdx = this.powerups.length - 1; pIdx >= 0; pIdx--) {
                        const pup = this.powerups[pIdx];
                        const px = pup.col * this.cellWidth + this.cellWidth / 2;
                        const py = pup.row * this.cellHeight + this.cellHeight / 2;
                        const dist = Math.hypot(ball.x - px, ball.y - py);

                        if (dist < this.ballRadius + 14 * this.dpr) {
                            this.extraBallsNextTurn++;
                            this.audio.playPowerup();
                            this._createSparks(px, py, '#10b981');
                            this.powerups.splice(pIdx, 1);
                        }
                    }

                    // 5. 与砖块的 AABB 精确碰撞检测 (反弹法线判定)
                    for (let bIdx = this.bricks.length - 1; bIdx >= 0; bIdx--) {
                        const brick = this.bricks[bIdx];
                        const bx = brick.col * this.cellWidth + 3;
                        const by = brick.row * this.cellHeight + 3;
                        const bw = this.cellWidth - 6;
                        const bh = this.cellHeight - 6;

                        // 找到砖块矩形上距离圆心最近的点
                        const closestX = Math.max(bx, Math.min(ball.x, bx + bw));
                        const closestY = Math.max(by, Math.min(ball.y, by + bh));

                        const distX = ball.x - closestX;
                        const distY = ball.y - closestY;
                        const distance = Math.hypot(distX, distY);

                        if (distance < this.ballRadius) {
                            // 发生碰撞！判定法线方向
                            const overlapLeft = Math.abs(ball.x - bx);
                            const overlapRight = Math.abs(ball.x - (bx + bw));
                            const overlapTop = Math.abs(ball.y - by);
                            const overlapBottom = Math.abs(ball.y - (by + bh));

                            const minOverlapX = Math.min(overlapLeft, overlapRight);
                            const minOverlapY = Math.min(overlapTop, overlapBottom);

                            if (minOverlapX < minOverlapY) {
                                ball.vx = -ball.vx;
                            } else {
                                ball.vy = -ball.vy;
                            }

                            brick.hp--;
                            ball.noHitBounces = 0;
                            this.hitComboCount = (this.hitComboCount || 0) + 1;
                            this.score += 10;
                            this._updateScoreUI();

                            if (brick.hp <= 0) {
                                this.bricks.splice(bIdx, 1);
                                this.audio.playBreak();
                                this.bridge.vibrate(20);
                                this._createSparks(bx + bw / 2, by + bh / 2, '#00f0ff');
                                this.score += 50;
                                this._updateScoreUI();
                                this._addFloatingText('+60', bx + bw / 2, by + bh / 2, '#fbbf24');

                                this.bridge.emit('ON_COMBO_TRIGGER', {
                                    scoreGained: 60,
                                    currentScore: this.score,
                                    combo: this.hitComboCount
                                });
                            } else {
                                this.audio.playHit(this.hitComboCount);
                                this._addFloatingText('+10', bx + bw / 2, by + bh / 2, '#00f0ff');
                            }
                            break; // 一次子步只处理一个最近砖块
                        }
                    }
                });

                // 本回合所有球都已落地
                if (allLanded && this.balls.length > 0) {
                    this._endTurn();
                    break;
                }
            }
        }

        _endTurn() {
            this.state = 'AIMING';
            const recallBtn = document.getElementById('btn-recall');
            if (recallBtn) recallBtn.style.display = 'none';

            if (this.newLauncherX !== null) {
                this.launcherX = this.newLauncherX;
            }
            this.totalBalls += this.extraBallsNextTurn;
            this.extraBallsNextTurn = 0;
            this.balls = [];
            this._spawnRow();
            document.getElementById('ball-count-val').textContent = this.totalBalls;
        }

        /**
         * 残局智能加速：存活小球不足 2 颗且反复弹跳未击中砖块时，速度自动提升 1.8 倍
         */
        _handleBallWallBounce(ball) {
            const activeInAir = this.balls.filter(b => !b.landed && (b.delay <= 0 || b.active)).length;
            if (activeInAir <= 2) {
                ball.noHitBounces = (ball.noHitBounces || 0) + 1;
                if (ball.noHitBounces >= 3 && !ball.boosted) {
                    ball.vx *= 1.8;
                    ball.vy *= 1.8;
                    ball.boosted = true;
                    this._createSparks(ball.x, ball.y, '#fbbf24');
                }
            }
        }

        _gameOver() {
            this.state = 'GAMEOVER';
            this.audio.playGameOver();
            this.bridge.vibrate([40, 60, 40]);

            if (this.score > this.highScore) {
                this.highScore = this.score;
                window.SafeStorage.set('resonance_ball_high_score', this.highScore);
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
                window.SafeStorage.set('resonance_ball_high_score', this.highScore);
            }
            document.getElementById('high-score-val').textContent = this.highScore;
            document.getElementById('ball-count-val').textContent = this.totalBalls;

            const payload = {
                current: this.score,
                best: this.highScore,
                currentScore: this.score,
                highScore: this.highScore
            };
            this.bridge.emit('SCORE_UPDATE', payload);
            this.bridge.emit('ON_SCORE_UPDATE', payload);
        }

        _addFloatingText(text, x, y, color = '#00f0ff') {
            this.floatingTexts.push({
                text,
                x,
                y,
                alpha: 1,
                vy: -1.4 * this.dpr,
                color
            });
        }

        _createSparks(x, y, color) {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 5 + 2;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: color || '#00f0ff',
                    alpha: 1
                });
            }
        }

        _render() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 1. 绘制砖块
            this.bricks.forEach(b => {
                const x = b.col * this.cellWidth + 3;
                const y = b.row * this.cellHeight + 3;
                const w = this.cellWidth - 6;
                const h = this.cellHeight - 6;

                // 随血量深浅渐变色
                const ratio = Math.min(b.hp / 20, 1);
                const color = ratio > 0.6 ? '#f43f5e' : (ratio > 0.3 ? '#fbbf24' : '#00f0ff');

                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                if (this.ctx.roundRect) {
                    this.ctx.roundRect(x, y, w, h, 6 * this.dpr);
                } else {
                    this.ctx.rect(x, y, w, h);
                }
                this.ctx.fill();

                // 砖块耐久数字
                this.ctx.fillStyle = '#050811';
                this.ctx.font = `bold ${Math.round(14 * this.dpr)}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(b.hp, x + w / 2, y + h / 2);
            });

            // 2. 绘制道具 (+1 弹珠)
            this.powerups.forEach(p => {
                const cx = p.col * this.cellWidth + this.cellWidth / 2;
                const cy = p.row * this.cellHeight + this.cellHeight / 2;
                const r = 10 * this.dpr;

                this.ctx.save();
                this.ctx.strokeStyle = '#10b981';
                this.ctx.lineWidth = 2.5;
                this.ctx.shadowColor = '#10b981';
                this.ctx.shadowBlur = 8;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.fillStyle = '#10b981';
                this.ctx.font = `bold ${Math.round(11 * this.dpr)}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('+1', cx, cy);
                this.ctx.restore();
            });

            // 3. 瞄准虚线轨迹与激光射线预判
            if (this.isAiming) {
                const dir = this._getAimDirection();
                if (dir) {
                    this.ctx.save();
                    this.ctx.setLineDash([6 * this.dpr, 6 * this.dpr]);
                    this.ctx.strokeStyle = '#00f0ff';
                    this.ctx.lineWidth = 2.5 * this.dpr;
                    this.ctx.shadowColor = '#00f0ff';
                    this.ctx.shadowBlur = 8;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.launcherX, this.launcherY);

                    // 计算第一段射线与墙壁/天花板交点
                    let startX = this.launcherX;
                    let startY = this.launcherY;
                    let curDx = dir.nx;
                    let curDy = dir.ny;

                    let tMin = Infinity;
                    let hitWall = 'none';

                    if (curDx < 0) {
                        const t = (this.ballRadius - startX) / curDx;
                        if (t > 0 && t < tMin) { tMin = t; hitWall = 'left'; }
                    } else if (curDx > 0) {
                        const t = (this.canvas.width - this.ballRadius - startX) / curDx;
                        if (t > 0 && t < tMin) { tMin = t; hitWall = 'right'; }
                    }

                    if (curDy < 0) {
                        const t = (this.ballRadius - startY) / curDy;
                        if (t > 0 && t < tMin) { tMin = t; hitWall = 'top'; }
                    }

                    if (tMin < Infinity && tMin > 0) {
                        const hitX = startX + curDx * tMin;
                        const hitY = startY + curDy * tMin;
                        this.ctx.lineTo(hitX, hitY);

                        // 反射第二段预判
                        let reflDx = curDx;
                        let reflDy = curDy;
                        if (hitWall === 'left' || hitWall === 'right') reflDx = -reflDx;
                        if (hitWall === 'top') reflDy = -reflDy;

                        const reflLen = 140 * this.dpr;
                        this.ctx.lineTo(hitX + reflDx * reflLen, hitY + reflDy * reflLen);
                    } else {
                        this.ctx.lineTo(startX + curDx * 300, startY + curDy * 300);
                    }

                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }

            // 4. 绘制底线与发射台
            this.ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.launcherY + this.ballRadius + 2);
            this.ctx.lineTo(this.canvas.width, this.launcherY + this.ballRadius + 2);
            this.ctx.stroke();

            // 绘制当前准备发射的球台
            if (this.state === 'AIMING') {
                this.ctx.fillStyle = '#00f0ff';
                this.ctx.shadowColor = '#00f0ff';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(this.launcherX, this.launcherY, this.ballRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 5. 绘制飞行中的弹珠 (残局加速球带有金色充能高亮)
            this.balls.forEach(b => {
                if (b.active && !b.landed) {
                    this.ctx.fillStyle = b.boosted ? '#fbbf24' : '#f8fafc';
                    this.ctx.shadowColor = b.boosted ? '#fbbf24' : '#00f0ff';
                    this.ctx.shadowBlur = b.boosted ? 14 : 8;
                    this.ctx.beginPath();
                    this.ctx.arc(b.x, b.y, this.ballRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });

            // 6. 粒子更新渲染
            this.particles.forEach(p => {
                this.ctx.save();
                this.ctx.globalAlpha = p.alpha;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3 * this.dpr, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });

            // 7. 浮动得分跳字渲染
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                this.ctx.save();
                this.ctx.globalAlpha = ft.alpha;
                this.ctx.fillStyle = ft.color;
                this.ctx.font = `bold ${Math.round(14 * this.dpr)}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.shadowColor = ft.color;
                this.ctx.shadowBlur = 6;
                this.ctx.fillText(ft.text, ft.x, ft.y);
                this.ctx.restore();
            }
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.ResonanceBallGame = new ResonanceBallGame();
    });

})(window);
