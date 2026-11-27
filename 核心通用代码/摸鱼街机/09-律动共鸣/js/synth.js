/**
 * 🎹 SynthEngine - 09-律动共鸣 真实名曲原声与打击反馈引擎
 * 严正声明：背景音乐 100% 播放用户真实 MP3 原声音轨，绝无任何程序化合成 BGM 杂音！
 * 
 * 架构设计规范：
 * 1. 背景音乐：采用纯原生 HTML5 Audio 独立通道（直接输出至系统声卡硬件，严禁调用 createMediaElementSource 劫持，
 *    彻底根除 Chromium/Edge 在 local file:/// 协议下因 CORS 静音的经典漏洞）。
 * 2. 按键反馈：Web Audio API 仅用于按键 (D/F/J/K) 敲击时的极低延迟清脆晶体音效 (PERFECT/GREAT/MISS/FULL COMBO)。
 * 3. 动态光柱：基于乐曲实时时间戳与 BPM 智能脉冲算法生成霓虹频域律动，绝不干扰音频硬件。
 */
(function(window) {
    'use strict';

    class SynthEngine {
        constructor() {
            this.ctx = null;
            this.muted = false;
            this.isMusicPlaying = false;
            this.currentSrc = '';
            this.bpm = 120;
            this.freqData = new Uint8Array(32);

            // 优先复用 DOM 中的 Audio 标签，确保生命周期与视图层绑定且不被垃圾回收
            this.audioEl = document.getElementById('bgm-player') || new Audio();
            this.audioEl.preload = "auto";
            this.audioEl.volume = 1.0;
            this.audioEl.muted = false;

            this._initContext();
            this._bindAudioEvents();
        }

        _initContext() {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                try {
                    this.ctx = new AudioCtx();
                } catch (e) {
                    console.warn('[EchoBeats Synth] AudioContext 初始化提示:', e);
                }
            }
        }

        _bindAudioEvents() {
            this.audioEl.addEventListener('play', () => {
                this.isMusicPlaying = true;
                if (this.ctx && this.ctx.state === 'suspended') {
                    this.ctx.resume().catch(() => {});
                }
                console.log('[EchoBeats Synth] 真实名曲原声开始播放:', this.audioEl.src);
            });

            this.audioEl.addEventListener('playing', () => {
                this.isMusicPlaying = true;
            });

            this.audioEl.addEventListener('pause', () => {
                this.isMusicPlaying = false;
            });

            this.audioEl.addEventListener('ended', () => {
                this.isMusicPlaying = false;
            });

            this.audioEl.addEventListener('error', (e) => {
                console.error('[EchoBeats Synth] 真实音频加载异常:', this.audioEl.src, e);
            });
        }

        setMuted(muted) {
            this.muted = !!muted;
            if (this.audioEl) {
                this.audioEl.muted = this.muted;
            }
            if (this.ctx) {
                if (this.muted) {
                    try { this.ctx.suspend(); } catch(e) {}
                } else {
                    try { this.ctx.resume(); } catch(e) {}
                }
            }
            return this.muted;
        }

        toggleMute() {
            return this.setMuted(!this.muted);
        }

        /**
         * 播放主人真实 MP3 原声歌曲
         * @param {string} src 歌曲路径 (如 "audio/song_01_paper_plane.mp3")
         * @param {number} bpm 歌曲节拍速度
         * @param {function} onEnded 播放结束回调
         */
        playMusic(src, bpm = 120, onEnded = null) {
            this.bpm = bpm;
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }

            // 确保音量为 100%
            this.audioEl.volume = 1.0;
            this.audioEl.muted = this.muted;

            // 检查曲目路径是否改变
            const isDifferent = !this.audioEl.src || !this.audioEl.src.endsWith(src);
            if (isDifferent) {
                this.audioEl.src = src;
                this.currentSrc = src;
                this.audioEl.load();
            }

            try {
                this.audioEl.currentTime = 0;
            } catch (err) {
                // 部分环境未就绪时容错
            }

            const promise = this.audioEl.play();
            if (promise !== undefined) {
                promise.then(() => {
                    this.isMusicPlaying = true;
                    console.log('[EchoBeats Synth] 原声起播成功:', src);
                }).catch(err => {
                    console.warn('[EchoBeats Synth] play() 待用户交互解锁:', err);
                    this.isMusicPlaying = false;
                });
            }

            this.audioEl.onended = () => {
                this.isMusicPlaying = false;
                if (typeof onEnded === 'function') onEnded();
            };
        }

        pauseMusic() {
            if (this.audioEl && !this.audioEl.paused) {
                this.audioEl.pause();
            }
            this.isMusicPlaying = false;
        }

        resumeMusic() {
            if (this.audioEl && this.audioEl.paused && this.audioEl.src) {
                if (this.ctx && this.ctx.state === 'suspended') {
                    this.ctx.resume().catch(() => {});
                }
                this.audioEl.play().catch(() => {});
                this.isMusicPlaying = true;
            }
        }

        stopMusic() {
            if (this.audioEl) {
                this.audioEl.pause();
                try {
                    this.audioEl.currentTime = 0;
                } catch (e) {}
            }
            this.isMusicPlaying = false;
        }

        getMusicTimeMs() {
            if (this.audioEl && this.isMusicPlaying && !isNaN(this.audioEl.currentTime)) {
                return this.audioEl.currentTime * 1000;
            }
            return null;
        }

        /**
         * 实时音频频域频谱 (基于真实乐曲播放时间戳与 BPM 自适应动态律动)
         */
        getAudioSpectrum() {
            if (this.isMusicPlaying && !this.muted) {
                const nowSec = (this.audioEl && !isNaN(this.audioEl.currentTime) && this.audioEl.currentTime > 0)
                    ? this.audioEl.currentTime
                    : performance.now() / 1000;
                const beat = nowSec * (this.bpm / 60);
                const beatPhase = beat % 1;
                const pulse = Math.pow(1 - beatPhase, 2);

                if (!this.freqData) this.freqData = new Uint8Array(32);
                for (let i = 0; i < this.freqData.length; i++) {
                    const wave = Math.sin(nowSec * 8 + i * 0.4) * 0.3 + 0.7;
                    this.freqData[i] = Math.min(255, Math.floor((pulse * 180 + 40) * wave));
                }
                return this.freqData;
            }
            return null;
        }

        // 测试套件向下兼容空实现
        startBGM() {}
        stopBGM() {}

        // 玩家按键敲击反馈音 (仅在按键击中时发出一声清脆的高频晶体音，不影响背景歌曲)
        playHit(isPerfect = true, lane = 0) {
            if (this.muted) return;
            if (!this.ctx) this._initContext();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            const freqs = [523.25, 659.25, 783.99, 1046.50];
            const freq = freqs[lane % freqs.length] * (isPerfect ? 1.0 : 0.95);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + 0.08);

            gain.gain.setValueAtTime(isPerfect ? 0.35 : 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.11);
        }

        playMiss() {
            if (this.muted) return;
            if (!this.ctx) this._initContext();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        }

        playFullCombo() {
            if (this.muted) return;
            if (!this.ctx) this._initContext();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }

            const now = this.ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, now + idx * 0.08);
                gain.gain.setValueAtTime(0.28, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.38);
            });
        }
    }

    window.SynthEngine = SynthEngine;
})(window);
