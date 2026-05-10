// ========================================
//  二次元桌宠 - 角色管理器
//  负责角色切换、主题应用、台词/提示词加载
//  优化：启动缓存、预缓存、主题批量更新
// ========================================

// 角色ID → 中文文件夹名映射
const CHARACTER_FOLDER_MAP = {
  megumi: '角色-加藤惠',
  rem: '角色-蕾姆',
  zerotwo: '角色-零二'
};

// 每个角色的台词文件列表（文件名 → 台词类别key）
const DIALOGUE_FILE_MAP = {
  '开机.txt': 'boot',
  '待机.txt': 'idle',
  '点击.txt': 'click',
  '吐槽.txt': 'tsukkomi',
  '温柔.txt': 'gentle',
  '吃醋.txt': 'jealous',
  '告别.txt': 'farewell',
  '特殊.txt': 'special',
  '天气.txt': 'weather',
  '夸奖.txt': 'praise',
  '晚安.txt': 'bedtime',
  '鼓励.txt': 'encouragement',
  '美食.txt': 'food',
  '料理.txt': 'cooking',
  '自我怀疑.txt': 'self_doubt',
  '调情.txt': 'playful',
  '孤独.txt': 'loneliness'
};

// CSS属性映射表（theme key → CSS variable name），用于批量主题更新
const THEME_CSS_MAP = {
  primary: '--primary-color',
  secondary: '--secondary-color',
  accent: '--accent-color',
  bg: '--bg-color',
  bgLight: '--bg-light',
  text: '--text-color',
  textSecondary: '--text-secondary',
  border: '--border-color',
  gradient: '--gradient-main',
  gradientSoft: '--gradient-soft',
  gradientBg: '--gradient-bg',
  gradientTitlebar: '--titlebar-bg',
  titleText: '--title-text',
  hoverColor: '--hover-color',
  shadowColor: '--shadow-color',
  glowColor: '--glow-color',
  bubble1: '--bubble-1',
  bubble2: '--bubble-2',
  bubble3: '--bubble-3',
  tabActiveBg: '--tab-active-bg',
  tabActiveColor: '--tab-active-color',
  scrollbarThumb: '--scrollbar-thumb',
  scrollbarHover: '--scrollbar-hover',
  inputFocusShadow: '--input-focus-shadow',
  messageAiBg: '--message-ai-bg',
  messageUserBg: '--message-user-bg',
  avatarAiBorder: '--avatar-ai-border',
  avatarUserBg: '--avatar-user-bg',
  codeBg: '--code-bg',
  codeText: '--code-text',
  codeLineNum: '--code-line-num',
  btnSendShadow: '--btn-send-shadow',
  toastBg: '--toast-bg',
  loadingBg: '--loading-bg',
  settingsBg: '--settings-bg',
};

class CharacterManager {
  constructor() {
    this.registry = window.CHARACTER_REGISTRY || {};
    this.currentCharacterId = null;
    this.currentCharacter = null;
    this._loadedCharacters = new Set();
    this._cachedTheme = null; // 缓存上次应用的主题，避免重复设置
    this._precacheTimer = null;
  }

  // 异步加载单个角色的台词和系统提示词（懒加载，带缓存）
  async loadCharacterData(characterId) {
    if (this._loadedCharacters.has(characterId)) return;
    await this._loadCharacterTextData(characterId);
    this._loadedCharacters.add(characterId);
  }

  // 启动时预加载当前角色 + 后台预缓存其他角色
  async loadSavedCharacter() {
    const savedId = localStorage.getItem('selected-character') || 'megumi';
    // 先加载当前角色数据
    await this.loadCharacterData(savedId);
    const success = await this.switchCharacter(savedId);
    // 后台预缓存其他角色（不阻塞）
    this._precacheOtherCharacters(savedId);
    return success ? savedId : 'megumi';
  }

  // 后台预缓存非当前角色的资源
  _precacheOtherCharacters(currentId) {
    const otherIds = Object.keys(this.registry).filter(id => id !== currentId);
    // 延迟2秒后开始预缓存，避免影响启动性能
    this._precacheTimer = setTimeout(async () => {
      for (const id of otherIds) {
        if (!this._loadedCharacters.has(id)) {
          await this._loadCharacterTextData(id);
          this._loadedCharacters.add(id);
        }
      }
    }, 2000);
  }

  // 预缓存指定角色（供外部调用，如鼠标悬停角色卡时）
  async precacheCharacter(characterId) {
    if (this._loadedCharacters.has(characterId)) return;
    await this._loadCharacterTextData(characterId);
    this._loadedCharacters.add(characterId);
  }

  async _loadCharacterTextData(characterId) {
    const folder = CHARACTER_FOLDER_MAP[characterId];
    if (!folder) return;

    const character = this.registry[characterId];
    if (!character) return;

    try {
      // 加载系统提示词
      const promptPath = `../../${folder}/系统提示词.txt`;
      const promptResp = await fetch(promptPath);
      if (promptResp.ok) {
        character.systemPrompt = (await promptResp.text()).trim();
      }

      // 并行加载所有台词文件
      const linePromises = Object.entries(DIALOGUE_FILE_MAP).map(async ([fileName, key]) => {
        const filePath = `../../${folder}/台词/${fileName}`;
        try {
          const resp = await fetch(filePath);
          if (resp.ok) {
            const text = await resp.text();
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length > 0) {
              character.lines[key] = lines;
            }
          }
        } catch (e) {
          // 文件不存在时静默跳过
        }
      });

      await Promise.all(linePromises);
    } catch (error) {
      // 静默处理
    }
  }

  getAllCharacters() {
    return Object.keys(this.registry).map(id => ({
      id,
      name: this.registry[id].name,
      series: this.registry[id].series,
      tagline: this.registry[id].tagline,
      theme: this.registry[id].theme,
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

  getCurrentCharacter() {
    return this.currentCharacter;
  }

  getSystemPrompt() {
    return this.currentCharacter?.systemPrompt || '';
  }

  getRandomLine(situation) {
    const lines = this.currentCharacter?.lines?.[situation];
    if (!lines || lines.length === 0) {
      return '……';
    }
    return lines[Math.floor(Math.random() * lines.length)];
  }

  getSituations() {
    return Object.keys(this.currentCharacter?.lines || {});
  }

  getAvatarPath() {
    return this.currentCharacter?.avatar || '../../核心通用代码/默认素材/默认头像.png';
  }

  getCoverPath() {
    return this.currentCharacter?.cover || this.currentCharacter?.live2d?.fallbackImage || '../../核心通用代码/默认素材/默认封面.png';
  }

  // 优化：批量更新CSS变量，跳过未变化的值
  applyTheme(theme) {
    if (!theme) return;

    const root = document.documentElement;
    const prev = this._cachedTheme;
    const newCache = {};

    // 批量设置直接映射的CSS变量
    for (const [key, cssVar] of Object.entries(THEME_CSS_MAP)) {
      const val = theme[key];
      if (val && (!prev || prev[key] !== val)) {
        root.style.setProperty(cssVar, val);
      }
      newCache[key] = val;
    }

    // 派生变量（基于主题值计算）
    const derived = {
      '--avatar-ai-bg': theme.avatarAiBorder?.replace(/[\d.]+\)$/, '0.15)'),
      '--code-placeholder': theme.codeLineNum?.replace(/[\d.]+\)$/, '0.25)'),
      '--btn-send-hover-shadow': theme.btnSendShadow?.replace(/[\d.]+\)$/, '0.45)'),
      '--toast-shadow': theme.btnSendShadow?.replace(/[\d.]+\)$/, '0.35)'),
      '--loading-border': theme.border,
      '--loading-shadow': theme.glowColor?.replace(/[\d.]+\)$/, '0.15)'),
      '--input-bg': theme.bgLight,
      '--input-border': theme.border,
      '--live2d-bg-start': theme.bg,
      '--live2d-bg-end': theme.bgLight,
      '--live2d-fade': theme.bg,
      '--mood-color': theme.textSecondary,
      '--code-inline-bg': theme.bubble1,
      '--code-inline-color': theme.text,
      '--pre-bg': theme.bg,
      '--pre-border': theme.border,
      '--close-hover-bg': theme.primary + '99',
      '--option-bg': theme.bg,
      '--range-bg': theme.border,
      '--range-thumb-shadow': theme.glowColor,
      '--card-hover-shadow': theme.shadowColor,
      '--card-hover-border': theme.border,
      '--card-active-shadow': theme.primary + '33',
      '--avatar-user-border': theme.primary + '40',
    };

    for (const [cssVar, val] of Object.entries(derived)) {
      if (val) root.style.setProperty(cssVar, val);
    }

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
