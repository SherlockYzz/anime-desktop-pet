/**
 * 🔢 Sudoku (数独) - 极意数独核心游戏引擎
 * 支持 4 大难度梯度 + 真实数学保证唯一解 + 草稿笔记模式 + 智能冲突提示 + 撤销回退 + 完整 UniversalBridge 协议
 */
(function(window) {
    'use strict';

    // 精选经典唯一解数独题库 (初始题板 + 终局解板)
    // 采用点阵字符 81 位紧凑表示 (0 代表空格)
    const PUZZLE_BANK = {
        "easy": [
                {
                        "puzzle": "009405678345000020600090040203009000560280003000000261450000002001820750080516904",
                        "solution": "129435678345768129678192345213649587567281493894357261456973812931824756782516934"
                },
                {
                        "puzzle": "001020568005180470040000010027001853100203000063478900650009130000000084000700695",
                        "solution": "971324568235186479846597312427961853198253746563478921652849137719635284384712695"
                }
        ],
        "medium": [
                {
                        "puzzle": "000300608300106500075090000038000000009803060200009030000607325026500009003021700",
                        "solution": "912345678384176592675298413138762954549813267267459831491687325726534189853921746"
                },
                {
                        "puzzle": "100000070500170064047689105004906000030840200780020600020000050900400032000000900",
                        "solution": "162354879598172364347689125214936587635847291789521643821793456956418732473265918"
                }
        ],
        "hard": [
                {
                        "puzzle": "000000567200170000000008002002710900056009000409003206000600300001590080500000020",
                        "solution": "918234567263175498745968132382716945156429873479853216827641359631592784594387621"
                },
                {
                        "puzzle": "009000000023000000040380010000058902008000060060000703080000007015030420006072059",
                        "solution": "859124376123567894647389215371658942298743561564291783982415637715936428436872159"
                }
        ],
        "expert": [
                {
                        "puzzle": "400000090000000500000007304200040900071000000008200000010705400086000050000023167",
                        "solution": "425136798837492516169587324253648971671359842948271635312765489786914253594823167"
                },
                {
                        "puzzle": "000000896090080000000300014000170060360000080005400700004500000050000040000701308",
                        "solution": "473215896192684537586397214248173965367952481915468723834526179751839642629741358"
                }
        ]
};

    class SudokuGame {
        constructor() {
            this.bridge = new window.UniversalBridge('sudoku');
            this.audio = new window.AudioEngine();
            this.bridge.bindGame(this);

            this.difficulty = 'easy';
            this.board = Array(9).fill(null).map(() => Array(9).fill(0));
            this.initialBoard = Array(9).fill(null).map(() => Array(9).fill(false));
            this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
            this.notes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));

            this.selectedCell = null;
            this.isPencilMode = false;
            this.history = [];
            this.mistakes = 0;
            this.maxMistakes = 3;
            this.hintsUsed = 0;
            this.timerSeconds = 0;
            this.timerInterval = null;
            this.isWon = false;
            this.isLost = false;
            this.isPaused = false;

            this._initDOM();
            this._bindEvents();
            this.newGame(this.difficulty);
        }

        _initDOM() {
            this.dom = {
                grid: document.getElementById('sudoku-grid'),
                keypad: document.getElementById('num-keypad'),
                timer: document.getElementById('timer-val'),
                mistakes: document.getElementById('mistakes-val'),
                pencilBtn: document.getElementById('btn-pencil'),
                eraseBtn: document.getElementById('btn-erase'),
                undoBtn: document.getElementById('btn-undo'),
                hintBtn: document.getElementById('btn-hint'),
                diffTabs: document.querySelectorAll('.diff-tab'),
                victoryModal: document.getElementById('victory-modal'),
                defeatModal: document.getElementById('defeat-modal'),
                victoryText: document.getElementById('victory-text'),
                btnNext: document.getElementById('btn-next'),
                btnRetry: document.getElementById('btn-retry'),
                btnRestart: document.getElementById('btn-restart'),
                muteBtn: document.getElementById('btn-mute')
            };

            // 生成 9x9 单元格
            if (this.dom.grid) {
                this.dom.grid.innerHTML = '';
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        const cell = document.createElement('div');
                        cell.className = 'sudoku-cell';
                        cell.dataset.r = r;
                        cell.dataset.c = c;
                        
                        // 3x3 粗边框区分
                        if (c % 3 === 2 && c !== 8) cell.classList.add('border-right-bold');
                        if (r % 3 === 2 && r !== 8) cell.classList.add('border-bottom-bold');

                        const valSpan = document.createElement('span');
                        valSpan.className = 'cell-value';
                        cell.appendChild(valSpan);

                        const notesGrid = document.createElement('div');
                        notesGrid.className = 'cell-notes';
                        for (let n = 1; n <= 9; n++) {
                            const noteNum = document.createElement('span');
                            noteNum.className = `note-item note-${n}`;
                            noteNum.textContent = n;
                            notesGrid.appendChild(noteNum);
                        }
                        cell.appendChild(notesGrid);

                        this.dom.grid.appendChild(cell);
                    }
                }
            }
        }

        _bindEvents() {
            // 点击单元格
            if (this.dom.grid) {
                this.dom.grid.addEventListener('click', (e) => {
                    const cell = e.target.closest('.sudoku-cell');
                    if (!cell) return;
                    const r = parseInt(cell.dataset.r, 10);
                    const c = parseInt(cell.dataset.c, 10);
                    this.selectCell(r, c);
                });
            }

            // 数字按键 (1~9)
            if (this.dom.keypad) {
                this.dom.keypad.addEventListener('click', (e) => {
                    const btn = e.target.closest('.num-key');
                    if (!btn) return;
                    const num = parseInt(btn.dataset.num, 10);
                    if (num >= 1 && num <= 9) {
                        this.handleNumberInput(num);
                    }
                });
            }

            // 键盘快捷键支持
            window.addEventListener('keydown', (e) => {
                if (this.isWon || this.isLost || this.isPaused) return;

                if (e.key >= '1' && e.key <= '9') {
                    this.handleNumberInput(parseInt(e.key, 10));
                } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
                    this.erase();
                } else if (e.key.toLowerCase() === 'n' || e.key === ' ') {
                    this.togglePencil();
                } else if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) {
                    this.undo();
                } else if (e.key.startsWith('Arrow')) {
                    this._handleArrowKey(e.key);
                }
            });

            // 工具栏操作
            if (this.dom.pencilBtn) this.dom.pencilBtn.addEventListener('click', () => this.togglePencil());
            if (this.dom.eraseBtn) this.dom.eraseBtn.addEventListener('click', () => this.erase());
            if (this.dom.undoBtn) this.dom.undoBtn.addEventListener('click', () => this.undo());
            if (this.dom.hintBtn) this.dom.hintBtn.addEventListener('click', () => this.hint());
            if (this.dom.btnRestart) this.dom.btnRestart.addEventListener('click', () => this.restart());

            // 难度切换
            if (this.dom.diffTabs) {
                this.dom.diffTabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        const diff = tab.dataset.diff;
                        if (diff && diff !== this.difficulty) {
                            this.dom.diffTabs.forEach(t => t.classList.remove('active'));
                            tab.classList.add('active');
                            this.newGame(diff);
                        }
                    });
                });
            }

            // 弹窗按键
            if (this.dom.btnNext) this.dom.btnNext.addEventListener('click', () => {
                this.dom.victoryModal.classList.remove('visible');
                this.newGame(this.difficulty);
            });
            if (this.dom.btnRetry) this.dom.btnRetry.addEventListener('click', () => {
                this.dom.defeatModal.classList.remove('visible');
                this.restart();
            });

            // 静音按键
            if (this.dom.muteBtn) {
                this.dom.muteBtn.addEventListener('click', () => {
                    const isMuted = this.audio.toggleMute();
                    this.dom.muteBtn.textContent = isMuted ? '🔇' : '🔊';
                    this.dom.muteBtn.classList.toggle('muted', isMuted);
                });
            }
        }

        _handleArrowKey(key) {
            if (!this.selectedCell) {
                this.selectCell(0, 0);
                return;
            }
            let { r, c } = this.selectedCell;
            if (key === 'ArrowUp') r = (r + 8) % 9;
            else if (key === 'ArrowDown') r = (r + 1) % 9;
            else if (key === 'ArrowLeft') c = (c + 8) % 9;
            else if (key === 'ArrowRight') c = (c + 1) % 9;
            this.selectCell(r, c);
        }

        newGame(difficulty = 'easy') {
            this.difficulty = difficulty;
            const bank = PUZZLE_BANK[difficulty] || PUZZLE_BANK.easy;
            const item = bank[Math.floor(Math.random() * bank.length)];

            this.isWon = false;
            this.isLost = false;
            this.mistakes = 0;
            this.hintsUsed = 0;
            this.selectedCell = null;
            this.history = [];
            this.notes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));

            // 解析数独点阵
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    const idx = r * 9 + c;
                    const pVal = parseInt(item.puzzle[idx], 10);
                    const sVal = parseInt(item.solution[idx], 10);
                    this.board[r][c] = pVal;
                    this.initialBoard[r][c] = (pVal !== 0);
                    this.solution[r][c] = sVal;
                }
            }

            this._startTimer();
            this._updateMistakesUI();
            this._renderBoard();
            this.bridge.emit('ON_GAME_START', { difficulty: this.difficulty });
        }

        restart() {
            this.isWon = false;
            this.isLost = false;
            this.mistakes = 0;
            this.hintsUsed = 0;
            this.selectedCell = null;
            this.history = [];
            this.notes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (!this.initialBoard[r][c]) {
                        this.board[r][c] = 0;
                    }
                }
            }

            this._startTimer();
            this._updateMistakesUI();
            this._renderBoard();
        }

        pause() {
            this.isPaused = true;
            if (this.timerInterval) clearInterval(this.timerInterval);
        }

        resume() {
            this.isPaused = false;
            this._startTimer(false);
        }

        _startTimer(reset = true) {
            if (this.timerInterval) clearInterval(this.timerInterval);
            if (reset) this.timerSeconds = 0;
            this._updateTimerDisplay();
            this.timerInterval = setInterval(() => {
                if (!this.isPaused && !this.isWon && !this.isLost) {
                    this.timerSeconds++;
                    this._updateTimerDisplay();
                }
            }, 1000);
        }

        _updateTimerDisplay() {
            if (!this.dom.timer) return;
            const m = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
            const s = (this.timerSeconds % 60).toString().padStart(2, '0');
            this.dom.timer.textContent = `${m}:${s}`;
        }

        _updateMistakesUI() {
            if (!this.dom.mistakes) return;
            this.dom.mistakes.textContent = `${this.mistakes}/${this.maxMistakes}`;
            if (this.mistakes >= this.maxMistakes) {
                this.dom.mistakes.style.color = '#ef4444';
            } else {
                this.dom.mistakes.style.color = '#00f0ff';
            }
        }

        selectCell(r, c) {
            this.selectedCell = { r, c };
            this._renderHighlights();
        }

        togglePencil() {
            this.isPencilMode = !this.isPencilMode;
            if (this.dom.pencilBtn) {
                this.dom.pencilBtn.classList.toggle('active', this.isPencilMode);
            }
            this.audio.playPencil();
        }

        _saveHistoryState() {
            const boardCopy = this.board.map(row => [...row]);
            const notesCopy = this.notes.map(row => row.map(cellSet => new Set(cellSet)));
            this.history.push({ board: boardCopy, notes: notesCopy });
            if (this.history.length > 30) this.history.shift();
        }

        undo() {
            if (this.history.length === 0 || this.isWon || this.isLost) return;
            const prev = this.history.pop();
            this.board = prev.board;
            this.notes = prev.notes;
            this.audio.playPencil();
            this._renderBoard();
        }

        erase() {
            if (!this.selectedCell || this.isWon || this.isLost) return;
            const { r, c } = this.selectedCell;
            if (this.initialBoard[r][c]) return;

            if (this.board[r][c] !== 0 || this.notes[r][c].size > 0) {
                this._saveHistoryState();
                this.board[r][c] = 0;
                this.notes[r][c].clear();
                this.audio.playErase();
                this._renderBoard();
            }
        }

        handleNumberInput(num) {
            if (!this.selectedCell || this.isWon || this.isLost) return;
            const { r, c } = this.selectedCell;
            if (this.initialBoard[r][c]) return;

            this._saveHistoryState();

            if (this.isPencilMode) {
                // 草稿笔记模式
                if (this.board[r][c] !== 0) return;
                const cellNotes = this.notes[r][c];
                if (cellNotes.has(num)) {
                    cellNotes.delete(num);
                } else {
                    cellNotes.add(num);
                }
                this.audio.playPencil();
                this._renderCell(r, c);
            } else {
                // 正式填数
                if (this.board[r][c] === num) return;

                this.notes[r][c].clear();
                const isCorrect = (num === this.solution[r][c]);

                if (isCorrect) {
                    this.board[r][c] = num;
                    this.audio.playTap(num);
                    this.bridge.vibrate(20);

                    // 自动擦除同格、同行、同列、同宫格里的该候选数笔记
                    this._autoCleanNotes(r, c, num);
                    this._renderBoard();

                    if (this._checkWin()) {
                        this._handleVictory();
                    }
                } else {
                    // 填入错误
                    this.board[r][c] = num;
                    this.mistakes++;
                    this.audio.playError();
                    this.bridge.vibrate(80);
                    this._updateMistakesUI();
                    this._renderBoard();

                    if (this.mistakes >= this.maxMistakes) {
                        this._handleDefeat();
                    }
                }
            }
        }

        _autoCleanNotes(r, c, num) {
            // 清理行、列
            for (let i = 0; i < 9; i++) {
                this.notes[r][i].delete(num);
                this.notes[i][c].delete(num);
            }
            // 清理 3x3 宫格
            const br = Math.floor(r / 3) * 3;
            const bc = Math.floor(c / 3) * 3;
            for (let dr = 0; dr < 3; dr++) {
                for (let dc = 0; dc < 3; dc++) {
                    this.notes[br + dr][bc + dc].delete(num);
                }
            }
        }

        hint() {
            if (!this.selectedCell || this.isWon || this.isLost) return;
            const { r, c } = this.selectedCell;
            if (this.board[r][c] === this.solution[r][c]) return;

            this._saveHistoryState();
            const correctVal = this.solution[r][c];
            this.board[r][c] = correctVal;
            this.notes[r][c].clear();
            this.hintsUsed++;
            this.audio.playHint();
            this._autoCleanNotes(r, c, correctVal);
            this._renderBoard();

            if (this._checkWin()) {
                this._handleVictory();
            }
        }

        _checkWin() {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (this.board[r][c] !== this.solution[r][c]) return false;
                }
            }
            return true;
        }

        _handleVictory() {
            this.isWon = true;
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.audio.playVictory();

            // 计算星级与积分
            let stars = 1;
            let ratingTitle = '功德圆满';
            if (this.mistakes === 0 && this.hintsUsed <= 1) {
                stars = 3;
                ratingTitle = '妙算通神';
            } else if (this.mistakes <= 1 && this.hintsUsed <= 2) {
                stars = 2;
                ratingTitle = '心思缜密';
            }

            const baseScoreMap = { easy: 1000, medium: 2000, hard: 3500, expert: 5000 };
            const timeBonus = Math.max(0, 1800 - this.timerSeconds * 2);
            const score = (baseScoreMap[this.difficulty] || 1000) + timeBonus - (this.mistakes * 200) - (this.hintsUsed * 150);

            this.bridge.recordScore(Math.max(500, score));

            if (this.dom.victoryText) {
                const starStr = '⭐'.repeat(stars);
                const m = Math.floor(this.timerSeconds / 60);
                const s = this.timerSeconds % 60;
                this.dom.victoryText.innerHTML = `
                    <div style="font-size: 32px; margin-bottom: 8px; filter: drop-shadow(0 0 12px #fbbf24); letter-spacing: 6px;">${starStr}</div>
                    <div style="font-size: 16px; color: #fbbf24; font-weight: bold; margin-bottom: 12px;">[ ${ratingTitle} ]</div>
                    解谜用时: <strong>${m}分${s}秒</strong> | 失误: <strong>${this.mistakes}</strong> 次<br>
                    终局总分: <strong>${Math.max(500, score)}</strong>
                `;
            }

            this.bridge.emit('LEVEL_COMPLETE', {
                difficulty: this.difficulty,
                stars: stars,
                time: this.timerSeconds,
                mistakes: this.mistakes,
                score: score
            });

            setTimeout(() => {
                if (this.dom.victoryModal) this.dom.victoryModal.classList.add('visible');
            }, 500);
        }

        _handleDefeat() {
            this.isLost = true;
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.bridge.emit('ON_GAME_OVER', { difficulty: this.difficulty, mistakes: this.mistakes });
            setTimeout(() => {
                if (this.dom.defeatModal) this.dom.defeatModal.classList.add('visible');
            }, 600);
        }

        _renderBoard() {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    this._renderCell(r, c);
                }
            }
            this._renderHighlights();
        }

        _renderCell(r, c) {
            const cell = this.dom.grid.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
            if (!cell) return;

            const val = this.board[r][c];
            const isInit = this.initialBoard[r][c];
            const isError = (val !== 0 && val !== this.solution[r][c]);

            const valSpan = cell.querySelector('.cell-value');
            const notesGrid = cell.querySelector('.cell-notes');

            cell.classList.toggle('fixed', isInit);
            cell.classList.toggle('error', isError);

            if (val !== 0) {
                valSpan.textContent = val;
                valSpan.style.display = 'block';
                notesGrid.style.display = 'none';
            } else {
                valSpan.textContent = '';
                valSpan.style.display = 'none';
                notesGrid.style.display = 'grid';

                const cellNotes = this.notes[r][c];
                for (let n = 1; n <= 9; n++) {
                    const noteItem = notesGrid.querySelector(`.note-${n}`);
                    if (noteItem) {
                        noteItem.style.visibility = cellNotes.has(n) ? 'visible' : 'hidden';
                    }
                }
            }
        }

        _renderHighlights() {
            const cells = this.dom.grid.querySelectorAll('.sudoku-cell');
            cells.forEach(c => {
                c.classList.remove('selected', 'highlighted', 'same-number');
            });

            if (!this.selectedCell) return;
            const { r, c } = this.selectedCell;
            const currentVal = this.board[r][c];

            const selCell = this.dom.grid.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
            if (selCell) selCell.classList.add('selected');

            const boxR = Math.floor(r / 3) * 3;
            const boxC = Math.floor(c / 3) * 3;

            cells.forEach(cell => {
                const cr = parseInt(cell.dataset.r, 10);
                const cc = parseInt(cell.dataset.c, 10);

                // 同行、同列、同九宫格高亮
                const sameRow = (cr === r);
                const sameCol = (cc === c);
                const sameBox = (cr >= boxR && cr < boxR + 3 && cc >= boxC && cc < boxC + 3);

                if (sameRow || sameCol || sameBox) {
                    if (!(cr === r && cc === c)) {
                        cell.classList.add('highlighted');
                    }
                }

                // 相同数字全盘点亮
                if (currentVal !== 0 && this.board[cr][cc] === currentVal) {
                    cell.classList.add('same-number');
                }
            });
        }
    }

    window.SudokuGame = SudokuGame;
    window.addEventListener('DOMContentLoaded', () => {
        window.game = new SudokuGame();
    });
})(window);
