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

  await win.loadFile(path.join(__dirname, '../核心通用代码/核心/index.html'));
  await new Promise(r => setTimeout(r, 2000));

  const res = await win.webContents.executeJavaScript(`
    (async () => {
      await window.mimoAPI.switchCharacter('rem');
      await window.app.petMode._loadCharacter();
      const pet = window.app.petMode;
      const m = pet._model;
      const before = {
        hasAnchor: Boolean(m && m.anchor),
        anchorVal: m && m.anchor ? { x: m.anchor.x, y: m.anchor.y } : null,
        hasPivot: Boolean(m && m.pivot),
        pivotVal: m && m.pivot ? { x: m.pivot.x, y: m.pivot.y } : null,
        width: m ? m.width : null,
        height: m ? m.height : null,
        x: m ? m.x : null,
        y: m ? m.y : null,
        scale: m ? { x: m.scale.x, y: m.scale.y } : null,
        origW: m ? m._origDesignWidth : null,
        origH: m ? m._origDesignHeight : null,
        canvasW: document.getElementById('pet-canvas').width,
        canvasH: document.getElementById('pet-canvas').height,
        areaW: document.getElementById('pet-character-area').clientWidth,
        areaH: document.getElementById('pet-character-area').clientHeight
      };

      // 模拟缩小到 0.8
      await pet.setPetScale(0.8);

      const after = {
        x: m ? m.x : null,
        y: m ? m.y : null,
        width: m ? m.width : null,
        height: m ? m.height : null,
        scale: m ? { x: m.scale.x, y: m.scale.y } : null,
        canvasW: document.getElementById('pet-canvas').width,
        canvasH: document.getElementById('pet-canvas').height,
        areaW: document.getElementById('pet-character-area').clientWidth,
        areaH: document.getElementById('pet-character-area').clientHeight,
        bounds: m ? m.getBounds() : null
      };

      return { before, after };
    })()
  `);

  console.log('--- PROBE RESULT ---');
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
});
