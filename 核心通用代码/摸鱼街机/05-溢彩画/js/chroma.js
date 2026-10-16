/**
 * 🎨 Chroma Paint (溢彩画) - 核心游戏引擎
 * 采用 Canvas 2D 逐帧渲染 + 区域水墨扩散动画 + Web Audio 东方五音阶合成
 * 10 个数学全通关关卡 + 撤销回退栈 + 完整接入 UniversalBridge
 */
(function(window) {
    'use strict';

    // 调色盘配置 (国风五色与鸣潮溢彩画基调)
    const PALETTE = [
        { id: 0, name: '赤红', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.5)' },
        { id: 1, name: '琉璃青', hex: '#00f0ff', glow: 'rgba(0, 240, 255, 0.5)' },
        { id: 2, name: '缃黄', hex: '#fbbf24', glow: 'rgba(251, 191, 36, 0.5)' },
        { id: 3, name: '幽紫', hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)' },
        { id: 4, name: '翡翠绿', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' }
    ];

    // 15 关严格数学全通关配置（全量复刻《鸣潮》黎那汐塔【溢彩画册】大世界探索机制）
    const LEVELS = [
        {
                "name": "第 1 关: 黎那汐塔·星夜与月",
                "size": 5,
                "steps": 4,
                "grid": [
                        [
                                1,
                                1,
                                1,
                                1,
                                1
                        ],
                        [
                                1,
                                0,
                                0,
                                0,
                                1
                        ],
                        [
                                1,
                                0,
                                2,
                                0,
                                1
                        ],
                        [
                                1,
                                0,
                                0,
                                0,
                                1
                        ],
                        [
                                1,
                                1,
                                1,
                                1,
                                1
                        ]
                ]
        },
        {
                "name": "第 2 关: 黎乔利的星期日",
                "size": 6,
                "steps": 5,
                "grid": [
                        [
                                0,
                                0,
                                0,
                                1,
                                1,
                                1
                        ],
                        [
                                0,
                                2,
                                2,
                                1,
                                3,
                                1
                        ],
                        [
                                0,
                                2,
                                3,
                                3,
                                3,
                                1
                        ],
                        [
                                2,
                                3,
                                3,
                                3,
                                1,
                                1
                        ],
                        [
                                2,
                                3,
                                0,
                                0,
                                1,
                                1
                        ],
                        [
                                2,
                                2,
                                2,
                                0,
                                0,
                                0
                        ]
                ]
        },
        {
                "name": "第 3 关: 拉古那的回忆",
                "size": 6,
                "steps": 6,
                "grid": [
                        [
                                1,
                                1,
                                2,
                                2,
                                3,
                                3
                        ],
                        [
                                1,
                                0,
                                2,
                                2,
                                0,
                                3
                        ],
                        [
                                0,
                                0,
                                0,
                                0,
                                0,
                                0
                        ],
                        [
                                3,
                                0,
                                1,
                                1,
                                0,
                                2
                        ],
                        [
                                3,
                                3,
                                1,
                                1,
                                2,
                                2
                        ],
                        [
                                3,
                                3,
                                0,
                                0,
                                2,
                                2
                        ]
                ]
        },
        {
                "name": "第 4 关: 林间曦光",
                "size": 6,
                "steps": 5,
                "grid": [
                        [
                                0,
                                0,
                                1,
                                1,
                                1,
                                1
                        ],
                        [
                                0,
                                0,
                                1,
                                2,
                                2,
                                1
                        ],
                        [
                                3,
                                0,
                                0,
                                2,
                                2,
                                1
                        ],
                        [
                                3,
                                2,
                                2,
                                0,
                                0,
                                1
                        ],
                        [
                                3,
                                2,
                                2,
                                3,
                                0,
                                0
                        ],
                        [
                                3,
                                3,
                                3,
                                3,
                                0,
                                0
                        ]
                ]
        },
        {
                "name": "第 5 关: 埃格拉的风车",
                "size": 7,
                "steps": 5,
                "grid": [
                        [
                                1,
                                1,
                                1,
                                1,
                                1,
                                1,
                                1
                        ],
                        [
                                1,
                                4,
                                4,
                                1,
                                4,
                                4,
                                1
                        ],
                        [
                                1,
                                4,
                                0,
                                4,
                                0,
                                4,
                                1
                        ],
                        [
                                1,
                                1,
                                4,
                                2,
                                4,
                                1,
                                1
                        ],
                        [
                                1,
                                4,
                                0,
                                4,
                                0,
                                4,
                                1
                        ],
                        [
                                1,
                                4,
                                4,
                                1,
                                4,
                                4,
                                1
                        ],
                        [
                                1,
                                1,
                                1,
                                1,
                                1,
                                1,
                                1
                        ]
                ]
        },
        {
                "name": "第 6 关: 湖中睡莲",
                "size": 7,
                "steps": 6,
                "grid": [
                        [
                                0,
                                0,
                                0,
                                1,
                                1,
                                1,
                                1
                        ],
                        [
                                0,
                                2,
                                2,
                                1,
                                3,
                                3,
                                1
                        ],
                        [
                                0,
                                2,
                                4,
                                4,
                                4,
                                3,
                                1
                        ],
                        [
                                1,
                                1,
                                4,
                                4,
                                4,
                                1,
                                1
                        ],
                        [
                                1,
                                3,
                                4,
                                4,
                                4,
                                2,
                                0
                        ],
                        [
                                1,
                                3,
                                3,
                                1,
                                2,
                                2,
                                0
                        ],
                        [
                                1,
                                1,
                                1,
                                1,
                                0,
                                0,
                                0
                        ]
                ]
        },
        {
                "name": "第 7 关: 拂风水畔·翠色流云",
                "size": 7,
                "steps": 6,
                "grid": [
                        [
                                4,
                                4,
                                4,
                                4,
                                4,
                                4,
                                4
                        ],
                        [
                                4,
                                1,
                                1,
                                1,
                                1,
                                1,
                                4
                        ],
                        [
                                4,
                                1,
                                2,
                                2,
                                2,
                                1,
                                4
                        ],
                        [
                                4,
                                1,
                                2,
                                0,
                                2,
                                1,
                                4
                        ],
                        [
                                4,
                                1,
                                2,
                                3,
                                3,
                                1,
                                4
                        ],
                        [
                                4,
                                1,
                                1,
                                1,
                                1,
                                1,
                                4
                        ],
                        [
                                4,
                                4,
                                4,
                                4,
                                4,
                                4,
                                4
                        ]
                ]
        },
        {
                "name": "第 8 关: 泊金岗的黄昏",
                "size": 7,
                "steps": 6,
                "grid": [
                        [
                                2,
                                2,
                                2,
                                0,
                                0,
                                0,
                                0
                        ],
                        [
                                2,
                                1,
                                1,
                                0,
                                3,
                                3,
                                0
                        ],
                        [
                                2,
                                1,
                                4,
                                4,
                                4,
                                3,
                                0
                        ],
                        [
                                2,
                                1,
                                4,
                                2,
                                4,
                                3,
                                0
                        ],
                        [
                                2,
                                1,
                                4,
                                4,
                                4,
                                3,
                                0
                        ],
                        [
                                2,
                                1,
                                1,
                                3,
                                3,
                                3,
                                0
                        ],
                        [
                                2,
                                2,
                                2,
                                0,
                                0,
                                0,
                                0
                        ]
                ]
        },
        {
                "name": "第 9 关: 悲叹墓岛·静谧孤岛",
                "size": 7,
                "steps": 6,
                "grid": [
                        [
                                3,
                                3,
                                3,
                                3,
                                3,
                                3,
                                3
                        ],
                        [
                                3,
                                1,
                                1,
                                3,
                                2,
                                2,
                                3
                        ],
                        [
                                3,
                                1,
                                0,
                                4,
                                0,
                                2,
                                3
                        ],
                        [
                                3,
                                3,
                                4,
                                4,
                                4,
                                3,
                                3
                        ],
                        [
                                3,
                                2,
                                0,
                                4,
                                0,
                                1,
                                3
                        ],
                        [
                                3,
                                2,
                                2,
                                3,
                                1,
                                1,
                                3
                        ],
                        [
                                3,
                                3,
                                3,
                                3,
                                3,
                                3,
                                3
                        ]
                ]
        },
        {
                "name": "第 10 关: 赞悼圣迹·万象归元",
                "size": 8,
                "steps": 6,
                "grid": [
                        [
                                0,
                                0,
                                0,
                                1,
                                1,
                                2,
                                2,
                                2
                        ],
                        [
                                0,
                                4,
                                0,
                                1,
                                1,
                                2,
                                4,
                                2
                        ],
                        [
                                0,
                                0,
                                3,
                                3,
                                3,
                                3,
                                2,
                                2
                        ],
                        [
                                1,
                                1,
                                3,
                                4,
                                4,
                                3,
                                1,
                                1
                        ],
                        [
                                1,
                                1,
                                3,
                                4,
                                4,
                                3,
                                1,
                                1
                        ],
                        [
                                2,
                                2,
                                3,
                                3,
                                3,
                                3,
                                0,
                                0
                        ],
                        [
                                2,
                                4,
                                2,
                                0,
                                0,
                                1,
                                4,
                                0
                        ],
                        [
                                2,
                                2,
                                2,
                                0,
                                0,
                                1,
                                1,
                                1
                        ]
                ]
        },
        {
                "name": "第 11 关: 贝奥海域·潮汐回响",
                "size": 6,
                "steps": 5,
                "grid": [
                        [
                                1,
                                1,
                                1,
                                1,
                                1,
                                1
                        ],
                        [
                                1,
                                4,
                                4,
                                4,
                                4,
                                1
                        ],
                        [
                                1,
                                4,
                                2,
                                2,
                                4,
                                1
                        ],
                        [
                                1,
                                4,
                                2,
                                0,
                                4,
                                1
                        ],
                        [
                                1,
                                4,
                                4,
                                4,
                                4,
                                1
                        ],
                        [
                                1,
                                1,
                                1,
                                1,
                                1,
                                1
                        ]
                ]
        },
        {
                "name": "第 12 关: 阿维纽林·晨雾微曦",
                "size": 6,
                "steps": 6,
                "grid": [
                        [
                                0,
                                0,
                                1,
                                1,
                                2,
                                2
                        ],
                        [
                                0,
                                3,
                                1,
                                1,
                                3,
                                2
                        ],
                        [
                                1,
                                1,
                                4,
                                4,
                                1,
                                1
                        ],
                        [
                                1,
                                1,
                                4,
                                4,
                                1,
                                1
                        ],
                        [
                                2,
                                3,
                                1,
                                1,
                                3,
                                0
                        ],
                        [
                                2,
                                2,
                                1,
                                1,
                                0,
                                0
                        ]
                ]
        },
        {
                "name": "第 13 关: 圣石回廊·天光织锦",
                "size": 7,
                "steps": 6,
                "grid": [
                        [
                                2,
                                2,
                                2,
                                1,
                                2,
                                2,
                                2
                        ],
                        [
                                2,
                                2,
                                1,
                                0,
                                1,
                                2,
                                2
                        ],
                        [
                                2,
                                1,
                                0,
                                4,
                                0,
                                1,
                                2
                        ],
                        [
                                1,
                                0,
                                4,
                                3,
                                4,
                                0,
                                1
                        ],
                        [
                                2,
                                1,
                                0,
                                4,
                                0,
                                1,
                                2
                        ],
                        [
                                2,
                                2,
                                1,
                                0,
                                1,
                                2,
                                2
                        ],
                        [
                                2,
                                2,
                                2,
                                1,
                                2,
                                2,
                                2
                        ]
                ]
        },
        {
                "name": "第 14 关: 巨榕之荫·青苍幻境",
                "size": 7,
                "steps": 6,
                "grid": [
                        [
                                4,
                                4,
                                4,
                                4,
                                4,
                                4,
                                4
                        ],
                        [
                                4,
                                1,
                                1,
                                1,
                                1,
                                1,
                                4
                        ],
                        [
                                4,
                                1,
                                3,
                                3,
                                3,
                                1,
                                4
                        ],
                        [
                                4,
                                1,
                                3,
                                2,
                                3,
                                1,
                                4
                        ],
                        [
                                4,
                                1,
                                3,
                                0,
                                3,
                                1,
                                4
                        ],
                        [
                                4,
                                1,
                                1,
                                1,
                                1,
                                1,
                                4
                        ],
                        [
                                4,
                                4,
                                4,
                                4,
                                4,
                                4,
                                4
                        ]
                ]
        },
        {
                "name": "第 15 关: 晨曦圣座·万彩琼楼",
                "size": 7,
                "steps": 6,
                "grid": [
                        [
                                1,
                                1,
                                1,
                                0,
                                2,
                                2,
                                2
                        ],
                        [
                                1,
                                3,
                                1,
                                0,
                                2,
                                4,
                                2
                        ],
                        [
                                1,
                                1,
                                1,
                                0,
                                2,
                                2,
                                2
                        ],
                        [
                                0,
                                0,
                                0,
                                0,
                                0,
                                0,
                                0
                        ],
                        [
                                2,
                                2,
                                2,
                                0,
                                1,
                                1,
                                1
                        ],
                        [
                                2,
                                4,
                                2,
                                0,
                                1,
                                3,
                                1
                        ],
                        [
                                2,
                                2,
                                2,
                                0,
                                1,
                                1,
                                1
                        ]
                ]
        }
];

    class ChromaGame {
        constructor() {
            this.canvas = document.getElementById('chroma-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.audio = new AudioEngine();
            this.bridge = new UniversalBridge('chroma-paint');
            this.bridge.bindGame(this);

            this.currentLevelIdx = 0;
            this.grid = [];
            this.stepsRemaining = 0;
            this.maxSteps = 0;
            this.selectedColor = 0;
            this.history = [];
            this.isWon = false;
            this.isLost = false;
            this.isPaused = false;

            // 涟漪波浪渲染
            this.ripples = [];
            this.hoveredCell = null;

            // 粒子特效
            this.particles = [];

            this._loadSavedProgress();
            this._initDOM();
            this._bindEvents();
            this._startLevel(this.currentLevelIdx);

            this.animLoop = this.animLoop.bind(this);
            requestAnimationFrame(this.animLoop);

            this.bridge.emit('ON_READY', { game: 'chroma-paint' });
        }

        pause() {
            this.isPaused = true;
        }

        resume() {
            this.isPaused = false;
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
                stepsVal: document.getElementById('steps-val'),
                coverageVal: document.getElementById('coverage-val'),
                paletteBar: document.getElementById('palette-bar'),
                btnUndo: document.getElementById('btn-undo'),
                btnRestart: document.getElementById('btn-restart'),
                btnMute: document.getElementById('btn-mute'),
                btnHelp: document.getElementById('btn-help'),
                btnPrev: document.getElementById('btn-prev-lvl'),
                btnNext: document.getElementById('btn-next-lvl'),
                victoryModal: document.getElementById('victory-modal'),
                defeatModal: document.getElementById('defeat-modal'),
                helpModal: document.getElementById('help-modal'),
                btnNextModal: document.getElementById('btn-next-modal'),
                btnRetryModal: document.getElementById('btn-retry-modal'),
                btnUndoModal: document.getElementById('btn-undo-modal'),
                btnCloseHelp: document.getElementById('btn-close-help')
            };
        }

        _bindEvents() {
            window.addEventListener('resize', () => this._resizeCanvas());

            // 画布交互 (点击与悬浮)
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

            const handlePointerMove = (evt) => {
                const pos = getCanvasPos(evt);
                this.hoveredCell = this._posToCell(pos.x, pos.y);
            };

            const handlePointerLeave = () => {
                this.hoveredCell = null;
            };

            this.canvas.addEventListener('mousedown', handlePointerDown);
            this.canvas.addEventListener('mousemove', handlePointerMove);
            this.canvas.addEventListener('mouseleave', handlePointerLeave);

            this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
            this.canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
            this.canvas.addEventListener('touchend', handlePointerLeave);

            // 控制按钮
            if (this.dom.btnUndo) this.dom.btnUndo.addEventListener('click', () => this.undo());
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
            if (this.dom.btnRetryModal) {
                this.dom.btnRetryModal.addEventListener('click', () => {
                    this._hideModals();
                    this.restart();
                });
            }
            if (this.dom.btnUndoModal) {
                this.dom.btnUndoModal.addEventListener('click', () => {
                    this._hideModals();
                    this.undo();
                });
            }

            // 键盘快捷键 (1-5 调色盘, Z 撤销, R 重置, ? 帮助)
            window.addEventListener('keydown', (e) => {
                const key = e.key;
                if (key >= '1' && key <= '5') {
                    const cIdx = parseInt(key, 10) - 1;
                    this.selectColor(cIdx);
                } else if (key === 'z' || key === 'Z') {
                    if (e.ctrlKey || !e.ctrlKey) this.undo();
                } else if (key === 'r' || key === 'R') {
                    this.restart();
                } else if (key === '?' || key === 'h' || key === 'H') {
                    this.showHelp(true);
                } else if (key === 'ArrowLeft') {
                    this.switchLevel(this.currentLevelIdx - 1);
                } else if (key === 'ArrowRight') {
                    this.switchLevel(this.currentLevelIdx + 1);
                } else if (key === 'Escape') {
                    this.showHelp(false);
                    this._hideModals();
                }
            });
        }

        _startLevel(idx) {
            if (idx < 0) idx = 0;
            if (idx >= LEVELS.length) idx = LEVELS.length - 1;
            this.currentLevelIdx = idx;
            const lvl = LEVELS[idx];

            this.grid = lvl.grid.map(row => [...row]);
            this.stepsRemaining = lvl.steps;
            this.maxSteps = lvl.steps;
            this.history = [];
            this.isWon = false;
            this.isLost = false;
            this.ripples = [];
            this.particles = [];

            // 寻找默认选中的颜色 (选网格中首个颜色或第一个存在颜色)
            const usedColors = this._getUsedColors();
            this.selectedColor = usedColors.length > 0 ? usedColors[0] : 0;

            this._renderPalette();
            this._updateHUD();
            this._resizeCanvas();
            this._hideModals();

            this.bridge.saveProgress({ level: this.currentLevelIdx });
        }

        _getUsedColors() {
            const set = new Set();
            for (let r = 0; r < this.grid.length; r++) {
                for (let c = 0; c < this.grid[r].length; c++) {
                    set.add(this.grid[r][c]);
                }
            }
            return Array.from(set).sort((a, b) => a - b);
        }

        _renderPalette() {
            if (!this.dom.paletteBar) return;
            this.dom.paletteBar.innerHTML = '';

            const used = new Set(this._getUsedColors());

            PALETTE.forEach((colorItem, idx) => {
                const btn = document.createElement('button');
                btn.className = `palette-item ${this.selectedColor === idx ? 'active' : ''} ${used.has(idx) ? 'in-use' : 'unused'}`;
                btn.title = `${colorItem.name} (按键 ${idx + 1})`;
                btn.dataset.colorId = idx;

                const swatch = document.createElement('span');
                swatch.className = 'color-swatch';
                swatch.style.backgroundColor = colorItem.hex;
                swatch.style.boxShadow = `0 0 10px ${colorItem.glow}`;

                const label = document.createElement('span');
                label.className = 'color-label';
                label.textContent = `${idx + 1}`;

                btn.appendChild(swatch);
                btn.appendChild(label);

                btn.addEventListener('click', () => {
                    this.selectColor(idx);
                });

                this.dom.paletteBar.appendChild(btn);
            });
        }

        selectColor(colorIdx) {
            if (colorIdx < 0 || colorIdx >= PALETTE.length) return;
            this.selectedColor = colorIdx;
            this.audio.playDrop(colorIdx);

            // 更新 UI 高亮
            const items = this.dom.paletteBar.querySelectorAll('.palette-item');
            items.forEach((item, idx) => {
                if (idx === colorIdx) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }

        _onCellClicked(r, c) {
            if (this.isWon || this.isLost) return;
            const targetColor = this.grid[r][c];
            if (targetColor === this.selectedColor) {
                // 点击相同颜色，不扣步数
                return;
            }
            if (this.stepsRemaining <= 0) {
                this.audio.playDefeat();
                return;
            }

            // 保存历史记录用于撤销
            this.history.push({
                grid: this.grid.map(row => [...row]),
                stepsRemaining: this.stepsRemaining
            });

            // 执行染色洪泛
            const floodedCells = this._floodFill(r, c, this.selectedColor);
            this.stepsRemaining--;

            // 触发音频与涟漪波动画
            this.audio.playDrop(this.selectedColor);
            this._addRipple(r, c, targetColor, this.selectedColor, floodedCells);

            this._updateHUD();

            // 检查通关与失败
            const isMono = this._checkMonochrome();
            if (isMono) {
                this.isWon = true;
                const score = (this.currentLevelIdx + 1) * 1000 + this.stepsRemaining * 300;
                this.bridge.recordScore(score);
                this.bridge.saveProgress({ level: Math.min(this.currentLevelIdx + 1, LEVELS.length - 1) });
                this.audio.playVictory();
                this._spawnVictoryParticles();

                let stars = 1;
                if (this.stepsRemaining >= 2) {
                    stars = 3;
                } else if (this.stepsRemaining === 1) {
                    stars = 2;
                }
                const payload = {
                    current: score,
                    best: this.bridge.getHighScore(),
                    currentScore: score,
                    highScore: this.bridge.getHighScore(),
                    level: this.currentLevelIdx + 1,
                    levelIndex: this.currentLevelIdx,
                    stars: stars,
                    stepsRemaining: this.stepsRemaining
                };
                this.bridge.emit('SCORE_UPDATE', payload);
                this.bridge.emit('ON_SCORE_UPDATE', payload);
                this.bridge.emit('LEVEL_COMPLETE', payload);
                this.bridge.emit('ON_LEVEL_COMPLETE', payload);

                setTimeout(() => this._showVictoryModal(), 600);
            } else if (this.stepsRemaining <= 0) {
                this.isLost = true;
                this.audio.playDefeat();
                const failPayload = {
                    level: this.currentLevelIdx + 1,
                    levelIndex: this.currentLevelIdx
                };
                this.bridge.emit('GAME_OVER', failPayload);
                this.bridge.emit('ON_GAME_OVER', failPayload);
                setTimeout(() => this._showDefeatModal(), 500);
            }
        }

        _floodFill(startR, startC, newColor) {
            const oldColor = this.grid[startR][startC];
            if (oldColor === newColor) return [];

            const R = this.grid.length;
            const C = this.grid[0].length;
            const queue = [[startR, startC]];
            const visited = new Set([`${startR},${startC}`]);
            const affected = [];

            while (queue.length > 0) {
                const [cr, cc] = queue.shift();
                this.grid[cr][cc] = newColor;
                affected.push({ r: cr, c: cc, dist: Math.hypot(cr - startR, cc - startC) });

                const neighbors = [
                    [-1, 0], [1, 0], [0, -1], [0, 1]
                ];
                for (const [dr, dc] of neighbors) {
                    const nr = cr + dr;
                    const nc = cc + dc;
                    if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                        const key = `${nr},${nc}`;
                        if (!visited.has(key) && this.grid[nr][nc] === oldColor) {
                            visited.add(key);
                            queue.push([nr, nc]);
                        }
                    }
                }
            }
            return affected;
        }

        _addRipple(originR, originC, oldColor, newColor, affectedCells) {
            this.ripples.push({
                originR,
                originC,
                oldColor,
                newColor,
                affectedCells,
                startTime: performance.now(),
                duration: 450 // ms
            });
        }

        undo() {
            if (this.history.length === 0 || this.isWon) return;
            const last = this.history.pop();
            this.grid = last.grid;
            this.stepsRemaining = last.stepsRemaining;
            this.isLost = false;
            this.audio.playUndo();
            this._updateHUD();
            this._hideModals();
        }

        restart() {
            this._startLevel(this.currentLevelIdx);
        }

        switchLevel(idx) {
            if (idx >= 0 && idx < LEVELS.length) {
                this._startLevel(idx);
            }
        }

        _checkMonochrome() {
            const first = this.grid[0][0];
            for (let r = 0; r < this.grid.length; r++) {
                for (let c = 0; c < this.grid[r].length; c++) {
                    if (this.grid[r][c] !== first) return false;
                }
            }
            return true;
        }

        _calcCoverage() {
            const counts = {};
            let total = 0;
            for (let r = 0; r < this.grid.length; r++) {
                for (let c = 0; c < this.grid[r].length; c++) {
                    const col = this.grid[r][c];
                    counts[col] = (counts[col] || 0) + 1;
                    total++;
                }
            }
            const maxVal = Math.max(...Object.values(counts));
            return Math.round((maxVal / total) * 100);
        }

        _updateHUD() {
            const lvl = LEVELS[this.currentLevelIdx];
            if (this.dom.levelLabel) {
                this.dom.levelLabel.textContent = `${this.currentLevelIdx + 1}/${LEVELS.length}`;
            }
            if (this.dom.stepsVal) {
                this.dom.stepsVal.textContent = `${this.stepsRemaining}`;
                if (this.stepsRemaining <= 1) {
                    this.dom.stepsVal.classList.add('danger');
                } else {
                    this.dom.stepsVal.classList.remove('danger');
                }
            }
            if (this.dom.coverageVal) {
                const cov = this._calcCoverage();
                this.dom.coverageVal.textContent = `${cov}%`;
            }
            if (this.dom.btnPrev) this.dom.btnPrev.disabled = (this.currentLevelIdx === 0);
            if (this.dom.btnNext) this.dom.btnNext.disabled = (this.currentLevelIdx === LEVELS.length - 1);
            if (this.dom.btnUndo) this.dom.btnUndo.disabled = (this.history.length === 0 || this.isWon);
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
            const N = this.grid.length;
            if (!N) return null;
            const pad = 12;
            const boardSize = this.viewSize - pad * 2;
            const cellSize = boardSize / N;

            if (px < pad || px > this.viewSize - pad || py < pad || py > this.viewSize - pad) {
                return null;
            }
            const c = Math.floor((px - pad) / cellSize);
            const r = Math.floor((py - pad) / cellSize);
            if (r >= 0 && r < N && c >= 0 && c < N) {
                return { r, c };
            }
            return null;
        }

        _spawnVictoryParticles() {
            this.particles = [];
            const count = 60;
            const cx = this.viewSize / 2;
            const cy = this.viewSize / 2;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 6;
                const pColor = PALETTE[Math.floor(Math.random() * PALETTE.length)].hex;
                this.particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: 3 + Math.random() * 4,
                    color: pColor,
                    alpha: 1,
                    life: 1.0,
                    decay: 0.015 + Math.random() * 0.02
                });
            }
        }

        _showVictoryModal() {
            if (this.dom.victoryModal) {
                const text = document.getElementById('victory-level-text');
                let stars = '⭐';
                let rating = '功德圆满';
                if (this.stepsRemaining >= 2) {
                    stars = '⭐⭐⭐';
                    rating = '神乎其技';
                } else if (this.stepsRemaining === 1) {
                    stars = '⭐⭐';
                    rating = '妙手天成';
                }
                if (text) {
                    text.innerHTML = `
                        <div style="font-size: 32px; margin-bottom: 8px; filter: drop-shadow(0 0 12px #fbbf24); letter-spacing: 6px;">${stars}</div>
                        <div style="font-size: 15px; color: #fbbf24; font-weight: bold; margin-bottom: 12px;">[ ${rating} ]</div>
                        恭喜通关 <strong>${LEVELS[this.currentLevelIdx].name}</strong>！<br>
                        剩余步数: <strong>${this.stepsRemaining}</strong> 步
                    `;
                }
                this.dom.victoryModal.classList.add('visible');
            }
        }

        _showDefeatModal() {
            if (this.dom.defeatModal) {
                this.dom.defeatModal.classList.add('visible');
            }
        }

        _hideModals() {
            if (this.dom.victoryModal) this.dom.victoryModal.classList.remove('visible');
            if (this.dom.defeatModal) this.dom.defeatModal.classList.remove('visible');
            if (this.dom.helpModal) this.dom.helpModal.classList.remove('visible');
        }

        showHelp(show) {
            if (this.dom.helpModal) {
                if (show) this.dom.helpModal.classList.add('visible');
                else this.dom.helpModal.classList.remove('visible');
            }
        }

        animLoop(now) {
            if (!this.isPaused) {
                this._updateRipples(now);
                this._updateParticles();
            }
            this._render(now);
            requestAnimationFrame(this.animLoop);
        }

        _updateRipples(now) {
            this.ripples = this.ripples.filter(rip => {
                return (now - rip.startTime) < rip.duration;
            });
        }

        _updateParticles() {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.12; // gravity
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

            const N = this.grid.length;
            if (!N) return;

            const pad = 12;
            const boardSize = size - pad * 2;
            const cellSize = boardSize / N;
            const gap = Math.max(1.5, Math.min(3, 18 / N));

            // 背景光韵底座
            ctx.fillStyle = '#0f141f';
            this._roundRect(ctx, pad - 4, pad - 4, boardSize + 8, boardSize + 8, 12);
            ctx.fill();

            // 绘制单元格
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const colorId = this.grid[r][c];
                    let hex = PALETTE[colorId].hex;

                    // 检查涟漪过渡
                    for (const rip of this.ripples) {
                        const cellInfo = rip.affectedCells.find(item => item.r === r && item.c === c);
                        if (cellInfo) {
                            const elapsed = now - rip.startTime;
                            const delay = cellInfo.dist * 35; // 距离扩散延迟
                            if (elapsed < delay) {
                                hex = PALETTE[rip.oldColor].hex;
                            } else {
                                hex = PALETTE[rip.newColor].hex;
                            }
                        }
                    }

                    const x = pad + c * cellSize + gap / 2;
                    const y = pad + r * cellSize + gap / 2;
                    const w = cellSize - gap;
                    const h = cellSize - gap;

                    // 绘制基础色块
                    ctx.fillStyle = hex;
                    this._roundRect(ctx, x, y, w, h, Math.max(3, 10 - N));
                    ctx.fill();

                    // 高亮悬浮单元格
                    if (this.hoveredCell && this.hoveredCell.r === r && this.hoveredCell.c === c) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
                        ctx.fill();
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                }
            }

            // 绘制粒子
            for (const p of this.particles) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
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
        window.game = new ChromaGame();
    });

})(window);
