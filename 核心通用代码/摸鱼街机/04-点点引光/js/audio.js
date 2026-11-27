/**
 * 🔊 AudioEngine - 点点引光 (Flow Link) 纯程序合成音效
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
                if (oldest?.stop) {
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
         * 划线步进音 (短促微鸣)
         */
        playStep(freq = 440) {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(ctx.destination);

            const voice = this._acquireVoice(osc);
            osc.start(now);
            osc.stop(now + 0.05);
            osc.onended = () => { voice.active = false; };
        }

        /**
         * 单条回路合拢通电音 (清脆叮咚)
         */
        playConnect() {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            [523.25, 659.25].forEach((freq, idx) => {
                const t = now + idx * 0.06;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.18, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);

                const voice = this._acquireVoice(osc);
                osc.start(t);
                osc.stop(t + 0.16);
                osc.onended = () => { voice.active = false; };
            });
        }

        /**
         * 全盘 100% 连通通关八音盒
         */
        playVictory() {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const t = now + idx * 0.08;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.22, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

                osc.connect(gain);
                gain.connect(ctx.destination);

                const voice = this._acquireVoice(osc);
                osc.start(t);
                osc.stop(t + 0.38);
                osc.onended = () => { voice.active = false; };
            });
        }
    }

    window.AudioEngine = AudioEngine;
})(window);
