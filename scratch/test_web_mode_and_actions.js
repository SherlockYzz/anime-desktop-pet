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
ipcMain.handle('get-window-bounds', () => ({ x: 100, y: 100, width: 850, height: 750 }));
ipcMain.handle('set-window-bounds', () => ({ x: 100, y: 100, width: 850, height: 750 }));
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
    if (level >= 2 && !msg.includes('Security Warning') && !msg.includes('超时') && !msg.includes('Aborted')) {
      consoleErrors.push(msg);
      console.error(`  [Renderer Error] ${msg}`);
    }
  });

  await win.loadFile(path.join(__dirname, '../核心通用代码/核心/index.html'));
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n======================================================');
  console.log('🧪 动作百宝箱与模式无缝切换深度压力测试');
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

  // 1. 网页模式下加藤惠 Live2D 加载与动作触发
  await test('1. 网页模式：加藤惠 Live2D 与动作执行', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('megumi');
        const l2d = window.live2dManager;
        const success = await l2d.loadCharacterModel();
        const actionPlayed = window.actionMenuManager?.executeAction('megumi', 'fun', { model: l2d.model });
        return {
          renderMode: l2d.currentRenderMode,
          hasModel: Boolean(l2d.model),
          success,
          actionPlayed
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'live2d', '网页模式应为 live2d');
    assert.strictEqual(res.hasModel, true, '网页模式 Live2D 模型必须存在');
    assert.strictEqual(res.success, true, '加载必须成功');
    assert.strictEqual(res.actionPlayed, true, '动作必须成功执行');
  });

  // 2. 网页模式下蕾姆 VRM 3D 模型加载与动画触发
  await test('2. 网页模式：蕾姆 3D VRM 加载与动作执行', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('rem');
        const l2d = window.live2dManager;
        const success = await l2d.loadCharacterModel();
        const animPlayed = window.actionMenuManager?.executeAction('rem', 'pray', { model: null });
        return {
          renderMode: l2d.currentRenderMode,
          hasVrm: Boolean(window.vrmManager?.vrm),
          success,
          animPlayed
        };
      })()
    `);
    assert.strictEqual(res.renderMode, 'vrm', '蕾姆网页模式应为 vrm');
    assert.strictEqual(res.hasVrm, true, '蕾姆 3D VRM 模型必须存在');
    assert.strictEqual(res.success, true, '蕾姆 VRM 必须加载成功');
    assert.strictEqual(res.animPlayed, true, '蕾姆祈愿动作必须成功执行');
  });

  // 3. 模式反复来回切换（桌宠 <-> 网页模式，防内存泄漏与上下文冲突）
  await test('3. 模式反复往返切换 (网页 <-> 桌宠 3次轮回)', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        const pet = window.app.petMode;
        for (let i = 0; i < 3; i++) {
          await pet.enter(true, true);
          await new Promise(r => setTimeout(r, 200));
          await pet.exit(true);
          await new Promise(r => setTimeout(r, 200));
        }
        return {
          finalMode: pet._renderMode,
          isTransitioning: pet._transitioning
        };
      })()
    `);
    assert.strictEqual(res.isTransitioning, false, '切换过渡锁必须正常释放，绝不可卡锁');
  });

  console.log('\n======================================================');
  console.log(`🎉 切换与动作测试全部结束：通过 ${passed} 项，失败 ${failed} 项`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
