/**
 * 🎵 Neon Snake - 纯 WebAudio 赛博合成音效引擎
 * 零外部音频依赖，支持静音同步与连击音阶爬升
 */
(function(window) {
    'use strict';

    class AudioEngine {
        constructor() {
            this.ctx = null;
            this.muted = false;
        }

        _ensureCtx() {
            if (this.muted) return null;
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return null;
                this.ctx = new AudioCtx();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return this.ctx;
        }

        setMuted(muted) {
            this.muted = !!muted;
            if (this.ctx && this.muted) {
                this.ctx.suspend().catch(() => {});
            } else if (this.ctx && !this.muted) {
                this.ctx.resume().catch(() => {});
            }
            return this.muted;
        }

        toggleMute() {
            return this.setMuted(!this.muted);
        }

        _tone(freq, duration, type = 'sine', vol = 0.14, delay = 0, slideTo = null) {
            const ctx = this._ensureCtx();
            if (!ctx) return;
            const now = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (slideTo) {
                osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
            }
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(vol, now + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration + 0.02);
        }

        /** 吃普通能量豆（音高随连击爬升） */
        playEat(combo = 1) {
            if (this.muted) return;
            const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
            const base = scale[Math.min(scale.length - 1, Math.max(0, combo - 1))];
            this._tone(base, 0.11, 'triangle', 0.16, 0, base * 1.25);
            this._tone(base * 1.5, 0.09, 'sine', 0.08, 0.03);
        }

        /** 吃金色超频核（清脆三和弦） */
        playBonus() {
            if (this.muted) return;
            this._tone(659.25, 0.12, 'triangle', 0.16, 0);
            this._tone(880.00, 0.14, 'triangle', 0.16, 0.06);
            this._tone(1318.5, 0.22, 'sine', 0.18, 0.12);
        }

        /** 撞击游戏结束 */
        playGameOver() {
            if (this.muted) return;
            this._tone(240, 0.22, 'sawtooth', 0.14, 0, 110);
            this._tone(140, 0.32, 'sawtooth', 0.12, 0.16, 58);
        }

        /** 切换模式轻提示 */
        playClick() {
            if (this.muted) return;
            this._tone(620, 0.06, 'sine', 0.09, 0, 780);
        }
    }

    window.AudioEngine = AudioEngine;
})(window);
