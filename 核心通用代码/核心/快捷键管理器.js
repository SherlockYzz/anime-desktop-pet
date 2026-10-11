// ========================================
//  二次元桌宠 - 快捷键管理器 (ShortcutManager)
//  支持：
//  1. 解除快捷键 / 一键开启停用 / 防打字模式（仅方向键）
//  2. 快捷键功能全览（分类清晰展示、可视按键徽章）
//  3. 自定义按键绑定（点击录制、按键冲突检测、一键恢复默认）
// ========================================

class ShortcutManager {
  constructor() {
    this.STORAGE_KEY = 'pet-shortcuts-config-v1';
    this.isRecording = false;
    this.recordingAction = null;
    this.recordingIndex = null;
    this._menuOpen = false;

    // 默认配置定义
    this.DEFAULT_CONFIG = {
      enabled: true,         // 总开关：true=开启, false=彻底解除/停用
      arrowOnlyMode: false,  // 防打字模式：true=仅方向键有效，屏蔽所有字母键
      bindings: {
        // 四向移动
        moveUp:    ['w', 'ArrowUp'],
        moveDown:  ['s', 'ArrowDown'],
        moveLeft:  ['a', 'ArrowLeft'],
        moveRight: ['d', 'ArrowRight'],
        // 核心交互动作
        jump:   [' '],
        work:   ['e'],
        sleep:  ['z'],
        wander: ['t'],
        bubble: ['b'],
        // 姿态直达 (数字键 1~8)
        anim1:  ['1'],
        anim2:  ['2'],
        anim3:  ['3'],
        anim4:  ['4'],
        anim5:  ['5'],
        anim6:  ['6'],
        anim7:  ['7'],
        anim8:  ['8']
      }
    };

    // 动作元数据（展示标签与分组）
    this.ACTION_META = {
      moveUp:    { label: 'Move Up / Run', group: 'move', icon: '⬆️' },
      moveDown:  { label: 'Move Down / Run', group: 'move', icon: '⬇️' },
      moveLeft:  { label: 'Move Left / Run', group: 'move', icon: '⬅️' },
      moveRight: { label: 'Move Right / Run', group: 'move', icon: '➡️' },
      jump:      { label: 'Charged Jump', group: 'action', icon: '⚡' },
      work:      { label: 'Focus Work / Typing', group: 'action', icon: '💼' },
      sleep:     { label: 'Sleep / Rest', group: 'action', icon: '🌙' },
      wander:    { label: 'Free Desktop Wander', group: 'action', icon: '🐾' },
      bubble:    { label: 'Toggle Speech Bubble', group: 'action', icon: '💬' },
      anim1:     { label: 'Pose 1: Idle Breath', group: 'pose', icon: '🌸' },
      anim2:     { label: 'Pose 2: Wave Hello', group: 'pose', icon: '👋' },
      anim3:     { label: 'Pose 3: Charged Jump', group: 'pose', icon: '⚡' },
      anim4:     { label: 'Pose 4: Free Wander', group: 'pose', icon: '🐾' },
      anim5:     { label: 'Pose 5: Waiting', group: 'pose', icon: '💭' },
      anim6:     { label: 'Pose 6: Work Hard', group: 'pose', icon: '💼' },
      anim7:     { label: 'Pose 7: Show Result', group: 'pose', icon: '📜' },
      anim8:     { label: 'Pose 8: Sleep', group: 'pose', icon: '🌙' }
    };

    this.config = this.loadConfig();
    this._bindGlobalEvents();
  }

  /** 加载本地配置，不存在则回退至官方默认 */
  loadConfig() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
          arrowOnlyMode: typeof parsed.arrowOnlyMode === 'boolean' ? parsed.arrowOnlyMode : false,
          bindings: Object.assign({}, this.DEFAULT_CONFIG.bindings, parsed.bindings || {})
        };
      }
    } catch (e) {
      console.warn('[ShortcutManager] 读取配置失败，采用默认值:', e);
    }
    return JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
  }

  /** 保存配置至本地存储 */
  saveConfig() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('[ShortcutManager] 保存配置失败:', e);
    }
    this.renderUI();
  }

  /** 快捷键总开关 */
  isEnabled() {
    return !!this.config.enabled;
  }

  /** 获取所有快捷键信息列表 */
  getShortcuts() {
    return Object.entries(this.config.bindings || {}).map(([actionId, keys]) => {
      const meta = this.ACTION_META[actionId] || {};
      return {
        id: actionId,
        label: meta.label || actionId,
        group: meta.group || 'action',
        icon: meta.icon || '⌨️',
        keys: keys || []
      };
    });
  }

  /** 是否处于防打字模式（仅方向键） */
  isArrowOnlyMode() {
    return !!this.config.arrowOnlyMode;
  }

  isAntiTypingMode() {
    return this.isArrowOnlyMode();
  }

  /** 切换启用/禁用状态 */
  toggleEnabled(state) {
    this.config.enabled = (typeof state === 'boolean') ? state : !this.config.enabled;
    this.saveConfig();
    return this.config.enabled;
  }

  /** 切换“防打字模式（仅方向键，彻底屏蔽字母键）” */
  toggleArrowOnlyMode(state) {
    this.config.arrowOnlyMode = (typeof state === 'boolean') ? state : !this.config.arrowOnlyMode;
    this.saveConfig();
    return this.config.arrowOnlyMode;
  }

  setAntiTypingMode(state) {
    return this.toggleArrowOnlyMode(state);
  }

  /** 一键解除全部快捷键（完全停用并清空所有按键绑定） */
  clearAllShortcuts() {
    this.config.enabled = false;
    for (const key of Object.keys(this.config.bindings)) {
      this.config.bindings[key] = [];
    }
    this.saveConfig();
  }

  /** 一键恢复官方默认设置 */
  resetToDefaults() {
    this.config = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
    this.saveConfig();
  }

  /** 设置单个按键自定义绑定 */
  setBinding(action, index, keyString) {
    if (!this.config.bindings[action]) {
      this.config.bindings[action] = [];
    }
    const cleanKey = this._normalizeKey(keyString);
    if (!cleanKey) return false;

    // 清除其他动作中的重复冲突键
    for (const [otherAction, keys] of Object.entries(this.config.bindings)) {
      if (otherAction === action) continue;
      this.config.bindings[otherAction] = keys.filter(k => k.toLowerCase() !== cleanKey.toLowerCase());
    }

    if (index >= 0 && index < this.config.bindings[action].length) {
      this.config.bindings[action][index] = cleanKey;
    } else {
      this.config.bindings[action].push(cleanKey);
    }
    this.saveConfig();
    return true;
  }

  /** 移除单个绑定的快捷键 */
  removeBinding(action, index) {
    if (this.config.bindings[action]) {
      this.config.bindings[action].splice(index, 1);
      this.saveConfig();
    }
  }

  /** 格式化按键名称展示 */
  formatKeyDisplay(key) {
    if (!key) return '';
    const map = {
      ' ': 'Space 空格',
      'ArrowUp': '↑ 上方向',
      'ArrowDown': '↓ 下方向',
      'ArrowLeft': '← 左方向',
      'ArrowRight': '→ 右方向',
      'Escape': 'Esc',
      'Control': 'Ctrl'
    };
    if (map[key]) return map[key];
    if (key.length === 1) return key.toUpperCase();
    return key;
  }

  /** 检查指定按键对应的移动方向 ('up' | 'down' | 'left' | 'right' | null) */
  getMovementDirection(pressedKey) {
    if (!this.config.enabled) return null;
    const pk = pressedKey.toLowerCase();
    const isArrow = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(pk);

    // 防打字模式：只允许方向键移动
    if (this.config.arrowOnlyMode && !isArrow) return null;

    const b = this.config.bindings;
    if (this._hasKey(b.moveUp, pk)) return 'up';
    if (this._hasKey(b.moveDown, pk)) return 'down';
    if (this._hasKey(b.moveLeft, pk)) return 'left';
    if (this._hasKey(b.moveRight, pk)) return 'right';
    return null;
  }

  /** 检查指定按键对应的动作标识 ('jump', 'work', 'sleep' 等) */
  getAction(pressedKey) {
    if (!this.config.enabled) return null;
    const pk = pressedKey.toLowerCase();

    // 防打字模式：仅允许空格跳跃，屏蔽字母按键
    if (this.config.arrowOnlyMode) {
      if (pk === ' ' && this._hasKey(this.config.bindings.jump, pk)) return 'jump';
      return null;
    }

    const b = this.config.bindings;
    for (const [actionId, keys] of Object.entries(b)) {
      if (['moveUp', 'moveDown', 'moveLeft', 'moveRight'].includes(actionId)) continue;
      if (this._hasKey(keys, pk)) return actionId;
    }
    return null;
  }

  _hasKey(keyList, targetKeyLower) {
    if (!Array.isArray(keyList)) return false;
    return keyList.some(k => (k === ' ' && targetKeyLower === ' ') || (k && k.toLowerCase() === targetKeyLower));
  }

  _normalizeKey(key) {
    if (!key) return null;
    if (key === ' ' || key === 'Space' || key === 'Spacebar') return ' ';
    if (key.startsWith('Arrow')) return key;
    if (key.length === 1) return key.toLowerCase();
    return key;
  }

  // ============ UI 面板与事件交互 ============
  toggleMenu(show) {
    const next = (typeof show === 'boolean') ? show : !this._menuOpen;
    this._menuOpen = next;
    const menu = document.getElementById('pet-shortcuts-menu');
    if (menu) {
      menu.classList.toggle('show', next);
      if (next) this.renderUI();
    }
    // 互斥关闭其他弹窗
    if (next && window.app?.petMode) {
      window.app.petMode._toggleActionMenu?.(false);
      window.app.petMode._toggleScaleMenu?.(false);
    }
  }

  _bindGlobalEvents() {
    // 全局快捷键与点击按键录制处理
    window.addEventListener('keydown', (e) => {
      // F1 键无论在哪个模式下，均可一键呼出/关闭快捷键一览与自定义面板
      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        this.toggleMenu();
        return;
      }

      if (!this.isRecording) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        // Esc 取消录制
        this._cancelRecording();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        // Backspace / Delete 解除当前按键绑定
        this.removeBinding(this.recordingAction, this.recordingIndex);
        this._cancelRecording();
        return;
      }

      this.setBinding(this.recordingAction, this.recordingIndex, e.key);
      this._cancelRecording();
    }, true);

    // 点击外部关闭快捷键菜单及标题栏/设置按钮点击分发
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-shortcuts-titlebar') || e.target.closest('#btn-open-shortcuts-settings')) {
        e.stopPropagation();
        this.toggleMenu();
        return;
      }

      if (!e.target.closest('#pet-shortcuts-menu') && 
          !e.target.closest('#btn-pet-shortcuts') &&
          !e.target.closest('.btn-open-shortcuts-from-menu') &&
          !e.target.closest('#btn-shortcuts-titlebar') &&
          !e.target.closest('#btn-open-shortcuts-settings')) {
        if (this._menuOpen) this.toggleMenu(false);
      }
    });
  }

  _cancelRecording() {
    this.isRecording = false;
    this.recordingAction = null;
    this.recordingIndex = null;
    this.renderUI();
  }

  /** 动态渲染快捷键功能一览与自定义面板 */
  renderUI() {
    const container = document.getElementById('pet-shortcuts-menu');
    if (!container) return;

    const isEnabled = this.config.enabled;
    const isArrowOnly = this.config.arrowOnlyMode;

    const groups = [
      { id: 'move', title: '🏃 Desktop Movement (Anti-typing Core)' },
      { id: 'action', title: '⚡ Common Actions & Interactivity' },
      { id: 'pose', title: '🌸 Number Keys 1~8 Poses' }
    ];

    container.innerHTML = `
      <div class="pet-shortcuts-header">
        <span class="pet-shortcuts-title">⌨️ Shortcuts Guide & Custom Key Bindings</span>
        <button class="btn-close-shortcuts" id="btn-close-shortcuts" title="Close">&#x2715;</button>
      </div>

      <div class="pet-shortcuts-toolbar">
        <div class="shortcuts-status-pill ${isEnabled ? 'enabled' : 'disabled'}">
          ${isEnabled ? (isArrowOnly ? '🛡️ Arrow Keys Only (Anti-typing)' : '🟢 Shortcuts Enabled') : '🔴 Shortcuts Disabled (Free Typing)'}
        </div>
        <div class="shortcuts-actions-row">
          <button class="shortcut-btn-tool ${isEnabled ? 'btn-warn' : 'btn-success'}" id="btn-toggle-shortcut-enabled">
            ${isEnabled ? '🚫 Disable Shortcuts' : '✅ Enable Shortcuts'}
          </button>
          <button class="shortcut-btn-tool ${isArrowOnly ? 'btn-active-tool' : ''}" id="btn-toggle-arrow-only" title="Arrow keys only, freely type letters without pet moving">
            ${isArrowOnly ? '⚡ Restore Full Keys' : '🛡️ Anti-typing Mode'}
          </button>
          <button class="shortcut-btn-tool" id="btn-reset-shortcut-defaults" title="Restore factory default keybindings">
            🔄 Reset Defaults
          </button>
        </div>
      </div>

      <div class="pet-shortcuts-body">
        ${!isEnabled ? `
          <div class="shortcuts-disabled-notice">
            💬 <strong>Shortcuts are fully disabled!</strong><br>
            You can type freely; the pet will ignore keyboard input.<br>
            Click [Enable Shortcuts] above whenever you want pet control back.
          </div>
        ` : ''}

        ${groups.map(grp => `
          <div class="shortcut-group-card">
            <div class="shortcut-group-title">${grp.title}</div>
            <div class="shortcut-items-list">
              ${Object.entries(this.ACTION_META)
                .filter(([_, meta]) => meta.group === grp.id)
                .map(([actionId, meta]) => {
                  const currentKeys = this.config.bindings[actionId] || [];
                  return `
                    <div class="shortcut-item-row">
                      <span class="shortcut-label">
                        <span class="shortcut-icon">${meta.icon}</span> ${meta.label}
                      </span>
                      <div class="shortcut-keys-container">
                        ${currentKeys.map((k, idx) => {
                          const isRec = this.isRecording && this.recordingAction === actionId && this.recordingIndex === idx;
                          return `
                            <span class="shortcut-kbd-badge ${isRec ? 'recording' : ''}" 
                                  data-action="${actionId}" 
                                  data-index="${idx}" 
                                  title="Click to rebind; press Backspace to unbind">
                              ${isRec ? 'Press key...' : this.formatKeyDisplay(k)}
                              <span class="badge-remove" data-action="${actionId}" data-index="${idx}" title="Unbind">&times;</span>
                            </span>
                          `;
                        }).join('')}
                        <button class="btn-add-shortcut-key" data-action="${actionId}" title="Add key">+</button>
                      </div>
                    </div>
                  `;
                }).join('')}
            </div>
          </div>
        `).join('')}

        <div class="shortcut-group-card sys-card">
          <div class="shortcut-group-title">⚙️ System Keys (Global Safety)</div>
          <div class="shortcut-item-row">
            <span class="shortcut-label">🔄 Switch to Chat Mode / Close Panels</span>
            <div class="shortcut-keys-container">
              <span class="shortcut-kbd-badge system-badge">Esc</span>
              <span class="shortcut-kbd-badge system-badge">F2</span>
            </div>
          </div>
        </div>

        <div class="shortcuts-footer-tips">
          💡 <strong>Tip</strong>: Click key badge to record; press <code>Backspace</code> or <code>Delete</code> to unbind. Turn on [Anti-typing Mode] for uninterrupted typing.
        </div>
      </div>
    `;

    // 绑定面板内部按钮事件
    container.querySelector('#btn-close-shortcuts')?.addEventListener('click', () => this.toggleMenu(false));
    container.querySelector('#btn-toggle-shortcut-enabled')?.addEventListener('click', () => {
      this.toggleEnabled();
      if (window.app?.petMode) {
        window.app.petMode._showBubble?.(this.config.enabled ? 'Shortcuts enabled 🟢' : 'Shortcuts disabled 🔴 (Free typing)');
      }
    });
    container.querySelector('#btn-toggle-arrow-only')?.addEventListener('click', () => {
      this.toggleArrowOnlyMode();
      if (window.app?.petMode) {
        window.app.petMode._showBubble?.(this.config.arrowOnlyMode ? '🛡️ Anti-typing mode active (Arrow keys only)' : '⚡ Full shortcuts restored');
      }
    });
    container.querySelector('#btn-reset-shortcut-defaults')?.addEventListener('click', () => {
      this.resetToDefaults();
      if (window.app?.petMode) window.app.petMode._showBubble?.('Shortcuts reset to defaults 🔄');
    });

    // 绑定按键录制点击
    container.querySelectorAll('.shortcut-kbd-badge:not(.system-badge)').forEach(badge => {
      badge.addEventListener('click', (e) => {
        if (e.target.classList.contains('badge-remove')) {
          e.stopPropagation();
          const act = e.target.dataset.action;
          const idx = parseInt(e.target.dataset.index, 10);
          this.removeBinding(act, idx);
          return;
        }
        const act = badge.dataset.action;
        const idx = parseInt(badge.dataset.index, 10);
        this.isRecording = true;
        this.recordingAction = act;
        this.recordingIndex = idx;
        this.renderUI();
      });
    });

    // 绑定添加新键
    container.querySelectorAll('.btn-add-shortcut-key').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.action;
        if (!this.config.bindings[act]) this.config.bindings[act] = [];
        const nextIdx = this.config.bindings[act].length;
        this.config.bindings[act].push('?');
        this.isRecording = true;
        this.recordingAction = act;
        this.recordingIndex = nextIdx;
        this.renderUI();
      });
    });
  }
}

// 挂载全局单例
window.shortcutManager = new ShortcutManager();
