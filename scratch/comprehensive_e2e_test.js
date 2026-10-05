const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const rootDir = 'F:/Desktop/.DeskBox/文件夹/项目与开发/二次元桌宠项目';
const unpackedAppDir = path.join(rootDir, 'dist/win-unpacked/resources/app');

// 注册 IPC Handlers
ipcMain.handle('check-file-exists', (event, relPath) => {
  if (!relPath) return false;
  try {
    const basePath = path.join(unpackedAppDir, '核心通用代码/核心');
    const fullPath = path.resolve(basePath, relPath);
    return fs.existsSync(fullPath);
  } catch (e) {
    return false;
  }
});
ipcMain.handle('get-custom-characters', () => []);
ipcMain.handle('set-always-on-top', () => {});
ipcMain.handle('update-tray-label', () => {});
ipcMain.handle('get-window-bounds', () => ({ x: 0, y: 0, width: 400, height: 600 }));
ipcMain.on('set-window-position', () => {});
ipcMain.on('move-window-by', () => {});

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(unpackedAppDir, '安全桥接.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true
    }
  });

  const consoleErrors = [];
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2 && !message.includes('Deprecation') && !message.includes('AudioContext') && !message.includes('Security Warning')) {
      consoleErrors.push(`[${level}] ${message}`);
    }
  });

  const indexPath = path.join(unpackedAppDir, '核心通用代码/核心/index.html');
  await win.loadFile(indexPath);
  await new Promise(r => setTimeout(r, 2000));

  const testReport = await win.webContents.executeJavaScript(`
    (async () => {
      const report = {
        passed: 0,
        failed: 0,
        details: [],
        toasts: []
      };

      function assert(name, condition, extra = '') {
        if (condition) {
          report.passed++;
          report.details.push({ test: name, status: 'PASS', extra });
        } else {
          report.failed++;
          report.details.push({ test: name, status: 'FAIL', extra });
        }
      }

      const petMode = window.app?.petMode;
      const actMgr = window.actionMenuManager;

      // 1. 若曦（初始角色）
      const bootChar = window.characterManager.getCurrentCharacter();
      assert('若曦启动就绪', bootChar?.id === 'ruoxi');
      assert('若曦进入精灵表模式', petMode?._renderMode === 'sprite');
      assert('若曦精灵引擎就绪', !!window.spriteAtlasManager?.ready);

      // 若曦气泡测试
      petMode._showBubble('若曦测试台词');
      const bubble = document.querySelector('.pet-bubble');
      assert('气泡元素存在', !!bubble);
      if (bubble) {
        const rect = bubble.getBoundingClientRect();
        assert('气泡置于顶端安全区(top <= 30px)', rect.top <= 30);
        assert('气泡小巧精致(高度 <= 40px)', rect.height <= 40);
        // 点击立即消除
        bubble.click();
        await new Promise(r => setTimeout(r, 300));
        assert('气泡点击立即消除', !document.querySelector('.pet-bubble'));
      }

      // 2. 加藤惠
      await window.app._switchCharacter('megumi');
      await new Promise(r => setTimeout(r, 1200));

      assert('加藤惠Live2D模式', petMode?._renderMode === 'live2d');
      assert('加藤惠模型就绪', !!petMode?._model);

      for (const act of ['fun', 'pout', 'surprise', 'shy', 'idle_sway', 'gentle']) {
        try {
          actMgr.executeAction('megumi', act, { model: petMode._model });
          assert('加藤惠动作: ' + act, true);
        } catch(e) {
          assert('加藤惠动作: ' + act, false, e.message);
        }
      }

      // 3. 高木同学（重点验证Live2D成功加载与动作）
      await window.app._switchCharacter('takagi');
      await new Promise(r => setTimeout(r, 1200));

      assert('高木同学Live2D模式', petMode?._renderMode === 'live2d');
      assert('高木同学模型就绪', !!petMode?._model);

      for (const act of ['tease', 'wink', 'surprise', 'blush', 'sleep', 'wakeup']) {
        try {
          actMgr.executeAction('takagi', act, { model: petMode._model });
          assert('高木同学动作: ' + act, true);
        } catch(e) {
          assert('高木同学动作: ' + act, false, e.message);
        }
      }

      // 4. 蕾姆（重点验证双手祈祷、女仆致礼双手动作）
      await window.app._switchCharacter('rem');
      await new Promise(r => setTimeout(r, 1200));

      assert('蕾姆Live2D模式', petMode?._renderMode === 'live2d');
      assert('蕾姆模型就绪', !!petMode?._model);

      for (const act of ['curtsey', 'pray', 'shy', 'fist', 'happy', 'idle']) {
        try {
          actMgr.executeAction('rem', act, { model: petMode._model });
          assert('蕾姆动作: ' + act, true);
        } catch(e) {
          assert('蕾姆动作: ' + act, false, e.message);
        }
      }

      // 5. 惠惠（重点验证爆裂魔法、大欢呼跳跃）
      await window.app._switchCharacter('megumin');
      await new Promise(r => setTimeout(r, 1200));

      assert('惠惠Live2D模式', petMode?._renderMode === 'live2d');
      assert('惠惠模型就绪', !!petMode?._model);

      for (const act of ['explosion', 'chant', 'proud', 'bound', 'shame', 'cry']) {
        try {
          actMgr.executeAction('megumin', act, { model: petMode._model });
          assert('惠惠动作: ' + act, true);
        } catch(e) {
          assert('惠惠动作: ' + act, false, e.message);
        }
      }

      // 6. 初音未来
      await window.app._switchCharacter('miku');
      await new Promise(r => setTimeout(r, 1200));

      assert('初音未来Live2D模式', petMode?._renderMode === 'live2d');
      assert('初音未来模型就绪', !!petMode?._model);

      for (const act of ['heart', 'shake', 'wave', 'spin', 'shy', 'idle']) {
        try {
          actMgr.executeAction('miku', act, { model: petMode._model });
          await new Promise(r => setTimeout(r, 100));
          assert('初音未来动作: ' + act, true);
        } catch(e) {
          assert('初音未来动作: ' + act, false, e.message);
        }
      }

      // 7. 切回若曦
      await window.app._switchCharacter('ruoxi');
      await new Promise(r => setTimeout(r, 1000));
      assert('切回若曦模式为sprite', petMode?._renderMode === 'sprite');

      report.toasts = [...document.querySelectorAll('.toast')].map(t => t.textContent);
      return report;
    })()
  `);

  console.log('=== FULL E2E TEST RESULTS ===');
  console.log('PASSED:', testReport.passed);
  console.log('FAILED:', testReport.failed);
  console.log('TOASTS IN DOM:', testReport.toasts.length);
  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:', consoleErrors);
  }
  if (testReport.failed > 0) {
    console.log('FAILED TESTS:', testReport.details.filter(d => d.status === 'FAIL'));
  }

  app.quit();
  process.exit(testReport.failed > 0 ? 1 : 0);
});
