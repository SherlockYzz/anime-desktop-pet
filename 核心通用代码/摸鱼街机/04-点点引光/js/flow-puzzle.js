/**
 * 💡 Flow Link (点点引光) - 核心关卡与回路拓扑引擎
 * 严守规范：管道互不交叉、全盘100%填满胜利判定、平滑倒退回退、多关卡流与高刷全端自适应
 */
(function(window) {
    'use strict';

    // 预设关卡池 (保证 100% 具备全盘填满的优雅唯一解)
    const LEVELS = [
        {
                "size": 5,
                "name": "Level 1 (5x5 新手启航)",
                "nodes": [
                        {
                                "color": "#f43f5e",
                                "name": "red",
                                "p1": {
                                        "r": 0,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 0,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#00f0ff",
                                "name": "cyan",
                                "p1": {
                                        "r": 1,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#fbbf24",
                                "name": "yellow",
                                "p1": {
                                        "r": 1,
                                        "c": 4
                                },
                                "p2": {
                                        "r": 3,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#10b981",
                                "name": "green",
                                "p1": {
                                        "r": 1,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 3,
                                        "c": 3
                                }
                        }
                ]
        },
        {
                "size": 5,
                "name": "Level 2 (5x5 灵巧回环)",
                "nodes": [
                        {
                                "color": "#f43f5e",
                                "name": "red",
                                "p1": {
                                        "r": 0,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 0
                                }
                        },
                        {
                                "color": "#00f0ff",
                                "name": "cyan",
                                "p1": {
                                        "r": 0,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 2,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#fbbf24",
                                "name": "yellow",
                                "p1": {
                                        "r": 1,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 1,
                                        "c": 3
                                }
                        },
                        {
                                "color": "#10b981",
                                "name": "green",
                                "p1": {
                                        "r": 3,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 2,
                                        "c": 3
                                }
                        },
                        {
                                "color": "#a855f7",
                                "name": "purple",
                                "p1": {
                                        "r": 3,
                                        "c": 4
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 3
                                }
                        }
                ]
        },
        {
                "size": 5,
                "name": "Level 3 (5x5 纵横交织)",
                "nodes": [
                        {
                                "color": "#f43f5e",
                                "name": "red",
                                "p1": {
                                        "r": 0,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 0
                                }
                        },
                        {
                                "color": "#00f0ff",
                                "name": "cyan",
                                "p1": {
                                        "r": 1,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 2,
                                        "c": 0
                                }
                        },
                        {
                                "color": "#fbbf24",
                                "name": "yellow",
                                "p1": {
                                        "r": 0,
                                        "c": 2
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#10b981",
                                "name": "green",
                                "p1": {
                                        "r": 1,
                                        "c": 2
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 1
                                }
                        },
                        {
                                "color": "#a855f7",
                                "name": "purple",
                                "p1": {
                                        "r": 1,
                                        "c": 3
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 3
                                }
                        }
                ]
        },
        {
                "size": 5,
                "name": "Level 4 (5x5 能量核心)",
                "nodes": [
                        {
                                "color": "#f43f5e",
                                "name": "red",
                                "p1": {
                                        "r": 0,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 0,
                                        "c": 2
                                }
                        },
                        {
                                "color": "#fbbf24",
                                "name": "yellow",
                                "p1": {
                                        "r": 0,
                                        "c": 3
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#00f0ff",
                                "name": "cyan",
                                "p1": {
                                        "r": 1,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 3,
                                        "c": 1
                                }
                        },
                        {
                                "color": "#10b981",
                                "name": "green",
                                "p1": {
                                        "r": 1,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 2
                                }
                        },
                        {
                                "color": "#a855f7",
                                "name": "purple",
                                "p1": {
                                        "r": 1,
                                        "c": 2
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 3
                                }
                        }
                ]
        },
        {
                "size": 6,
                "name": "Level 5 (6x6 脉冲回路)",
                "nodes": [
                        {
                                "color": "#f43f5e",
                                "name": "red",
                                "p1": {
                                        "r": 0,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 2,
                                        "c": 5
                                }
                        },
                        {
                                "color": "#00f0ff",
                                "name": "cyan",
                                "p1": {
                                        "r": 1,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 5,
                                        "c": 3
                                }
                        },
                        {
                                "color": "#fbbf24",
                                "name": "yellow",
                                "p1": {
                                        "r": 3,
                                        "c": 5
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#10b981",
                                "name": "green",
                                "p1": {
                                        "r": 1,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 2,
                                        "c": 1
                                }
                        },
                        {
                                "color": "#a855f7",
                                "name": "purple",
                                "p1": {
                                        "r": 4,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 3,
                                        "c": 4
                                }
                        }
                ]
        },
        {
                "size": 6,
                "name": "Level 6 (6x6 霓虹回廊)",
                "nodes": [
                        {
                                "color": "#f43f5e",
                                "name": "red",
                                "p1": {
                                        "r": 0,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 5,
                                        "c": 0
                                }
                        },
                        {
                                "color": "#00f0ff",
                                "name": "cyan",
                                "p1": {
                                        "r": 0,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 0,
                                        "c": 5
                                }
                        },
                        {
                                "color": "#fbbf24",
                                "name": "yellow",
                                "p1": {
                                        "r": 1,
                                        "c": 5
                                },
                                "p2": {
                                        "r": 5,
                                        "c": 5
                                }
                        },
                        {
                                "color": "#10b981",
                                "name": "green",
                                "p1": {
                                        "r": 5,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 5,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#38bdf8",
                                "name": "blue",
                                "p1": {
                                        "r": 1,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 4,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#a855f7",
                                "name": "purple",
                                "p1": {
                                        "r": 1,
                                        "c": 2
                                },
                                "p2": {
                                        "r": 3,
                                        "c": 2
                                }
                        }
                ]
        },
        {
                "size": 6,
                "name": "Level 7 (6x6 星轨双环)",
                "nodes": [
                        {
                                "color": "#f43f5e",
                                "name": "red",
                                "p1": {
                                        "r": 0,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 1,
                                        "c": 0
                                }
                        },
                        {
                                "color": "#00f0ff",
                                "name": "cyan",
                                "p1": {
                                        "r": 2,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 5,
                                        "c": 2
                                }
                        },
                        {
                                "color": "#fbbf24",
                                "name": "yellow",
                                "p1": {
                                        "r": 0,
                                        "c": 3
                                },
                                "p2": {
                                        "r": 1,
                                        "c": 3
                                }
                        },
                        {
                                "color": "#10b981",
                                "name": "green",
                                "p1": {
                                        "r": 2,
                                        "c": 5
                                },
                                "p2": {
                                        "r": 5,
                                        "c": 3
                                }
                        },
                        {
                                "color": "#38bdf8",
                                "name": "blue",
                                "p1": {
                                        "r": 2,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 2,
                                        "c": 2
                                }
                        },
                        {
                                "color": "#a855f7",
                                "name": "purple",
                                "p1": {
                                        "r": 2,
                                        "c": 4
                                },
                                "p2": {
                                        "r": 2,
                                        "c": 3
                                }
                        }
                ]
        },
        {
                "size": 7,
                "name": "Level 8 (7x7 终极流光网络)",
                "nodes": [
                        {
                                "color": "#f43f5e",
                                "name": "red",
                                "p1": {
                                        "r": 0,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 0,
                                        "c": 6
                                }
                        },
                        {
                                "color": "#00f0ff",
                                "name": "cyan",
                                "p1": {
                                        "r": 1,
                                        "c": 0
                                },
                                "p2": {
                                        "r": 6,
                                        "c": 0
                                }
                        },
                        {
                                "color": "#fbbf24",
                                "name": "yellow",
                                "p1": {
                                        "r": 1,
                                        "c": 6
                                },
                                "p2": {
                                        "r": 6,
                                        "c": 6
                                }
                        },
                        {
                                "color": "#10b981",
                                "name": "green",
                                "p1": {
                                        "r": 6,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 6,
                                        "c": 5
                                }
                        },
                        {
                                "color": "#38bdf8",
                                "name": "blue",
                                "p1": {
                                        "r": 1,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 5,
                                        "c": 5
                                }
                        },
                        {
                                "color": "#a855f7",
                                "name": "purple",
                                "p1": {
                                        "r": 2,
                                        "c": 1
                                },
                                "p2": {
                                        "r": 2,
                                        "c": 4
                                }
                        },
                        {
                                "color": "#fb923c",
                                "name": "orange",
                                "p1": {
                                        "r": 2,
                                        "c": 2
                                },
                                "p2": {
                                        "r": 3,
                                        "c": 2
                                }
                        }
                ]
        }
];;

    class FlowGame {
        constructor() {
            this.currentLevelIdx = window.SafeStorage.get('flow_level_idx', 0);
            if (this.currentLevelIdx >= LEVELS.length) this.currentLevelIdx = 0;

            this.audio = new window.AudioEngine();
            this.bridge = new window.UniversalBridge('flow-link');
            this.bridge.bindGame(this);

            this.canvas = document.getElementById('flow-canvas');
            this.ctx = this.canvas.getContext('2d');

            this.pipes = new Map(); // colorName -> Array<{r, c}>
            this.activeColor = null;
            this.isDragging = false;
            this.isWon = false;
            this.isPaused = false;
            this.strokeCount = 0;
            this.victoryPulse = null;
            this.particles = [];

            this._initDPI();
            this._loadLevel(this.currentLevelIdx);
            this._bindEvents();
            this._startLoop();

            this.bridge.emit('ON_READY', { game: 'flow-link' });
        }

        pause() {
            this.isPaused = true;
            document.getElementById('pause-modal')?.classList.add('active');
        }

        resume() {
            this.isPaused = false;
            document.getElementById('pause-modal')?.classList.remove('active');
        }

        _initDPI() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = rect.width > 0 ? rect.width : (this.canvas.clientWidth || 360);
            const h = rect.height > 0 ? rect.height : (this.canvas.clientHeight || 360);
            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.dpr = dpr;
            if (this.level) {
                this.cellSize = this.canvas.width / this.level.size;
            }
        }

        _loadLevel(idx) {
            this.currentLevelIdx = idx % LEVELS.length;
            this.level = LEVELS[this.currentLevelIdx];
            this.cellSize = this.canvas.width / this.level.size;
            this.pipes.clear();
            this.isWon = false;
            this.strokeCount = 0;
            this.victoryPulse = null;
            this.particles = [];

            this.level.nodes.forEach(n => {
                this.pipes.set(n.name, []);
            });

            this._updateUI();
            document.getElementById('victory-modal')?.classList.remove('active');
        }

        restart() {
            this._loadLevel(this.currentLevelIdx);
        }

        nextLevel() {
            this.currentLevelIdx = (this.currentLevelIdx + 1) % LEVELS.length;
            this.bridge.saveProgress({ level: this.currentLevelIdx });
            this._loadLevel(this.currentLevelIdx);
        }

        prevLevel() {
            this.currentLevelIdx = (this.currentLevelIdx - 1 + LEVELS.length) % LEVELS.length;
            this.bridge.saveProgress({ level: this.currentLevelIdx });
            this._loadLevel(this.currentLevelIdx);
        }

        _bindEvents() {
            window.addEventListener('resize', () => this._initDPI());

            this.canvas.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                if (this.isWon) return;

                const pt = this._getCanvasPoint(e);
                const cell = this._pointToCell(pt.x, pt.y);
                if (!cell) return;

                // 检查是否点在某个颜色的端点或已有管道上
                const node = this._getNodeAt(cell.r, cell.c);
                if (node) {
                    this.activeColor = node.name;
                    this.isDragging = true;
                    this.strokeCount++;
                    this.pipes.set(node.name, [{ r: cell.r, c: cell.c }]);
                    this.audio.playStep(520);
                    this._updateUI();
                } else {
                    // 点在现有管道中间：截断至该点并继续延伸
                    for (let [color, path] of this.pipes) {
                        const pathIdx = path.findIndex(p => p.r === cell.r && p.c === cell.c);
                        if (pathIdx !== -1) {
                            this.activeColor = color;
                            this.isDragging = true;
                            this.strokeCount++;
                            this.pipes.set(color, path.slice(0, pathIdx + 1));
                            this.audio.playStep(480);
                            this._updateUI();
                            break;
                        }
                    }
                }
            });

            window.addEventListener('pointermove', (e) => {
                if (!this.isDragging || !this.activeColor) return;
                e.stopPropagation();

                const pt = this._getCanvasPoint(e);
                const cell = this._pointToCell(pt.x, pt.y);
                if (!cell) return;

                const path = this.pipes.get(this.activeColor);
                if (!path || path.length === 0) return;

                const last = path[path.length - 1];

                // 必须在上下左右相邻格移动
                const dr = Math.abs(cell.r - last.r);
                const dc = Math.abs(cell.c - last.c);
                if (dr + dc !== 1) return;

                // 1. 平滑回退倒退检测 (Backtracking)
                if (path.length >= 2) {
                    const prev = path[path.length - 2];
                    if (prev.r === cell.r && prev.c === cell.c) {
                        path.pop();
                        this.audio.playStep(360);
                        this._updateUI();
                        return;
                    }
                }

                // 2. 如果碰上不同颜色的端点，坚决禁止穿过
                const otherNode = this._getNodeAt(cell.r, cell.c);
                if (otherNode && otherNode.name !== this.activeColor) {
                    return;
                }

                // 3. 如果穿过别的颜色的现有管道：打断冲散该管道
                for (let [cName, otherPath] of this.pipes) {
                    if (cName !== this.activeColor) {
                        const cutIdx = otherPath.findIndex(p => p.r === cell.r && p.c === cell.c);
                        if (cutIdx !== -1) {
                            this.pipes.set(cName, otherPath.slice(0, cutIdx));
                        }
                    }
                }

                // 4. 若进入自身已有管道，截断回退至该格
                const selfIdx = path.findIndex(p => p.r === cell.r && p.c === cell.c);
                if (selfIdx !== -1) {
                    this.pipes.set(this.activeColor, path.slice(0, selfIdx + 1));
                    return;
                }

                // 正常前进步进
                path.push({ r: cell.r, c: cell.c });
                this.audio.playStep(440 + path.length * 15);

                // 检查是否正好接入终点端点
                const targetNode = this.level.nodes.find(n => n.name === this.activeColor);
                if (targetNode) {
                    const isEnd1 = cell.r === targetNode.p1.r && cell.c === targetNode.p1.c;
                    const isEnd2 = cell.r === targetNode.p2.r && cell.c === targetNode.p2.c;
                    if ((isEnd1 || isEnd2) && path.length > 1) {
                        this.isDragging = false;
                        this.audio.playConnect();
                        this.bridge.vibrate(20);
                        this._createGlowParticles(cell.r, cell.c, targetNode.color);
                    }
                }

                this._updateUI();
            }, { passive: false });

            window.addEventListener('pointerup', (e) => {
                if (this.isDragging) {
                    e.stopPropagation();
                    this.isDragging = false;
                    this._checkVictory();
                }
            });

            window.addEventListener('pointercancel', (e) => {
                e.stopPropagation();
                this.isDragging = false;
            });

            document.getElementById('btn-restart')?.addEventListener('click', () => this.restart());
            document.getElementById('btn-prev-lvl')?.addEventListener('click', () => this.prevLevel());
            document.getElementById('btn-next-lvl')?.addEventListener('click', () => this.nextLevel());
            document.getElementById('btn-next-modal')?.addEventListener('click', () => this.nextLevel());
            document.getElementById('btn-mute')?.addEventListener('click', () => {
                const isMuted = this.audio.toggleMute();
                document.getElementById('btn-mute').textContent = isMuted ? '🔇' : '🔊';
            });

            // 玩法说明弹窗控制
            const helpModal = document.getElementById('help-modal');
            const openHelp = () => helpModal?.classList.add('active');
            const closeHelp = () => helpModal?.classList.remove('active');

            document.getElementById('btn-help')?.addEventListener('click', openHelp);
            document.getElementById('btn-close-help')?.addEventListener('click', closeHelp);
            helpModal?.addEventListener('click', (e) => {
                if (e.target === helpModal) closeHelp();
            });

            // 键盘快捷键支持
            window.addEventListener('keydown', (e) => {
                if (e.key === '?' || e.key === 'h' || e.key === 'H') {
                    if (helpModal?.classList.contains('active')) closeHelp();
                    else openHelp();
                } else if (e.key === 'Escape') {
                    closeHelp();
                } else if (e.key === 'r' || e.key === 'R') {
                    this.restart();
                } else if (e.key === 'ArrowLeft') {
                    this.prevLevel();
                } else if (e.key === 'ArrowRight') {
                    this.nextLevel();
                }
            });
        }

        _getCanvasPoint(e) {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
                y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
            };
        }

        _pointToCell(x, y) {
            const c = Math.floor(x / this.cellSize);
            const r = Math.floor(y / this.cellSize);
            if (r >= 0 && r < this.level.size && c >= 0 && c < this.level.size) {
                return { r, c };
            }
            return null;
        }

        _getNodeAt(r, c) {
            return this.level.nodes.find(n => 
                (n.p1.r === r && n.p1.c === c) || (n.p2.r === r && n.p2.c === c)
            ) || null;
        }

        _checkVictory() {
            // 铁律 1：所有回路必须端对端完整接通
            const allConnected = this.level.nodes.every(n => {
                const path = this.pipes.get(n.name) || [];
                if (path.length < 2) return false;
                const head = path[0];
                const tail = path[path.length - 1];

                const match1 = (head.r === n.p1.r && head.c === n.p1.c && tail.r === n.p2.r && tail.c === n.p2.c);
                const match2 = (head.r === n.p2.r && head.c === n.p2.c && tail.r === n.p1.r && tail.c === n.p1.c);
                return match1 || match2;
            });

            // 铁律 2：全盘 100% 填满 (覆盖单元格数 == 总格数)
            const coveredCells = new Set();
            for (let [, path] of this.pipes) {
                path.forEach(p => coveredCells.add(`${p.r},${p.c}`));
            }

            const totalCells = this.level.size * this.level.size;
            const isFull = coveredCells.size === totalCells;

            if (allConnected && isFull) {
                this.isWon = true;
                this.victoryPulse = {
                    startTime: performance.now(),
                    duration: 750
                };
                this.audio.playVictory();
                this.bridge.vibrate([20, 40, 60]);

                // 生成各回路沿线高能共鸣火花
                this.level.nodes.forEach(n => {
                    const path = this.pipes.get(n.name) || [];
                    path.forEach(p => this._createGlowParticles(p.r, p.c, n.color));
                });

                const minStrokes = this.level.nodes.length;
                let stars = 1;
                let rating = '功德圆满';
                if (this.strokeCount <= minStrokes) {
                    stars = 3;
                    rating = '神乎其技·一笔通天';
                } else if (this.strokeCount <= minStrokes + 2) {
                    stars = 2;
                    rating = '妙手天成·游刃有余';
                } else {
                    stars = 1;
                    rating = '功德圆满·百折不挠';
                }

                const completePayload = {
                    levelIndex: this.currentLevelIdx + 1,
                    level: this.currentLevelIdx + 1,
                    size: this.level.size,
                    fillPercent: 100,
                    current: 100,
                    best: 100,
                    currentScore: 100,
                    highScore: 100,
                    stars: stars,
                    strokes: this.strokeCount,
                    minStrokes: minStrokes
                };
                this.bridge.saveProgress({ level: Math.min(this.currentLevelIdx + 1, LEVELS.length - 1) });
                this.bridge.emit('LEVEL_COMPLETE', completePayload);
                this.bridge.emit('ON_LEVEL_COMPLETE', completePayload);

                // 延迟 700ms 弹出结算弹窗，留足观赏全图流光贯通的震撼视觉
                setTimeout(() => {
                    const textEl = document.getElementById('victory-level-text');
                    const starStr = '⭐'.repeat(stars);
                    if (textEl) {
                        textEl.innerHTML = `
                            <div style="font-size: 32px; margin-bottom: 8px; filter: drop-shadow(0 0 12px #00f0ff); letter-spacing: 6px;">${starStr}</div>
                            <div style="font-size: 15px; color: #00f0ff; font-weight: bold; margin-bottom: 12px;">[ ${rating} ]</div>
                            关卡 ${this.currentLevelIdx + 1} 完美通关！全盘共鸣流光 100% 贯通！<br>
                            连线尝试: <strong>${this.strokeCount}</strong> 次 (基准笔数: ${minStrokes} 笔)
                        `;
                    }
                    document.getElementById('victory-modal')?.classList.add('active');
                }, 700);
            }
        }

        _updateUI() {
            const coveredCells = new Set();
            for (let [, path] of this.pipes) {
                path.forEach(p => coveredCells.add(`${p.r},${p.c}`));
            }
            const totalCells = this.level.size * this.level.size;
            const percent = Math.round((coveredCells.size / totalCells) * 100);

            document.getElementById('level-label-val').textContent = `${this.currentLevelIdx + 1}/${LEVELS.length}`;
            document.getElementById('fill-percent-val').textContent = `${percent}%`;
            const strokesEl = document.getElementById('strokes-val');
            if (strokesEl) {
                strokesEl.textContent = `${this.strokeCount}`;
            }

            const payload = {
                fillPercent: percent,
                level: this.currentLevelIdx + 1,
                levelIndex: this.currentLevelIdx,
                current: percent,
                best: 100,
                currentScore: percent,
                highScore: 100
            };
            this.bridge.emit('SCORE_UPDATE', payload);
            this.bridge.emit('ON_SCORE_UPDATE', payload);
        }

        _createGlowParticles(r, c, color) {
            const cx = c * this.cellSize + this.cellSize / 2;
            const cy = r * this.cellSize + this.cellSize / 2;
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 4 + 2;
                this.particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: color,
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

            // 1. 绘制网格底盘
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.lineWidth = 1;
            for (let r = 0; r < this.level.size; r++) {
                for (let c = 0; c < this.level.size; c++) {
                    const x = c * this.cellSize;
                    const y = r * this.cellSize;
                    this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
                }
            }

            // 2. 绘制各颜色管道 (带平滑流光管壁)
            this.level.nodes.forEach(n => {
                const path = this.pipes.get(n.name) || [];
                if (path.length > 1) {
                    this.ctx.save();
                    this.ctx.strokeStyle = n.color;
                    this.ctx.lineWidth = this.cellSize * 0.38;
                    this.ctx.lineCap = 'round';
                    this.ctx.lineJoin = 'round';
                    this.ctx.shadowColor = n.color;
                    this.ctx.shadowBlur = 12;

                    this.ctx.beginPath();
                    path.forEach((p, idx) => {
                        const px = p.c * this.cellSize + this.cellSize / 2;
                        const py = p.r * this.cellSize + this.cellSize / 2;
                        if (idx === 0) this.ctx.moveTo(px, py);
                        else this.ctx.lineTo(px, py);
                    });
                    this.ctx.stroke();

                    // 中心高光光纤内芯
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = this.cellSize * 0.12;
                    this.ctx.shadowBlur = 0;
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            });

            // 3. 绘制节点端点
            this.level.nodes.forEach(n => {
                [n.p1, n.p2].forEach(p => {
                    const cx = p.c * this.cellSize + this.cellSize / 2;
                    const cy = p.r * this.cellSize + this.cellSize / 2;
                    const r = this.cellSize * 0.32;

                    this.ctx.save();
                    this.ctx.fillStyle = n.color;
                    this.ctx.shadowColor = n.color;
                    this.ctx.shadowBlur = 14;
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    this.ctx.fill();

                    // 内部共鸣光斑
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                });
            });

            // 3.5 绘制通电流光高速贯通脉冲 (自起点沿回路向终点奔涌)
            if (this.victoryPulse) {
                const elapsed = performance.now() - this.victoryPulse.startTime;
                const progress = Math.min(1, elapsed / this.victoryPulse.duration);

                this.level.nodes.forEach(n => {
                    const path = this.pipes.get(n.name) || [];
                    if (path.length > 1) {
                        const totalSegs = path.length - 1;
                        const curFloat = progress * totalSegs;
                        const segIdx = Math.min(Math.floor(curFloat), totalSegs - 1);
                        const t = curFloat - segIdx;

                        const pA = path[segIdx];
                        const pB = path[segIdx + 1];

                        const curX = ((1 - t) * pA.c + t * pB.c) * this.cellSize + this.cellSize / 2;
                        const curY = ((1 - t) * pA.r + t * pB.r) * this.cellSize + this.cellSize / 2;

                        this.ctx.save();
                        // 绘制奔涌的高光电弧光斑
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.shadowColor = n.color;
                        this.ctx.shadowBlur = 18;
                        this.ctx.beginPath();
                        this.ctx.arc(curX, curY, this.cellSize * 0.28, 0, Math.PI * 2);
                        this.ctx.fill();

                        // 环形电涌光晕
                        this.ctx.strokeStyle = n.color;
                        this.ctx.lineWidth = 3;
                        this.ctx.beginPath();
                        this.ctx.arc(curX, curY, this.cellSize * 0.45, 0, Math.PI * 2);
                        this.ctx.stroke();
                        this.ctx.restore();
                    }
                });
            }

            // 4. 粒子渲染
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
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, 3 * this.dpr, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.FlowGame = new FlowGame();
    });

})(window);
