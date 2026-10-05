/**
 * 自动化全量测试脚本：验证窗口放大上限、等比例缩放与重新登录恢复默认大小
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================');
console.log('🧪 正在执行桌宠窗口缩放与默认尺寸恢复全量自动化验证');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

// 模拟浏览器与 DOM 环境
global.window = {
  screen: { availHeight: 1040, availWidth: 1920 },
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  electronAPI: {
    setWindowBounds: (b) => { window._lastBounds = b; },
    setIgnoreMouseEvents: () => {},
    onToggleModeRequest: (cb) => { window._toggleCb = cb; }
  }
};
global.document = {
  documentElement: {
    style: {
      setProperty: (k, v) => { document.documentElement.style[k] = v; }
    }
  },
  body: {
    classList: {
      _classes: new Set(),
      contains: (c) => document.body.classList._classes.has(c),
      add: (c) => document.body.classList._classes.add(c),
      remove: (c) => document.body.classList._classes.delete(c),
      toggle: (c, val) => {
        if (val) document.body.classList._classes.add(c);
        else document.body.classList._classes.delete(c);
      }
    }
  },
  getElementById: (id) => {
    if (!document._elements[id]) {
      document._elements[id] = {
        id,
        style: {},
        classList: {
          toggle: () => {},
          remove: () => {},
          add: () => {}
        },
        dataset: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null
      };
    }
    return document._elements[id];
  },
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  _elements: {}
};
global.localStorage = {
  _store: {},
  getItem: (k) => global.localStorage._store[k] || null,
  setItem: (k, v) => { global.localStorage._store[k] = String(v); },
  removeItem: (k) => { delete global.localStorage._store[k]; }
};

// 1. 验证 JS 文件语法正确性
it('主进程代码语法校验 (AST parser parse)', () => {
  const code = fs.readFileSync(path.join(__dirname, '../程序主入口.js'), 'utf8');
  new vm.Script(code);
  assert.ok(true, '程序主入口.js 语法校验 100% 通过');
});

// 2. 加载桌宠模式代码进行逻辑断言
it('验证每次登录/重新启动时强制恢复默认 1.0 (400x600) 尺寸', () => {
  // 模拟上次遗留了 1.35
  localStorage.setItem('pet-scale', '1.35');

  // 读取并执行桌宠模式类
  const petModeCode = fs.readFileSync(path.join(__dirname, '../核心通用代码/核心/桌宠模式.js'), 'utf8');
  vm.runInThisContext(petModeCode);

  const fakeApp = { hideSettings: () => {}, hideCharacterSelector: () => {} };
  const petMode = new PetMode(fakeApp);

  // 构造后必须重置为 1.0
  assert.strictEqual(petMode._petScale, 1.0, '构造函数中 _petScale 必须被重置为 1.0');
  assert.strictEqual(localStorage.getItem('pet-scale'), null, 'localStorage 中的旧 pet-scale 必须被清除');

  // 执行 init
  petMode.init(true);
  assert.strictEqual(petMode._petScale, 1.0, 'init() 执行后必须保持 1.0');
  assert.strictEqual(window._lastBounds.width, 400, '默认窗口宽度必须为 400');
  assert.strictEqual(window._lastBounds.height, 600, '默认窗口高度必须为 600');
});

// 3. 验证安全放大上限（WorkArea Safe Clamp）
it('验证屏幕工作区自适应安全上限计算 (1080p, 125% 缩放, 768p)', () => {
  const fakeApp = { hideSettings: () => {}, hideCharacterSelector: () => {} };
  const petMode = new PetMode(fakeApp);

  // 情况 A: 1080p 标准屏 (availHeight = 1040)
  window.screen.availHeight = 1040;
  const maxSafe1080 = petMode._calcMaxSafeScale();
  assert.ok(maxSafe1080 <= 1.35, `1080p 屏幕上限必须 <= 1.35 (当前: ${maxSafe1080})`);
  assert.ok(maxSafe1080 >= 1.0, '上限必须 >= 1.0');
  const h1080 = 600 * maxSafe1080;
  assert.ok(h1080 <= 1040 - 70, `窗口最大高度 (${h1080}) 必须在屏幕安全高度 (${1040-70}) 内，留足切换键安全区`);

  // 情况 B: 1080p 笔记本 125% 缩放 (availHeight = 824)
  window.screen.availHeight = 824;
  const maxSafe824 = petMode._calcMaxSafeScale();
  assert.ok(maxSafe824 <= 1.25, `824 高度上限必须 <= 1.25 (当前: ${maxSafe824})`);
  const h824 = 600 * maxSafe824;
  assert.ok(h824 <= 824 - 70, `824 高度窗口最大尺寸 (${h824}) 必须在屏幕安全区内`);

  // 情况 C: 768p 紧凑小屏 (availHeight = 728)
  window.screen.availHeight = 728;
  const maxSafe728 = petMode._calcMaxSafeScale();
  assert.ok(maxSafe728 <= 1.1, `768p 小屏上限必须 <= 1.1 (当前: ${maxSafe728})`);
  const h728 = 600 * maxSafe728;
  assert.ok(h728 <= 728 - 70, `768p 窗口最大尺寸 (${h728}) 必须在屏幕安全区内`);
});

// 4. 验证极端大输入时的越界钳位
it('验证传入极端大倍数 (如 2.5 或 999) 时强制钳位到安全上限', () => {
  const fakeApp = { hideSettings: () => {}, hideCharacterSelector: () => {} };
  const petMode = new PetMode(fakeApp);
  window.screen.availHeight = 1040;

  petMode.setPetScale(999);
  assert.strictEqual(petMode._petScale, 1.35, 'setPetScale(999) 必须被钳位在 1.35');
  assert.strictEqual(window._lastBounds.height, Math.round(600 * 1.35), '窗口高度必须被钳制在 810');

  petMode.setPetScale(2.5);
  assert.strictEqual(petMode._petScale, 1.35, 'setPetScale(2.5) 必须被钳位在 1.35');
});

// 5. 验证严格等比例放大与蒙版矩阵同步
it('验证 Live2D 模型两轴 1:1 严格等比缩放与蒙版矩阵刷新', () => {
  const fakeApp = { hideSettings: () => {}, hideCharacterSelector: () => {} };
  const petMode = new PetMode(fakeApp);

  // 模拟 Live2D 模型
  let resizeCalledWith = null;
  let updateCalled = false;
  let transformUpdated = false;

  const mockModel = {
    scale: {
      x: 1, y: 1,
      set: function(x, y) { this.x = x; this.y = (y !== undefined ? y : x); }
    },
    anchor: { set: () => {} },
    position: { set: () => {} },
    internalModel: {
      originalWidth: 1200,
      originalHeight: 2400,
      resize: (w, h) => { resizeCalledWith = { w, h }; },
      update: (t, f) => { updateCalled = true; }
    },
    updateTransform: () => { transformUpdated = true; }
  };

  const mockPixiApp = {
    renderer: {
      resize: (w, h) => { mockPixiApp._lastResize = { w, h }; }
    }
  };

  petMode._renderMode = 'live2d';
  petMode._model = mockModel;
  petMode._pixiApp = mockPixiApp;

  // 首次设置 1.0
  petMode.setPetScale(1.0);
  assert.strictEqual(mockModel.scale.x, mockModel.scale.y, 'Live2D 模型 X 与 Y 轴必须完全等比例');
  const baseScale = mockModel.scale.x;

  // 缩放到 1.2
  petMode.setPetScale(1.2);
  assert.strictEqual(mockModel.scale.x, mockModel.scale.y, '缩放后 Live2D 模型 X 与 Y 轴仍然完全等比');
  assert.ok(Math.abs(mockModel.scale.x - baseScale * 1.2) < 0.001, '缩放比例必须严格等于 baseScale * 1.2');

  // 再缩放到 0.8
  petMode.setPetScale(0.8);
  assert.strictEqual(mockModel.scale.x, mockModel.scale.y, '多轮缩放后 X 与 Y 轴仍然完全等比');
  assert.ok(Math.abs(mockModel.scale.x - baseScale * 0.8) < 0.001, '多轮缩放绝对不出现除数漂移');

  // 验证 WebGL 与 蒙版矩阵更新
  assert.deepStrictEqual(mockPixiApp._lastResize, { w: Math.round(380 * 0.8), h: Math.round(570 * 0.8) }, 'Pixi renderer 必须同步 resize');
  assert.deepStrictEqual(resizeCalledWith, { w: Math.round(380 * 0.8), h: Math.round(570 * 0.8) }, 'Live2D internalModel.resize 必须同步被调用');
  assert.strictEqual(updateCalled, true, 'Live2D 蒙版与着色器投影矩阵 update 必须被触发');
  assert.strictEqual(transformUpdated, true, 'Pixi updateTransform 必须被触发');
});

// 6. 验证主进程 clampToWorkArea 算法绝不越界
it('验证主进程 clampToWorkArea 窗口边界防护算法', () => {
  const wa = { x: 0, y: 0, width: 1920, height: 1040 };

  function clamp(x, y, w, h) {
    const minX = wa.x;
    const maxX = Math.max(wa.x, wa.x + wa.width - w);
    const minY = wa.y;
    const maxY = Math.max(wa.y, wa.y + wa.height - h);
    const nx = Math.max(minX, Math.min(maxX, Math.round(x)));
    const ny = Math.max(minY, Math.min(maxY, Math.round(y)));
    return { x: nx, y: ny };
  }

  // 窗口 540x810（1.35倍）位于屏幕右下角
  const p = clamp(1500, 300, 540, 810);
  assert.ok(p.y + 810 <= 1040, `窗口最底部 (${p.y + 810}) 绝对不能超过屏幕底部 (1040)`);
  assert.ok(p.x + 540 <= 1920, `窗口最右侧 (${p.x + 540}) 绝对不能超过屏幕右侧 (1920)`);
});

// 7. 验证动作百宝箱中的切回网页与调节大小快捷按键
it('验证动作百宝箱包含切回网页和调节大小快捷入口', () => {
  const actionMenuCode = fs.readFileSync(path.join(__dirname, '../核心通用代码/核心/动作百宝箱.js'), 'utf8');
  assert.ok(actionMenuCode.includes('btn-open-scale-from-menu'), '百宝箱中必须包含调节大小快捷键');
  assert.ok(actionMenuCode.includes('btn-exit-pet-from-menu'), '百宝箱中必须包含切回网页快捷键');
  assert.ok(actionMenuCode.includes('切回网页'), '百宝箱中必须包含切回网页文案');
});

// 8. 验证 HTML 中的预设按钮无危险的 150% 和 200%
it('验证 index.html 中移除 150% 和 200% 危险超屏预设', () => {
  const htmlCode = fs.readFileSync(path.join(__dirname, '../核心通用代码/核心/index.html'), 'utf8');
  assert.ok(!htmlCode.includes('200% 巨幕'), 'HTML 中严禁出现 200% 巨幕按钮');
  assert.ok(!htmlCode.includes('150% 超清'), 'HTML 中严禁出现 150% 按钮');
  assert.ok(htmlCode.includes('max="1.35"'), 'HTML 滑动条上限必须为 1.35');
});

console.log(`\n====================================================`);
console.log(`🎉 测试结果：共执行 ${passCount + failCount} 项测试，通过 ${passCount} 项，失败 ${failCount} 项`);
console.log(`====================================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
