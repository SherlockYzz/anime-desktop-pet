// ========================================
//  二次元桌宠 - 摸鱼街机管理器 (ArcadeManager)
//  管理 10 款通用轻量微游戏生命周期、Iframe 双向通信总线、
//  游戏音效静音、桌宠说话独立开关、街机背景音乐 (BGM) 与本机音乐导入
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
    { id: '07-镜光引路',     name: '镜光引路',     icon: '🪞',  tag: '激光折射', path: '../摸鱼街机/07-镜光引路/index.html' },
    { id: '08-霓虹贪吃蛇',   name: '霓虹贪吃蛇',   icon: '🐍',  tag: '赛博冲刺', path: '../摸鱼街机/08-霓虹贪吃蛇/index.html' },
    { id: '09-律动共鸣',     name: '律动共鸣',     icon: '🎵',  tag: '4轨音游',  path: '../摸鱼街机/09-律动共鸣/index.html' }
  ];

  // 内置精选街机背景音乐曲库（纸飞机与落花置顶 + 新下载免版权纯音乐 + 本机精选曲库）
  const BUILTIN_BGM_TRACKS = [
    { id: 'rhythm_paper_plane',  title: '纸飞机 · 轻盈旋律',            tag: '内置曲库', url: '../摸鱼街机/09-律动共鸣/audio/song_01_paper_plane.mp3' },
    { id: 'rhythm_broken_flower',title: '落花 · 治愈轻音',              tag: '内置曲库', url: '../摸鱼街机/09-律动共鸣/audio/song_02_broken_flower.mp3' },
    { id: 'bgm_pixelland',       title: 'Pixelland · 像素街机',         tag: '街机纯音', url: '../摸鱼街机/shared/bgm/bgm_pixelland.mp3' },
    { id: 'bgm_lobby_time',      title: 'Lobby Time · 慵懒轻爵士',      tag: '休闲益智', url: '../摸鱼街机/shared/bgm/bgm_lobby_time.mp3' },
    { id: 'bgm_wallpaper',       title: 'Wallpaper · 轻快电子节拍',     tag: '轻快纯音', url: '../摸鱼街机/shared/bgm/bgm_wallpaper.mp3' },
    { id: 'local_carefree',      title: 'Carefree · 欢快悠闲日常',      tag: '本机曲库', url: '../摸鱼街机/shared/bgm/local_carefree.mp3' },
    { id: 'local_sneaky_snitch', title: 'Sneaky Snitch · 俏皮整活',     tag: '本机曲库', url: '../摸鱼街机/shared/bgm/local_sneaky_snitch.mp3' },
    { id: 'local_kitto_kanojo',  title: '石滨翔 · きっと彼女は (治愈)', tag: '本机曲库', url: '../摸鱼街机/shared/bgm/local_kitto_kanojo.mp3' },
    { id: 'local_pvz_day',       title: '草坪白昼 · 经典休闲小调',      tag: '本机曲库', url: '../摸鱼街机/shared/bgm/local_pvz_day.mp3' },
    { id: 'local_pvz_night',     title: '月夜花园 · 神秘轻节奏',        tag: '本机曲库', url: '../摸鱼街机/shared/bgm/local_pvz_night.mp3' },
    { id: 'local_huashanxing',   title: '单桐 · 华山行 (国风纯音)',     tag: '本机曲库', url: '../摸鱼街机/shared/bgm/local_huashanxing.mp3' },
    { id: 'local_renshijian',    title: '沈必昂 · 人世间 (舒缓纯音)',   tag: '本机曲库', url: '../摸鱼街机/shared/bgm/local_renshijian.mp3' },
    { id: 'rhythm_oregairu',     title: '春拟き · 温柔钢琴曲',          tag: '动漫钢琴', url: '../摸鱼街机/09-律动共鸣/audio/song_03_oregairu_piano.mp3' },
    { id: 'rhythm_moon',         title: '共鸣之月 · 幻梦旋律',          tag: '内置曲库', url: '../摸鱼街机/09-律动共鸣/audio/song_04_wuthering_moon.mp3' }
  ];

  // 自带完整音轨的游戏 ID（切入时自动暂停街机 BGM 防止串音）
  const SELF_MUSIC_GAME_IDS = new Set(['09-律动共鸣']);

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

      // 一次性默认偏好升级：街机模式下默认「角色说话静默开启」+「背景音乐默认打开」
      if (localStorage.getItem('arcade_audio_defaults_v2') !== '1') {
        localStorage.setItem('arcade_pet_voice_enabled', '0');
        localStorage.setItem('arcade_bgm_enabled', '1');
        localStorage.setItem('arcade_audio_defaults_v2', '1');
      }

      // 游戏音效静音状态（持久化）
      this.isMuted = localStorage.getItem('arcade_game_muted') === '1';
      // 桌宠说话/配音开关（默认静默开启，支持独立切换，持久化）
      const savedPetVoice = localStorage.getItem('arcade_pet_voice_enabled');
      this.petVoiceEnabled = savedPetVoice === null ? false : savedPetVoice === '1';

      this.lastVoiceTime = 0;
      this.voiceCooldown = 5500; // 连击语音CD 5.5秒，防止高频刷屏

      // 街机 BGM 背景音乐播放器状态（默认打开，从置顶的纸飞机开始）
      this.customBgmTracks = [];
      const savedBgmOn = localStorage.getItem('arcade_bgm_enabled');
      this.bgmEnabled = savedBgmOn === null ? true : savedBgmOn === '1';
      this.bgmTrackId = localStorage.getItem('arcade_bgm_track_id') || BUILTIN_BGM_TRACKS[0].id;
      const savedVol = parseFloat(localStorage.getItem('arcade_bgm_volume'));
      // 默认 22% 柔和音量，上限 60%，确保不遮挡清脆的游戏声效
      this.bgmVolume = Number.isFinite(savedVol) ? Math.max(0, Math.min(0.6, savedVol)) : 0.22;
      this.bgmLoopMode = localStorage.getItem('arcade_bgm_loop_mode') === 'single' ? 'single' : 'list';
      this.bgmPanelOpen = false;
      this._bgmAudio = null;
      this._bgmFadeTimer = null;
      this._windowPaused = false;

      this.iframe = null;
      this.pillsContainer = null;
    }

    init() {
      this.iframe = document.getElementById('arcade-viewport');
      this.pillsContainer = document.getElementById('arcade-game-pills');

      if (!this.iframe || !this.pillsContainer) return;

      // 1. 渲染游戏选择胶囊
      this._renderGamePills();

      // 2. 绑定控制栏按钮与 BGM 悬浮面板
      this._bindControlButtons();
      this._bindBgmPanel();

      // 3. 监听 iframe 加载完成，确保切换游戏/刷新后立即同步静音状态并自动聚焦游戏
      this.iframe.addEventListener('load', () => {
        if (!this._active) return;
        this._syncGameMuteState();
        this._focusGameIframe();
        // 部分微游戏在 DOMContentLoaded 后才实例化 audio，延迟补发一次确保万无一失
        setTimeout(() => {
          if (this._active) {
            this._syncGameMuteState();
            this._focusGameIframe();
          }
        }, 180);
      });

      // 4. 监听全局小游戏 postMessage 广播总线 & 父窗口键盘转发（彻底解决点完按钮后方向键/WASD/空格失灵）
      window.addEventListener('message', this._handleGameEvent.bind(this));
      this._bindKeyboardForwarding();

      // 5. 仅恢复上次游玩的 ID 与按钮高亮，不预先加载 iframe
      const lastGame = localStorage.getItem('arcade_last_game') || '01-拉海洛方块01';
      this.currentGameId = this.games.some(g => g.id === lastGame) ? lastGame : this.games[0].id;
      this._updatePillActive(this.currentGameId);
      this._active = false;
      this._loadedGameId = null;
      this._idleUnloadTimer = null;

      // 6. 同步按钮视觉状态 & 异步加载用户已导入的本机 BGM
      this._updateMuteBtnUI();
      this._updatePetVoiceBtnUI();
      this._initBgmAudio();
      this._loadCustomBgmTracks();
    }

    /** 获取完整 BGM 歌单（内置精选 + 用户导入本机音乐） */
    _getAllBgmTracks() {
      return [...BUILTIN_BGM_TRACKS, ...this.customBgmTracks];
    }

    _getCurrentBgmTrack() {
      const all = this._getAllBgmTracks();
      return all.find(t => t.id === this.bgmTrackId) || all[0];
    }

    _initBgmAudio() {
      if (this._bgmAudio) return;
      const audio = new Audio();
      audio.preload = 'none';
      audio.volume = this.bgmVolume;
      audio.addEventListener('ended', () => {
        if (!this.bgmEnabled || !this._active || this._shouldDuckBgm()) return;
        if (this.bgmLoopMode === 'single') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          this.nextBgmTrack(true);
        }
      });
      audio.addEventListener('error', () => {
        // 若单曲加载失败，自动顺延到下一首避免卡死
        if (this.bgmEnabled && this._active && this._getAllBgmTracks().length > 1) {
          setTimeout(() => this.nextBgmTrack(true), 600);
        }
      });
      this._bgmAudio = audio;
    }

    async _loadCustomBgmTracks() {
      try {
        if (window.electronAPI?.listCustomArcadeBgm) {
          const res = await window.electronAPI.listCustomArcadeBgm();
          if (res?.success && Array.isArray(res.tracks)) {
            this.customBgmTracks = res.tracks.map(t => ({
              id: t.id,
              title: t.title,
              tag: t.tag || '本机导入',
              url: t.url,
              isCustom: true
            }));
          }
        }
      } catch (e) {
        console.warn('加载本机自定义 BGM 失败:', e);
      }
      this._renderBgmPanel();
    }

    _updatePillActive(gameId) {
      if (!this.pillsContainer) return;
      const btns = this.pillsContainer.querySelectorAll('.arcade-pill-btn');
      btns.forEach(b => b.classList.toggle('active', b.dataset.gameId === gameId));
    }

    /** 切入街机 Tab 时按需加载当前游戏；若 3 分钟内切回则直接 RESUME 保留当前对局 */
    activate() {
      this._active = true;
      this._windowPaused = false;
      if (this._idleUnloadTimer) {
        clearTimeout(this._idleUnloadTimer);
        this._idleUnloadTimer = null;
      }
      const target = this.games.find(g => g.id === this.currentGameId) || this.games[0];
      if (this.iframe) {
        if (this._loadedGameId !== target.id || !this.iframe.src || this.iframe.src === 'about:blank') {
          this._loadedGameId = target.id;
          this.iframe.src = target.path;
        } else {
          this._sendControl('RESUME');
          this._syncGameMuteState();
        }
      }
      this._syncBgmPlayback();
      this._syncPetVoiceGate();
      this._focusGameIframe();
    }

    /** 将键盘焦点归还给当前游戏 iframe，避免焦点停留在父窗口按钮上导致方向键/WASD失效 */
    _focusGameIframe() {
      try {
        if (!this._active || !this.iframe) return;
        const activeEl = document.activeElement;
        if (activeEl && activeEl !== this.iframe && activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
          activeEl.blur?.();
        }
        this.iframe.focus?.();
        this.iframe.contentWindow?.focus?.();
      } catch (e) {}
    }

    /** 父窗口键盘兜底转发：街机激活态下，即使焦点短暂留在父窗口，按下方向键/WASD/空格等也能 100% 直达当前游戏 */
    _bindKeyboardForwarding() {
      const GAME_CODES = new Set([
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'KeyW', 'KeyA', 'KeyS', 'KeyD',
        'KeyQ', 'KeyE', 'KeyF', 'KeyV', 'KeyC', 'KeyJ', 'KeyK', 'KeyP', 'KeyR',
        'Space', 'Enter', 'ShiftLeft', 'ShiftRight',
        'Digit1', 'Digit2', 'Digit3', 'Digit4'
      ]);

      const forwardKey = (type, e) => {
        if (!this._active || !this.iframe || !this.iframe.contentWindow) return;
        if (this.bgmPanelOpen) return;
        if (window.shortcutManager?.isRecording) return;
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
        if (!GAME_CODES.has(e.code)) return;

        e.preventDefault();
        e.stopPropagation();
        this._focusGameIframe();

        try {
          const iframeWin = this.iframe.contentWindow;
          const forwarded = new iframeWin.KeyboardEvent(type, {
            key: e.key,
            code: e.code,
            keyCode: e.keyCode,
            which: e.which,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
            repeat: e.repeat,
            bubbles: true,
            cancelable: true
          });
          iframeWin.dispatchEvent(forwarded);
        } catch (err) {}
      };

      window.addEventListener('keydown', (e) => forwardKey('keydown', e), true);
      window.addEventListener('keyup', (e) => forwardKey('keyup', e), true);
    }

    /** 切出街机 Tab 时发送 PAUSE 保留当前局，暂停 BGM，恢复桌宠日常语音总闸，闲置 3 分钟后再卸载 iframe */
    deactivate() {
      if (!this._active) return;
      this._active = false;
      this._sendControl('PAUSE');
      this._pauseBgmSmooth();
      this._toggleBgmPanel(false);
      // 退出街机后恢复角色正常语音，不影响日常聊天与桌宠互动
      window.characterManager?.setVoiceMuted?.(false);
      if (this._idleUnloadTimer) clearTimeout(this._idleUnloadTimer);
      this._idleUnloadTimer = setTimeout(() => {
        if (!this._active && this.iframe) {
          this.iframe.src = 'about:blank';
          this._loadedGameId = null;
        }
        this._idleUnloadTimer = null;
      }, 180000);
    }

    /** 窗口隐藏/显示时同步暂停/恢复当前游戏与 BGM */
    setPaused(paused) {
      this._windowPaused = !!paused;
      if (!this._active) return;
      this._sendControl(paused ? 'PAUSE' : 'RESUME');
      if (paused) {
        this._pauseBgmSmooth();
      } else {
        this._syncBgmPlayback();
      }
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
      const btnPetVoice = document.getElementById('btn-arcade-pet-voice');
      const btnBgm = document.getElementById('btn-arcade-bgm');
      const btnReload = document.getElementById('btn-arcade-reload');
      const btnTitlebar = document.getElementById('btn-arcade-titlebar');
      const btnExit = document.getElementById('btn-arcade-exit');

      if (btnExit) {
        btnExit.addEventListener('click', () => {
          window.app?._switchTab?.('chat');
        });
      }
      if (btnRestart) {
        btnRestart.addEventListener('click', () => {
          this.restartGame();
          this._focusGameIframe();
        });
      }
      if (btnMute) {
        btnMute.addEventListener('click', () => {
          this.toggleMute();
          this._focusGameIframe();
        });
      }
      if (btnPetVoice) {
        btnPetVoice.addEventListener('click', () => {
          this.togglePetVoice();
          this._focusGameIframe();
        });
      }
      if (btnBgm) {
        btnBgm.addEventListener('click', (e) => {
          e.stopPropagation();
          this._toggleBgmPanel();
        });
      }
      if (btnReload) {
        btnReload.addEventListener('click', () => {
          this.reloadGame();
          this._focusGameIframe();
        });
      }
      if (btnTitlebar) {
        btnTitlebar.addEventListener('click', () => this.openArcade());
      }
    }

    _bindBgmPanel() {
      const panel = document.getElementById('arcade-bgm-panel');
      const btnToggle = document.getElementById('btn-arcade-bgm-toggle');
      const btnClose = document.getElementById('btn-arcade-bgm-close');
      const btnPrev = document.getElementById('btn-arcade-bgm-prev');
      const btnPlay = document.getElementById('btn-arcade-bgm-play');
      const btnNext = document.getElementById('btn-arcade-bgm-next');
      const btnLoop = document.getElementById('btn-arcade-bgm-loop');
      const sliderVol = document.getElementById('arcade-bgm-volume');
      const btnImport = document.getElementById('btn-arcade-bgm-import');
      const listEl = document.getElementById('arcade-bgm-list');

      if (!panel) return;

      panel.addEventListener('click', (e) => e.stopPropagation());
      document.addEventListener('click', (e) => {
        if (this.bgmPanelOpen && !e.target.closest('#arcade-bgm-panel') && !e.target.closest('#btn-arcade-bgm')) {
          this._toggleBgmPanel(false);
        }
      });

      if (btnClose) btnClose.addEventListener('click', () => this._toggleBgmPanel(false));
      if (btnToggle) btnToggle.addEventListener('click', () => this.toggleBgm());
      if (btnPlay) btnPlay.addEventListener('click', () => this.toggleBgm());
      if (btnPrev) btnPrev.addEventListener('click', () => this.prevBgmTrack());
      if (btnNext) btnNext.addEventListener('click', () => this.nextBgmTrack(false));
      if (btnLoop) btnLoop.addEventListener('click', () => this.toggleBgmLoopMode());

      if (sliderVol) {
        sliderVol.value = String(Math.round(this.bgmVolume * 100));
        sliderVol.addEventListener('input', (e) => {
          const pct = Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0));
          this.setBgmVolume(pct / 100);
        });
      }

      if (btnImport) {
        btnImport.addEventListener('click', () => this.importLocalBgmFiles());
      }

      if (listEl) {
        listEl.addEventListener('click', (e) => {
          const delBtn = e.target.closest('.arcade-bgm-del-btn');
          if (delBtn && delBtn.dataset.trackId) {
            e.stopPropagation();
            this.deleteCustomBgmTrack(delBtn.dataset.trackId);
            return;
          }
          const row = e.target.closest('.arcade-bgm-item');
          if (row && row.dataset.trackId) {
            this.selectBgmTrack(row.dataset.trackId, true);
          }
        });
      }
    }

    _toggleBgmPanel(forceState) {
      const panel = document.getElementById('arcade-bgm-panel');
      if (!panel) return;
      this.bgmPanelOpen = typeof forceState === 'boolean' ? forceState : !this.bgmPanelOpen;
      panel.classList.toggle('open', this.bgmPanelOpen);
      panel.setAttribute('aria-hidden', this.bgmPanelOpen ? 'false' : 'true');
      if (this.bgmPanelOpen) {
        this._renderBgmPanel();
      } else {
        this._focusGameIframe();
      }
    }

    switchGame(gameId) {
      const target = this.games.find(g => g.id === gameId) || this.games[0];
      this.currentGameId = target.id;
      localStorage.setItem('arcade_last_game', target.id);

      // 更新按钮高亮
      this._updatePillActive(target.id);

      // 仅在街机处于激活态时加载 Iframe
      if (this.iframe && this._active) {
        this._loadedGameId = target.id;
        this.iframe.src = target.path;
      }

      // 切入/切出音游时自动暂停或恢复 BGM
      this._syncBgmPlayback();
      if (this.bgmPanelOpen) this._renderBgmPanel();
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

    /** 切换小游戏音效静音状态（同时立即同步给当前 iframe，并在切游戏/刷新时保持） */
    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('arcade_game_muted', this.isMuted ? '1' : '0');
      this._syncGameMuteState();
      this._updateMuteBtnUI();
    }

    _syncGameMuteState() {
      this._sendControl('SET_MUTE', { muted: this.isMuted });
    }

    _updateMuteBtnUI() {
      const btnMute = document.getElementById('btn-arcade-mute');
      if (!btnMute) return;
      const label = btnMute.querySelector('.arcade-audio-text');
      const txt = this.isMuted ? '游戏音效 · 关' : '游戏音效 · 开';
      if (label) label.textContent = txt;
      else btnMute.textContent = txt;
      btnMute.title = this.isMuted ? '游戏音效已静音（点击开启）' : '游戏音效已开启（点击静音）';
      btnMute.classList.toggle('active', this.isMuted);
    }

    /** 将当前街机「角色说话」开关同步到全局 CharacterManager 底层总闸 */
    _syncPetVoiceGate() {
      if (!this._active) return;
      window.characterManager?.setVoiceMuted?.(!this.petVoiceEnabled);
    }

    /** 切换桌宠说话功能（独立开关：关闭后锁死底层语音总闸、立即停止当前语音并清空喝彩气泡；开启后恢复） */
    togglePetVoice() {
      this.petVoiceEnabled = !this.petVoiceEnabled;
      localStorage.setItem('arcade_pet_voice_enabled', this.petVoiceEnabled ? '1' : '0');
      this._syncPetVoiceGate();
      if (!this.petVoiceEnabled) {
        window.characterManager?.stopVoice?.();
        window.app?.petMode?._clearBubbles?.();
      }
      this._updatePetVoiceBtnUI();
    }

    _updatePetVoiceBtnUI() {
      const btnPetVoice = document.getElementById('btn-arcade-pet-voice');
      if (!btnPetVoice) return;
      const label = btnPetVoice.querySelector('.arcade-audio-text');
      const txt = this.petVoiceEnabled ? '角色说话 · 开' : '角色说话 · 静默';
      if (label) label.textContent = txt;
      else btnPetVoice.textContent = txt;
      btnPetVoice.title = this.petVoiceEnabled
        ? '玩游戏时角色说话：已开启（点击静音角色说话）'
        : '玩游戏时角色说话：已静音（点击开启角色说话）';
      btnPetVoice.classList.toggle('muted-pet', !this.petVoiceEnabled);
    }

    // ==================== 街机背景音乐 (BGM) 核心控制 ====================

    _shouldDuckBgm() {
      return SELF_MUSIC_GAME_IDS.has(this.currentGameId);
    }

    toggleBgm() {
      this.bgmEnabled = !this.bgmEnabled;
      localStorage.setItem('arcade_bgm_enabled', this.bgmEnabled ? '1' : '0');
      this._syncBgmPlayback();
      this._renderBgmPanel();
    }

    selectBgmTrack(trackId, autoEnable = true) {
      const all = this._getAllBgmTracks();
      const found = all.find(t => t.id === trackId);
      if (!found) return;
      this.bgmTrackId = found.id;
      localStorage.setItem('arcade_bgm_track_id', found.id);
      if (autoEnable) {
        this.bgmEnabled = true;
        localStorage.setItem('arcade_bgm_enabled', '1');
      }
      this._playCurrentBgm(true);
      this._renderBgmPanel();
    }

    prevBgmTrack() {
      const all = this._getAllBgmTracks();
      if (!all.length) return;
      const idx = Math.max(0, all.findIndex(t => t.id === this.bgmTrackId));
      const prev = all[(idx - 1 + all.length) % all.length];
      this.selectBgmTrack(prev.id, true);
    }

    nextBgmTrack(fromEnded = false) {
      const all = this._getAllBgmTracks();
      if (!all.length) return;
      const idx = Math.max(0, all.findIndex(t => t.id === this.bgmTrackId));
      const next = all[(idx + 1) % all.length];
      this.selectBgmTrack(next.id, fromEnded ? this.bgmEnabled : true);
    }

    toggleBgmLoopMode() {
      this.bgmLoopMode = this.bgmLoopMode === 'list' ? 'single' : 'list';
      localStorage.setItem('arcade_bgm_loop_mode', this.bgmLoopMode);
      this._renderBgmPanel();
    }

    setBgmVolume(vol) {
      this.bgmVolume = Math.max(0, Math.min(0.6, vol));
      localStorage.setItem('arcade_bgm_volume', String(this.bgmVolume));
      if (this._bgmAudio && !this._bgmFadeTimer) {
        this._bgmAudio.volume = this.bgmVolume;
      }
      const valEl = document.getElementById('arcade-bgm-vol-val');
      if (valEl) valEl.textContent = `${Math.round(this.bgmVolume * 100)}%`;
    }

    _syncBgmPlayback() {
      if (this.bgmEnabled && this._active && !this._windowPaused && !this._shouldDuckBgm()) {
        this._playCurrentBgm(false);
      } else {
        this._pauseBgmSmooth();
      }
      this._updateBgmBtnUI();
    }

    _playCurrentBgm(forceReload = false) {
      this._initBgmAudio();
      if (!this._bgmAudio) return;
      if (!this.bgmEnabled || !this._active || this._windowPaused || this._shouldDuckBgm()) {
        this._pauseBgmSmooth();
        this._updateBgmBtnUI();
        return;
      }

      const track = this._getCurrentBgmTrack();
      if (!track) return;

      if (this._bgmFadeTimer) {
        clearInterval(this._bgmFadeTimer);
        this._bgmFadeTimer = null;
      }

      const targetSrc = new URL(track.url, window.location.href).href;
      if (forceReload || this._bgmAudio.src !== targetSrc) {
        this._bgmAudio.src = targetSrc;
      }

      // 平滑淡入到目标柔和音量，避免突然炸耳
      const targetVol = this.bgmVolume;
      this._bgmAudio.volume = Math.min(this._bgmAudio.volume, targetVol * 0.25);
      this._bgmAudio.play().then(() => {
        let step = 0;
        const steps = 8;
        const startVol = this._bgmAudio.volume;
        this._bgmFadeTimer = setInterval(() => {
          step++;
          if (!this._bgmAudio || step >= steps) {
            if (this._bgmAudio) this._bgmAudio.volume = this.bgmVolume;
            clearInterval(this._bgmFadeTimer);
            this._bgmFadeTimer = null;
          } else {
            this._bgmAudio.volume = startVol + (this.bgmVolume - startVol) * (step / steps);
          }
        }, 25);
        this._updateBgmBtnUI();
      }).catch(() => {
        this._updateBgmBtnUI();
      });
    }

    _pauseBgmSmooth() {
      if (!this._bgmAudio || this._bgmAudio.paused) {
        this._updateBgmBtnUI();
        return;
      }
      if (this._bgmFadeTimer) {
        clearInterval(this._bgmFadeTimer);
        this._bgmFadeTimer = null;
      }
      const audio = this._bgmAudio;
      const startVol = audio.volume;
      let step = 0;
      const steps = 5;
      this._bgmFadeTimer = setInterval(() => {
        step++;
        if (step >= steps || audio.paused) {
          clearInterval(this._bgmFadeTimer);
          this._bgmFadeTimer = null;
          audio.pause();
          audio.volume = this.bgmVolume;
          this._updateBgmBtnUI();
        } else {
          audio.volume = Math.max(0, startVol * (1 - step / steps));
        }
      }, 20);
    }

    _updateBgmBtnUI() {
      const btnBgm = document.getElementById('btn-arcade-bgm');
      if (!btnBgm) return;
      const isPlayingNow = this.bgmEnabled && this._active && !this._shouldDuckBgm();
      btnBgm.classList.toggle('bgm-on', isPlayingNow);
      const track = this._getCurrentBgmTrack();
      const label = btnBgm.querySelector('.arcade-audio-text');
      const txt = this.bgmEnabled
        ? (this._shouldDuckBgm() ? '背景音乐 · 暂避' : '背景音乐 · 开')
        : '背景音乐 · 关';
      if (label) label.textContent = txt;
      else btnBgm.textContent = txt;
      btnBgm.title = this.bgmEnabled
        ? (this._shouldDuckBgm()
          ? '背景音乐：音游模式已自动避让暂停'
          : `背景音乐播放中：${track?.title || ''}（点击打开音乐盒）`)
        : '背景音乐：已关闭（点击开启并选曲）';
    }

    _renderBgmPanel() {
      const track = this._getCurrentBgmTrack();
      const allTracks = this._getAllBgmTracks();
      const ducked = this._shouldDuckBgm();

      const btnToggle = document.getElementById('btn-arcade-bgm-toggle');
      const nowTitle = document.getElementById('arcade-bgm-now-title');
      const btnPlay = document.getElementById('btn-arcade-bgm-play');
      const btnLoop = document.getElementById('btn-arcade-bgm-loop');
      const sliderVol = document.getElementById('arcade-bgm-volume');
      const valEl = document.getElementById('arcade-bgm-vol-val');
      const duckTip = document.getElementById('arcade-bgm-duck-tip');
      const listEl = document.getElementById('arcade-bgm-list');

      if (btnToggle) {
        btnToggle.textContent = this.bgmEnabled ? '已开启' : '已关闭';
        btnToggle.classList.toggle('on', this.bgmEnabled);
      }
      if (nowTitle) {
        nowTitle.textContent = this.bgmEnabled
          ? (ducked ? `已暂避 · ${track?.title || ''}` : `${track?.title || ''}`)
          : `已暂停 · ${track?.title || '未选择曲目'}`;
      }
      if (btnPlay) {
        const playing = this.bgmEnabled && !ducked;
        btnPlay.classList.toggle('is-playing', playing);
        btnPlay.title = playing ? '暂停背景音乐' : '播放背景音乐';
      }
      if (btnLoop) {
        const isSingle = this.bgmLoopMode === 'single';
        btnLoop.classList.toggle('is-single', isSingle);
        btnLoop.title = isSingle ? '单曲循环（点击切换列表循环）' : '列表循环（点击切换单曲循环）';
      }
      if (sliderVol) sliderVol.value = String(Math.round(this.bgmVolume * 100));
      if (valEl) valEl.textContent = `${Math.round(this.bgmVolume * 100)}%`;
      if (duckTip) duckTip.style.display = (this.bgmEnabled && ducked) ? 'block' : 'none';

      if (listEl) {
        listEl.innerHTML = allTracks.map(t => {
          const isCurrent = t.id === track?.id;
          const safeTitle = String(t.title || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
          const safeTag = String(t.tag || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
          return `
            <div class="arcade-bgm-item ${isCurrent ? 'active' : ''}" data-track-id="${t.id}">
              <span class="arcade-bgm-item-dot">${isCurrent && this.bgmEnabled && !ducked ? '♪' : '•'}</span>
              <span class="arcade-bgm-item-title" title="${safeTitle}">${safeTitle}</span>
              <span class="arcade-bgm-item-tag">${safeTag}</span>
              ${t.isCustom ? `<button class="arcade-bgm-del-btn" data-track-id="${t.id}" type="button" title="移除该曲目">✕</button>` : ''}
            </div>
          `;
        }).join('');
      }

      this._updateBgmBtnUI();
    }

    async importLocalBgmFiles() {
      if (!window.electronAPI?.pickArcadeBgmFiles) return;
      try {
        const res = await window.electronAPI.pickArcadeBgmFiles();
        if (res?.success && Array.isArray(res.tracks)) {
          this.customBgmTracks = res.tracks.map(t => ({
            id: t.id,
            title: t.title,
            tag: t.tag || '本机导入',
            url: t.url,
            isCustom: true
          }));
          if (res.added && res.added.length > 0) {
            // 自动选中并播放刚导入的第一首本机音乐
            this.selectBgmTrack(res.added[0].id, true);
          } else {
            this._renderBgmPanel();
          }
        }
      } catch (e) {
        console.warn('导入本机音乐失败:', e);
      }
    }

    async deleteCustomBgmTrack(trackId) {
      if (!window.electronAPI?.deleteCustomArcadeBgm) return;
      try {
        const res = await window.electronAPI.deleteCustomArcadeBgm(trackId);
        if (res?.success) {
          const wasCurrent = this.bgmTrackId === trackId;
          this.customBgmTracks = (res.tracks || []).map(t => ({
            id: t.id,
            title: t.title,
            tag: t.tag || '本机导入',
            url: t.url,
            isCustom: true
          }));
          if (wasCurrent) {
            this.bgmTrackId = BUILTIN_BGM_TRACKS[0].id;
            localStorage.setItem('arcade_bgm_track_id', this.bgmTrackId);
            if (this.bgmEnabled) this._playCurrentBgm(true);
          }
          this._renderBgmPanel();
        }
      } catch (e) {
        console.warn('删除本机音乐失败:', e);
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
     * 核心事件总线：接收全 10 款微游戏通过 UniversalBridge 广播的事件
     */
    _handleGameEvent(e) {
      // 安全校验：仅接收当前内嵌街机 iframe 发出的消息
      if (this.iframe && e.source !== this.iframe.contentWindow) return;
      const data = e.data;
      if (!data) return;

      let eventName = null;
      let payload = data.payload || {};

      if (data.type === 'GAME_EVENT') {
        eventName = data.event || data.action;
      } else if (data.source === 'mini-game-engine' || data.source === 'mini-game') {
        eventName = data.type || data.action || data.event;
      } else if (data.event || data.action) {
        eventName = data.event || data.action;
      }

      if (!eventName) return;

      switch (eventName) {
        // 0. 游戏就绪：向小游戏下发当前角色上下文与静音状态
        case 'READY':
        case 'ON_GAME_READY': {
          const char = window.characterManager?.getCurrentCharacter?.();
          this._sendControl('INIT', {
            characterId: char?.id || 'ruoxi',
            characterName: char?.name || '若曦',
            primaryColor: char?.theme?.primary || '#f0a0b0',
            muted: this.isMuted
          });
          this._syncGameMuteState();
          break;
        }

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

        // 2. 关卡大通关 (数独完成、音游通关、鸣潮谜题通关等)
        case 'ON_LEVEL_COMPLETE':
        case 'LEVEL_COMPLETE':
        case 'LEVEL_CLEAR':
        case 'VICTORY':
        case 'WIN': {
          const lvl = (typeof payload.level === 'number') ? (payload.level + 1) : (payload.difficulty ? `${payload.difficulty}难度` : '');
          const desc = lvl ? `【${lvl}】圆满通关！` : '大通关！';
          this._triggerReward(5, desc);
          this._triggerCheer('win', `🎉 恭喜${desc}`);
          break;
        }

        // 3. 分数刷新与打破历史纪录
        case 'ON_SCORE_UPDATE':
        case 'SCORE_UPDATE':
        case 'SCORE': {
          if (payload.current && payload.best && payload.current >= payload.best && payload.current >= 200) {
            this._triggerReward(5, '打破最高纪录');
            this._triggerCheer('win', `🏆 诞生新纪录 ${payload.current} 分！`);
          }
          break;
        }

        // 4. 游戏结束
        case 'ON_GAME_OVER':
        case 'GAME_OVER':
        case 'FAIL': {
          this._triggerCheer('fail', '惜败！再接再厉哦～');
          break;
        }
      }
    }

    /** 触发角色语音与台词气泡喝彩（严格受桌宠说话开关控制） */
    _triggerCheer(type, fallbackBubble) {
      // 用户关闭了桌宠说话开关时，静默不发声也不打扰
      if (!this.petVoiceEnabled) return;

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
