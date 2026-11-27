// 二次元AI桌宠 - 桌面贴心管家与生活助手系统 (DesktopButler)
// 包含功能：
// 1. 番茄钟 / 专注工作计时（25分钟专注工作 + 5分钟休息 + 动作姿态联动 + 喝水伸懒腰提醒）
// 2. 桌面系统硬件负荷感知（CPU/内存超载趣味吐槽气泡，小埋/若曦/惠惠等9大角色专属台词）
// 3. 晨间天气与贴心穿衣问候（轻量免Key气象服务 + 温差/雨雪关怀）

class DesktopButler {
  constructor() {
    // === 番茄钟状态 ===
    this.pomodoro = {
      active: false,
      isBreak: false,
      remainingSeconds: 25 * 60,
      workDuration: 25 * 60,
      breakDuration: 5 * 60,
      timerId: null,
      badgeElement: null,
    };

    // === 硬件监控状态 ===
    this.monitor = {
      enabled: localStorage.getItem('butler_monitor_enabled') !== 'false',
      intervalId: null,
      lastAlertTime: 0,
      highLoadCount: 0,
    };

    // === 天气与日程问候状态 ===
    this.weather = {
      lastCareDate: localStorage.getItem('butler_last_weather_date') || '',
    };
  }

  /** 安全发送气泡消息（自动适配各种运行模式与单例结构） */
  _showBubble(text) {
    if (!text) return;
    const pm = window.app?.petMode || window.petMode;
    if (pm?._showBubble) {
      pm._showBubble(text);
    } else if (window.app?.chat?.addMessage) {
      window.app.chat.addMessage('ai', text);
    }
  }

  init() {
    this._injectStyles();
    this._initSystemMonitor();
    this._checkMorningWeatherCare();
    console.log('[DesktopButler] 桌面贴心管家系统已成功初始化就绪 ✨');
  }

  // =========================================================================
  // 1. 番茄钟 / 专注工作计时系统
  // =========================================================================

  /** 切换番茄钟启动/停止 */
  togglePomodoro(customMinutes) {
    if (this.pomodoro.active) {
      this.stopPomodoro();
    } else {
      this.startPomodoro(customMinutes);
    }
  }

  /** 启动专注番茄钟 */
  startPomodoro(minutes = 25) {
    this.stopPomodoro(true);

    // 若当前处于自由漫步，自动暂停漫步以专心陪伴工作
    const pm = window.app?.petMode || window.petMode;
    if (pm?._wanderActive) {
      pm._stopWander();
    }

    this.pomodoro.active = true;
    this.pomodoro.isBreak = false;
    this.pomodoro.workDuration = Math.max(1, minutes) * 60;
    this.pomodoro.remainingSeconds = this.pomodoro.workDuration;

    // 1. 联动角色进入专注工作姿态
    this._setPetWorkPose(true);

    // 2. 渲染微型悬浮番茄徽章
    this._renderPomodoroBadge();

    // 3. 提示气泡与语音
    const char = window.characterManager?.getCurrentCharacter();
    const charName = char?.name || '桌宠';
    const callName = this._getCallName(char?.id);
    const startMsg = `${charName}番茄时钟开启啦！25分钟专注冲刺开始，我会乖乖陪在${callName}身边一起努力~ 💼🌸`;
    this._showBubble(startMsg);

    // 4. 计时器主循环
    this.pomodoro.timerId = setInterval(() => {
      this.pomodoro.remainingSeconds--;
      this._updatePomodoroBadge();

      if (this.pomodoro.remainingSeconds <= 0) {
        clearInterval(this.pomodoro.timerId);
        this.pomodoro.timerId = null;
        if (!this.pomodoro.isBreak) {
          this._onWorkSessionCompleted();
        } else {
          this._onBreakSessionCompleted();
        }
      }
    }, 1000);
  }

  /** 停止/放弃番茄钟 */
  stopPomodoro(quiet = false) {
    if (this.pomodoro.timerId) {
      clearInterval(this.pomodoro.timerId);
      this.pomodoro.timerId = null;
    }
    const wasActive = this.pomodoro.active;
    this.pomodoro.active = false;
    this.pomodoro.isBreak = false;

    if (this.pomodoro.badgeElement) {
      this.pomodoro.badgeElement.remove();
      this.pomodoro.badgeElement = null;
    }

    if (wasActive && !quiet) {
      this._setPetWorkPose(false);
      const callName = this._getCallName();
      this._showBubble(`番茄钟已停止，辛苦${callName}啦，随时可以再次开启哦~ 🌸`);
    }
  }

  /** 25分钟专注完成，触发喝水伸懒腰提醒，发放 +10 羁绊 EXP，切入5分钟休息 */
  _onWorkSessionCompleted() {
    this.pomodoro.isBreak = true;
    this.pomodoro.remainingSeconds = this.pomodoro.breakDuration;

    // 恢复放松姿态
    this._setPetWorkPose(false);

    // 播放提示语音并发放专注陪伴好感度奖励 (+10 EXP)
    const charId = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    window.characterManager?.playVoice?.(charId, '02');
    window.emotionMemory?.addExp?.(charId, 10, '番茄钟专注陪伴达成');

    // 弹温馨关怀气泡
    const callName = this._getCallName(charId);
    const doneMsg = `滴答~ 25分钟专注达成（羁绊 +10 EXP）！🎉 ${callName}快端起水杯喝口水，站起来活动活动、伸个懒腰吧！5分钟休息时间开始咯~ 🍵✨`;
    this._showBubble(doneMsg);

    // 启动休息计时
    this._renderPomodoroBadge();
    this.pomodoro.timerId = setInterval(() => {
      this.pomodoro.remainingSeconds--;
      this._updatePomodoroBadge();

      if (this.pomodoro.remainingSeconds <= 0) {
        clearInterval(this.pomodoro.timerId);
        this.pomodoro.timerId = null;
        this._onBreakSessionCompleted();
      }
    }, 1000);
  }

  /** 休息结束 */
  _onBreakSessionCompleted() {
    this.stopPomodoro(true);
    const callName = this._getCallName();
    this._showBubble(`5分钟休息结束啦！精神充沛充满电，${callName}准备好开始下一个番茄时钟了吗？☀️`);
  }

  /** 姿态联动：若曦切换敲键盘工作，全阵容 9 大角色自动映射各自专注姿态 */
  _setPetWorkPose(isWork) {
    const pm = window.app?.petMode || window.petMode;
    if (pm?._renderMode === 'sprite') {
      const m = window.spriteAtlasManager;
      if (m && m.ready) {
        if (isWork) m.work(); else m.goIdle();
      }
    } else if (window.actionMenuManager) {
      const char = window.characterManager?.getCurrentCharacter();
      if (char) {
        if (isWork) {
          const focusPoseMap = {
            ruoxi: 'work',
            yukino: 'read',
            rem: 'fist',
            megumi: 'gentle',
            umaru: 'game',
            megumin: 'chant',
            miku: 'idle',
            takagi: 'blush',
            zerotwo: 'darling'
          };
          const actId = focusPoseMap[char.id] || 'idle';
          const data = window.actionMenuManager.getCharacterActions(char.id);
          const act = data?.actions?.find(a => a.id === actId);
          if (act && pm?._model) {
            if (act.motion) window.actionMenuManager.playModelMotion(pm._model, act.motion);
            if (act.expression) window.actionMenuManager.playModelExpression(pm._model, act.expression);
          }
        } else {
          window.actionMenuManager.playIdle(char.id);
        }
      }
    }
  }

  /** 渲染头顶微型番茄钟徽章 */
  _renderPomodoroBadge() {
    if (this.pomodoro.badgeElement) this.pomodoro.badgeElement.remove();

    const area = document.getElementById('pet-character-area') || document.body;
    const badge = document.createElement('div');
    badge.id = 'pet-pomodoro-badge';
    badge.className = 'pet-pomodoro-badge';
    badge.title = '番茄钟运行中：左键暂停/结束，右键重置';

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      this.stopPomodoro();
    });

    badge.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startPomodoro(25);
    });

    area.appendChild(badge);
    this.pomodoro.badgeElement = badge;
    this._updatePomodoroBadge();
  }

  /** 更新徽章文本与进度显示 */
  _updatePomodoroBadge() {
    if (!this.pomodoro.badgeElement) return;
    const sec = Math.max(0, this.pomodoro.remainingSeconds);
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    const icon = this.pomodoro.isBreak ? '☕' : '💼';
    const statusText = this.pomodoro.isBreak ? '休息' : '专注';
    this.pomodoro.badgeElement.innerHTML = `<span class="pomo-icon">${icon}</span> <span class="pomo-time">${m}:${s}</span> <span class="pomo-sub">${statusText}</span>`;
    this.pomodoro.badgeElement.classList.toggle('is-break', this.pomodoro.isBreak);
  }

  // =========================================================================
  // 2. 桌面系统硬件负荷感知（CPU/内存超载调侃）
  // =========================================================================

  _initSystemMonitor() {
    if (this.monitor.intervalId) clearInterval(this.monitor.intervalId);
    if (!this.monitor.enabled) return;

    // 每 30 秒进行一次轻量级硬件负载嗅探
    this.monitor.intervalId = setInterval(async () => {
      if (!window.electronAPI?.getSystemStatus) return;
      if (document.body.classList.contains('web-mode-active')) return; // 仅在桌宠模式下提醒

      try {
        const status = await window.electronAPI.getSystemStatus();
        if (!status || !status.success) return;

        const isHighMem = status.memPercent >= 86;
        const isHighCpu = status.cpuPercent >= 88;

        if (isHighMem || isHighCpu) {
          this.monitor.highLoadCount++;
          // 连续 2 次采样（满 1 分钟）高负载，且距离上次告警超过 10 分钟
          const now = Date.now();
          if (this.monitor.highLoadCount >= 2 && (now - this.monitor.lastAlertTime > 10 * 60 * 1000)) {
            this.monitor.lastAlertTime = now;
            this.monitor.highLoadCount = 0;
            this._triggerHighLoadQuip(status);
          }
        } else {
          this.monitor.highLoadCount = 0;
        }
      } catch (e) {}
    }, 30000);
  }

  /** 触发对应角色的专属趣味吐槽气泡 */
  _triggerHighLoadQuip(status) {
    const char = window.characterManager?.getCurrentCharacter();
    const id = char?.id || 'ruoxi';

    const quips = {
      ruoxi: '主人电脑风扇吹得好大风呀，若曦的狐狸尾巴都要被吹起来啦~ 是不是开太多软件了呢？(呼呼)',
      umaru: '欧尼酱！电脑风扇在呼呼大叫，小埋都要被吹飞啦！快关掉几个偷偷运行的程序嘛~ 💨',
      megumi: '那个……电脑的声音突然变大了呢，是在进行很吃力的运算吗？稍微注意一下散热哦~ 🌸',
      rem: '蕾姆检测到电脑在超负荷运转呢，辛苦了！蕾姆这就为昴君的电脑和您扇扇风降温~ 🪭',
      megumin: '吾乃惠惠！这炽烈翻滚的风暴……难道是搭档的电脑也在共鸣吾终极爆裂魔法的魔力吗？！💥',
      miku: '音乐的节拍有点被风扇声盖过去啦~ 电脑也在热情演奏呢，记得让它休息一下哦！🎵',
      yukino: '风扇发出的散热噪音稍微有些刺耳了。不管是人还是机器，过度超频都是不理智的行为，注意降温。☕',
      takagi: '诶~ 电脑的声音突然好大呢。该不会是……西片背着我偷偷开了什么很占内存的东西吧？嘻嘻~ 😏',
      zerotwo: 'DARLING，你的机器在躁动呢~ 像我驾驶鹤望兰号时一样热情呢！不过可别烧坏了哦。🍓',
      zero_two: 'DARLING，你的机器在躁动呢~ 像我驾驶鹤望兰号时一样热情呢！不过可别烧坏了哦。🍓'
    };

    const callName = this._getCallName(id);
    const line = quips[id] || `电脑似乎在超负荷全速运转呢，风扇呼呼响，${callName}注意设备散热哦~`;
    const detail = `[内存占用 ${status.memPercent}% · CPU ${status.cpuPercent}%]`;
    this._showBubble(`${line} \n${detail}`);
  }

  // =========================================================================
  // 3. 晨间天气与贴心穿衣问候
  // =========================================================================

  async _checkMorningWeatherCare() {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (this.weather.lastCareDate === todayStr) return; // 每天只在晨间关怀一次

    const hour = new Date().getHours();
    // 晨间唤醒时间窗（早晨 6:00 ~ 10:30）
    if (hour < 6 || hour > 10) return;

    // 延迟 4 秒等待角色模型初始化完成后再弹出温馨气泡
    setTimeout(async () => {
      try {
        let weatherInfo = null;
        if (window.electronAPI?.getWeatherInfo) {
          weatherInfo = await window.electronAPI.getWeatherInfo();
        }

        const callName = this._getCallName();
        let careLine = '';
        if (weatherInfo && weatherInfo.success) {
          const temp = parseInt(weatherInfo.temp) || 20;
          const desc = weatherInfo.weather || '晴';

          if (desc.includes('雨') || desc.includes('雪')) {
            careLine = `${callName}早安！今天外面好像有${desc}呢，出门千万记得带伞，小心着凉淋湿啦~ 🌧️`;
          } else if (temp <= 12) {
            careLine = `${callName}早上好！今天外面气温只有 ${temp}°C 呢，体感清冷，出门一定要多添件外套保暖哦~ 🧣`;
          } else if (temp >= 30) {
            careLine = `${callName}早安！今天外头晴热有 ${temp}°C 呢，出门注意防晒并多喝水哦~ 🥤`;
          } else {
            careLine = `${callName}早安！今天天气舒适（${temp}°C · ${desc}），又是元气满满的一天，${callName}今天也要开开心心哦！☀️🌸`;
          }
        } else {
          // 离线优雅降级
          careLine = `${callName}早安！新的一天开始啦，揉揉眼睛深呼吸，愿${callName}今天一切顺心如意~ ☀️🌸`;
        }

        this._showBubble(careLine);
        this.weather.lastCareDate = todayStr;
        localStorage.setItem('butler_last_weather_date', todayStr);
      } catch (e) {}
    }, 4500);
  }

  // =========================================================================
  // 4. 样式注入与菜单联动
  // =========================================================================

  _injectStyles() {
    if (document.getElementById('butler-custom-css')) return;
    const style = document.createElement('style');
    style.id = 'butler-custom-css';
    style.textContent = `
      /* 番茄钟悬浮徽章 */
      .pet-pomodoro-badge {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(255, 107, 107, 0.92), rgba(255, 142, 83, 0.92));
        color: #ffffff;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 12px rgba(255, 107, 107, 0.35);
        cursor: pointer;
        z-index: 100;
        pointer-events: auto;
        user-select: none;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.4);
        transition: all 0.25s ease;
        animation: pomoPulse 2s infinite ease-in-out;
      }
      .pet-pomodoro-badge:hover {
        transform: translateX(-50%) scale(1.08);
        box-shadow: 0 6px 16px rgba(255, 107, 107, 0.5);
      }
      .pet-pomodoro-badge.is-break {
        background: linear-gradient(135deg, rgba(74, 222, 128, 0.92), rgba(34, 197, 94, 0.92));
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
      }
      .pomo-time {
        font-family: monospace;
        letter-spacing: 0.5px;
      }
      .pomo-sub {
        font-size: 10px;
        opacity: 0.9;
        background: rgba(0, 0, 0, 0.15);
        padding: 1px 6px;
        border-radius: 10px;
      }
      @keyframes pomoPulse {
        0%, 100% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.03); }
      }
    `;
    document.head.appendChild(style);
  }

  /** 获取当前角色对用户的正统称呼（仅若曦叫主人，其他角色严格遵循原作设定） */
  _getCallName(charId) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    if (window.emotionMemory?.getCallName) {
      return window.emotionMemory.getCallName(id);
    }
    const defaultCalls = {
      ruoxi: '主人',
      umaru: '哥哥',
      yukino: '比企谷',
      takagi: '西片',
      zerotwo: '达令',
      megumi: '伦也君',
      megumin: '和真',
      rem: '昴君',
      miku: 'Master'
    };
    return defaultCalls[id] || '你';
  }
}

// 挂载全局单例
window.desktopButler = new DesktopButler();

// 页面加载完成后自启动管家
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.desktopButler.init());
} else {
  window.desktopButler.init();
}
