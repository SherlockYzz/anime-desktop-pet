
// ========================================
//  二次元桌宠 - 角色管理器
//  职责：角色切换、主题应用、台词加载与缓存、原作台词集管理
//  依赖：工具函数.js (CHARACTER_FOLDER_MAP)
// ========================================

const DIALOGUE_FILE_MAP = {
  '开机.txt': 'boot', '待机.txt': 'idle', '点击.txt': 'click',
  '吐槽.txt': 'tsukkomi', '温柔.txt': 'gentle', '吃醋.txt': 'jealous',
  '告别.txt': 'farewell', '特殊.txt': 'special', '天气.txt': 'weather',
  '夸奖.txt': 'praise', '晚安.txt': 'bedtime', '鼓励.txt': 'encouragement',
  '美食.txt': 'food', '料理.txt': 'cooking', '自我怀疑.txt': 'self_doubt',
  '调情.txt': 'playful', '孤独.txt': 'loneliness',
  '捉弄.txt': 'tease', '毒舌.txt': 'sharp_tongue'
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
    // ★ 启动时清除所有台词缓存，确保从文件读取最新内容
    this._clearAllDialogueCache();
    // ★ 等待自定义角色加载完成
    // ★ 自定义角色加载带3秒超时，防止IPC卡住阻塞整个启动流程
    const customCharPromise = window.customCharManager
      ? window.customCharManager.loadCustomCharacters()
      : Promise.resolve();
    const timeoutPromise = new Promise(resolve => setTimeout(() => {
      console.warn('[CharacterManager] 自定义角色加载超时(3s)，继续启动');
      resolve();
    }, 3000));
    this._customCharactersReady = Promise.race([customCharPromise, timeoutPromise]);
  }

  /** 获取台词缓存版本号（基于日期，一天一变；不影响提示词热更新） */
  _getCacheVersion() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }

  /** 从 localStorage 读取缓存的台词 */
  _getCachedDialogue(characterId) {
    const key = `dialogue_cache_${characterId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // 校验缓存版本，过期则丢弃
      if (data._version !== this._getCacheVersion()) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  /** 将台词写入 localStorage 缓存 */
  _setCachedDialogue(characterId, lines) {
    const key = `dialogue_cache_${characterId}`;
    try {
      const data = { _version: this._getCacheVersion(), lines };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      // localStorage 可能满，忽略
    }
  }

  /** 启动时清除所有角色的台词缓存，确保文件修改立即生效 */
  _clearAllDialogueCache() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('dialogue_cache_') || key.startsWith('prompt_cache_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) { /* 忽略 */ }
  }

  async checkModelFileExists(path) {
    if (!path) return false;
    if (this._modelExistsCache.has(path)) return this._modelExistsCache.get(path);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(path, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timer);
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
    // ★ 提示词永远从文件加载最新版（不加缓存）
    //    台词会缓存到 localStorage 中加速下次启动
    await this._loadCharacterTextData(characterId);
  }

  /** 只加载系统提示词（最核心，API必需），不加载台词文件 */
  async loadCharacterSystemPromptOnly(characterId) {
    const character = this.registry[characterId];
    if (!character) return;

    // ★ 自定义角色：提示词已在注册时加载到内存
    if (character.isCustom) {
      const customPrompt = this.getCustomPrompt(characterId);
      character.systemPrompt = customPrompt || character._defaultSystemPrompt || '';
      return;
    }

    const folder = CHARACTER_FOLDER_MAP[characterId];
    if (!folder || !character) return;

    // ★ 先尝试从缓存读取系统提示词（同台词缓存，一天一变）
    const cacheKey = `prompt_cache_${characterId}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data._version === this._getCacheVersion()) {
          character._defaultSystemPrompt = data.prompt;
          character.systemPrompt = this.getCustomPrompt(characterId) || data.prompt;
          // 同时加载台词缓存
          const cachedLines = this._getCachedDialogue(characterId);
          if (cachedLines && cachedLines.lines) {
            for (const [situation, lines] of Object.entries(cachedLines.lines)) {
              character.lines[situation] = lines;
            }
          }
          return; // ★ 缓存命中，跳过文件 fetch
        }
      }
    } catch (e) { /* 忽略 */ }

    try {
      const promptPath = `../../${folder}/系统提示词.txt?t=${Date.now()}`;
      const promptResp = await fetch(promptPath, { cache: 'no-store' });
      if (promptResp.ok) {
        const filePrompt = (await promptResp.text()).trim();
        character._defaultSystemPrompt = filePrompt;
        const customPrompt = this.getCustomPrompt(characterId);
        character.systemPrompt = customPrompt || filePrompt;
        // ★ 写入缓存
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            _version: this._getCacheVersion(),
            prompt: filePrompt
          }));
        } catch (e) { /* localStorage 满 */ }
      }
    } catch (e) { /* 静默 */ }

    // ★ 尝试从缓存读取台词，这样 UI 能先显示
    const cached = this._getCachedDialogue(characterId);
    if (cached && cached.lines) {
      for (const [situation, lines] of Object.entries(cached.lines)) {
        character.lines[situation] = lines;
      }
    }
  }

  /** 后台加载台词文件（不阻塞启动） */
  async loadCharacterDialoguesInBackground(characterId) {
    const character = this.registry[characterId];
    // ★ 自定义角色没有台词文件
    if (character?.isCustom) {
      this._loadedCharacters.add(characterId);
      return;
    }

    const folder = CHARACTER_FOLDER_MAP[characterId];

    // ★ 如果已有缓存，跳过（UI 所需的台词已经在 loadCharacterSystemPromptOnly 里加载了）
    const cached = this._getCachedDialogue(characterId);
    if (cached && cached.lines) {
      // 台词已在内存中，只需确保 _loadedCharacters 标记
      this._loadedCharacters.add(characterId);
      return;
    }

    await this._loadDialogueFiles(characterId);
  }

  /** 仅加载台词文件（不含系统提示词） */
  async _loadDialogueFiles(characterId) {
    const folder = CHARACTER_FOLDER_MAP[characterId];
    const character = this.registry[characterId];
    if (!folder || !character) return;

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

    // ★ 加载原作台词集
    try {
      const canonPath = `../../${folder}/原作台词集.txt`;
      const canonResp = await fetch(canonPath);
      if (canonResp.ok) {
        const canonText = await canonResp.text();
        const canonLines = canonText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (canonLines.length > 0) character.lines._canonical = canonLines;
      }
    } catch (e) { /* 跳过 */ }

    this._loadedCharacters.add(characterId);

    // ★ 写入缓存，下次启动不再请求文件
    this._setCachedDialogue(characterId, character.lines);
  }

  // ★ 启动时加载当前角色（分两阶段）
  async loadSavedCharacter() {
    // ★ 等待自定义角色注册完成
    await this._customCharactersReady;

    const savedId = localStorage.getItem('selected-character') || 'megumi';

    // ★ 阶段A：只加载核心（系统提示词），让UI尽快显示
    await this.loadCharacterSystemPromptOnly(savedId);
    const success = await this.switchCharacter(savedId);

    // ★ 阶段B：在后台加载台词文件（不阻塞 showLoading(false)）
    setTimeout(() => {
      this.loadCharacterDialoguesInBackground(savedId).catch(() => {});
    }, 100);

    // ★ 不再预缓存其他角色——改成按需加载，点击角色卡片时才预加载
    return success ? savedId : 'megumi';
  }

  async precacheCharacter(characterId) {
    // ★ 按需预加载：先尝试读缓存，再走文件
    const cached = this._getCachedDialogue(characterId);
    if (cached && cached.lines) {
      const character = this.registry[characterId];
      if (character) {
        for (const [situation, lines] of Object.entries(cached.lines)) {
          character.lines[situation] = lines;
        }
        this._loadedCharacters.add(characterId);
      }
      return;
    }
    await this._loadDialogueFiles(characterId);
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

  async deleteCustomPrompt(characterId) {
    localStorage.removeItem(CharacterManager.CUSTOM_PROMPT_PREFIX + characterId);
    // ★ 清除文件内容缓存，确保恢复默认时从文件重新读取最新内容
    localStorage.removeItem('prompt_cache_' + characterId);
    const character = this.registry[characterId];
    if (character) {
      character._defaultSystemPrompt = null; // 标记为待重新加载
      character.systemPrompt = character._defaultSystemPrompt || '';
    }
    if (this.currentCharacterId === characterId) {
      if (window.mimoAPI) window.mimoAPI.clearHistory();
    }
    // ★ 立即从文件重新加载默认提示词（等待完成）
    await this.loadCharacterSystemPromptOnly(characterId);
  }
  async _loadCharacterTextData(characterId) {
    // ★ 完整加载（提示词+台词），由 switchCharacter 在切换角色时完整调用
    await this.loadCharacterSystemPromptOnly(characterId);
    await this.loadCharacterDialoguesInBackground(characterId);
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

    // ★ 完整加载：系统提示词 + 台词文件（保持和改之前一样的行为）
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

  // 核心场景：优先从原作台词集取
  static _CANONICAL_SITUATIONS = new Set(['boot', 'click', 'idle', 'farewell']);

  getRandomLine(situation) {
    const char = this.currentCharacter;
    if (!char?.lines) return '……';

    // 核心场景 + 有原作台词集 → 从原作台词集随机选
    if (CharacterManager._CANONICAL_SITUATIONS.has(situation) && char.lines._canonical?.length > 0) {
      return char.lines._canonical[Math.floor(Math.random() * char.lines._canonical.length)];
    }

    const lines = char.lines[situation];
    return (lines && lines.length > 0) ? lines[Math.floor(Math.random() * lines.length)] : '……';
  }

  // 获取原作台词集（供前端管理界面使用）
  getCanonicalLines() {
    return this.currentCharacter?.lines?._canonical || [];
  }

  // 添加原作台词
  addCanonicalLine(line) {
    if (!this.currentCharacter?.lines) return;
    if (!this.currentCharacter.lines._canonical) this.currentCharacter.lines._canonical = [];
    this.currentCharacter.lines._canonical.push(line);
    this._saveCanonicalToFile();
  }

  // 删除原作台词
  removeCanonicalLine(index) {
    const lines = this.currentCharacter?.lines?._canonical;
    if (!lines || index < 0 || index >= lines.length) return;
    lines.splice(index, 1);
    this._saveCanonicalToFile();
  }

  // 将原作台词集保存到文件（通过 IPC 调用主进程）
  async _saveCanonicalToFile() {
    const folder = CHARACTER_FOLDER_MAP[this.currentCharacterId];
    if (!folder) return;
    const lines = this.currentCharacter?.lines?._canonical || [];
    try {
      if (window.electronAPI?.saveCanonicalLines) {
        await window.electronAPI.saveCanonicalLines(folder, lines);
      }
    } catch (e) { /* 忽略 */ }
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
