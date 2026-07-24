
// ========================================
//  二次元桌宠 - 角色管理器
//  优化：台词本地缓存（避免重复fetch）、模型文件缓存
// ========================================

const CHARACTER_FOLDER_MAP = {
  megumi: '角色-加藤惠',
  rem: '角色-蕾姆',
  zerotwo: '角色-零二'
};

const DIALOGUE_FILE_MAP = {
  '开机.txt': 'boot', '待机.txt': 'idle', '点击.txt': 'click',
  '吐槽.txt': 'tsukkomi', '温柔.txt': 'gentle', '吃醋.txt': 'jealous',
  '告别.txt': 'farewell', '特殊.txt': 'special', '天气.txt': 'weather',
  '夸奖.txt': 'praise', '晚安.txt': 'bedtime', '鼓励.txt': 'encouragement',
  '美食.txt': 'food', '料理.txt': 'cooking', '自我怀疑.txt': 'self_doubt',
  '调情.txt': 'playful', '孤独.txt': 'loneliness'
};

// CSS属性映射表
const THEME_CSS_MAP = {
  primary: '--primary-color', secondary: '--secondary-color', accent: '--accent-color',
  bg: '--bg-color', bgLight: '--bg-light', text: '--text-color',
  textSecondary: '--text-secondary', border: '--border-color',
  hoverColor: '--hover-color', shadowColor: '--shadow-color', glowColor: '--glow-color',
  gradient: '--gradient-main', gradientSoft: '--gradient-soft', gradientBg: '--gradient-bg',
  gradientTitlebar: '--titlebar-bg', titleText: '--title-text',
  scrollbarThumb: '--scrollbar-thumb', scrollbarHover: '--scrollbar-hover',
  btnSendShadow: '--btn-send-shadow', btnSendHoverShadow: '--btn-send-hover-shadow',
  toastBg: '--toast-bg', toastShadow: '--toast-shadow',
  codeBg: '--code-bg', codeText: '--code-text', codeLineNum: '--code-line-num',
  codePlaceholder: '--code-placeholder', settingsBg: '--settings-bg',
  inputBg: '--input-bg', inputBorder: '--input-border',
  inputFocusShadow: '--input-focus-shadow',
  live2dBgStart: '--live2d-bg-start', live2dBgEnd: '--live2d-bg-end',
  live2dFade: '--live2d-fade', moodColor: '--mood-color',
  tabActiveBg: '--tab-active-bg', tabActiveColor: '--tab-active-color',
  messageAiBg: '--message-ai-bg', messageUserBg: '--message-user-bg',
  avatarAiBorder: '--avatar-ai-border', avatarAiBg: '--avatar-ai-bg',
  avatarUserBg: '--avatar-user-bg', avatarUserBorder: '--avatar-user-border',
  codeInlineBg: '--code-inline-bg', codeInlineColor: '--code-inline-color',
  preBg: '--pre-bg', preBorder: '--pre-border',
  closeHoverBg: '--close-hover-bg', optionBg: '--option-bg',
  rangeBg: '--range-bg', rangeThumbShadow: '--range-thumb-shadow',
  cardHoverShadow: '--card-hover-shadow', cardHoverBorder: '--card-hover-border',
  cardActiveShadow: '--card-active-shadow',
  loadingBg: '--loading-bg', loadingBorder: '--loading-border', loadingShadow: '--loading-shadow',
};

class CharacterManager {
  constructor() {
    this.registry = window.CHARACTER_REGISTRY || {};
    this.currentCharacterId = null;
    this.currentCharacter = null;
    this._loadedCharacters = new Set();
    this._cachedTheme = null;
    this._precacheTimer = null;
    this._modelExistsCache = new Map();
    // ★ 启动时彻底清理所有旧缓存，文件是唯一源
    this._purgeAllCache();
  }

  /** 清除 localStorage 中所有旧版本对话缓存（自定义提示词保留，那是用户主动保存的） */
  _purgeAllCache() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dialogue_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log(`[CharacterManager] 已清理 ${keysToRemove.length} 个旧对话缓存`);
    }
  }

  async checkModelFileExists(path) {
    if (!path) return false;
    if (this._modelExistsCache.has(path)) return this._modelExistsCache.get(path);
    try {
      const resp = await fetch(path, { method: 'HEAD' });
      const exists = resp.ok;
      this._modelExistsCache.set(path, exists);
      return exists;
    } catch {
      this._modelExistsCache.set(path, false);
      return false;
    }
  }

  async precheckModelFiles() {
    const promises = Object.values(this.registry).flatMap(char => {
      const paths = [];
      if (char.live2d?.modelPath) paths.push(char.live2d.modelPath);
      if (char.vrm?.modelPath) paths.push(char.vrm.modelPath);
      return paths.map(p => this.checkModelFileExists(p));
    });
    await Promise.allSettled(promises);
  }

  async loadCharacterData(characterId) {
    // ★ 不加缓存保护，每次都重新从文件加载，确保提示词永远是最新版
    await this._loadCharacterTextData(characterId);
  }

  // ★ 启动时加载当前角色
  async loadSavedCharacter() {
    const savedId = localStorage.getItem('selected-character') || 'megumi';
    await this.loadCharacterData(savedId);
    const success = await this.switchCharacter(savedId);
    this._precacheOtherCharacters(savedId);
    return success ? savedId : 'megumi';
  }

  _precacheOtherCharacters(currentId) {
    const otherIds = Object.keys(this.registry).filter(id => id !== currentId);
    this._precacheTimer = setTimeout(async () => {
      for (const id of otherIds) {
        await this._loadCharacterTextData(id);
      }
    }, 5000);
  }

  async precacheCharacter(characterId) {
    await this._loadCharacterTextData(characterId);
  }
  // ★ 自定义提示词：用户可通过设置面板自由修改角色的系统提示词
  // 优先级：localStorage 自定义 > 文件加载的提示词
  static CUSTOM_PROMPT_PREFIX = 'custom_prompt_';

  setCustomPrompt(characterId, prompt) {
    const character = this.registry[characterId];
    if (!character) return false;

    const trimmedPrompt = (prompt || '').trim();
    if (trimmedPrompt) {
      localStorage.setItem(CharacterManager.CUSTOM_PROMPT_PREFIX + characterId, trimmedPrompt);
    } else {
      localStorage.removeItem(CharacterManager.CUSTOM_PROMPT_PREFIX + characterId);
    }

    // 立即更新内存中的 systemPrompt
    character.systemPrompt = trimmedPrompt || character._defaultSystemPrompt || '';

    // 如果当前正在使用这个角色，重置对话历史让其使用新提示词
    if (this.currentCharacterId === characterId) {
      if (window.mimoAPI) window.mimoAPI.clearHistory();
    }

    return true;
  }

  getCustomPrompt(characterId) {
    return localStorage.getItem(CharacterManager.CUSTOM_PROMPT_PREFIX + characterId) || '';
  }

  deleteCustomPrompt(characterId) {
    localStorage.removeItem(CharacterManager.CUSTOM_PROMPT_PREFIX + characterId);
    const character = this.registry[characterId];
    if (character) {
      character.systemPrompt = character._defaultSystemPrompt || '';
    }
    if (this.currentCharacterId === characterId) {
      if (window.mimoAPI) window.mimoAPI.clearHistory();
    }
  }
  async _loadCharacterTextData(characterId) {
    const folder = CHARACTER_FOLDER_MAP[characterId];
    const character = this.registry[characterId];
    if (!folder || !character) return;

    try {
      // ★ 只从文件加载，不用任何缓存——加 ?t= 时间戳绕过浏览器 HTTP 缓存，每次都是最新版
      const promptPath = `../../${folder}/系统提示词.txt?t=${Date.now()}`;
      const promptResp = await fetch(promptPath, { cache: 'no-store' });
      if (promptResp.ok) {
        const filePrompt = (await promptResp.text()).trim();
        character._defaultSystemPrompt = filePrompt;
        // ★ 自定义提示词优先：如果 localStorage 中有用户通过设置面板保存的自定义提示词则使用自定义
        const customPrompt = this.getCustomPrompt(characterId);
        character.systemPrompt = customPrompt || filePrompt;
      }

      const linePromises = Object.entries(DIALOGUE_FILE_MAP).map(async ([fileName, key]) => {
        const filePath = `../../${folder}/台词/${fileName}`;
        try {
          const resp = await fetch(filePath);
          if (resp.ok) {
            const text = await resp.text();
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length > 0) character.lines[key] = lines;
          }
        } catch (e) { /* 跳过 */ }
      });
      await Promise.all(linePromises);

      this._loadedCharacters.add(characterId);
    } catch (error) { /* 静默处理 */ }
  }

  getAllCharacters() {
    return Object.keys(this.registry).map(id => ({
      id, name: this.registry[id].name, series: this.registry[id].series,
      tagline: this.registry[id].tagline, theme: this.registry[id].theme,
      avatar: this.registry[id].avatar,
    }));
  }

  async switchCharacter(characterId) {
    if (!this.registry[characterId]) return false;
    await this.loadCharacterData(characterId);
    this.currentCharacterId = characterId;
    this.currentCharacter = this.registry[characterId];
    localStorage.setItem('selected-character', characterId);
    this.applyTheme(this.currentCharacter.theme);
    this.updateTitleBar(this.currentCharacter.name);
    this.updateTray(this.currentCharacter.name);
    return true;
  }

  getCurrentCharacter() { return this.currentCharacter; }
  getSystemPrompt() { return this.currentCharacter?.systemPrompt || ''; }

  getRandomLine(situation) {
    const lines = this.currentCharacter?.lines?.[situation];
    return (lines && lines.length > 0) ? lines[Math.floor(Math.random() * lines.length)] : '……';
  }

  getSituations() { return Object.keys(this.currentCharacter?.lines || {}); }
  getAvatarPath() { return this.currentCharacter?.avatar || '../../核心通用代码/默认素材/默认头像.png'; }
  getCoverPath() { return this.currentCharacter?.cover || this.currentCharacter?.live2d?.fallbackImage || '../../核心通用代码/默认素材/默认封面.png'; }

  applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;
    const prev = this._cachedTheme;
    const newCache = {};
    for (const [key, cssVar] of Object.entries(THEME_CSS_MAP)) {
      const val = theme[key];
      if (val && (!prev || prev[key] !== val)) root.style.setProperty(cssVar, val);
      newCache[key] = val;
    }
    const derived = {};
    if (theme.bgLight) { derived['--input-bg'] = theme.bgLight; derived['--settings-bg'] = theme.bgLight; }
    if (theme.border) derived['--input-border'] = theme.border;
    if (theme.bg) { derived['--live2d-bg-start'] = theme.bg; derived['--live2d-fade'] = theme.bg; }
    if (theme.bgLight) derived['--live2d-bg-end'] = theme.bgLight;
    if (theme.textSecondary) derived['--mood-color'] = theme.textSecondary;
    if (theme.avatarAiBorder) derived['--avatar-ai-bg'] = theme.avatarAiBorder.replace(/[\d.]+\)$/, '0.15)');
    if (theme.primary) { derived['--close-hover-bg'] = theme.primary + '99'; derived['--card-active-shadow'] = theme.primary + '33'; derived['--avatar-user-border'] = theme.primary + '40'; }
    if (theme.bubble1) derived['--code-inline-bg'] = theme.bubble1;
    if (theme.text) derived['--code-inline-color'] = theme.text;
    if (theme.bg) { derived['--pre-bg'] = theme.bg; derived['--option-bg'] = theme.bg; }
    if (theme.border) { derived['--pre-border'] = theme.border; derived['--range-bg'] = theme.border; derived['--card-hover-border'] = theme.border; derived['--loading-border'] = theme.border; }
    if (theme.btnSendShadow) { derived['--btn-send-hover-shadow'] = theme.btnSendShadow.replace(/[\d.]+\)$/, '0.45)'); derived['--toast-shadow'] = theme.btnSendShadow.replace(/[\d.]+\)$/, '0.35)'); }
    if (theme.codeLineNum) derived['--code-placeholder'] = theme.codeLineNum.replace(/[\d.]+\)$/, '0.25)');
    if (theme.shadowColor) derived['--card-hover-shadow'] = theme.shadowColor;
    if (theme.glowColor) { derived['--loading-shadow'] = theme.glowColor.replace(/[\d.]+\)$/, '0.15)'); derived['--range-thumb-shadow'] = theme.glowColor; }
    for (const [k, v] of Object.entries(derived)) { if (v) root.style.setProperty(k, v); }
    this._cachedTheme = newCache;
  }

  updateTitleBar(name) {
    const petName = document.querySelector('.pet-name');
    if (petName) petName.textContent = name;
    document.title = `${name} - 桌宠`;
  }

  updateTray(name) {
    if (window.electronAPI?.updateTrayLabel) {
      window.electronAPI.updateTrayLabel(name, this.getAvatarPath());
    }
  }

  isBirthday() {
    if (!this.currentCharacter?.birthday) return false;
    const now = new Date();
    return (now.getMonth() + 1) === this.currentCharacter.birthday.month
        && now.getDate() === this.currentCharacter.birthday.day;
  }

  getCharacterSummary() {
    if (!this.currentCharacter) return '';
    const c = this.currentCharacter;
    return `${c.name}（${c.nameJa}）- ${c.series}\n${c.description}`;
  }
}

window.characterManager = new CharacterManager();
