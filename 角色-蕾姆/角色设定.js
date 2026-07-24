// ========================================
//  蕾姆 - 角色设定
//  作品：Re:从零开始的异世界生活（Re:ゼロから始める異世界生活）
// ========================================

CHARACTER_REGISTRY.rem = {
  id: 'rem',
  name: '蕾姆',
  nameJa: 'レム',
  series: 'Re:从零开始的异世界生活',
  seriesJa: 'Re:ゼロから始める異世界生活',
  cv: '水濑祈',
  birthday: { month: 2, day: 2 },
  tagline: '蕾姆觉得，这就是蕾姆的全部了',
  description: '罗兹瓦尔宅邸的双子女仆之一，外表温柔内心坚韧。曾因童年创伤而自我否定，在遇到昴后找到了活下去的意义。',

  // 图片路径（相对于 index.html）
  avatar: '../../角色-蕾姆/图片素材/头像.png',
  cover: '../../角色-蕾姆/图片素材/封面.png',

  // 主题配色（蓝色系）
  theme: {
    primary: '#6ea8d9',
    secondary: '#8ec5e8',
    accent: '#a8d8f0',
    bg: 'rgba(240, 248, 255, 0.94)',
    bgLight: 'rgba(235, 245, 255, 0.9)',
    text: '#3a4a5a',
    textSecondary: 'rgba(58, 74, 90, 0.6)',
    border: 'rgba(110, 168, 217, 0.25)',
    gradient: 'linear-gradient(135deg, #6ea8d9, #5a90c0)',
    gradientSoft: 'linear-gradient(135deg, #8ec5e8, #6ea8d9)',
    gradientTitlebar: 'linear-gradient(135deg, #d8ecf8, #c8e0f0, #b8d4e8)',
    gradientBg: 'linear-gradient(180deg, rgba(240,248,255,0.97), rgba(230,242,255,0.95))',
    titleText: '#4a6a8a',
    hoverColor: 'rgba(110, 168, 217, 0.18)',
    shadowColor: 'rgba(100, 150, 200, 0.15)',
    glowColor: 'rgba(110, 168, 217, 0.35)',
    bubble1: 'rgba(110, 168, 217, 0.12)',
    bubble2: 'rgba(180, 200, 240, 0.1)',
    bubble3: 'rgba(160, 210, 240, 0.08)',
    tabActiveBg: 'linear-gradient(135deg, rgba(110,168,217,0.3), rgba(140,180,230,0.2))',
    tabActiveColor: '#4a6a8a',
    scrollbarThumb: 'rgba(110, 168, 217, 0.25)',
    scrollbarHover: 'rgba(110, 168, 217, 0.4)',
    inputFocusShadow: 'rgba(110, 168, 217, 0.15)',
    messageAiBg: 'rgba(240, 248, 255, 0.7)',
    messageUserBg: 'linear-gradient(135deg, rgba(180,210,240,0.5), rgba(160,200,235,0.4))',
    avatarAiBorder: 'rgba(110, 168, 217, 0.3)',
    avatarUserBg: 'rgba(160, 200, 230, 0.2)',
    codeBg: 'rgba(35, 45, 60, 0.95)',
    codeText: '#d0dde8',
    codeLineNum: 'rgba(110, 168, 217, 0.3)',
    btnSendShadow: 'rgba(110, 168, 217, 0.3)',
    toastBg: 'linear-gradient(135deg, rgba(110,168,217,0.9), rgba(140,180,230,0.85))',
    loadingBg: 'rgba(235, 245, 255, 0.8)',
    settingsBg: 'rgba(200, 225, 245, 0.35)',
  },

  // Live2D 配置（本地模型）
  live2d: {
    fallbackImage: '../../角色-蕾姆/图片素材/封面.png',
    modelPath: '../../角色-蕾姆/Live2D模型/model.model3.json',
  },

  // VRM 配置
  vrm: {
    modelPath: '../../角色-蕾姆/蕾姆vrm.vrm',
  },

  // 以下字段由运行时从 txt 文件加载填充
  systemPrompt: null,
  lines: {}
};
