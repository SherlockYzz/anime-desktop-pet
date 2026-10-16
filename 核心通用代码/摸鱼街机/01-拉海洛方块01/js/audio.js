/**
 * 🔊 AudioEngine - 单例 Web Audio 合成器 (8 音道限流池化 + 手势自解锁)
 * 纯算法生成波形，零外部音频资源依赖，杜绝 404 与 iOS Safari 硬件通道熔断
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

            // 音乐音阶频率表 (Do Re Mi Fa Sol La Si)
            this.CHORD_SCALE = [
                261.63, // C4
                293.66, // D4
                329.63, // E4
                349.23, // F4
                392.00, // G4
                440.00, // A4
                493.88, // B4
                523.25, // C5
                587.33, // D5
                659.25, // E5
                698.46, // F5
                783.99, // G5
                880.00, // A5
                1046.50 // C6
            ];

            this._bindUnlock();
        }

        _getOrCreateContext() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
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

        /**
         * 8 音道并发管理 (Voice-Stealing)
         */
        _acquireVoice(node) {
            // 清理已完成的节点
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
         * 方块吸附与放置音 (柔和低频水滴/落子)
         */
        playPlace() {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);

            const voice = this._acquireVoice(osc);
            osc.start(now);
            osc.stop(now + 0.09);
            osc.onended = () => { voice.active = false; };
        }

        /**
         * 动态五声音阶升调消除音效 (C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6)
         * 达成连击或多行消除时激发出空灵大三和弦琶音
         * @param {number} lines 消除行/列数
         * @param {number} combo 当前连击计数
         */
        playClear(lines = 1, combo = 1) {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            // C大调五声升阶音列 (C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6)
            const PENTATONIC_CHORDS = [
                261.63, // C4
                329.63, // E4
                392.00, // G4
                523.25, // C5
                659.25, // E5
                783.99, // G5
                1046.50 // C6
            ];

            const baseIdx = (Math.max(1, combo) - 1) % PENTATONIC_CHORDS.length;
            const baseFreq = PENTATONIC_CHORDS[baseIdx];

            let notes = [baseFreq];
            // 高连击 (combo >= 2) 或多行消除 (lines >= 2)，激发出大三和弦琶音
            if (combo >= 2 || lines >= 2) {
                const next1 = PENTATONIC_CHORDS[(baseIdx + 1) % PENTATONIC_CHORDS.length];
                const next2 = PENTATONIC_CHORDS[(baseIdx + 2) % PENTATONIC_CHORDS.length];
                notes = [baseFreq, next1, next2];
                if (combo >= 4 || lines >= 3) {
                    notes.push(baseFreq * 2); // 额外高八度共鸣
                }
            }

            notes.forEach((freq, idx) => {
                const t = ctx.currentTime + idx * 0.055;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = combo > 2 ? 'triangle' : 'sine';
                osc.frequency.setValueAtTime(freq, t);

                const dur = 0.25 + lines * 0.05;
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

                osc.connect(gain);
                gain.connect(ctx.destination);

                const voice = this._acquireVoice(osc);
                osc.start(t);
                osc.stop(t + dur + 0.02);
                osc.onended = () => { voice.active = false; };
            });
        }

        /**
         * 游戏结束音 (渐弱哀伤下行音)
         */
        playGameOver() {
            if (this.muted) return;
            const ctx = this._getOrCreateContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            [392.00, 349.23, 293.66, 261.63].forEach((freq, idx) => {
                const t = now + idx * 0.12;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.12, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

                osc.connect(gain);
                gain.connect(ctx.destination);

                const voice = this._acquireVoice(osc);
                osc.start(t);
                osc.stop(t + 0.28);
                osc.onended = () => { voice.active = false; };
            });
        }
    }

    window.AudioEngine = AudioEngine;
})(window);
