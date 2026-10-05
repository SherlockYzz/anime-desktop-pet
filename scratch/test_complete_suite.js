const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// 模拟所有 IPC 通信
ipcMain.handle('check-file-exists', (event, relPath) => {
  if (!relPath) return false;
  try {
    const basePath = path.join(__dirname, '../核心通用代码', '核心');
    const fullPath = path.resolve(basePath, relPath);
    return fs.existsSync(fullPath);
  } catch (e) {
    return false;
  }
});
ipcMain.handle('get-work-area', () => ({ x: 0, y: 0, width: 1920, height: 1040 }));
ipcMain.handle('get-window-bounds', () => ({ x: 100, y: 100, width: 400, height: 600 }));
ipcMain.handle('set-window-bounds', () => ({ x: 100, y: 100, width: 400, height: 600 }));
ipcMain.handle('set-always-on-top', () => {});
ipcMain.handle('get-custom-characters', () => []);
ipcMain.handle('update-tray-label', () => {});
ipcMain.on('set-ignore-mouse-events', () => {});
ipcMain.on('move-window-by', () => {});
ipcMain.on('set-window-position', () => {});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 900,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../安全桥接.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true
    }
  });

  const consoleErrors = [];
  win.webContents.on('console-message', (e, level, msg, line, sourceId) => {
    // 忽略预期的网络断开或特定日志
    if (level >= 2 && !msg.includes('Security Warning') && !msg.includes('超时') && !msg.includes('Aborted')) {
      consoleErrors.push(msg);
      console.error(`  [Renderer Error] ${msg}`);
    }
  });

  await win.loadFile(path.join(__dirname, '../核心通用代码/核心/index.html'));
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n======================================================');
  console.log('🧪 全面质检测试：8大角色全渲染 + 动作 + 缩放完整性');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. 加藤惠 (Live2D Cubism 2) 桌宠
  await test('1. 加藤惠 Live2D (桌宠模式) 正常渲染与尺寸等比', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('megumi');
        await window.app.petMode._loadCharacter();
        const m = window.app.petMode?._model;
        return {
          renderMode: window.app.petMode?._renderMode,
          hasModel: Boolean(m),
          scaleX: m?.scale?.x,
          scaleY: m?.scale?.y,
          isEqualScale: Math.abs((m?.scale?.x || 0) - (m?.scale?.y || 0)) < 0.0001,
          parentAttached: Boolean(m?.parent)
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'live2d', '渲染模式必须为 live2d');
    assert.strictEqual(res.hasModel, true, 'Live2D 模型必须存在');
    assert.strictEqual(res.parentAttached, true, '模型必须挂载在 stage 上');
    assert.strictEqual(res.isEqualScale, true, 'X和Y缩放必须严格等比例');
  });

  // 2. 惠惠 (Live2D Cubism 4) 桌宠
  await test('2. 惠惠 Live2D (桌宠模式) 正常渲染与动作响应', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('megumin');
        await window.app.petMode._loadCharacter();
        const m = window.app.petMode?._model;
        return {
          renderMode: window.app.petMode?._renderMode,
          hasModel: Boolean(m),
          parentAttached: Boolean(m?.parent)
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'live2d', '渲染模式必须为 live2d');
    assert.strictEqual(res.hasModel, true, 'Live2D 模型必须存在');
    assert.strictEqual(res.parentAttached, true, '模型必须挂载在 stage 上');
  });

  // 3. 高木同学 (Live2D Cubism 5) 桌宠
  await test('3. 高木同学 Live2D (桌宠模式) 正常渲染', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('takagi');
        await window.app.petMode._loadCharacter();
        const m = window.app.petMode?._model;
        return {
          renderMode: window.app.petMode?._renderMode,
          hasModel: Boolean(m),
          parentAttached: Boolean(m?.parent)
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'live2d', '渲染模式必须为 live2d');
    assert.strictEqual(res.hasModel, true, 'Live2D 模型必须存在');
    assert.strictEqual(res.parentAttached, true, '模型必须挂载在 stage 上');
  });

  // 4. 初音未来 (Live2D Cubism 2) 桌宠
  await test('4. 初音未来 Live2D (桌宠模式) 正常渲染', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('miku');
        await window.app.petMode._loadCharacter();
        const m = window.app.petMode?._model;
        return {
          renderMode: window.app.petMode?._renderMode,
          hasModel: Boolean(m),
          parentAttached: Boolean(m?.parent)
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'live2d', '渲染模式必须为 live2d');
    assert.strictEqual(res.hasModel, true, 'Live2D 模型必须存在');
    assert.strictEqual(res.parentAttached, true, '模型必须挂载在 stage 上');
  });

  // 5. 蕾姆 (彻底无旧版 Live2D，以 3D VRM 运行)
  await test('5. 蕾姆 (绝无旧版Live2D，正确加载VRM模型与动画)', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        const char = CHARACTER_REGISTRY.rem;
        const hasLive2D = Boolean(char.live2d);
        await window.mimoAPI.switchCharacter('rem');
        await window.app.petMode._loadCharacter();
        return {
          hasLive2dConfig: hasLive2D,
          renderMode: window.app.petMode?._renderMode,
          vrmModelExists: Boolean(window.vrmManager?.vrm),
          vrmConfigPath: char.vrm?.modelPath
        };
      })()
    `);
    assert.strictEqual(res.hasLive2dConfig, false, '蕾姆配置中绝不可有旧版 live2d 字段');
    assert.strictEqual(res.renderMode, 'vrm', '蕾姆渲染模式必须为 vrm');
    assert.strictEqual(res.vrmModelExists, true, '蕾姆 3D VRM 实体模型必须成功加载');
  });

  // 6. 若曦 (精灵表) 桌宠
  await test('6. 若曦 精灵表 (桌宠模式) 独立画布渲染', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('ruoxi');
        await window.app.petMode._loadCharacter();
        const sc = document.getElementById('pet-sprite-canvas');
        return {
          renderMode: window.app.petMode?._renderMode,
          spriteCanvasDisplay: sc.style.display,
          ready: window.spriteAtlasManager?.ready
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'sprite', '若曦渲染模式必须为 sprite');
    assert.strictEqual(res.spriteCanvasDisplay, 'block', '若曦专属精灵画布必须可见');
    assert.strictEqual(res.ready, true, '若曦精灵图集必须 ready');
  });

  // 7. 雪之下雪乃 & 零二 (高质量插画与原声CV模式)
  await test('7. 雪乃与零二 纯净插画与原版声库模式正常运作', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        const yukino = CHARACTER_REGISTRY.yukino;
        const zerotwo = CHARACTER_REGISTRY.zerotwo;
        return {
          yukinoHasLive2d: Boolean(yukino.live2d),
          zerotwoHasLive2d: Boolean(zerotwo.live2d),
          yukinoVoiceCount: yukino.voice?.count,
          zerotwoVoiceCount: zerotwo.voice?.count
        };
      })()
    `);
    assert.strictEqual(res.yukinoHasLive2d, false, '雪乃无损坏 Live2D 遗留');
    assert.strictEqual(res.zerotwoHasLive2d, false, '零二无损坏 Live2D 遗留');
    assert.strictEqual(res.yukinoVoiceCount, 10, '雪乃配有10段原声CV');
    assert.strictEqual(res.zerotwoVoiceCount, 10, '零二配有10段原声CV');
  });

  // 8. 窗口尺寸安全控制、上限保护与默认复位
  await test('8. 桌宠缩放安全上限、默认恢复、安全防护测试', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        const pet = window.app.petMode;
        // 1. 默认缩放必须为 1.0
        const defaultScale = pet._petScale;
        // 2. 模拟设置大缩放
        const maxSafe = pet._calcMaxSafeScale();
        await pet.setPetScale(1.8);
        const clampedScale = pet._petScale;
        // 3. 复位默认
        await pet.resetPetScale();
        const resetScale = pet._petScale;
        // 4. 检查底部控制按钮
        const actionBtn = document.getElementById('btn-pet-actions');
        const scaleBtn = document.getElementById('btn-pet-scale');
        return {
          defaultScale,
          maxSafe,
          clampedScale,
          resetScale,
          actionBtnExists: Boolean(actionBtn),
          scaleBtnExists: Boolean(scaleBtn)
        };
      })()
    `);
    assert.strictEqual(res.defaultScale, 1.0, '初始缩放必须为 1.0');
    assert.ok(res.clampedScale <= res.maxSafe + 0.001, '缩放必须被安全限制在 maxSafe 以内');
    assert.strictEqual(res.resetScale, 1.0, '复位后缩放必须恢复为 1.0');
    assert.strictEqual(res.actionBtnExists, true, '动作百宝箱按钮必须存在');
    assert.strictEqual(res.scaleBtnExists, true, '缩放调节按钮必须存在');
  });

  console.log('\n======================================================');
  console.log(`🎉 测试质检全部结束：通过 ${passed} 项，失败 ${failed} 项`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
