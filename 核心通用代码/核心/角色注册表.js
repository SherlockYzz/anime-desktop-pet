// 角色注册表 - 由各角色的 角色设定.js 自动注册到此对象
// 台词和系统提示词在运行时从 txt 文件异步加载
window.CHARACTER_REGISTRY = {};

// ★ 固化全角色排位顺序（若曦为默认首位，前6位为完整Live2D/精灵帧，后3位为静态立绘）
window.DEFAULT_CHARACTER_ORDER = [
  'ruoxi',    // ① 若曦（首位默认位 · 核心基石 · 白狐仙精灵帧桌宠）
  'megumi',   // ② 加藤惠（官方 Live2D 全身像）
  'rem',      // ③ 蕾姆（Live2D 女仆全身像 + 26 段原版真人 CV 声库）
  'megumin',  // ④ 惠惠（Live2D 爆裂魔导全身像）
  'umaru',    // ⑤ 土间埋（Live2D 仓鼠斗篷全身像 + 35 段原版 CV 声库）
  'miku',     // ⑥ 初音未来（Live2D 经典电子歌姬全身像）
  'yukino',   // ⑦ 雪之下雪乃（动态形象）
  'takagi',   // ⑧ 高木同学（动态形象 / 原生CV）
  'zerotwo'   // ⑨ 零二（动态形象）
];
