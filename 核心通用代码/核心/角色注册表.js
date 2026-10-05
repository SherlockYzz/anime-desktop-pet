// 角色注册表 - 由各角色的 角色设定.js 自动注册到此对象
// 台词和系统提示词在运行时从 txt 文件异步加载
window.CHARACTER_REGISTRY = {};

// ★ 固化全角色排位顺序（若曦为绝对第一核心）
window.DEFAULT_CHARACTER_ORDER = [
  'ruoxi',    // ① 若曦（核心基石 · 白狐仙精灵帧桌宠）
  'megumi',   // ② 加藤惠（官方 Live2D 全身像）
  'megumin',  // ③ 惠惠（Live2D 爆裂魔导全身像）
  'rem',      // ④ 蕾姆（Live2D 女仆全身像 + 26 段原版真人 CV 声库）
  'miku',     // ⑤ 初音未来（Live2D 经典电子歌姬全身像）
  'takagi',   // ⑥ 高木同学（Live2D 修复版全身像）
  'zerotwo',  // ⑦ 零二（动态形象）
  'yukino'    // ⑧ 雪之下雪乃（动态形象）
];
