// ========================================
//  土间埋 - 角色设定
//  作品：干物妹！小埋（干物妹!うまるちゃん）
// ========================================

CHARACTER_REGISTRY.umaru = {
  id: 'umaru',
  name: '土间埋',
  nameJa: 'どま うまる',
  series: '干物妹！小埋',
  seriesJa: '干物妹!うまるちゃん',
  cv: '田中爱美',
  birthday: { month: 9, day: 26 },
  tagline: '可乐、薯片、打游戏，这就是小埋的终极生活！',
  description: '拥有双重面貌的高中少女。在学校是文武双全、万众瞩目的完美美少女；但一回到家就会披上标志性的橙色仓鼠斗篷，变成圆滚滚的二头身“干物妹”，最喜欢喝可乐、吃薯片、打游戏和向哥哥撒娇。',

  // 图片路径（相对于 index.html）
  avatar: '../../角色-土间埋/图片素材/头像.png',
  cover: '../../角色-土间埋/图片素材/封面.png',

  // 主题配色（活力仓鼠暖橙系）
  theme: {
    primary: '#ff7043',
    secondary: '#ffa726',
    accent: '#ffb74d',
    bg: 'rgba(255, 248, 240, 0.94)',
    bgLight: 'rgba(255, 243, 230, 0.9)',
    text: '#4e2a10',
    textSecondary: 'rgba(78, 42, 16, 0.65)',
    border: 'rgba(255, 112, 67, 0.28)',
    gradient: 'linear-gradient(135deg, #ff7043, #ffa726)',
    gradientSoft: 'linear-gradient(135deg, #ffa726, #ff7043)',
    gradientTitlebar: 'linear-gradient(135deg, #ffe0d0, #ffebd8, #fff3e6)',
    gradientBg: 'linear-gradient(180deg, rgba(255,248,240,0.97), rgba(255,240,228,0.95))',
    titleText: '#8e3810',
    hoverColor: 'rgba(255, 112, 67, 0.18)',
    shadowColor: 'rgba(220, 90, 40, 0.18)',
    glowColor: 'rgba(255, 112, 67, 0.38)',
    bubble1: 'rgba(255, 112, 67, 0.12)',
    bubble2: 'rgba(255, 167, 38, 0.1)',
    bubble3: 'rgba(255, 183, 77, 0.08)',
    tabActiveBg: 'linear-gradient(135deg, rgba(255,112,67,0.3), rgba(255,167,38,0.2))',
    tabActiveColor: '#8e3810',
    scrollbarThumb: 'rgba(255, 112, 67, 0.25)',
    scrollbarHover: 'rgba(255, 112, 67, 0.45)',
    inputFocusShadow: 'rgba(255, 112, 67, 0.18)',
    messageAiBg: 'rgba(255, 248, 240, 0.72)',
    messageUserBg: 'linear-gradient(135deg, rgba(255,224,178,0.5), rgba(255,204,128,0.4))',
    avatarAiBorder: 'rgba(255, 112, 67, 0.35)',
    avatarUserBg: 'rgba(255, 167, 38, 0.2)',
    codeBg: 'rgba(45, 25, 15, 0.95)',
    codeText: '#ffe0b2',
    codeLineNum: 'rgba(255, 112, 67, 0.35)',
    btnSendShadow: 'rgba(255, 112, 67, 0.35)',
    toastBg: 'linear-gradient(135deg, rgba(255,112,67,0.92), rgba(255,167,38,0.88))',
    loadingBg: 'rgba(255, 244, 235, 0.85)',
    settingsBg: 'rgba(255, 230, 215, 0.35)',
  },

  // Live2D 模型配置（Cubism 2.1 经典仓鼠斗篷高精度模型，含全套待机与点击动效）
  live2d: {
    fallbackImage: '../../角色-土间埋/图片素材/封面.png',
    modelPath: '../../角色-土间埋/Live2D模型/model.json',
  },

  // 原生CV语音配置（田中爱美原版动漫声库，共35段经典台词与交互语音）
  voice: {
    baseDir: '../../角色-土间埋/音频素材/',
    count: 35,
    format: 'wav'
  },

  // 以下字段由运行时从 txt 文件加载填充
  systemPrompt: null,
  lines: {}
};
