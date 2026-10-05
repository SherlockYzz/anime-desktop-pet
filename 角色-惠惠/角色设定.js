// ========================================
//  惠惠 - 角色设定
//  作品：为美好的世界献上祝福！（この素晴らしい世界に祝福を！）
// ========================================

CHARACTER_REGISTRY.megumin = {
  id: 'megumin',
  name: '惠惠',
  nameJa: 'めぐみん',
  series: '为美好的世界献上祝福！',
  seriesJa: 'この素晴らしい世界に祝福を！',
  cv: '高桥李依',
  birthday: { month: 12, day: 4 },
  tagline: '吾名惠惠！乃红魔族第一魔法师、兼爆裂魔法操纵者！',
  description: '红魔族首屈一指的天才大魔导师。执着于唯一的究极奥义——爆裂魔法（Explosion），每天都必须来上一发。性格中二傲娇、重情重义，有着极高自尊心但极度依赖同伴。',

  // 图片路径（相对于 index.html）
  avatar: '../../角色-惠惠/图片素材/头像.png',
  cover: '../../角色-惠惠/图片素材/封面.png',

  // 主题配色（红魔族爆裂火焰红系）
  theme: {
    primary: '#e53935',
    secondary: '#fb8c00',
    accent: '#ffd54f',
    bg: 'rgba(255, 245, 243, 0.94)',
    bgLight: 'rgba(255, 238, 235, 0.9)',
    text: '#4a1e1e',
    textSecondary: 'rgba(74, 30, 30, 0.65)',
    border: 'rgba(229, 57, 53, 0.28)',
    gradient: 'linear-gradient(135deg, #e53935, #fb8c00)',
    gradientSoft: 'linear-gradient(135deg, #fb8c00, #e53935)',
    gradientTitlebar: 'linear-gradient(135deg, #ffdedb, #ffe8d6, #fff3d6)',
    gradientBg: 'linear-gradient(180deg, rgba(255,245,243,0.97), rgba(255,236,230,0.95))',
    titleText: '#822727',
    hoverColor: 'rgba(229, 57, 53, 0.18)',
    shadowColor: 'rgba(200, 45, 45, 0.18)',
    glowColor: 'rgba(229, 57, 53, 0.38)',
    bubble1: 'rgba(229, 57, 53, 0.12)',
    bubble2: 'rgba(251, 140, 0, 0.1)',
    bubble3: 'rgba(255, 213, 79, 0.08)',
    tabActiveBg: 'linear-gradient(135deg, rgba(229,57,53,0.3), rgba(251,140,0,0.2))',
    tabActiveColor: '#7f2323',
    scrollbarThumb: 'rgba(229, 57, 53, 0.25)',
    scrollbarHover: 'rgba(229, 57, 53, 0.45)',
    inputFocusShadow: 'rgba(229, 57, 53, 0.18)',
    messageAiBg: 'rgba(255, 248, 245, 0.72)',
    messageUserBg: 'linear-gradient(135deg, rgba(255,204,188,0.5), rgba(255,224,178,0.4))',
    avatarAiBorder: 'rgba(229, 57, 53, 0.35)',
    avatarUserBg: 'rgba(229, 57, 53, 0.2)',
    codeBg: 'rgba(48, 20, 20, 0.95)',
    codeText: '#ffcdd2',
    codeLineNum: 'rgba(229, 57, 53, 0.35)',
    btnSendShadow: 'rgba(229, 57, 53, 0.35)',
    toastBg: 'linear-gradient(135deg, rgba(229,57,53,0.92), rgba(251,140,0,0.88))',
    loadingBg: 'rgba(255, 240, 238, 0.85)',
    settingsBg: 'rgba(255, 218, 210, 0.35)',
  },

  // Live2D 模型配置（Cubism 4 原版动画模型）
  live2d: {
    fallbackImage: '../../角色-惠惠/图片素材/封面.png',
    modelPath: '../../角色-惠惠/Live2D模型/1024100.model3.json',
  },

  // 原生CV语音配置（高桥李依官方原版动漫与Fantastic Days原声语音包，共10段经典名台词与交互语音）
  voice: {
    baseDir: '../../角色-惠惠/音频素材/',
    count: 10,
    format: 'mp3'
  },

  // 以下字段由运行时从 txt 文件加载填充
  systemPrompt: null,
  lines: {}
};
