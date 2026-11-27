/**
 * 🔊 AudioEngine - 溢彩画 (Chroma Paint) 专用 Web Audio 合成器
 * 8 声道池化 + 空灵水墨水滴音阶 + 零外部静态音频依赖
 */
(function(window) {
    'use strict';

    class AudioEngine {
        constructor() {
            this.ctx = null;
            this.isUnlocked = false;
            this.muted = false;
            this.maxVoices = 8;
            this.activeVoices = [];

            // 东方空灵五音阶 (宫商角徵羽)
            this.SCALES = [
                392.00, // G4 (徵)
                440.00, // A4 (羽)
                523.25, // C5 (宫)
                587.33, // D5 (商)
                659.25  // E5 (角)
            ];

            this._bindUnlock();
        }

        _getOrCreateContext() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return this.ctx;
        }

        _bindUnlock() {
            const unlockHandler = () => {
                const ctx = this._getOrCreateContext();
                if (ctx && ctx.state === 'running') {
                    this.isUnlocked = true;
                    ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
                        window.removeEventListener(evt, unlockHandler);
                    });
                }
            };
            ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
                window.addEventListener(evt, unlockHandler, { passive: true, once: false });
            });
        }

        _acquireVoice(node) {
            this.activeVoices = this.activeVoices.filter(v => v.active);
            if (this.activeVoices.length >= this.maxVoices) {
                const oldest = this.activeVoices.shift();
                if (oldest && oldest.stop) {
                    try { oldest.stop(); } catch(e) {}
                }
            }
            const voice = { active: true, stop: () => {
                try { node.stop(); } catch(e) {}
                voice.active = false;
            }};
            this.activeVoices.push(voice);
            return voice;
        }

        setMuted(muted) {
            this.muted = !!muted;
            if (this.ctx && this.muted) {
                try { this.ctx.suspend(); } catch(e) {}
            } else if (this.ctx && !this.muted) {
                try { this.ctx.resume(); } catch(e) {}
            }
        }

        toggleMute() {
            this.setMuted(!this.muted);
            return this.muted;
        }

        /**
         * 水墨涟漪染色水滴音 (Sine + 柔和指数下跌)
         */
        playDrop(colorIdx = 0) {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const baseFreq = this.SCALES[colorIdx % this.SCALES.length] || 523.25;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * 1.5, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.12);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);

            const voice = this._acquireVoice(osc);
            osc.start(now);
            osc.stop(now + 0.2);
            osc.onended = () => { voice.active = false; };
        }

        /**
         * 撤销回退音效 (轻盈向上滑音)
         */
        playUndo() {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(560, now + 0.08);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);

            const voice = this._acquireVoice(osc);
            osc.start(now);
            osc.stop(now + 0.09);
            osc.onended = () => { voice.active = false; };
        }

        /**
         * 通关和弦音效 (空灵大三和弦琶音)
         */
        playVictory() {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            chord.forEach((freq, idx) => {
                const t = now + idx * 0.08;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

                osc.connect(gain);
                gain.connect(ctx.destination);

                const voice = this._acquireVoice(osc);
                osc.start(t);
                osc.stop(t + 0.5);
                osc.onended = () => { voice.active = false; };
            });
        }

        /**
         * 步数告罄失败音效
         */
        playDefeat() {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            [392.00, 369.99, 329.63].forEach((freq, idx) => {
                const t = now + idx * 0.12;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.14, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

                osc.connect(gain);
                gain.connect(ctx.destination);

                const voice = this._acquireVoice(osc);
                osc.start(t);
                osc.stop(t + 0.3);
                osc.onended = () => { voice.active = false; };
            });
        }
    }

    window.AudioEngine = AudioEngine;
})(window);
