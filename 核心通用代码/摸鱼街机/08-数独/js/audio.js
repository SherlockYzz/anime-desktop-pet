/**
 * 🔊 AudioEngine - 08-数独 (Sudoku)
 * 纯 Web Audio API 程序化高品质声效合成器 (零外部音频文件依赖)
 */
(function(window) {
    'use strict';

    class AudioEngine {
        constructor() {
            this.ctx = null;
            this.muted = false;
            this.masterGain = null;
        }

        _init() {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                    this.masterGain = this.ctx.createGain();
                    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.25, this.ctx.currentTime);
                    this.masterGain.connect(this.ctx.destination);
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            if (this.masterGain && this.ctx) {
                this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.25, this.ctx.currentTime);
            }
            return this.muted;
        }

        setMuted(val) {
            this.muted = !!val;
            if (this.masterGain && this.ctx) {
                this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.25, this.ctx.currentTime);
            }
        }

        playTap(num = 1) {
            if (this.muted) return;
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // 1~9 对应清晰明快的上行音阶 (C4 ~ D5)
            const baseFreq = 261.63;
            const scale = [1, 1.122, 1.259, 1.334, 1.498, 1.681, 1.887, 2.0, 2.245];
            const idx = Math.max(0, Math.min(8, (num || 1) - 1));
            const freq = baseFreq * scale[idx];

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.95, now + 0.08);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.09);
        }

        playPencil() {
            if (this.muted) return;
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(780, now);
            osc.frequency.exponentialRampToValueAtTime(450, now + 0.04);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.05);
        }

        playErase() {
            if (this.muted) return;
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.09);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.1);
        }

        playError() {
            if (this.muted) return;
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.18);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.19);
        }

        playHint() {
            if (this.muted) return;
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            [659.25, 987.77].forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const t = now + i * 0.09;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, t);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.23);
            });
        }

        playVictory() {
            if (this.muted) return;
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const noteTime = now + idx * 0.1;

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.35, noteTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

                osc.connect(gain);
                gain.connect(this.masterGain);

                osc.start(noteTime);
                osc.stop(noteTime + 0.48);
            });
        }
    }

    window.AudioEngine = AudioEngine;
})(window);
