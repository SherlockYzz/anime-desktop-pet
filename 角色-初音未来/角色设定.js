// ========================================
//  初音未来 - 角色设定
//  作品：VOCALOID（ボーカロイド）
// ========================================

CHARACTER_REGISTRY.miku = {
  id: 'miku',
  name: '初音未来',
  nameJa: '初音ミク',
  series: 'VOCALOID',
  seriesJa: 'ボーカロイド',
  cv: '藤田咲',
  birthday: { month: 8, day: 31 },
  tagline: '用歌声将心意传达给你！',
  description: '世界第一的电子歌姬、VOCALOID 象征符号与公主殿下。标志性的葱绿色双马尾与未来感制服，拥有纯澈治愈的电子声线与充满元气的笑容。用跃动的旋律与舞台为你带来永不落幕的温暖与力量。',

  // 图片路径（相对于 index.html）
  avatar: '../../角色-初音未来/图片素材/头像.png',
  cover: '../../角色-初音未来/图片素材/封面.png',

  // 主题配色（未来葱绿色系）
  theme: {
    primary: '#39c5bb',
    secondary: '#00cec9',
    accent: '#ff7675',
    bg: 'rgba(240, 253, 250, 0.94)',
    bgLight: 'rgba(230, 250, 246, 0.9)',
    text: '#134e4a',
    textSecondary: 'rgba(19, 78, 74, 0.65)',
    border: 'rgba(57, 197, 187, 0.28)',
    gradient: 'linear-gradient(135deg, #39c5bb, #00cec9)',
    gradientSoft: 'linear-gradient(135deg, #00cec9, #39c5bb)',
    gradientTitlebar: 'linear-gradient(135deg, #d8f5f0, #e2f8f5, #e8faf8)',
    gradientBg: 'linear-gradient(180deg, rgba(240,253,250,0.97), rgba(230,248,245,0.95))',
    titleText: '#115e59',
    hoverColor: 'rgba(57, 197, 187, 0.18)',
    shadowColor: 'rgba(20, 150, 140, 0.18)',
    glowColor: 'rgba(57, 197, 187, 0.38)',
    bubble1: 'rgba(57, 197, 187, 0.12)',
    bubble2: 'rgba(0, 206, 201, 0.1)',
    bubble3: 'rgba(255, 118, 117, 0.08)',
    tabActiveBg: 'linear-gradient(135deg, rgba(57,197,187,0.3), rgba(0,206,201,0.2))',
    tabActiveColor: '#0f766e',
    scrollbarThumb: 'rgba(57, 197, 187, 0.25)',
    scrollbarHover: 'rgba(57, 197, 187, 0.45)',
    inputFocusShadow: 'rgba(57, 197, 187, 0.18)',
    messageAiBg: 'rgba(255, 255, 255, 0.75)',
    messageUserBg: 'linear-gradient(135deg, rgba(204,251,241,0.5), rgba(153,246,228,0.4))',
    avatarAiBorder: 'rgba(57, 197, 187, 0.35)',
    avatarUserBg: 'rgba(57, 197, 187, 0.2)',
    codeBg: 'rgba(15, 35, 35, 0.95)',
    codeText: '#99f6e4',
    codeLineNum: 'rgba(57, 197, 187, 0.35)',
    btnSendShadow: 'rgba(57, 197, 187, 0.35)',
    toastBg: 'linear-gradient(135deg, rgba(57,197,187,0.92), rgba(0,206,201,0.88))',
    loadingBg: 'rgba(235, 252, 249, 0.85)',
    settingsBg: 'rgba(204, 251, 241, 0.35)',
  },

  // Live2D 模型配置（经典轻量 Cubism 2 动态形象）
  live2d: {
    fallbackImage: '../../角色-初音未来/图片素材/封面.png',
    modelPath: '../../角色-初音未来/Live2D模型/miku.model.json',
  },

  // 原生CV语音配置（VOCALOID经典元气电子歌姬语音包，共10段经典语音）
  voice: {
    baseDir: '../../角色-初音未来/音频素材/',
    count: 10,
    format: 'mp3'
  },

  // 以下字段由运行时从 txt 文件加载填充
  systemPrompt: null,
  lines: {}
};
