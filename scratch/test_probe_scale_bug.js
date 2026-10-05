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
    width: 400,
    height: 600,
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

  await win.loadFile(path.join(__dirname, '../核心通用代码/核心/index.html'));
  await new Promise(r => setTimeout(r, 2000));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      await window.mimoAPI.switchCharacter('rem');
      await window.app.petMode._loadCharacter();
      const pet = window.app.petMode;
      const canvas = document.getElementById('pet-canvas');

      const dpr = window.devicePixelRatio;
      const initial = {
        dpr,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        canvasStyleW: canvas.style.width,
        canvasStyleH: canvas.style.height,
        rendererW: pet._pixiApp.renderer.width,
        rendererH: pet._pixiApp.renderer.height,
        rendererScreenW: pet._pixiApp.renderer.screen.width,
        rendererScreenH: pet._pixiApp.renderer.screen.height,
        modelX: pet._model.x,
        modelY: pet._model.y,
        modelScaleX: pet._model.scale.x,
        modelBounds: pet._model.getBounds()
      };

      // 测试设置 scale = 0.8
      await pet.setPetScale(0.8);

      const afterScaleDown = {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        canvasStyleW: canvas.style.width,
        canvasStyleH: canvas.style.height,
        rendererW: pet._pixiApp.renderer.width,
        rendererH: pet._pixiApp.renderer.height,
        rendererScreenW: pet._pixiApp.renderer.screen.width,
        rendererScreenH: pet._pixiApp.renderer.screen.height,
        modelX: pet._model.x,
        modelY: pet._model.y,
        modelScaleX: pet._model.scale.x,
        modelBounds: pet._model.getBounds()
      };

      return { initial, afterScaleDown };
    })()
  `);

  console.log('Scale Probe Result:');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
});
