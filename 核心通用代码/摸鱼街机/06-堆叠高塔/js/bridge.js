/**
 * 🌉 UniversalBridge - 工业级统一宿主接入桥接器与安全沙盒存储
 * 双向总线通信 (兼容 event / action 双字段广播) + 安全存储 (SafeStorage) + Haptic 触感震动
 */
(function(window) {
    'use strict';

    // 1. 安全沙盒存储代理 (解决 Safari 隐私模式 / 跨域 Iframe 下 localStorage 抛错死机)
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

    // 2. 统一宿主事件与数据通信总线
    class UniversalBridge {
        constructor(gameId = 'mini-game') {
            this.gameId = gameId;
            this.callbacks = {};
            this.gameInstance = null;

            this._initMessageListener();
        }

        bindGame(instance) {
            this.gameInstance = instance;
        }

        /**
         * 监听宿主 (Electron 桌宠 / 3D 个人空间 / 博客) 下发的控制指令
         * 兼容 data.action / data.event / data.cmd
         */
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
                        if (this.gameInstance?.audio) {
                            this.gameInstance.audio.setMuted(!!data.payload?.muted);
                        }
                        break;
                }
            });
        }

        /**
         * 广播核心游戏事件到宿主
         * 同时挂载 event 与 action 两个字段，双协议无缝并轨
         */
        emit(name, payload = {}) {
            const message = {
                type: 'GAME_EVENT',
                gameId: this.gameId,
                event: name,
                action: name,
                payload: payload,
                timestamp: Date.now()
            };

            // 1. 发送给父级 Iframe
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage(message, '*');
                }
            } catch (e) {}

            // 2. 本地订阅者回调 (DOM 原生挂载)
            if (this.callbacks[name]) {
                this.callbacks[name].forEach(cb => {
                    try { cb(payload); } catch(err) { console.error(err); }
                });
            }
        }

        _notifyHost(name, payload = {}) {
            this.emit(name, payload);
        }

        on(eventName, callback) {
            if (!this.callbacks[eventName]) {
                this.callbacks[eventName] = [];
            }
            this.callbacks[eventName].push(callback);
        }

        off(eventName, callback) {
            if (!this.callbacks[eventName]) return;
            if (!callback) {
                delete this.callbacks[eventName];
            } else {
                this.callbacks[eventName] = this.callbacks[eventName].filter(cb => cb !== callback);
            }
        }

        /**
         * 分数与存档 API
         */
        recordScore(score) {
            const best = this.getHighScore();
            if (score > best) {
                SafeStorage.set(`${this.gameId}_high_score`, score);
            }
            const currentBest = Math.max(best, score);
            this.emit('SCORE_UPDATE', { current: score, best: currentBest });
            this.emit('ON_SCORE_UPDATE', { current: score, best: currentBest });
            return currentBest;
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

        /**
         * 触觉微震动反馈 (Haptic Vibration API)
         */
        vibrate(pattern = 15) {
            try {
                if ('vibrate' in navigator) {
                    navigator.vibrate(pattern);
                }
            } catch (e) {}
        }
    }

    window.SafeStorage = SafeStorage;
    window.UniversalBridge = UniversalBridge;
})(window);
