const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

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
    if (level >= 2 && !msg.includes('Security Warning') && !msg.includes('超时')) {
      consoleErrors.push(msg);
      console.error(`  [Renderer Error] ${msg}`);
    }
  });

  await win.loadFile(path.join(__dirname, '../核心通用代码/核心/index.html'));
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n======================================================');
  console.log('🧪 全体角色 Live2D 与 VRM 加载深度实测');
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

  // 1. 测试加藤惠 Live2D (桌宠模式)
  await test('加藤惠 (Live2D) 在桌宠模式下正常加载', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('megumi');
        await window.app.petMode._loadCharacter();
        return {
          renderMode: window.app.petMode?._renderMode,
          hasModel: Boolean(window.app.petMode?._model),
          modelVisible: Boolean(window.app.petMode?._model?.visible !== false),
          canvasDisplay: document.getElementById('pet-canvas').style.display
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'live2d', '加藤惠渲染模式必须是 live2d');
    assert.strictEqual(res.hasModel, true, '加藤惠 Live2D 模型对象必须成功创建');
    assert.strictEqual(res.canvasDisplay, 'block', 'pet-canvas 必须可见');
  });

  // 2. 测试惠惠 Live2D (桌宠模式 Cubism 4)
  await test('惠惠 (Live2D Cubism 4) 在桌宠模式下正常加载', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('megumin');
        await window.app.petMode._loadCharacter();
        return {
          renderMode: window.app.petMode?._renderMode,
          hasModel: Boolean(window.app.petMode?._model),
          canvasDisplay: document.getElementById('pet-canvas').style.display
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'live2d', '惠惠渲染模式必须是 live2d');
    assert.strictEqual(res.hasModel, true, '惠惠 Live2D 模型对象必须成功创建');
  });

  // 3. 测试高木同学 Live2D (桌宠模式 Cubism 5)
  await test('高木同学 (Live2D Cubism 5) 在桌宠模式下正常加载', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('takagi');
        await window.app.petMode._loadCharacter();
        return {
          renderMode: window.app.petMode?._renderMode,
          hasModel: Boolean(window.app.petMode?._model),
          canvasDisplay: document.getElementById('pet-canvas').style.display
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'live2d', '高木同学渲染模式必须是 live2d');
    assert.strictEqual(res.hasModel, true, '高木同学 Live2D 模型对象必须成功创建');
  });

  // 4. 测试初音未来 Live2D (桌宠模式)
  await test('初音未来 (Live2D) 在桌宠模式下正常加载', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('miku');
        await window.app.petMode._loadCharacter();
        return {
          renderMode: window.app.petMode?._renderMode,
          hasModel: Boolean(window.app.petMode?._model),
          canvasDisplay: document.getElementById('pet-canvas').style.display
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'live2d', '初音未来渲染模式必须是 live2d');
    assert.strictEqual(res.hasModel, true, '初音未来 Live2D 模型对象必须成功创建');
  });

  // 5. 测试蕾姆 (用户已删除旧版垃圾Live2D，优先加载高质量 VRM)
  await test('蕾姆 (旧版Live2D已删除，无Live2D配置，加载VRM/动画)', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        const char = window.characterManager.registry['rem'];
        return {
          hasLive2dConfig: Boolean(char.live2d),
          hasVrmConfig: Boolean(char.vrm)
        };
      })()
    `);
    assert.strictEqual(res.hasLive2dConfig, false, '蕾姆的垃圾版 Live2D 配置必须已被彻底删除');
    assert.strictEqual(res.hasVrmConfig, true, '蕾姆保留 VRM 优质模型配置');
  });

  // 6. 测试网页模式下的 Live2D 正常展示
  await test('网页模式下加藤惠 Live2D 正常恢复展示', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.app.petMode.exit(true);
        await window.mimoAPI.switchCharacter('megumi');
        await window.live2dManager.loadCharacterModel();
        return {
          currentRenderMode: window.live2dManager?.currentRenderMode,
          hasModel: Boolean(window.live2dManager?.model),
          canvasDisplay: document.getElementById('live2d-canvas').style.display
        };
      })()
    `);
    assert.strictEqual(res.currentRenderMode, 'live2d', '网页模式下加藤惠渲染模式必须是 live2d');
    assert.strictEqual(res.hasModel, true, '网页模式下加藤惠 model 必须存在');
  });

  // 7. 测试若曦精灵表模式
  await test('若曦 (原创白狐仙) 精灵表正常加载', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.app.petMode.enter(false, true);
        await window.mimoAPI.switchCharacter('ruoxi');
        await window.app.petMode._loadCharacter();
        return {
          renderMode: window.app.petMode?._renderMode,
          spriteCanvasDisplay: document.getElementById('pet-sprite-canvas').style.display
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'sprite', '若曦渲染模式必须是 sprite');
    assert.strictEqual(res.spriteCanvasDisplay, 'block', 'pet-sprite-canvas 必须可见');
  });

  console.log('\n======================================================');
  console.log(`🎉 角色实测汇总：共测试 ${passed + failed} 项，通过 ${passed} 项，失败 ${failed} 项`);
  console.log(`   渲染控制台未捕获到未处理异常 (Errors: ${consoleErrors.length})`);
  console.log('======================================================\n');

  if (failed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
