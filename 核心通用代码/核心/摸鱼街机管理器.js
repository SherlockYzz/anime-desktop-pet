// ========================================
//  二次元桌宠 - 摸鱼街机管理器 (ArcadeManager)
//  管理 8 款通用轻量微游戏生命周期、Iframe 双向通信总线、CV 语音喝彩与好感度联动
// ========================================

(function(window) {
  'use strict';

  const ARCADE_GAMES = [
    { id: '01-拉海洛方块01', name: '拉海洛·放置', icon: '🧱', tag: '经典消除', path: '../摸鱼街机/01-拉海洛方块01/index.html' },
    { id: '01-拉海洛方块02', name: '拉海洛·重力', icon: '⬇️', tag: '下落旋转', path: '../摸鱼街机/01-拉海洛方块02/index.html' },
    { id: '02-六边形消除',   name: '六边形消除',   icon: '⬡',  tag: '蜂巢全爆', path: '../摸鱼街机/02-六边形消除/index.html' },
    { id: '03-共鸣弹球',     name: '共鸣弹球',     icon: '⚪',  tag: '物理反弹', path: '../摸鱼街机/03-共鸣弹球/index.html' },
    { id: '04-点点引光',     name: '点点引光',     icon: '💡',  tag: '拓扑回路', path: '../摸鱼街机/04-点点引光/index.html' },
    { id: '05-溢彩画',       name: '溢彩水墨',     icon: '🎨',  tag: '水墨同化', path: '../摸鱼街机/05-溢彩画/index.html' },
    { id: '06-堆叠高塔',     name: '堆叠高塔',     icon: '🏰',  tag: '切片登顶', path: '../摸鱼街机/06-堆叠高塔/index.html' },
    { id: '07-镜光引路',     name: '镜光引路',     icon: '🪞',  tag: '激光折射', path: '../摸鱼街机/07-镜光引路/index.html' }
  ];

  // 全角色原声 CV 街机定制联动词典 (与各角色音频素材严格对齐)
  const CHARACTER_ARCADE_VOICES = {
    ruoxi: {
      combo: { voice: '06', text: '嗖！看若曦轻巧一跃~ 连击达成！⚡' },
      win:   { voice: '07', text: '成果已经准备好啦，主人请快快检阅！太棒啦📜✨' },
      fail:  { voice: '08', text: '呜……遇到小困难了，容若曦抱头缓一缓嘛😿' }
    },
    megumi: {
      combo: { voice: '06', text: '请尽情享受只属于我们两个人的回忆制作吧🌸' },
      win:   { voice: '05', text: '我有没有成为只属于你的第一女主角呢？恭喜通关！✨' },
      fail:  { voice: '08', text: '没关系的哦，因为加藤会一直为你提供提示的呢。' }
    },
    megumin: {
      combo: { voice: '04', text: '来吧，今天也一起 Let\'s 爆裂吧！💥' },
      win:   { voice: '10', text: '这就是人类最大威力的究极攻击魔法——Explosion！🔥' },
      fail:  { voice: '03', text: '禁忌……那与悲剧颇为相似。下一局再爆裂回来！' }
    },
    rem: {
      combo: { voice: '05', text: '蕾姆在战斗中也能派上用场，开路先锋请尽管交给我吧！⚡' },
      win:   { voice: '14', text: '真是勤勉呢！蕾姆打心底为您感到自豪💙' },
      fail:  { voice: '03', text: '请不要勉强自己，您的身体才是第一位的哦。' }
    },
    takagi: {
      combo: { voice: '08', text: '好开心呀～！表现得很不错嘛西片（笑）' },
      win:   { voice: '03', text: '呐，你是喜欢的吧？赢了就要好好承认哦～' },
      fail:  { voice: '01', text: 'ふふっ、原来你在看我呀？又输了呢，呵呵～' }
    },
    zerotwo: {
      combo: { voice: '04', text: '好好地驾驶成功了呢，刚才很棒哦达令！❤️' },
      win:   { voice: '07', text: '看吧，很简单对吧？不愧是我的达令！' },
      fail:  { voice: '05', text: '真天真呢，不过我并不讨厌哦，再来一次吧。' }
    },
    yukino: {
      combo: { voice: '02', text: '既然受人所托，我就会尽到责任。表现尚可。' },
      win:   { voice: '04', text: '困意瞬间就一扫而空了呢，这才是侍奉部的实力。' },
      fail:  { voice: '03', text: '我会帮你矫正你的问题，心怀感激地重新挑战吧。' }
    },
    miku: {
      combo: { voice: '01', text: '初音未来登场！一起奏响最强节奏吧～🎵' },
      win:   { voice: '03', text: '谢谢大家！最棒的高分诞生了！✨' },
      fail:  { voice: '02', text: '不要气馁哦，下一曲再一起加油吧！🎶' }
    },
    umaru: {
      combo: { voice: '04', text: '好慢！不陪小埋打个痛快游戏的话我可不原谅你哦！🎮' },
      win:   { voice: '01', text: '小埋大获全胜！天下无敌的干物妹模式全开～可乐薯片干杯！🥤' },
      fail:  { voice: '12', text: '呜呜，哥哥坏心眼！这把不算，再来一局嘛！' }
    }
  };

  class ArcadeManager {
    constructor() {
      this.games = ARCADE_GAMES;
      this.currentGameId = '01-拉海洛方块01';
      this.isMuted = false;
      this.lastVoiceTime = 0;
      this.voiceCooldown = 5500; // 连击语音CD 5.5秒，防止高频刷屏

      this.iframe = null;
      this.pillsContainer = null;
    }

    init() {
      this.iframe = document.getElementById('arcade-viewport');
      this.pillsContainer = document.getElementById('arcade-game-pills');

      if (!this.iframe || !this.pillsContainer) return;

      // 1. 渲染游戏选择胶囊
      this._renderGamePills();

      // 2. 绑定控制栏按钮
      this._bindControlButtons();

      // 3. 监听全局小游戏 postMessage 广播总线
      window.addEventListener('message', this._handleGameEvent.bind(this));

      // 4. 恢复上次游玩的游戏
      const lastGame = localStorage.getItem('arcade_last_game') || '01-拉海洛方块01';
      this.switchGame(lastGame, false);
    }

    _renderGamePills() {
      if (!this.pillsContainer) return;
      this.pillsContainer.innerHTML = this.games.map(g => `
        <button class="arcade-pill-btn ${g.id === this.currentGameId ? 'active' : ''}" data-game-id="${g.id}">
          <span class="pill-icon">${g.icon}</span>
          <span class="pill-name">${g.name}</span>
        </button>
      `).join('');

      this.pillsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.arcade-pill-btn');
        if (btn && btn.dataset.gameId) {
          this.switchGame(btn.dataset.gameId);
        }
      });
    }

    _bindControlButtons() {
      const btnRestart = document.getElementById('btn-arcade-restart');
      const btnMute = document.getElementById('btn-arcade-mute');
      const btnReload = document.getElementById('btn-arcade-reload');
      const btnTitlebar = document.getElementById('btn-arcade-titlebar');
      const btnExit = document.getElementById('btn-arcade-exit');

      if (btnExit) {
        btnExit.addEventListener('click', () => {
          window.app?._switchTab?.('chat');
        });
      }
      if (btnRestart) {
        btnRestart.addEventListener('click', () => this.restartGame());
      }
      if (btnMute) {
        btnMute.addEventListener('click', () => this.toggleMute());
      }
      if (btnReload) {
        btnReload.addEventListener('click', () => this.reloadGame());
      }
      if (btnTitlebar) {
        btnTitlebar.addEventListener('click', () => this.openArcade());
      }
    }

    switchGame(gameId, playAudio = true) {
      const target = this.games.find(g => g.id === gameId) || this.games[0];
      this.currentGameId = target.id;
      localStorage.setItem('arcade_last_game', target.id);

      // 更新按钮高亮
      if (this.pillsContainer) {
        const btns = this.pillsContainer.querySelectorAll('.arcade-pill-btn');
        btns.forEach(b => b.classList.toggle('active', b.dataset.gameId === target.id));
      }

      // 切换 Iframe 地址
      if (this.iframe) {
        this.iframe.src = target.path;
      }
    }

    restartGame() {
      this._sendControl('RESTART');
    }

    reloadGame() {
      if (this.iframe) {
        const curSrc = this.iframe.src;
        this.iframe.src = '';
        setTimeout(() => { this.iframe.src = curSrc; }, 50);
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      this._sendControl('SET_MUTE', { muted: this.isMuted });
      const btnMute = document.getElementById('btn-arcade-mute');
      if (btnMute) {
        btnMute.innerHTML = this.isMuted ? '🔇 静音' : '🔊 声音';
        btnMute.classList.toggle('active', this.isMuted);
      }
    }

    _sendControl(action, payload = {}) {
      try {
        if (this.iframe && this.iframe.contentWindow) {
          this.iframe.contentWindow.postMessage({
            type: 'GAME_CONTROL',
            action: action,
            payload: payload
          }, '*');
        }
      } catch (e) {
        console.warn('向小游戏发送指令失败:', e);
      }
    }

    /**
     * 核心事件总线：接收全 8 款微游戏通过 UniversalBridge 广播的事件
     */
    _handleGameEvent(e) {
      const data = e.data;
      if (!data || data.type !== 'GAME_EVENT') return;

      const eventName = data.event || data.action;
      const payload = data.payload || {};

      switch (eventName) {
        // 1. 连击消除喝彩
        case 'ON_COMBO_TRIGGER':
        case 'ON_LINE_CLEAR':
        case 'COMBO': {
          const combo = payload.combo || payload.lines || 1;
          if (combo >= 2) {
            this._triggerCheer('combo', `🔥 连击爆发 x${combo}！`);
          }
          break;
        }

        // 2. 关卡大通关
        case 'ON_LEVEL_COMPLETE':
        case 'LEVEL_CLEAR':
        case 'VICTORY': {
          const lvl = (typeof payload.level === 'number') ? (payload.level + 1) : '';
          this._triggerReward(3, `第 ${lvl} 关大通关！`);
          this._triggerCheer('win', `🎉 恭喜第 ${lvl} 关通关！`);
          break;
        }

        // 3. 分数刷新与打破历史纪录
        case 'ON_SCORE_UPDATE':
        case 'SCORE_UPDATE': {
          if (payload.current && payload.best && payload.current >= payload.best && payload.current >= 200) {
            // 达到新纪录
            this._triggerReward(5, '打破最高纪录');
            this._triggerCheer('win', `🏆 诞生新纪录 ${payload.current} 分！`);
          }
          break;
        }

        // 4. 游戏结束
        case 'ON_GAME_OVER':
        case 'GAME_OVER': {
          this._triggerCheer('fail', '惜败！再接再厉哦～');
          break;
        }
      }
    }

    /** 触发角色语音与台词气泡喝彩 */
    _triggerCheer(type, fallbackBubble) {
      const now = Date.now();
      const charId = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
      const voiceDict = CHARACTER_ARCADE_VOICES[charId] || CHARACTER_ARCADE_VOICES.ruoxi;
      const item = voiceDict[type];

      // 气泡随时更新显示
      const bubbleText = item?.text || fallbackBubble;
      if (bubbleText && window.app?.petMode?._showBubble) {
        window.app.petMode._showBubble(bubbleText);
      }

      // 语音受冷却 CD 控制，避免高频连爆轰炸
      if (item?.voice && (now - this.lastVoiceTime > this.voiceCooldown)) {
        this.lastVoiceTime = now;
        if (window.characterManager?.playVoice) {
          window.characterManager.playVoice(charId, item.voice);
        }
      }
    }

    /** 触发好感度与经验值奖励 */
    _triggerReward(expAmount, reason) {
      const charId = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
      if (window.emotionMemory && typeof window.emotionMemory.addExp === 'function') {
        window.emotionMemory.addExp(charId, expAmount, `街机·${reason}`);
      }
    }

    /** 从任何地方极速切入摸鱼街机 (若已在街机中则切回聊天) */
    openArcade() {
      if (!document.body?.classList?.contains('web-mode-active')) {
        window.app?.petMode?.exit?.(true);
      }
      setTimeout(() => {
        if (window.app?.currentTab === 'arcade') {
          window.app._switchTab('chat');
        } else if (window.app?._switchTab) {
          window.app._switchTab('arcade');
        } else if (window.app?.switchTab) {
          window.app.switchTab('arcade');
        }
      }, 100);
    }
  }

  window.ArcadeManager = ArcadeManager;
  window.arcadeManager = new ArcadeManager();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.arcadeManager.init());
  } else {
    window.arcadeManager.init();
  }

})(window);
