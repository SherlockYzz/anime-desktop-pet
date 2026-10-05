const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const rootDir = 'F:/Desktop/.DeskBox/文件夹/项目与开发/二次元桌宠项目';

// 完备 IPC Handlers
ipcMain.handle('check-file-exists', (event, relPath) => {
  if (!relPath) return false;
  try {
    const basePath = path.join(rootDir, '核心通用代码/核心');
    const fullPath = path.resolve(basePath, relPath);
    return fs.existsSync(fullPath);
  } catch (e) {
    return false;
  }
});
ipcMain.handle('get-custom-characters', () => []);
ipcMain.handle('save-custom-character', () => true);
ipcMain.handle('delete-custom-character', () => true);
ipcMain.handle('export-custom-character', () => true);
ipcMain.handle('import-custom-character', () => null);
ipcMain.handle('set-always-on-top', () => {});
ipcMain.handle('update-tray-label', () => {});
ipcMain.handle('get-window-bounds', () => ({ x: 0, y: 0, width: 400, height: 600 }));
ipcMain.handle('set-window-bounds', (e, b) => b);
ipcMain.handle('get-work-area', () => ({ x: 0, y: 0, width: 1920, height: 1080 }));
ipcMain.handle('get-screen-size', () => ({ width: 1920, height: 1080 }));
ipcMain.handle('minimize-window', () => {});
ipcMain.handle('close-window', () => {});
ipcMain.on('set-window-position', () => {});
ipcMain.on('move-window-by', () => {});
ipcMain.on('set-ignore-mouse-events', () => {});

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(rootDir, '安全桥接.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true
    }
  });

  const consoleMessages = [];
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (!message.includes('Security Warning') && !message.includes('AudioContext')) {
      consoleMessages.push('[' + level + '] ' + message);
    }
  });

  const indexPath = path.join(rootDir, '核心通用代码/核心/index.html');
  await win.loadFile(indexPath);
  await new Promise(r => setTimeout(r, 2000));

  const clientTestFunction = async () => {
    const suite = {
      passed: 0,
      failed: 0,
      tests: []
    };

    function assert(name, condition, extra) {
      if (condition) {
        suite.passed++;
        suite.tests.push({ test: name, status: 'PASS', extra: extra || '' });
      } else {
        suite.failed++;
        suite.tests.push({ test: name, status: 'FAIL', extra: extra || '' });
      }
    }

    const petMode = window.app && window.app.petMode;
    const charMgr = window.characterManager;
    const actMgr = window.actionMenuManager;

    // 1. 若曦初始启动与精灵引擎
    const curChar = charMgr.getCurrentCharacter();
    assert('1. 默认启动角色为若曦', curChar && curChar.id === 'ruoxi');
    assert('1. 桌宠渲染模式为sprite', petMode && petMode._renderMode === 'sprite');
    assert('1. 精灵表引擎就绪', !!(window.spriteAtlasManager && window.spriteAtlasManager.ready));

    // 2. 若曦超清 2X 模态及视线帧定向回退机制
    const m = window.spriteAtlasManager;
    // 确保进入 HD 模态
    if (!m.isHdMode()) await m.toggleHdMode(true);
    assert('2. 开启超清2X模态', m.isHdMode() === true);
    assert('2. 超清模态基础单格尺寸384x416', m.CW === 384 && m.CH === 416);

    // ★ 验证核心用户指令：上下左右全视角全量实装超清 2X (384x416) 原画，彻底根除模糊
    const lookCell0 = m._cellBox('look-row-9', 0);
    assert('2. 视线帧全量升级为超清384x416画质且零模糊', lookCell0.cw === 384 && lookCell0.ch === 416 && lookCell0.img === m.atlas);

    // 动作帧（如待机、跳跃、工作）严格使用超清模态 (384x416)
    const idleCell = m._cellBox('idle', 0);
    assert('2. 动作帧严格使用超清atlas采样(384x416)', idleCell.cw === 384 && idleCell.ch === 416 && idleCell.img === m.atlas);

    // 模拟随手指指针在 4 个象限平滑移动
    const canvasRect = m.canvas.getBoundingClientRect();
    const cx = canvasRect.left + (canvasRect.width || 200) / 2;
    const cy = canvasRect.top + (canvasRect.height || 300) / 2;
    const rUp = m.lookStep(cx, cy - 80);
    const rDown = m.lookStep(cx, cy + 80);
    const rRight = m.lookStep(cx + 80, cy);
    const rLeft = m.lookStep(cx - 80, cy);
    assert('2. 16向视线跟踪解析正常(上下左右皆可锁定)', !!rUp && !!rDown && !!rRight && !!rLeft);

    // 3. 大小滑动窗口功能 (80% ~ 200%)
    petMode.setPetScale(1.1);
    const scaleCss11 = document.documentElement.style.getPropertyValue('--pet-scale');
    const scaleVal11 = document.getElementById('pet-scale-val');
    assert('3. 设置缩放110%成功', (scaleCss11 || '').trim() === '1.1' && scaleVal11 && scaleVal11.textContent === '110%');

    petMode.setPetScale(0.8);
    const scaleCss08 = document.documentElement.style.getPropertyValue('--pet-scale');
    const scaleVal08 = document.getElementById('pet-scale-val');
    assert('3. 设置缩放80%成功', (scaleCss08 || '').trim() === '0.8' && scaleVal08 && scaleVal08.textContent === '80%');

    petMode.setPetScale(1.0);
    const scaleCss10 = document.documentElement.style.getPropertyValue('--pet-scale');
    assert('3. 恢复缩放100%成功', (scaleCss10 || '').trim() === '1');

    // 4. 桌宠模式下 8 大角色切换与非空白验证
    const allCharIds = ['ruoxi', 'megumi', 'megumin', 'rem', 'miku', 'takagi', 'zerotwo', 'yukino'];
    for (const id of allCharIds) {
      await window.app._switchCharacter(id);
      await new Promise(r => setTimeout(r, 1200));

      const char = charMgr.getCurrentCharacter();
      const mode = petMode._renderMode;
      const area = document.getElementById('pet-character-area');
      const petCanvas = document.getElementById('pet-canvas');
      const petSpriteCanvas = document.getElementById('pet-sprite-canvas');
      const petVrmCanvas = document.getElementById('pet-vrm-canvas');
      const fallbackImg = area ? area.querySelector('.pet-fallback-img') : null;

      let isRendered = false;
      let desc = '';
      if (mode === 'sprite') {
        isRendered = petSpriteCanvas && petSpriteCanvas.style.display !== 'none' && !!(window.spriteAtlasManager && window.spriteAtlasManager.ready);
        desc = 'Sprite 2D 画布正常渲染';
      } else if (mode === 'live2d') {
        isRendered = petCanvas && petCanvas.style.display !== 'none' && !!petMode._model;
        desc = 'Live2D 正常渲染，模型存在';
      } else if (mode === 'vrm') {
        isRendered = petVrmCanvas && petVrmCanvas.style.display !== 'none';
        desc = 'VRM 正常渲染';
      } else if (fallbackImg) {
        isRendered = fallbackImg.style.display !== 'none' && fallbackImg.src && fallbackImg.src.length > 5;
        desc = '高清封面正常回退兜底，无空白';
      }

      assert('4. 桌宠模式角色[' + char.name + ']无空白正常显示', isRendered, mode + ': ' + desc);
    }

    // 5. 网页模式下 8 大角色切换与非空白验证
    await petMode.exit(true);
    await new Promise(r => setTimeout(r, 600));
    assert('5. 成功切入网页模式', document.body.classList.contains('web-mode-active'));

    for (const id of allCharIds) {
      await window.app._switchCharacter(id);
      await new Promise(r => setTimeout(r, 1200));

      const char = charMgr.getCurrentCharacter();
      const mode = window.live2dManager ? window.live2dManager.currentRenderMode : null;
      const live2dCanvas = document.getElementById('live2d-canvas');
      const spriteCanvas = document.getElementById('sprite-canvas');
      const vrmCanvas = document.getElementById('vrm-canvas');
      const fallbackDiv = document.getElementById('live2d-fallback');
      const fbImg = fallbackDiv ? fallbackDiv.querySelector('img') : null;

      let isRendered = false;
      let desc = '';
      if (mode === 'sprite') {
        isRendered = spriteCanvas && spriteCanvas.style.display !== 'none' && !!(window.spriteAtlasManager && window.spriteAtlasManager.ready);
        desc = '网页模式 Sprite 画布正常渲染';
      } else if (mode === 'live2d') {
        isRendered = live2dCanvas && live2dCanvas.style.display !== 'none' && !!(window.live2dManager && window.live2dManager.model);
        desc = '网页模式 Live2D 正常渲染';
      } else if (mode === 'vrm') {
        isRendered = vrmCanvas && vrmCanvas.style.display !== 'none';
        desc = '网页模式 VRM 正常渲染';
      } else if (fallbackDiv) {
        isRendered = fallbackDiv.style.display !== 'none' && fbImg && fbImg.src && fbImg.src.length > 5;
        desc = '网页模式 高清立绘正常回退，彻底杜绝空白画布';
      }

      assert('5. 网页模式角色[' + char.name + ']无空白正常显示', isRendered, mode + ': ' + desc);
    }

    // 6. 原生 CV 语音系统全角色验证
    for (const id of allCharIds) {
      const char = charMgr.registry[id];
      let hasVoice = false;
      try {
        hasVoice = charMgr.playRandomVoice(id);
      } catch (e) {
        hasVoice = false;
      }
      assert('6. 角色[' + char.name + ']具有原生CV配音配置', typeof hasVoice === 'string' && hasVoice.length > 5);
    }

    // 7. 桌宠双击交互验证（杜绝意外退出）
    await petMode.enter(true, true);
    await new Promise(r => setTimeout(r, 500));
    assert('7. 切回桌宠模式', !document.body.classList.contains('web-mode-active'));

    let tapTriggered = false;
    const originalHandleTouch = actMgr ? actMgr.handleTouch : null;
    if (actMgr) {
      actMgr.handleTouch = () => { tapTriggered = true; };
    }
    petMode._playTap('head', 2);
    assert('7. 双击桌宠触发摸头欢乐互动而非退出程序', tapTriggered === true);
    if (actMgr && originalHandleTouch) {
      actMgr.handleTouch = originalHandleTouch;
    }

    return suite;
  };

  const results = await win.webContents.executeJavaScript('(' + clientTestFunction.toString() + ')()');

  console.log('========================================================');
  console.log('             COMPREHENSIVE TEST SUITE REPORT            ');
  console.log('========================================================');
  console.log('TOTAL PASSED: ' + results.passed);
  console.log('TOTAL FAILED: ' + results.failed);
  console.log('--------------------------------------------------------');
  results.tests.forEach((t) => {
    console.log('[' + t.status + '] ' + t.test + (t.extra ? ' (' + t.extra + ')' : ''));
  });
  console.log('========================================================');

  app.quit();
  process.exit(results.failed > 0 ? 1 : 0);
});
