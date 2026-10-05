const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

ipcMain.handle('check-file-exists', () => true);
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

  const res = await win.webContents.executeJavaScript(`
    (async () => {
      await window.mimoAPI.switchCharacter('rem');
      await window.app.petMode._loadCharacter();
      const pet = window.app.petMode;
      const canvas = document.getElementById('pet-canvas');

      const r1 = {
        pixiW: pet._pixiApp.renderer.width,
        pixiH: pet._pixiApp.renderer.height,
        canvasW: canvas.width,
        canvasH: canvas.height,
        styleW: canvas.style.width,
        styleH: canvas.style.height
      };

      // 仅调用 renderer.resize(304, 456)，不手动覆盖 canvas.width
      pet._pixiApp.renderer.resize(304, 456);

      const r2 = {
        pixiW: pet._pixiApp.renderer.width,
        pixiH: pet._pixiApp.renderer.height,
        canvasW: canvas.width,
        canvasH: canvas.height,
        styleW: canvas.style.width,
        styleH: canvas.style.height
      };

      // 手动覆盖 canvas.width = 304
      canvas.width = 304;
      canvas.height = 456;

      const r3 = {
        pixiW: pet._pixiApp.renderer.width,
        pixiH: pet._pixiApp.renderer.height,
        canvasW: canvas.width,
        canvasH: canvas.height,
        styleW: canvas.style.width,
        styleH: canvas.style.height
      };

      return { r1, r2, r3 };
    })()
  `);

  console.log('--- PIXI RESIZE EXPERIMENT ---');
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
});
