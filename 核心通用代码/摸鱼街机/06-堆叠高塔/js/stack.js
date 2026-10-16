/**
 * 🏰 Stack Tower (堆叠高塔) - 核心游戏引擎
 * 纯原生 Canvas 2.5D 等距透视渲染 + 物理切片切割 + 动量掉落碎块
 * 连续连击完美对齐琶音 + 动态彩虹渐变色相 + 完整接入 UniversalBridge
 */
(function(window) {
    'use strict';

    class StackGame {
        constructor() {
            this.canvas = document.getElementById('stack-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.audio = new AudioEngine();
            this.bridge = new UniversalBridge('stack-tower');
            this.bridge.bindGame(this);

            // 基础配置
            this.BLOCK_HEIGHT = 20;
            this.INITIAL_SIZE = 140;
            this.PERFECT_TOLERANCE = 3.5; // 3.5 像素内视为完美对齐

            // 游戏状态
            this.score = 0;
            this.highScore = this.bridge.getHighScore();
            this.combo = 0;
            this.isPlaying = false;
            this.isGameOver = false;

            // 摄像机
            this.cameraY = 0;
            this.targetCameraY = 0;

            // 方块列表与运动方块
            this.stack = [];
            this.activeBlock = null;
            this.fallingBlocks = [];
            this.particles = [];
            this.comboTexts = [];

            // 运动参数
            this.speed = 2.4;
            this.direction = 'x'; // 'x' 或 'z'
            this.moveOffset = 0;
            this.moveDirection = 1;

            this._initDOM();
            this._bindEvents();
            this._resizeCanvas();
            this.reset();

            this.animLoop = this.animLoop.bind(this);
            requestAnimationFrame(this.animLoop);
        }

        _initDOM() {
            this.dom = {
                scoreVal: document.getElementById('score-val'),
                highScoreVal: document.getElementById('high-score-val'),
                comboVal: document.getElementById('combo-val'),
                btnMute: document.getElementById('btn-mute'),
                btnRestart: document.getElementById('btn-restart'),
                btnHelp: document.getElementById('btn-help'),
                helpModal: document.getElementById('help-modal'),
                btnCloseHelp: document.getElementById('btn-close-help'),
                gameOverModal: document.getElementById('game-over-modal'),
                finalScoreVal: document.getElementById('final-score-val'),
                btnRetryModal: document.getElementById('btn-retry-modal')
            };

            if (this.dom.highScoreVal) {
                this.dom.highScoreVal.textContent = this.highScore;
            }
        }

        _bindEvents() {
            window.addEventListener('resize', () => this._resizeCanvas());

            // 点击 / 触摸放置
            const handleAction = (e) => {
                // 如果点到了按钮或弹窗，不触发下落
                if (e && e.target && (e.target.closest('button') || e.target.closest('.modal-content'))) {
                    return;
                }
                if (this.isGameOver) return;
                this.placeBlock();
            };

            this.canvas.addEventListener('pointerdown', handleAction);

            // 键盘操作 (空格 / 回车 / 向上键放置)
            window.addEventListener('keydown', (e) => {
                if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter' || e.code === 'ArrowUp') {
                    e.preventDefault();
                    if (!this.isGameOver) {
                        this.placeBlock();
                    } else {
                        this.reset();
                    }
                } else if (e.key === 'r' || e.key === 'R') {
                    this.reset();
                } else if (e.key === '?' || e.key === 'h' || e.key === 'H') {
                    this.showHelp(true);
                } else if (e.key === 'Escape') {
                    this.showHelp(false);
                }
            });

            // 按钮事件
            if (this.dom.btnMute) {
                this.dom.btnMute.addEventListener('click', () => {
                    const muted = this.audio.toggleMute();
                    this.dom.btnMute.textContent = muted ? '🔇' : '🔊';
                });
            }
            if (this.dom.btnRestart) this.dom.btnRestart.addEventListener('click', () => this.reset());
            if (this.dom.btnHelp) this.dom.btnHelp.addEventListener('click', () => this.showHelp(true));
            if (this.dom.btnCloseHelp) this.dom.btnCloseHelp.addEventListener('click', () => this.showHelp(false));
            if (this.dom.btnRetryModal) this.dom.btnRetryModal.addEventListener('click', () => this.reset());
        }

        _resizeCanvas() {
            const container = this.canvas.parentElement;
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            const dpr = window.devicePixelRatio || 1;

            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.canvas.style.width = `${w}px`;
            this.canvas.style.height = `${h}px`;

            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(dpr, dpr);

            this.viewW = w;
            this.viewH = h;
            this.originX = w / 2;
            this.originY = h * 0.72; // 基底偏下方
        }

        reset() {
            this.score = 0;
            this.combo = 0;
            this.isGameOver = false;
            this.stack = [];
            this.fallingBlocks = [];
            this.particles = [];
            this.comboTexts = [];
            this.cameraY = 0;
            this.targetCameraY = 0;
            this.speed = 2.4;

            // 地基块 (Level 0)
            const baseBlock = {
                x: -this.INITIAL_SIZE / 2,
                z: -this.INITIAL_SIZE / 2,
                y: 0,
                w: this.INITIAL_SIZE,
                d: this.INITIAL_SIZE,
                h: this.BLOCK_HEIGHT,
                hue: 200 // 基础深蓝
            };
            this.stack.push(baseBlock);

            this._spawnNextBlock();
            this._updateHUD();
            this._hideModals();
        }

        _spawnNextBlock() {
            const top = this.stack[this.stack.length - 1];
            const nextIdx = this.stack.length;
            this.direction = (nextIdx % 2 === 1) ? 'x' : 'z';

            const hue = (200 + nextIdx * 4) % 360; // 彩虹色阶平滑流动
            const moveSpan = this.INITIAL_SIZE * 1.5;

            this.activeBlock = {
                x: top.x,
                z: top.z,
                y: nextIdx * this.BLOCK_HEIGHT,
                w: top.w,
                d: top.d,
                h: this.BLOCK_HEIGHT,
                hue: hue
            };

            this.moveOffset = -moveSpan;
            this.moveDirection = 1;
            this.moveSpan = moveSpan;

            // 动态速度随层数平稳增加 (封顶 5.5)
            this.speed = Math.min(2.4 + nextIdx * 0.05, 5.5);
        }

        placeBlock() {
            if (!this.activeBlock || this.isGameOver) return;

            const top = this.stack[this.stack.length - 1];
            const current = this.activeBlock;

            let diff = 0;
            let isPerfect = false;

            if (this.direction === 'x') {
                diff = current.x - top.x;
                if (Math.abs(diff) <= this.PERFECT_TOLERANCE) {
                    diff = 0;
                    current.x = top.x;
                    isPerfect = true;
                }

                const overlap = top.w - Math.abs(diff);

                if (overlap <= 0) {
                    // 全空，跌落失败
                    this._triggerGameOver(current);
                    return;
                }

                // 切割计算
                const sliceW = Math.abs(diff);
                let sliceX = 0;

                if (diff > 0) {
                    // 悬挂在正方向 (右侧)
                    current.w = overlap;
                    sliceX = current.x + overlap;
                } else {
                    // 悬挂在负方向 (左侧)
                    sliceX = current.x;
                    current.x = top.x;
                    current.w = overlap;
                }

                if (!isPerfect && sliceW > 0) {
                    this._spawnFallingBlock({
                        x: sliceX,
                        z: current.z,
                        y: current.y,
                        w: sliceW,
                        d: current.d,
                        h: current.h,
                        hue: current.hue,
                        vx: diff > 0 ? 1.5 : -1.5,
                        vz: 0
                    });
                }

            } else { // z 轴运动
                diff = current.z - top.z;
                if (Math.abs(diff) <= this.PERFECT_TOLERANCE) {
                    diff = 0;
                    current.z = top.z;
                    isPerfect = true;
                }

                const overlap = top.d - Math.abs(diff);

                if (overlap <= 0) {
                    this._triggerGameOver(current);
                    return;
                }

                const sliceD = Math.abs(diff);
                let sliceZ = 0;

                if (diff > 0) {
                    current.d = overlap;
                    sliceZ = current.z + overlap;
                } else {
                    sliceZ = current.z;
                    current.z = top.z;
                    current.d = overlap;
                }

                if (!isPerfect && sliceD > 0) {
                    this._spawnFallingBlock({
                        x: current.x,
                        z: sliceZ,
                        y: current.y,
                        w: current.w,
                        d: sliceD,
                        h: current.h,
                        hue: current.hue,
                        vx: 0,
                        vz: diff > 0 ? 1.5 : -1.5
                    });
                }
            }

            // 处理连击与奖励
            if (isPerfect) {
                this.combo++;
                this.audio.playPerfect(this.combo);
                this._addComboText(`PERFECT! x${this.combo}`, current);
                this._spawnRingParticles(current);

                // 连续 5 次完美，奖励高塔微幅膨胀复原 (最高不超过初始大小)
                if (this.combo >= 5 && this.combo % 3 === 0) {
                    current.w = Math.min(current.w + 6, this.INITIAL_SIZE);
                    current.d = Math.min(current.d + 6, this.INITIAL_SIZE);
                    current.x -= 3;
                    current.z -= 3;
                }
            } else {
                this.combo = 0;
                this.audio.playLand();
                this.audio.playSlice();
            }

            // 成功落位
            this.stack.push({ ...current });
            this.score = this.stack.length - 1;

            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.bridge.recordScore(this.highScore);
            }

            // 摄像机镜头随着高度向上提升
            if (this.score > 4) {
                this.targetCameraY = (this.score - 4) * this.BLOCK_HEIGHT;
            }

            this._updateHUD();
            this._spawnNextBlock();
        }

        _spawnFallingBlock(info) {
            this.fallingBlocks.push({
                x: info.x,
                z: info.z,
                y: info.y,
                w: info.w,
                d: info.d,
                h: info.h,
                hue: info.hue,
                vx: info.vx || 0,
                vy: 0,
                vz: info.vz || 0,
                rotX: 0,
                rotZ: 0,
                vRotX: (Math.random() - 0.5) * 0.08,
                vRotZ: (Math.random() - 0.5) * 0.08
            });
        }

        _triggerGameOver(current) {
            this.isGameOver = true;
            this.audio.playGameOver();

            // 整块跌落
            this._spawnFallingBlock({
                x: current.x,
                z: current.z,
                y: current.y,
                w: current.w,
                d: current.d,
                h: current.h,
                hue: current.hue,
                vx: this.direction === 'x' ? this.moveDirection * 2 : 0,
                vz: this.direction === 'z' ? this.moveDirection * 2 : 0
            });
            this.activeBlock = null;

            setTimeout(() => {
                this._showGameOverModal();
            }, 600);
        }

        _spawnRingParticles(block) {
            const count = 16;
            const topY = block.y + block.h;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                this.particles.push({
                    x: block.x + block.w / 2 + Math.cos(angle) * (block.w / 2),
                    z: block.z + block.d / 2 + Math.sin(angle) * (block.d / 2),
                    y: topY,
                    vx: Math.cos(angle) * 1.8,
                    vz: Math.sin(angle) * 1.8,
                    vy: 1.5 + Math.random(),
                    alpha: 1,
                    hue: block.hue,
                    radius: 2.5
                });
            }
        }

        _addComboText(text, block) {
            const iso = this._isoProject(block.x + block.w / 2, block.y + block.h + 10, block.z + block.d / 2);
            this.comboTexts.push({
                text,
                x: iso.x,
                y: iso.y,
                alpha: 1,
                vy: -1.2,
                hue: (block.hue + 40) % 360
            });
        }

        _updateHUD() {
            if (this.dom.scoreVal) this.dom.scoreVal.textContent = this.score;
            if (this.dom.highScoreVal) this.dom.highScoreVal.textContent = this.highScore;
            if (this.dom.comboVal) {
                this.dom.comboVal.textContent = this.combo > 1 ? `x${this.combo}` : '-';
                if (this.combo > 2) {
                    this.dom.comboVal.classList.add('hot');
                } else {
                    this.dom.comboVal.classList.remove('hot');
                }
            }
        }

        _showGameOverModal() {
            if (this.dom.gameOverModal) {
                if (this.dom.finalScoreVal) this.dom.finalScoreVal.textContent = this.score;
                this.dom.gameOverModal.classList.add('visible');
            }
        }

        _hideModals() {
            if (this.dom.gameOverModal) this.dom.gameOverModal.classList.remove('visible');
            if (this.dom.helpModal) this.dom.helpModal.classList.remove('visible');
        }

        showHelp(show) {
            if (this.dom.helpModal) {
                if (show) this.dom.helpModal.classList.add('visible');
                else this.dom.helpModal.classList.remove('visible');
            }
        }

        animLoop() {
            this._update();
            this._render();
            requestAnimationFrame(this.animLoop);
        }

        _update() {
            // 平滑镜头缓动
            this.cameraY += (this.targetCameraY - this.cameraY) * 0.08;

            // 活动方块振荡运动
            if (this.activeBlock && !this.isGameOver) {
                this.moveOffset += this.speed * this.moveDirection;
                if (Math.abs(this.moveOffset) > this.moveSpan) {
                    this.moveDirection *= -1;
                    this.moveOffset = Math.sign(this.moveOffset) * this.moveSpan;
                }

                const top = this.stack[this.stack.length - 1];
                if (this.direction === 'x') {
                    this.activeBlock.x = top.x + this.moveOffset;
                    this.activeBlock.z = top.z;
                } else {
                    this.activeBlock.x = top.x;
                    this.activeBlock.z = top.z + this.moveOffset;
                }
            }

            // 更新坠落方块物理 (重力加速度)
            for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
                const fb = this.fallingBlocks[i];
                fb.vy -= 0.6; // 重力
                fb.y += fb.vy;
                fb.x += fb.vx;
                fb.z += fb.vz;
                fb.rotX += fb.vRotX;
                fb.rotZ += fb.vRotZ;

                // 超出视野底部移除
                if (fb.y < this.cameraY - 300) {
                    this.fallingBlocks.splice(i, 1);
                }
            }

            // 更新粒子
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.z += p.vz;
                p.y += p.vy;
                p.vy -= 0.08;
                p.alpha -= 0.02;
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                }
            }

            // 更新浮动文字
            for (let i = this.comboTexts.length - 1; i >= 0; i--) {
                const ct = this.comboTexts[i];
                ct.y += ct.vy;
                ct.alpha -= 0.015;
                if (ct.alpha <= 0) {
                    this.comboTexts.splice(i, 1);
                }
            }
        }

        _isoProject(x, y, z) {
            const cos30 = 0.866025;
            const sin30 = 0.5;
            const scrX = this.originX + (x - z) * cos30;
            const scrY = this.originY + (x + z) * sin30 - (y - this.cameraY);
            return { x: scrX, y: scrY };
        }

        _render() {
            const ctx = this.ctx;
            const w = this.viewW;
            const h = this.viewH;
            if (!w || !h) return;

            // 动态清屏并绘制纵深科技渐变背景
            ctx.clearRect(0, 0, w, h);

            // 1. 绘制已堆叠的静态方块 (从底向上绘制，保证深度覆盖)
            for (let i = 0; i < this.stack.length; i++) {
                const blk = this.stack[i];
                // 仅渲染视口内的方块提高能效
                if (blk.y + blk.h >= this.cameraY - 200) {
                    this._drawCuboid(blk.x, blk.y, blk.z, blk.w, blk.h, blk.d, blk.hue);
                }
            }

            // 2. 绘制掉落中的碎块
            for (const fb of this.fallingBlocks) {
                this._drawCuboid(fb.x, fb.y, fb.z, fb.w, fb.h, fb.d, fb.hue, 0.85);
            }

            // 3. 绘制当前正在运动的方块
            if (this.activeBlock && !this.isGameOver) {
                const ab = this.activeBlock;
                this._drawCuboid(ab.x, ab.y, ab.z, ab.w, ab.h, ab.d, ab.hue, 1.0, true);
            }

            // 4. 绘制粒子
            for (const p of this.particles) {
                const pt = this._isoProject(p.x, p.y, p.z);
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.fillStyle = `hsl(${p.hue}, 90%, 65%)`;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 5. 绘制浮动连击特效文字
            for (const ct of this.comboTexts) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, ct.alpha);
                ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = `hsl(${ct.hue}, 95%, 65%)`;
                ctx.shadowColor = `hsl(${ct.hue}, 95%, 50%)`;
                ctx.shadowBlur = 10;
                ctx.fillText(ct.text, ct.x, ct.y);
                ctx.restore();
            }
        }

        _drawCuboid(x, y, z, w, h, d, hue, alpha = 1.0, isActive = false) {
            const ctx = this.ctx;
            ctx.save();
            ctx.globalAlpha = alpha;

            // 顶点投影
            const p0 = this._isoProject(x, y + h, z);
            const p1 = this._isoProject(x + w, y + h, z);
            const p2 = this._isoProject(x + w, y + h, z + d);
            const p3 = this._isoProject(x, y + h, z + d);

            const b1 = this._isoProject(x + w, y, z + d);
            const b2 = this._isoProject(x, y, z + d);
            const b3 = this._isoProject(x + w, y, z);

            // 1. 顶面 (Top Face - 最明亮)
            ctx.fillStyle = `hsl(${hue}, 70%, 62%)`;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.fill();

            // 顶面边框微光
            ctx.strokeStyle = isActive ? '#ffffff' : `hsl(${hue}, 80%, 75%)`;
            ctx.lineWidth = isActive ? 1.5 : 0.7;
            ctx.stroke();

            // 2. 右侧面 (Facing +X direction: p1 -> p2 -> b1 -> b3)
            ctx.fillStyle = `hsl(${hue}, 65%, 48%)`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(b1.x, b1.y);
            ctx.lineTo(b3.x, b3.y);
            ctx.closePath();
            ctx.fill();

            // 3. 左侧面 (Facing +Z direction: p3 -> p2 -> b1 -> b2)
            ctx.fillStyle = `hsl(${hue}, 65%, 38%)`;
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(b1.x, b1.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.game = new StackGame();
    });

})(window);
