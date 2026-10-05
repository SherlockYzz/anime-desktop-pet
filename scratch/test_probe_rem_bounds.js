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

  const info = await win.webContents.executeJavaScript(`
    (async () => {
      await window.mimoAPI.switchCharacter('rem');
      await window.app.petMode._loadCharacter();
      const pet = window.app.petMode;
      const m = pet._model;
      const c = document.getElementById('pet-canvas');
      const area = document.getElementById('pet-character-area');

      function snapshot(tag) {
        const b = m.getBounds();
        const areaRect = area.getBoundingClientRect();
        const canvasRect = c.getBoundingClientRect();
        return {
          tag,
          petScale: pet._petScale,
          modelX: m.x,
          modelY: m.y,
          modelScale: { x: m.scale.x, y: m.scale.y },
          modelAnchor: { x: m.anchor.x, y: m.anchor.y },
          modelPivot: { x: m.pivot.x, y: m.pivot.y },
          bounds: { x: b.x, y: b.y, width: b.width, height: b.height, right: b.x + b.width, bottom: b.y + b.height },
          areaRect: { left: areaRect.left, right: areaRect.right, width: areaRect.width, height: areaRect.height },
          canvasRect: { left: canvasRect.left, right: canvasRect.right, width: canvasRect.width, height: canvasRect.height },
          canvasPixelW: c.width,
          canvasPixelH: c.height,
          canvasStyleW: c.style.width,
          canvasStyleH: c.style.height,
          windowInnerW: window.innerWidth,
          windowInnerH: window.innerHeight
        };
      }

      const s1 = snapshot('default-1.0');

      await pet.setPetScale(0.8);
      const s2 = snapshot('scale-0.8');

      await pet.setPetScale(0.75);
      const s3 = snapshot('scale-0.75');

      return [s1, s2, s3];
    })()
  `);

  console.log(JSON.stringify(info, null, 2));
  process.exit(0);
});
