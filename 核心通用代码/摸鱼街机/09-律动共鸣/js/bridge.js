/**
 * 🌉 UniversalBridge - 工业级统一宿主接入桥接器与安全沙盒存储
 * 09-律动共鸣 (Echo Beats) 专用通信适配层
 */
(function(window) {
    'use strict';

    const SafeStorage = {
        _mem: {},
        get(key, fallback = null) {
            try {
                const val = localStorage.getItem(key);
                return val !== null ? JSON.parse(val) : fallback;
            } catch (e) {
                return this._mem[key] !== undefined ? this._mem[key] : fallback;
            }
        },
        set(key, val) {
            try {
                localStorage.setItem(key, JSON.stringify(val));
            } catch (e) {
                this._mem[key] = val;
            }
        }
    };

    class UniversalBridge {
        constructor(gameId = 'echo-beats') {
            this.gameId = gameId;
            this.callbacks = {};
            this.gameInstance = null;

            this._initMessageListener();
        }

        bindGame(instance) {
            this.gameInstance = instance;
        }

        _initMessageListener() {
            window.addEventListener('message', (event) => {
                const data = event.data;
                if (!data || (data.type !== 'GAME_CONTROL' && data.type !== 'HOST_COMMAND')) return;

                const command = data.action || data.event || data.cmd;
                switch (command) {
                    case 'PAUSE':
                        if (this.gameInstance?.pause) this.gameInstance.pause();
                        break;
                    case 'RESUME':
                        if (this.gameInstance?.resume) this.gameInstance.resume();
                        break;
                    case 'RESTART':
                        if (this.gameInstance?.restart) this.gameInstance.restart();
                        break;
                    case 'SET_MUTE':
                        if (this.gameInstance?.synth) {
                            this.gameInstance.synth.setMuted(!!data.payload?.muted);
                        }
                        break;
                }
            });
        }

        emit(name, payload = {}) {
            const message = {
                type: 'GAME_EVENT',
                gameId: this.gameId,
                event: name,
                action: name,
                payload: payload,
                timestamp: Date.now()
            };

            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage(message, '*');
                }
            } catch (e) {}

            if (this.callbacks[name]) {
                this.callbacks[name].forEach(cb => {
                    try { cb(payload); } catch(err) { console.error(err); }
                });
            }
        }

        recordScore(score) {
            const high = SafeStorage.get(`${this.gameId}_high_score`, 0);
            if (score > high) {
                SafeStorage.set(`${this.gameId}_high_score`, score);
                this.emit('ON_NEW_HIGH_SCORE', { currentScore: score, highScore: score });
            }
        }

        getHighScore() {
            return SafeStorage.get(`${this.gameId}_high_score`, 0);
        }

        saveProgress(data) {
            SafeStorage.set(`${this.gameId}_progress`, data);
            this.emit('PROGRESS_SAVED', data);
            this.emit('ON_PROGRESS_SAVED', data);
        }

        loadProgress(fallback = {}) {
            return SafeStorage.get(`${this.gameId}_progress`, fallback);
        }

        vibrate(pattern = 15) {
            try {
                if (navigator.vibrate) navigator.vibrate(pattern);
            } catch (e) {}
        }
    }

    window.SafeStorage = SafeStorage;
    window.UniversalBridge = UniversalBridge;
})(window);
