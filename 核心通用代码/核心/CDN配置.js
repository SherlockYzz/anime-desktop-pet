// 二次元桌宠 - 前端依赖资源配置（★ 2026-09-15 本地化：原 jsdelivr CDN 直连超时导致 Live2D/VRM 加载不稳定）
// 集中管理所有依赖文件，方便统一升级版本
window.CDN_CONFIG = {
  pixi: '../lib/pixi.min.js',
  pixiLive2d: '../lib/pixi-live2d-display.min.js',
  cubismCore: '../lib/live2dcubismcore.min.js',   // ★ Cubism4 核心运行时：加载 .moc3 模型必需
  three: '../lib/three.min.js',
  threeGltfLoader: '../lib/GLTFLoader.js',
  threeVrm: '../lib/three-vrm.js',
};
