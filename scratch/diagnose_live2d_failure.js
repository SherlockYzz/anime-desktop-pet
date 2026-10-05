const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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
    width: 800,
    height: 800,
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

  win.webContents.on('console-message', (e, level, msg, line, sourceId) => {
    console.log(`[Renderer Console] [lvl:${level}] ${msg} (${sourceId}:${line})`);
  });

  await win.loadFile(path.join(__dirname, '../核心通用代码/核心/index.html'));

  // 等待初始化
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n--- 测试切换加藤惠 (Live2D) ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      try {
        console.log('[Test] 开始切换到加藤惠');
        await window.mimoAPI.switchCharacter('megumi');
        console.log('[Test] switchCharacter 完成，当前角色:', window.characterManager.getCurrentCharacter()?.id);
        const isWeb = document.body.classList.contains('web-mode-active');
        console.log('[Test] 当前是否网页模式:', isWeb);
        if (isWeb) {
          await window.live2dManager.loadCharacterModel();
        } else {
          await window.app.petMode._loadCharacter();
        }
        console.log('[Test] 加藤惠加载逻辑执行完毕，当前渲染模式:', window.app.petMode?._renderMode, 'model存在:', Boolean(window.app.petMode?._model));
      } catch (err) {
        console.error('[Test Error] 加藤惠加载报错:', err);
      }
    })()
  `);

  await new Promise(r => setTimeout(r, 2500));

  console.log('\n--- 检查网页模式下的 Live2D ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      try {
        console.log('[Test] 退出到网页模式');
        await window.app.petMode.exit(true);
        console.log('[Test] 切换网页模式后 Live2D 状态:', window.live2dManager?.currentRenderMode, 'model存在:', Boolean(window.live2dManager?.model));
      } catch (err) {
        console.error('[Test Error] 退出到网页模式报错:', err);
      }
    })()
  `);

  await new Promise(r => setTimeout(r, 2000));

  console.log('\n--- 测试切换惠惠 (Live2D) ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      try {
        console.log('[Test] 开始切换到惠惠');
        await window.mimoAPI.switchCharacter('megumin');
        await window.live2dManager.loadCharacterModel();
        console.log('[Test] 惠惠网页模式 Live2D 状态:', window.live2dManager?.currentRenderMode, 'model存在:', Boolean(window.live2dManager?.model));
      } catch (err) {
        console.error('[Test Error] 惠惠加载报错:', err);
      }
    })()
  `);

  await new Promise(r => setTimeout(r, 2000));

  console.log('\n--- 测试切换高木同学 (Live2D) ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      try {
        console.log('[Test] 开始切换到高木同学');
        await window.mimoAPI.switchCharacter('takagi');
        await window.live2dManager.loadCharacterModel();
        console.log('[Test] 高木同学网页模式 Live2D 状态:', window.live2dManager?.currentRenderMode, 'model存在:', Boolean(window.live2dManager?.model));
      } catch (err) {
        console.error('[Test Error] 高木同学加载报错:', err);
      }
    })()
  `);

  await new Promise(r => setTimeout(r, 2000));

  process.exit(0);
});
