const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

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

  const scales = [1.3, 1.15, 1.0, 0.9, 0.8, 0.75];

  const results = await win.webContents.executeJavaScript(`
    (async () => {
      await window.mimoAPI.switchCharacter('rem');
      await window.app.petMode._loadCharacter();
      const pet = window.app.petMode;
      const m = pet._model;
      const canvas = document.getElementById('pet-canvas');

      const data = [];
      for (const s of [1.3, 1.0, 0.8, 0.75]) {
        await pet.setPetScale(s);
        const b = m.getBounds();
        const stageW = pet._pixiApp.renderer.screen.width;
        const stageH = pet._pixiApp.renderer.screen.height;
        const canvasBackW = canvas.width;
        const dpr = window.devicePixelRatio || 1;
        
        // 关键指标：模型左右边距是否对称？是否溢出画布？
        const leftMargin = b.x;
        const rightMargin = stageW - (b.x + b.width);
        const isCroppedRight = (b.x + b.width) > stageW;
        const isCroppedLeft = b.x < 0;
        const backBufferMatchesDpr = (canvasBackW === Math.round(stageW * dpr));

        data.push({
          scale: s,
          stageW,
          stageH,
          canvasBackW,
          expectedBackW: Math.round(stageW * dpr),
          backBufferMatchesDpr,
          modelX: m.x,
          modelWidth: b.width,
          leftMargin,
          rightMargin,
          isCroppedLeft,
          isCroppedRight
        });
      }
      return data;
    })()
  `);

  console.log('--- SCALE COMPLIANCE TEST ---');
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
});
