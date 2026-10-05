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
ipcMain.handle('update-tray-label', () => {});
ipcMain.handle('get-window-bounds', () => ({ x: 0, y: 0, width: 400, height: 600 }));
ipcMain.on('set-window-position', () => {});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 400,
    height: 600,
    webPreferences: {
      preload: path.resolve('安全桥接.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  win.webContents.on('console-message', (event, level, message) => {
    console.log(`[CONSOLE] ${message}`);
  });

  await win.loadFile('核心通用代码/核心/index.html');
  await new Promise(r => setTimeout(r, 1500));

  console.log('--- Switching to Takagi ---');
  const res = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        const ok = await window.characterManager.switchCharacter('takagi');
        return { success: true, ok };
      } catch (e) {
        return { success: false, error: e.stack || e.message };
      }
    })()
  `);
  console.log('Switch result:', JSON.stringify(res));

  await new Promise(r => setTimeout(r, 1500));

  const state = await win.webContents.executeJavaScript(`
    (() => {
      const petCanvas = document.getElementById('pet-canvas');
      const petGif = document.getElementById('pet-gif');
      const fallbackImg = document.querySelector('.pet-fallback-img');
      const petMode = window.app?.petMode;
      return {
        mode: petMode?._renderMode,
        hasModel: !!petMode?._model,
        petCanvasDisplay: petCanvas ? petCanvas.style.display : null,
        petGifDisplay: petGif ? petGif.style.display : null,
        hasFallbackImg: !!fallbackImg,
        fallbackSrc: fallbackImg ? fallbackImg.src : null,
        innerHtmlArea: document.getElementById('pet-character-area')?.innerHTML?.substring(0, 300)
      };
    })()
  `);
  console.log('Takagi final state:', JSON.stringify(state, null, 2));

  app.quit();
});
