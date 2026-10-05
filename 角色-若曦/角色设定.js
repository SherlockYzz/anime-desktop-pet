// ========================================
//  若曦 (Ruo Xi) - 角色设定
//  作品：原创 · 白狐仙少女（Codex v2 精灵表桌宠）
// ========================================

CHARACTER_REGISTRY.ruoxi = {
  id: 'ruoxi',
  name: '若曦',
  nameJa: 'ルオシー',
  series: '原创 · 白狐仙',
  seriesJa: 'オリジナル',
  cv: '—',
  birthday: { month: 12, day: 21 },
  tagline: '我用一生，陪你一个冬夏',
  description: '修行多年的白狐仙少女，白发赤瞳，狐耳狐尾，额心焰印。安静、机敏、忠诚，略带倦意与傲娇；不擅长说漂亮话，却总在无声处陪着你。',

  // 图片路径（相对于 index.html）
  avatar: '../../角色-若曦/图片素材/头像.png',
  cover: '../../角色-若曦/图片素材/封面.png',

  // 主题配色（红白 · 金 · 狐仙系）
  theme: {
    primary: '#d94f4f',
    secondary: '#e8a0a0',
    accent: '#e8b04a',
    bg: 'rgba(255, 250, 248, 0.94)',
    bgLight: 'rgba(255, 244, 240, 0.9)',
    text: '#5a3a3a',
    textSecondary: 'rgba(90, 58, 58, 0.6)',
    border: 'rgba(217, 79, 79, 0.22)',
    gradient: 'linear-gradient(135deg, #d94f4f, #b83a3a)',
    gradientSoft: 'linear-gradient(135deg, #e8a0a0, #d94f4f)',
    gradientTitlebar: 'linear-gradient(135deg, #fde8e4, #f6d6cf, #f3e2c8)',
    gradientBg: 'linear-gradient(180deg, rgba(255,250,248,0.97), rgba(255,242,236,0.95))',
    titleText: '#8a5555',
    hoverColor: 'rgba(217, 79, 79, 0.16)',
    shadowColor: 'rgba(180, 120, 110, 0.15)',
    glowColor: 'rgba(217, 79, 79, 0.30)',
    bubble1: 'rgba(217, 79, 79, 0.10)',
    bubble2: 'rgba(232, 176, 74, 0.10)',
    bubble3: 'rgba(240, 210, 200, 0.10)',
    tabActiveBg: 'linear-gradient(135deg, rgba(217,79,79,0.28), rgba(232,176,74,0.20))',
    tabActiveColor: '#7a4a4a',
    scrollbarThumb: 'rgba(217, 79, 79, 0.25)',
    scrollbarHover: 'rgba(217, 79, 79, 0.4)',
    inputFocusShadow: 'rgba(217, 79, 79, 0.15)',
    messageAiBg: 'rgba(255, 255, 255, 0.68)',
    messageUserBg: 'linear-gradient(135deg, rgba(246,214,207,0.5), rgba(243,226,200,0.4))',
    avatarAiBorder: 'rgba(217, 79, 79, 0.3)',
    avatarUserBg: 'rgba(232, 176, 74, 0.2)',
    codeBg: 'rgba(50, 38, 38, 0.95)',
    codeText: '#e6d0cc',
    codeLineNum: 'rgba(217, 79, 79, 0.3)',
    btnSendShadow: 'rgba(217, 79, 79, 0.3)',
    toastBg: 'linear-gradient(135deg, rgba(217,79,79,0.9), rgba(232,176,74,0.85))',
    loadingBg: 'rgba(255, 246, 242, 0.8)',
    settingsBg: 'rgba(246, 226, 220, 0.35)',
  },

  // 精灵表渲染配置（若曦专用 · 与网页版 pet_manifest 同源）
  sprite: {
    atlas: '../../角色-若曦/精灵表/若曦_pets_v2_atlas.png',
    sleepStrip: '../../角色-若曦/精灵表/sleep.png',
    manifest: '../../角色-若曦/精灵表/pet_manifest.json',
    cell: { w: 192, h: 208 },
    cols: 8,
    rows: 11,
  },

  // 无 Live2D / VRM，走精灵表渲染
  live2d: null,
  vrm: null,

  // 以下字段由运行时从 txt 文件加载填充
  systemPrompt: null,
  lines: {}
};
