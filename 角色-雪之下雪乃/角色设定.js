// ========================================
//  雪之下雪乃 - 角色设定
//  作品：我的青春恋爱物语果然有问题（やはり俺の青春ラブコメはまちがっている）
// ========================================

CHARACTER_REGISTRY.yukino = {
  id: 'yukino',
  name: '雪之下雪乃',
  nameJa: 'ゆきのした ゆきの',
  series: '我的青春恋爱物语果然有问题',
  seriesJa: 'やはり俺の青春ラブコメはまちがっている',
  cv: '早见沙织',
  birthday: { month: 1, day: 7 },
  tagline: '我只是在陈述事实而已',
  description: '总武高中侍奉部部长，成绩年级第一，外表冷艳内心温柔。因童年经历而习惯独立，不善表达感情。在与比企谷的相处中逐渐学会依赖他人。',
  avatar: '../../角色-雪之下雪乃/图片素材/头像.png',
  cover: '../../角色-雪之下雪乃/图片素材/封面.png',

  // 主题配色（蓝紫色系，对应雪乃的冷艳深邃气质）
  theme: {
    primary: '#6a7fb8',
    secondary: '#8a9ad0',
    accent: '#a8b8e0',
    bg: 'rgba(240, 245, 255, 0.94)',
    bgLight: 'rgba(235, 240, 252, 0.9)',
    text: '#3a4060',
    textSecondary: 'rgba(58, 64, 96, 0.6)',
    border: 'rgba(106, 127, 184, 0.25)',
    gradient: 'linear-gradient(135deg, #6a7fb8, #5a6fa8)',
    gradientSoft: 'linear-gradient(135deg, #8a9ad0, #6a7fb8)',
    gradientTitlebar: 'linear-gradient(135deg, #d8e0f5, #ccd4f0, #c0c8e8)',
    gradientBg: 'linear-gradient(180deg, rgba(240,245,255,0.97), rgba(232,238,250,0.95))',
    titleText: '#4a5a8a',
    hoverColor: 'rgba(106, 127, 184, 0.18)',
    shadowColor: 'rgba(90, 110, 170, 0.15)',
    glowColor: 'rgba(106, 127, 184, 0.35)',
    bubble1: 'rgba(106, 127, 184, 0.12)',
    bubble2: 'rgba(140, 160, 210, 0.1)',
    bubble3: 'rgba(170, 185, 230, 0.08)',
    tabActiveBg: 'linear-gradient(135deg, rgba(106,127,184,0.3), rgba(130,150,210,0.2))',
    tabActiveColor: '#4a5a8a',
    scrollbarThumb: 'rgba(106, 127, 184, 0.25)',
    scrollbarHover: 'rgba(106, 127, 184, 0.4)',
    inputFocusShadow: 'rgba(106, 127, 184, 0.15)',
    messageAiBg: 'rgba(240, 245, 255, 0.7)',
    messageUserBg: 'linear-gradient(135deg, rgba(170,185,230,0.5), rgba(160,175,220,0.4))',
    avatarAiBorder: 'rgba(106, 127, 184, 0.3)',
    avatarUserBg: 'rgba(160, 175, 220, 0.2)',
    codeBg: 'rgba(35, 40, 60, 0.95)',
    codeText: '#d0d8e8',
    codeLineNum: 'rgba(106, 127, 184, 0.3)',
    btnSendShadow: 'rgba(106, 127, 184, 0.3)',
    toastBg: 'linear-gradient(135deg, rgba(106,127,184,0.9), rgba(130,150,210,0.85))',
    loadingBg: 'rgba(235, 240, 252, 0.8)',
    settingsBg: 'rgba(200, 215, 245, 0.35)',
  },

  live2d: {
    fallbackImage: '../../角色-雪之下雪乃/图片素材/封面.png',
    modelPath: '../../角色-雪之下雪乃/Live2D模型/model.model3.json',
  },

  // 以下字段由运行时从 txt 文件加载填充
  systemPrompt: null,
  lines: {}
};
