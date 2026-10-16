/**
 * 🎵 Echo Beats (律动共鸣 · 极意音轨) - 核心节拍音游引擎
 * 严守规范：4 轨下落音轨、毫秒级精准判定（PERFECT/GREAT/MISS）、实时频域频谱背景
 * 完整曲目选择大厅 (Song Selection Hub) + 倒计时发令 + 真实乐曲节拍对齐 + 成绩存档持久化
 */
(function(window) {
    'use strict';

    // 4 轨元素音轨配置 (D / F / J / K)
    const LANES = [
        { id: 0, key: 'D', name: 'pyro', color: '#f43f5e', glow: '#fb7185' },
        { id: 1, key: 'F', name: 'hydro', color: '#00f0ff', glow: '#38bdf8' },
        { id: 2, key: 'J', name: 'electro', color: '#c084fc', glow: '#e879f9' },
        { id: 3, key: 'K', name: 'geo', color: '#fbbf24', glow: '#fcd34d' }
    ];

    // 精选主人专属原声与高燃名曲乐库
    const TRACKS = [
        {
            id: 1,
            title: "纸飞机 (Paper Plane)",
            subtitle: "主人专属原创 · 温暖治愈抒情曲",
            src: "audio/song_01_paper_plane.mp3",
            bpm: 74,
            durationSec: 90,
            speed: 400,
            difficulty: "NORMAL ⭐⭐",
            themeColor: "#00f0ff"
        },
        {
            id: 2,
            title: "碎花 (Broken Flower)",
            subtitle: "主人专属原创 · 极意律动狂想",
            src: "audio/song_02_broken_flower.mp3",
            bpm: 172,
            durationSec: 90,
            speed: 480,
            difficulty: "MASTER ⭐⭐⭐⭐",
            themeColor: "#f43f5e"
        },
        {
            id: 3,
            title: "春拟き (春物MAD钢琴伴奏)",
            subtitle: "主人专属经典 · 青春记忆流光",
            src: "audio/song_03_oregairu_piano.mp3",
            bpm: 144,
            durationSec: 90,
            speed: 430,
            difficulty: "HARD ⭐⭐⭐",
            themeColor: "#fbbf24"
        },
        {
            id: 4,
            title: "月声尽，心灯明",
            subtitle: "东方空灵神曲 · 破晓之光",
            src: "audio/song_04_wuthering_moon.mp3",
            bpm: 152,
            durationSec: 90,
            speed: 450,
            difficulty: "EXPERT ⭐⭐⭐⭐",
            themeColor: "#c084fc"
        }
    ];

    class EchoBeatsGame {
        constructor() {
            this.canvas = document.getElementById('beats-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.synth = new window.SynthEngine();
            this.bridge = new window.UniversalBridge('echo-beats');
            this.bridge.bindGame(this);

            this.currentTrackIdx = 0;
            this.selectedTrackIdx = 0;
            this.inSongSelect = true; // 默认停留在选歌大厅，绝不强制开局

            this.notes = []; // { lane, timeMs, hit, missed }
            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.stats = { perfect: 0, great: 0, miss: 0 };

            this.isPlaying = false;
            this.isPaused = false;
            this.isComplete = false;
            this.songStartTime = 0;
            this.pausedTime = 0;
            this.lastFrameTime = performance.now();

            // 视效与打击
            this.particles = [];
            this.floatingTexts = [];
            this.laneActive = [false, false, false, false];
            this.shake = { intensity: 0, duration: 0, startTime: 0 };

            this._loadSavedProgress();
            this._initDOM();
            this._bindEvents();
            this._resizeCanvas();
            this._renderSongSelectionHub();

            this.animLoop = this.animLoop.bind(this);
            requestAnimationFrame(this.animLoop);

            this.bridge.emit('ON_READY', { game: 'echo-beats' });
        }

        pause() {
            if (this.isPlaying && !this.isPaused) {
                this.isPaused = true;
                this.pausedTime = performance.now();
                this.synth.pauseMusic();
            }
        }

        resume() {
            if (this.isPlaying && this.isPaused) {
                this.isPaused = false;
                const pauseDelta = performance.now() - this.pausedTime;
                this.songStartTime += pauseDelta;
                this.synth.resumeMusic();
            }
        }

        restart() {
            this._startTrack(this.currentTrackIdx);
        }

        switchTrack(idx) {
            if (idx >= TRACKS.length) idx = 0;
            if (idx < 0) idx = TRACKS.length - 1;
            this.selectedTrackIdx = idx;
            this._startCountdownAndPlay(idx);
        }

        _loadSavedProgress() {
            const saved = this.bridge.loadProgress({ track: 0 });
            if (saved && typeof saved.track === 'number' && saved.track >= 0 && saved.track < TRACKS.length) {
                this.currentTrackIdx = saved.track;
                this.selectedTrackIdx = saved.track;
            }
        }

        _initDOM() {
            this.dom = {
                songSelectScreen: document.getElementById('song-select-screen'),
                songListContainer: document.getElementById('song-list-container'),
                btnStartPlay: document.getElementById('btn-start-play'),
                countdownOverlay: document.getElementById('countdown-overlay'),
                countdownNum: document.getElementById('countdown-num'),
                btnOpenSelect: document.getElementById('btn-open-select'),
                hudTrackBtn: document.getElementById('hud-track-btn'),
                btnModalSelect: document.getElementById('btn-modal-select'),
                btnHubMute: document.getElementById('btn-hub-mute'),
                btnHubHelp: document.getElementById('btn-hub-help'),
                trackVal: document.getElementById('track-label-val'),
                comboVal: document.getElementById('combo-val'),
                accVal: document.getElementById('acc-val'),
                scoreVal: document.getElementById('score-val'),
                pads: [
                    document.getElementById('pad-0'),
                    document.getElementById('pad-1'),
                    document.getElementById('pad-2'),
                    document.getElementById('pad-3')
                ],
                btnRestart: document.getElementById('btn-restart'),
                btnMute: document.getElementById('btn-mute'),
                btnHelp: document.getElementById('btn-help'),
                btnCloseHelp: document.getElementById('btn-close-help'),
                btnNextModal: document.getElementById('btn-next-modal'),
                victoryModal: document.getElementById('victory-modal'),
                helpModal: document.getElementById('help-modal')
            };
        }

        _bindEvents() {
            window.addEventListener('resize', () => this._resizeCanvas());

            const keyToLane = {
                'd': 0, 'D': 0,
                'f': 1, 'F': 1,
                'j': 2, 'J': 2,
                'k': 3, 'K': 3
            };

            window.addEventListener('keydown', (e) => {
                if (this.inSongSelect) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        this._startCountdownAndPlay(this.selectedTrackIdx);
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        this.selectedTrackIdx = (this.selectedTrackIdx + TRACKS.length - 1) % TRACKS.length;
                        this._renderSongSelectionHub();
                    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        this.selectedTrackIdx = (this.selectedTrackIdx + 1) % TRACKS.length;
                        this._renderSongSelectionHub();
                    }
                    return;
                }

                if (keyToLane[e.key] !== undefined) {
                    e.preventDefault();
                    const lane = keyToLane[e.key];
                    this._triggerHit(lane);
                    this._setLaneActive(lane, true);
                } else if (e.key === 'r' || e.key === 'R') {
                    this.restart();
                } else if (e.key === '?' || e.key === 'h' || e.key === 'H') {
                    this.showHelp(true);
                } else if (e.key === 'Escape') {
                    this._openSongSelectHub();
                }
            });

            window.addEventListener('keyup', (e) => {
                if (keyToLane[e.key] !== undefined) {
                    const lane = keyToLane[e.key];
                    this._setLaneActive(lane, false);
                }
            });

            // 底部 4 个触控打击垫
            this.dom.pads.forEach((pad, lane) => {
                if (!pad) return;
                const press = (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this._triggerHit(lane);
                    this._setLaneActive(lane, true);
                };
                const release = (evt) => {
                    evt.preventDefault();
                    this._setLaneActive(lane, false);
                };
                pad.addEventListener('pointerdown', press);
                pad.addEventListener('pointerup', release);
                pad.addEventListener('pointercancel', release);
                pad.addEventListener('pointerleave', release);
            });

            // 画布直接点击判定对应四分之一象限
            this.canvas.addEventListener('pointerdown', (e) => {
                if (this.inSongSelect) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = this.canvas.getBoundingClientRect();
                const px = (e.clientX - rect.left) * (this.viewW / rect.width);
                const laneW = this.viewW / 4;
                const lane = Math.min(3, Math.max(0, Math.floor(px / laneW)));
                this._triggerHit(lane);
                this._setLaneActive(lane, true);
                setTimeout(() => this._setLaneActive(lane, false), 100);
            });

            // 选歌大厅交互
            if (this.dom.btnStartPlay) {
                this.dom.btnStartPlay.addEventListener('click', () => {
                    this._startCountdownAndPlay(this.selectedTrackIdx);
                });
            }

            if (this.dom.btnOpenSelect) {
                this.dom.btnOpenSelect.addEventListener('click', () => this._openSongSelectHub());
            }

            if (this.dom.hudTrackBtn) {
                this.dom.hudTrackBtn.addEventListener('click', () => this._openSongSelectHub());
            }

            if (this.dom.btnModalSelect) {
                this.dom.btnModalSelect.addEventListener('click', () => this._openSongSelectHub());
            }

            // 静音按键统一代理
            const toggleMute = () => {
                const muted = this.synth.toggleMute();
                if (this.dom.btnMute) this.dom.btnMute.textContent = muted ? '🔇' : '🔊';
                if (this.dom.btnHubMute) this.dom.btnHubMute.textContent = muted ? '🔇' : '🔊';
            };
            if (this.dom.btnMute) this.dom.btnMute.addEventListener('click', toggleMute);
            if (this.dom.btnHubMute) this.dom.btnHubMute.addEventListener('click', toggleMute);

            if (this.dom.btnHelp) this.dom.btnHelp.addEventListener('click', () => this.showHelp(true));
            if (this.dom.btnHubHelp) this.dom.btnHubHelp.addEventListener('click', () => this.showHelp(true));
            if (this.dom.btnCloseHelp) this.dom.btnCloseHelp.addEventListener('click', () => this.showHelp(false));

            if (this.dom.btnRestart) this.dom.btnRestart.addEventListener('click', () => this.restart());

            if (this.dom.btnNextModal) {
                this.dom.btnNextModal.addEventListener('click', () => {
                    this._hideModals();
                    this.switchTrack(this.currentTrackIdx + 1);
                });
            }

            // 任意处首击唤醒试听机制 (适配现代浏览器 Autoplay 策略)
            const handleFirstGesture = () => {
                if (this.inSongSelect && !this.synth.isMusicPlaying && !this.synth.muted) {
                    const track = TRACKS[this.selectedTrackIdx];
                    if (track) {
                        this.synth.playMusic(track.src, track.bpm);
                        this._renderSongSelectionHub();
                    }
                }
            };
            window.addEventListener('pointerdown', handleFirstGesture, { once: true });
        }

        /**
         * 渲染选歌大厅卡片列表
         */
        _renderSongSelectionHub() {
            if (!this.dom.songListContainer) return;
            this.dom.songListContainer.innerHTML = '';

            TRACKS.forEach((track, idx) => {
                const isSelected = (idx === this.selectedTrackIdx);
                const isPlayingThis = (isSelected && this.synth.isMusicPlaying);
                const record = window.SafeStorage.get(`echo_beats_track_${track.id}`, { score: 0, rank: '-', acc: 0 });

                const card = document.createElement('div');
                card.className = `song-card ${isSelected ? 'selected' : ''} ${isPlayingThis ? 'playing' : ''}`;
                card.dataset.idx = idx;

                const statusTag = isPlayingThis
                    ? `<span class="playing-pulse-badge">🔊 正在试听原声</span>`
                    : (isSelected
                        ? `<span class="tag-badge" style="background: rgba(236,72,153,0.25); color: #ec4899; border: 1px solid #ec4899;">已选定 (点击试听)</span>`
                        : `<span class="tag-badge" style="opacity: 0.65;">点击挑选试听</span>`);

                card.innerHTML = `
                    <div class="song-card-header">
                        <div>
                            <div class="song-card-title">${track.title}</div>
                            <div class="song-card-subtitle">${track.subtitle}</div>
                        </div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: ${record.rank === 'SSS' || record.rank === 'SS' ? '#fbbf24' : '#00f0ff'};">
                            ${record.rank !== '-' ? record.rank : ''}
                        </div>
                    </div>
                    <div class="song-card-tags">
                        <span class="tag-badge tag-bpm">BPM ${track.bpm}</span>
                        <span class="tag-badge tag-diff">${track.difficulty}</span>
                        <span class="tag-badge" style="background: rgba(255,255,255,0.08); color: #cbd5e1;">时值 ${track.durationSec}s</span>
                        ${statusTag}
                    </div>
                    <div class="song-card-record">
                        <span>最佳得分: <strong>${record.score}</strong></span>
                        <span>最高准度: <strong>${record.acc}%</strong></span>
                    </div>
                `;

                card.addEventListener('click', () => {
                    const wasSelected = (this.selectedTrackIdx === idx);
                    this.selectedTrackIdx = idx;

                    if (wasSelected && this.synth.isMusicPlaying) {
                        // 再次点击正在试听的卡片：暂停试听
                        this.synth.pauseMusic();
                    } else {
                        // 播放对应原声音轨
                        this.synth.playMusic(track.src, track.bpm, () => {
                            if (this.inSongSelect) {
                                // 试听结束自动重新播放，维持大厅动感氛围
                                this.synth.playMusic(track.src, track.bpm);
                            }
                        });
                    }
                    this._renderSongSelectionHub();
                });

                this.dom.songListContainer.appendChild(card);
            });
        }

        _openSongSelectHub() {
            this.synth.stopMusic();
            this.isPlaying = false;
            this.isPaused = false;
            this.inSongSelect = true;
            this._hideModals();

            if (this.dom.songSelectScreen) {
                this.dom.songSelectScreen.classList.remove('hidden');
            }
            this._renderSongSelectionHub();
        }

        _startCountdownAndPlay(idx) {
            if (idx < 0) idx = 0;
            if (idx >= TRACKS.length) idx = TRACKS.length - 1;
            this.currentTrackIdx = idx;
            this.selectedTrackIdx = idx;
            const track = TRACKS[idx];

            this.inSongSelect = false;
            if (this.dom.songSelectScreen) {
                this.dom.songSelectScreen.classList.add('hidden');
            }

            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.stats = { perfect: 0, great: 0, miss: 0 };
            this.isComplete = false;
            this.isPaused = false;
            this.particles = [];
            this.floatingTexts = [];

            // 生成与歌曲真实节拍严格锁定的音乐谱面
            this._generateMusicalChart(track);
            this._resizeCanvas();
            this._updateHUD();
            this._hideModals();

            // 核心：在玩家点击事件上下文中立即播放真实 MP3，彻底杜绝浏览器 Autoplay 拦截！
            this.songStartTime = performance.now();
            this.isPlaying = true;
            this.synth.playMusic(track.src, track.bpm, () => {
                this._handleTrackComplete();
            });

            this.bridge.saveProgress({ track: this.currentTrackIdx });

            // 视觉 3-2-1 倒计时发令覆盖层
            if (this.dom.countdownOverlay && this.dom.countdownNum) {
                this.dom.countdownOverlay.classList.add('visible');
                let count = 3;
                this.dom.countdownNum.textContent = count;
                this.synth.playHit(false, 0);

                const timer = setInterval(() => {
                    count--;
                    if (count > 0) {
                        this.dom.countdownNum.textContent = count;
                        this.synth.playHit(false, 3 - count);
                    } else if (count === 0) {
                        this.dom.countdownNum.textContent = 'GO!';
                        this.synth.playHit(true, 3);
                    } else {
                        clearInterval(timer);
                        this.dom.countdownOverlay.classList.remove('visible');
                    }
                }, 400);
            }
        }

        _setLaneActive(lane, active) {
            this.laneActive[lane] = active;
            if (this.dom.pads[lane]) {
                if (active) this.dom.pads[lane].classList.add('active');
                else this.dom.pads[lane].classList.remove('active');
            }
        }

        _startTrack(idx) {
            this._startCountdownAndPlay(idx);
        }

        /**
         * 严格依节拍律动与真实 MP3 波形打击点编排谱面
         */
        _generateMusicalChart(track) {
            // 优先加载从真实 MP3 提取的高精度波形鼓点打击谱面
            if (window.RAW_BEATMAPS && window.RAW_BEATMAPS[track.id]) {
                this.notes = window.RAW_BEATMAPS[track.id].map(n => ({
                    lane: n.lane,
                    timeMs: n.timeMs,
                    hit: false,
                    missed: false
                }));
                return;
            }

            this.notes = [];
            const beatSec = 60 / track.bpm;
            const totalBeats = Math.floor(track.durationSec / beatSec);

            // 前 4 拍对应 3-2-1-GO 发令期 (约 1.6~2 秒)，从第 4 拍开始落下击打音符
            let prevLane = 1;
            for (let b = 4; b < totalBeats; b++) {
                const timeMs = b * beatSec * 1000;
                const measure = Math.floor(b / 4);
                const beatInMeasure = b % 4;

                // 1. 前奏区 (0 ~ 4 小节)
                if (measure < 4) {
                    if (beatInMeasure === 0 || beatInMeasure === 2) {
                        const lane = (beatInMeasure === 0) ? 0 : 3;
                        this.notes.push({ lane, timeMs, hit: false, missed: false });
                    }
                }
                // 2. 主歌段 (4 ~ 12 小节)
                else if (measure < 12) {
                    let lane = (prevLane + (b % 3 === 0 ? 2 : 1)) % 4;
                    this.notes.push({ lane, timeMs, hit: false, missed: false });
                    prevLane = lane;

                    if (beatInMeasure === 2) {
                        this.notes.push({
                            lane: (lane + 2) % 4,
                            timeMs: timeMs + (beatSec * 0.5) * 1000,
                            hit: false,
                            missed: false
                        });
                    }
                }
                // 3. 副歌预备 (12 ~ 16 小节)
                else if (measure < 16) {
                    const lane = (b % 4);
                    this.notes.push({ lane, timeMs, hit: false, missed: false });
                    if (b % 2 === 1) {
                        this.notes.push({
                            lane: (3 - lane),
                            timeMs: timeMs + (beatSec * 0.5) * 1000,
                            hit: false,
                            missed: false
                        });
                    }
                }
                // 4. 极意高潮段 (16 小节至结束)
                else {
                    const lane = (b % 2 === 0) ? (b % 4) : ((prevLane + 1) % 4);
                    this.notes.push({ lane, timeMs, hit: false, missed: false });
                    prevLane = lane;

                    if (beatInMeasure === 0 || beatInMeasure === 2) {
                        const oppLane = (lane + 2) % 4;
                        this.notes.push({ lane: oppLane, timeMs, hit: false, missed: false });
                    } else if (beatInMeasure === 3) {
                        this.notes.push({
                            lane: (lane + 1) % 4,
                            timeMs: timeMs + (beatSec * 0.5) * 1000,
                            hit: false,
                            missed: false
                        });
                    }
                }
            }

            this.notes.sort((a, b) => a.timeMs - b.timeMs);
        }

        _triggerHit(lane) {
            if (!this.isPlaying || this.isPaused || this.isComplete) return;

            const currentSongTimeMs = this._getCurrentSongTimeMs();

            let bestNote = null;
            let minDiff = Infinity;

            for (let i = 0; i < this.notes.length; i++) {
                const n = this.notes[i];
                if (n.lane === lane && !n.hit && !n.missed) {
                    const diff = Math.abs(n.timeMs - currentSongTimeMs);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestNote = n;
                    }
                }
            }

            if (bestNote && minDiff <= 125) {
                bestNote.hit = true;
                const isPerfect = (minDiff <= 45);

                if (isPerfect) {
                    this.stats.perfect++;
                    this.combo++;
                    this.score += Math.round(100 * (1 + Math.min(this.combo, 50) * 0.05));
                    this._spawnHitFeedback(lane, 'PERFECT', '#00f0ff');
                    this.synth.playHit(true, lane);
                } else {
                    this.stats.great++;
                    this.combo++;
                    this.score += Math.round(60 * (1 + Math.min(this.combo, 50) * 0.03));
                    this._spawnHitFeedback(lane, 'GREAT', '#fbbf24');
                    this.synth.playHit(false, lane);
                }

                if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                this.bridge.vibrate(isPerfect ? 18 : 30);
                this._shakeScreen(isPerfect ? 3 : 2, 80);
            } else {
                this.synth.playHit(false, lane);
            }

            this._updateHUD();
        }

        _getCurrentSongTimeMs() {
            const musicTime = this.synth.getMusicTimeMs();
            if (musicTime !== null) {
                return musicTime;
            }
            return performance.now() - this.songStartTime;
        }

        _spawnHitFeedback(lane, text, color) {
            const laneW = this.viewW / 4;
            const cx = lane * laneW + laneW / 2;
            const cy = this.viewH * 0.88;

            this.floatingTexts.push({
                text,
                color,
                x: cx,
                y: cy - 25,
                vy: -1.8,
                alpha: 1.0,
                scale: 1.3
            });

            for (let i = 0; i < 14; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2.0 + Math.random() * 5.5;
                this.particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.2,
                    color: color,
                    size: 2.5 + Math.random() * 3.5,
                    alpha: 1.0,
                    decay: 0.02 + Math.random() * 0.03
                });
            }
        }

        _shakeScreen(intensity, durationMs) {
            this.shake = {
                intensity,
                duration: durationMs,
                startTime: performance.now()
            };
        }

        _resizeCanvas() {
            const container = this.canvas.parentElement;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.viewW = rect.width;
            this.viewH = rect.height;

            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        _updateHUD() {
            const track = TRACKS[this.currentTrackIdx];
            if (this.dom.trackVal) {
                this.dom.trackVal.textContent = track.title;
            }
            if (this.dom.comboVal) {
                this.dom.comboVal.textContent = this.combo;
                this.dom.comboVal.style.color = this.combo > 20 ? '#fbbf24' : '#00f0ff';
            }
            if (this.dom.accVal) {
                const totalNotes = this.stats.perfect + this.stats.great + this.stats.miss;
                const acc = totalNotes > 0 
                    ? (((this.stats.perfect * 100) + (this.stats.great * 65)) / (totalNotes * 100) * 100).toFixed(1) 
                    : '100.0';
                this.dom.accVal.textContent = `${acc}%`;
            }
            if (this.dom.scoreVal) {
                this.dom.scoreVal.textContent = this.score;
            }
        }

        _hideModals() {
            if (this.dom.victoryModal) this.dom.victoryModal.classList.remove('visible');
            if (this.dom.helpModal) this.dom.helpModal.classList.remove('visible');
        }

        showHelp(show = true) {
            if (this.dom.helpModal) {
                if (show) this.dom.helpModal.classList.add('visible');
                else this.dom.helpModal.classList.remove('visible');
            }
        }

        _handleTrackComplete() {
            if (this.isComplete) return;
            this.isComplete = true;
            this.isPlaying = false;
            this.synth.stopMusic();

            const track = TRACKS[this.currentTrackIdx];
            const total = this.stats.perfect + this.stats.great + this.stats.miss;
            const acc = total > 0 ? (((this.stats.perfect * 100) + (this.stats.great * 65)) / (total * 100) * 100) : 0;

            let stars = 1;
            let rank = 'B';
            let title = '功德圆满';
            if (acc >= 94 || (this.stats.miss === 0 && acc >= 90)) {
                stars = 3;
                rank = this.stats.miss === 0 ? 'SSS' : 'SS';
                title = '极意破晓';
                this.synth.playFullCombo();
            } else if (acc >= 80) {
                stars = 2;
                rank = 'S';
                title = '声动九霄';
            }

            this.bridge.recordScore(this.score);

            // 保存单曲纪录
            const prev = window.SafeStorage.get(`echo_beats_track_${track.id}`, { score: 0 });
            if (this.score > prev.score) {
                window.SafeStorage.set(`echo_beats_track_${track.id}`, {
                    score: this.score,
                    rank: rank,
                    acc: acc.toFixed(1)
                });
            }

            const payload = {
                track: track.title,
                score: this.score,
                acc: acc.toFixed(1),
                maxCombo: this.maxCombo,
                stars: stars,
                rank: rank
            };
            this.bridge.emit('LEVEL_COMPLETE', payload);

            const textEl = document.getElementById('victory-stat-text');
            if (textEl) {
                const starStr = '⭐'.repeat(stars);
                textEl.innerHTML = `
                    <div style="font-size: 32px; margin-bottom: 8px; filter: drop-shadow(0 0 12px #fbbf24); letter-spacing: 6px;">${starStr}</div>
                    <div style="font-size: 26px; color: #00f0ff; font-weight: 800; margin-bottom: 4px;">RANK ${rank}</div>
                    <div style="font-size: 14px; color: #fbbf24; font-weight: bold; margin-bottom: 12px;">[ ${title} ]</div>
                    曲目: <strong>${track.title}</strong><br>
                    终局得分: <strong>${this.score}</strong> | 准度: <strong>${acc.toFixed(1)}%</strong><br>
                    最大连击: <strong>${this.maxCombo}</strong> | PERFECT: <strong>${this.stats.perfect}</strong>
                `;
            }

            setTimeout(() => {
                if (this.dom.victoryModal) this.dom.victoryModal.classList.add('visible');
            }, 600);
        }

        // 动画渲染主循环
        animLoop(timestamp) {
            const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
            this.lastFrameTime = timestamp;

            if (this.isPlaying && !this.isPaused && !this.isComplete) {
                this._updateGameLogic();
            }

            this._render(dt);
            requestAnimationFrame(this.animLoop);
        }

        _updateGameLogic() {
            const songTimeMs = this._getCurrentSongTimeMs();
            const track = TRACKS[this.currentTrackIdx];

            for (let i = 0; i < this.notes.length; i++) {
                const n = this.notes[i];
                if (!n.hit && !n.missed) {
                    if (songTimeMs - n.timeMs > 130) {
                        n.missed = true;
                        this.stats.miss++;
                        this.combo = 0;
                        this._spawnHitFeedback(n.lane, 'MISS', '#f43f5e');
                        this.synth.playMiss();
                        this._updateHUD();
                    }
                }
            }

            if (songTimeMs >= track.durationSec * 1000) {
                this._handleTrackComplete();
            }
        }

        _render(dt) {
            const ctx = this.ctx;
            const w = this.viewW;
            const h = this.viewH;

            ctx.clearRect(0, 0, w, h);

            ctx.save();
            const now = performance.now();
            if (now - this.shake.startTime < this.shake.duration) {
                const progress = (now - this.shake.startTime) / this.shake.duration;
                const curIntensity = this.shake.intensity * (1 - progress);
                const ox = (Math.random() - 0.5) * curIntensity * 2;
                const oy = (Math.random() - 0.5) * curIntensity * 2;
                ctx.translate(ox, oy);
            }

            this._renderAudioSpectrum(ctx, w, h);
            this._renderLanes(ctx, w, h);
            this._renderNotes(ctx, w, h);
            this._renderJudgeLine(ctx, w, h);
            this._renderEffects(ctx, dt);

            ctx.restore();
        }

        _renderAudioSpectrum(ctx, w, h) {
            const spectrum = this.synth.getAudioSpectrum();
            if (!spectrum) return;

            const barCount = 28;
            const barWidth = w / barCount;
            const maxH = h * 0.35;

            ctx.save();
            for (let i = 0; i < barCount; i++) {
                const val = spectrum[i % spectrum.length] / 255;
                const barH = val * maxH;
                const x = i * barWidth;
                const y = h - barH;

                const grad = ctx.createLinearGradient(0, y, 0, h);
                grad.addColorStop(0, 'rgba(0, 240, 255, 0.28)');
                grad.addColorStop(1, 'rgba(168, 85, 247, 0.02)');

                ctx.fillStyle = grad;
                ctx.fillRect(x + 1, y, barWidth - 2, barH);
            }
            ctx.restore();
        }

        _renderLanes(ctx, w, h) {
            const laneW = w / 4;
            for (let i = 0; i < 4; i++) {
                const x = i * laneW;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();

                if (this.laneActive[i]) {
                    const grad = ctx.createLinearGradient(0, h * 0.5, 0, h);
                    grad.addColorStop(0, 'rgba(0, 240, 255, 0.0)');
                    grad.addColorStop(1, 'rgba(0, 240, 255, 0.22)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(x, 0, laneW, h);
                }
            }
        }

        _renderNotes(ctx, w, h) {
            const songTimeMs = this._getCurrentSongTimeMs();
            const track = TRACKS[this.currentTrackIdx];
            const speed = track.speed;
            const judgeY = h * 0.88;
            const laneW = w / 4;

            for (let i = 0; i < this.notes.length; i++) {
                const n = this.notes[i];
                if (n.hit || n.missed) continue;

                const timeDiffSec = (n.timeMs - songTimeMs) / 1000;
                const y = judgeY - timeDiffSec * speed;

                if (y < -40 || y > h + 40) continue;

                const x = n.lane * laneW + 6;
                const noteW = laneW - 12;
                const noteH = 18;

                const laneCfg = LANES[n.lane];
                ctx.save();
                ctx.fillStyle = laneCfg.color;
                ctx.shadowColor = laneCfg.glow;
                ctx.shadowBlur = 12;

                ctx.beginPath();
                ctx.roundRect(x, y - noteH / 2, noteW, noteH, 6);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.roundRect(x + 4, y - noteH / 2 + 2, noteW - 8, 4, 2);
                ctx.fill();

                ctx.restore();
            }
        }

        _renderJudgeLine(ctx, w, h) {
            const judgeY = h * 0.88;
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, judgeY);
            ctx.lineTo(w, judgeY);
            ctx.stroke();
            ctx.restore();
        }

        _renderEffects(ctx, dt) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15;
                p.alpha -= p.decay;
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const t = this.floatingTexts[i];
                t.y += t.vy;
                t.alpha -= 0.025;
                if (t.alpha <= 0) {
                    this.floatingTexts.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = t.alpha;
                ctx.fillStyle = t.color;
                ctx.font = 'bold 22px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.shadowColor = t.color;
                ctx.shadowBlur = 10;
                ctx.fillText(t.text, t.x, t.y);
                ctx.restore();
            }
        }
    }

    window.EchoBeatsGame = EchoBeatsGame;
    window.addEventListener('DOMContentLoaded', () => {
        window.game = new EchoBeatsGame();
    });
})(window);
