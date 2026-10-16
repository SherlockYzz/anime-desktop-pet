/**
 * 🌉 UniversalBridge - 08-数独 (Sudoku)
 * 统一微游戏跨窗口/跨域通信契约与安全存储适配器
 */
(function(window) {
    'use strict';

    const SafeStorage = {
        _mem: {},
        get(key, defaultValue = null) {
            try {
                const val = localStorage.getItem(key);
                return val !== null ? JSON.parse(val) : defaultValue;
            } catch (e) {
                return this._mem[key] !== undefined ? this._mem[key] : defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                this._mem[key] = value;
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                delete this._mem[key];
            }
        }
    };

    class UniversalBridge {
        constructor(gameId = 'sudoku') {
            this.gameId = gameId;
            this.isEmbedded = window.parent !== window;
            this.gameInstance = null;
            this._boundMessageListener = this._handleHostMessage.bind(this);
            window.addEventListener('message', this._boundMessageListener);
        }

        bindGame(instance) {
            this.gameInstance = instance;
        }

        emit(eventType, payload = {}) {
            const message = {
                source: 'mini-game-engine',
                gameId: this.gameId,
                type: eventType,
                payload: payload,
                timestamp: Date.now()
            };
            if (this.isEmbedded) {
                try {
                    window.parent.postMessage(message, '*');
                } catch (e) {}
            }
        }

        _handleHostMessage(event) {
            const data = event.data;
            if (!data || typeof data !== 'object') return;
            if (data.target && data.target !== this.gameId && data.target !== 'all') return;

            switch (data.action) {
                case 'PAUSE':
                case 'pause':
                    if (this.gameInstance && typeof this.gameInstance.pause === 'function') {
                        this.gameInstance.pause();
                    }
                    break;
                case 'RESUME':
                case 'resume':
                    if (this.gameInstance && typeof this.gameInstance.resume === 'function') {
                        this.gameInstance.resume();
                    }
                    break;
                case 'RESTART':
                case 'restart':
                    if (this.gameInstance && typeof this.gameInstance.restart === 'function') {
                        this.gameInstance.restart();
                    }
                    break;
                case 'SET_MUTED':
                case 'setMuted':
                    if (this.gameInstance && this.gameInstance.audio && typeof this.gameInstance.audio.setMuted === 'function') {
                        this.gameInstance.audio.setMuted(!!data.value);
                    }
                    break;
                case 'PING':
                    this.emit('PONG', { gameId: this.gameId });
                    break;
            }
        }

        recordScore(score) {
            const currentHigh = SafeStorage.get(`${this.gameId}_high_score`, 0);
            if (score > currentHigh) {
                SafeStorage.set(`${this.gameId}_high_score`, score);
            }
            this.emit('ON_SCORE_UPDATE', { score, highScore: Math.max(score, currentHigh) });
        }

        getHighScore() {
            return SafeStorage.get(`${this.gameId}_high_score`, 0);
        }

        saveProgress(data) {
            SafeStorage.set(`${this.gameId}_progress`, data);
            this.emit('ON_PROGRESS_SAVED', data);
        }

        loadProgress(defaultVal = null) {
            return SafeStorage.get(`${this.gameId}_progress`, defaultVal);
        }

        vibrate(ms = 30) {
            if ('vibrate' in navigator) {
                try { navigator.vibrate(ms); } catch (e) {}
            }
        }
    }

    window.SafeStorage = SafeStorage;
    window.UniversalBridge = UniversalBridge;
})(window);
