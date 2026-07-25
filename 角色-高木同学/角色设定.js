// ========================================
//  高木同学 - 角色设定
//  作品：擅长捉弄的高木同学（からかい上手の高木さん）
// ========================================

CHARACTER_REGISTRY.takagi = {
  id: 'takagi',
  name: '高木同学',
  nameJa: 'たかぎ',
  series: '擅长捉弄的高木同学',
  seriesJa: 'からかい上手の高木さん',
  cv: '高桥李依',
  birthday: { month: 9, day: 5 },
  tagline: '又捉弄到你了呢',
  description: '西片的同班女生，总是坐在他旁边。擅长看穿西片的心思并捉弄他，笑容温柔又狡黠。虽然经常让西片害羞脸红，但其实内心非常喜欢他。',
  avatar: '../../角色-高木同学/图片素材/头像.png',
  cover: '../../角色-高木同学/图片素材/封面.png',

  // 主题配色（粉黄色系，对应高木同学的温暖活泼形象）
  theme: {
    primary: '#f0a0b0',
    secondary: '#f5c0a0',
    accent: '#f8d8c0',
    bg: 'rgba(255, 248, 245, 0.94)',
    bgLight: 'rgba(255, 244, 240, 0.9)',
    text: '#5a4040',
    textSecondary: 'rgba(90, 64, 64, 0.6)',
    border: 'rgba(240, 160, 176, 0.25)',
    gradient: 'linear-gradient(135deg, #f0a0b0, #f5c0a0)',
    gradientSoft: 'linear-gradient(135deg, #f5c0a0, #f0a0b0)',
    gradientTitlebar: 'linear-gradient(135deg, #fde8e0, #f8e0d8, #f5d8d0)',
    gradientBg: 'linear-gradient(180deg, rgba(255,248,245,0.97), rgba(255,242,238,0.95))',
    titleText: '#8a6060',
    hoverColor: 'rgba(240, 160, 176, 0.18)',
    shadowColor: 'rgba(220, 150, 160, 0.15)',
    glowColor: 'rgba(240, 160, 176, 0.35)',
    bubble1: 'rgba(240, 160, 176, 0.12)',
    bubble2: 'rgba(245, 192, 160, 0.1)',
    bubble3: 'rgba(248, 216, 192, 0.08)',
    tabActiveBg: 'linear-gradient(135deg, rgba(240,160,176,0.3), rgba(245,192,160,0.2))',
    tabActiveColor: '#8a6060',
    scrollbarThumb: 'rgba(240, 160, 176, 0.25)',
    scrollbarHover: 'rgba(240, 160, 176, 0.4)',
    inputFocusShadow: 'rgba(240, 160, 176, 0.15)',
    messageAiBg: 'rgba(255, 248, 245, 0.7)',
    messageUserBg: 'linear-gradient(135deg, rgba(245,200,180,0.5), rgba(240,180,170,0.4))',
    avatarAiBorder: 'rgba(240, 160, 176, 0.3)',
    avatarUserBg: 'rgba(240, 180, 170, 0.2)',
    codeBg: 'rgba(55, 40, 40, 0.95)',
    codeText: '#e8d0d0',
    codeLineNum: 'rgba(240, 160, 176, 0.3)',
    btnSendShadow: 'rgba(240, 160, 176, 0.3)',
    toastBg: 'linear-gradient(135deg, rgba(240,160,176,0.9), rgba(245,192,160,0.85))',
    loadingBg: 'rgba(255, 244, 240, 0.8)',
    settingsBg: 'rgba(248, 220, 210, 0.35)',
  },

  live2d: {
    fallbackImage: '../../角色-高木同学/图片素材/封面.png',
    modelPath: '../../角色-高木同学/Live2D模型/model.model3.json',
  },

  // 以下字段由运行时从 txt 文件加载填充
  systemPrompt: null,
  lines: {}
};
