// ========================================
//  加藤惠 - 角色设定
//  作品：路人女主的养成方法（冴えない彼女の育てかた）
// ========================================

CHARACTER_REGISTRY.megumi = {
  id: 'megumi',
  name: '加藤惠',
  nameJa: 'かとう めぐみ',
  series: '路人女主的养成方法',
  seriesJa: '冴えない彼女の育てかた',
  cv: '安野希世乃',
  birthday: { month: 9, day: 23 },
  tagline: '为了成为你心中的女主角',
  description: '私立丰之崎学园学生，blessing software社团第二任社长。表面是毫无存在感的"路人"女主，实则拥有极致的洞察力与温柔包容的内心。',

  // 图片路径（相对于 index.html）
  avatar: '../../角色-加藤惠/图片素材/头像.png',
  cover: '../../角色-加藤惠/图片素材/封面.png',

  // 主题配色（粉色系）
  theme: {
    primary: '#f8b4c8',
    secondary: '#f0c6d6',
    accent: '#fbd0de',
    bg: 'rgba(255, 248, 250, 0.94)',
    bgLight: 'rgba(255, 242, 246, 0.9)',
    text: '#5a4550',
    textSecondary: 'rgba(90, 69, 80, 0.6)',
    border: 'rgba(248, 180, 200, 0.25)',
    gradient: 'linear-gradient(135deg, #f8b4c8, #e8a0b8)',
    gradientSoft: 'linear-gradient(135deg, #f0c6d6, #f8b4c8)',
    gradientTitlebar: 'linear-gradient(135deg, #fde8ee, #f0d8e6, #e8daf0)',
    gradientBg: 'linear-gradient(180deg, rgba(255,248,250,0.97), rgba(255,240,245,0.95))',
    titleText: '#8a6578',
    hoverColor: 'rgba(248, 180, 200, 0.18)',
    shadowColor: 'rgba(200, 150, 170, 0.15)',
    glowColor: 'rgba(248, 180, 200, 0.35)',
    bubble1: 'rgba(248, 180, 200, 0.12)',
    bubble2: 'rgba(180, 200, 240, 0.1)',
    bubble3: 'rgba(200, 230, 210, 0.08)',
    tabActiveBg: 'linear-gradient(135deg, rgba(248,180,200,0.3), rgba(220,190,240,0.2))',
    tabActiveColor: '#7a5568',
    scrollbarThumb: 'rgba(248, 180, 200, 0.25)',
    scrollbarHover: 'rgba(248, 180, 200, 0.4)',
    inputFocusShadow: 'rgba(248, 180, 200, 0.15)',
    messageAiBg: 'rgba(255, 255, 255, 0.65)',
    messageUserBg: 'linear-gradient(135deg, rgba(248,220,230,0.5), rgba(230,210,240,0.4))',
    avatarAiBorder: 'rgba(248, 180, 200, 0.3)',
    avatarUserBg: 'rgba(180, 200, 230, 0.2)',
    codeBg: 'rgba(55, 42, 50, 0.95)',
    codeText: '#e0ccd5',
    codeLineNum: 'rgba(248, 180, 200, 0.3)',
    btnSendShadow: 'rgba(248, 180, 200, 0.3)',
    toastBg: 'linear-gradient(135deg, rgba(248,180,200,0.9), rgba(220,190,240,0.85))',
    loadingBg: 'rgba(255, 245, 248, 0.8)',
    settingsBg: 'rgba(248, 230, 238, 0.35)',
  },

  // Live2D 配置（本地模型）
  live2d: {
    fallbackImage: '../../角色-加藤惠/图片素材/封面.png',
    modelPath: '../../角色-加藤惠/Live2D模型/model.model3.json',
  },

  // 以下字段由运行时从 txt 文件加载填充
  systemPrompt: null,
  lines: {}
};
