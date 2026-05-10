// ========================================
//  零二（02） - 角色设定
//  作品：DARLING in the FRANXX
// ========================================

CHARACTER_REGISTRY.zerotwo = {
  id: 'zerotwo',
  name: '02',
  nameJa: 'ゼロツー',
  series: 'DARLING in the FRANXX',
  seriesJa: 'DARLING in the FRANXX',
  cv: '户松遥',
  birthday: { month: 1, day: 1 },
  tagline: '你就是我的DARLING',
  description: '拥有龙族血统的少女，代号002（Zero Two）。拥有红色角和粉色长发，外表妖艳内心渴望成为人类。被称为"搭档杀手"但内心深处只想找到童年时遇见的男孩。',

  // 图片路径（相对于 index.html）
  avatar: '../../角色-零二/图片素材/头像.png',
  cover: '../../角色-零二/图片素材/封面.png',

  // 主题配色（红色系）
  theme: {
    primary: '#e85a7a',
    secondary: '#f08090',
    accent: '#f5a0b0',
    bg: 'rgba(255, 245, 248, 0.94)',
    bgLight: 'rgba(255, 240, 244, 0.9)',
    text: '#5a3040',
    textSecondary: 'rgba(90, 48, 64, 0.6)',
    border: 'rgba(232, 90, 122, 0.25)',
    gradient: 'linear-gradient(135deg, #e85a7a, #d04060)',
    gradientSoft: 'linear-gradient(135deg, #f08090, #e85a7a)',
    gradientTitlebar: 'linear-gradient(135deg, #fce8ee, #f8d8e4, #f0c8d8)',
    gradientBg: 'linear-gradient(180deg, rgba(255,245,248,0.97), rgba(255,238,242,0.95))',
    titleText: '#8a4a60',
    hoverColor: 'rgba(232, 90, 122, 0.18)',
    shadowColor: 'rgba(200, 100, 130, 0.15)',
    glowColor: 'rgba(232, 90, 122, 0.35)',
    bubble1: 'rgba(232, 90, 122, 0.12)',
    bubble2: 'rgba(240, 160, 180, 0.1)',
    bubble3: 'rgba(250, 180, 200, 0.08)',
    tabActiveBg: 'linear-gradient(135deg, rgba(232,90,122,0.3), rgba(220,120,150,0.2))',
    tabActiveColor: '#8a4060',
    scrollbarThumb: 'rgba(232, 90, 122, 0.25)',
    scrollbarHover: 'rgba(232, 90, 122, 0.4)',
    inputFocusShadow: 'rgba(232, 90, 122, 0.15)',
    messageAiBg: 'rgba(255, 248, 250, 0.7)',
    messageUserBg: 'linear-gradient(135deg, rgba(240,180,200,0.5), rgba(235,170,195,0.4))',
    avatarAiBorder: 'rgba(232, 90, 122, 0.3)',
    avatarUserBg: 'rgba(230, 160, 180, 0.2)',
    codeBg: 'rgba(55, 35, 45, 0.95)',
    codeText: '#e8ccd5',
    codeLineNum: 'rgba(232, 90, 122, 0.3)',
    btnSendShadow: 'rgba(232, 90, 122, 0.3)',
    toastBg: 'linear-gradient(135deg, rgba(232,90,122,0.9), rgba(220,120,150,0.85))',
    loadingBg: 'rgba(255, 240, 244, 0.8)',
    settingsBg: 'rgba(248, 210, 225, 0.35)',
  },

  // Live2D 配置（本地模型）
  live2d: {
    fallbackImage: '../../角色-零二/图片素材/封面.png',
    modelPath: '../../角色-零二/Live2D模型/model.model3.json',
  },

  // 以下字段由运行时从 txt 文件加载填充
  systemPrompt: null,
  lines: {}
};
