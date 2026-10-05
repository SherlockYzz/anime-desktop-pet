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
    console.log('[LOG]', message);
  });

  await win.loadFile('核心通用代码/核心/index.html');
  await new Promise(r => setTimeout(r, 1500));

  console.log('--- Exiting to Web Mode ---');
  await win.webContents.executeJavaScript(`
    window.app.petMode.exit(true);
  `);
  await new Promise(r => setTimeout(r, 1000));

  console.log('--- Switching to Rem in Web Mode ---');
  await win.webContents.executeJavaScript(`
    window.app._switchCharacter('rem');
  `);
  await new Promise(r => setTimeout(r, 2000));

  const remState = await win.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('live2d-container');
      const canvas = document.getElementById('live2d-canvas');
      const fb = document.getElementById('live2d-fallback');
      const gif = document.getElementById('gif-fallback-container');
      return {
        containerHtml: container ? container.outerHTML.substring(0, 300) : null,
        canvasDisplay: canvas ? canvas.style.display : null,
        canvasComputedDisplay: canvas ? window.getComputedStyle(canvas).display : null,
        hasFallback: !!fb,
        hasGif: !!gif,
        hasModel: !!(window.live2dManager && window.live2dManager.model)
      };
    })()
  `);
  console.log('Rem Web Mode State:', JSON.stringify(remState, null, 2));

  // Take screenshot of Rem in Web Mode
  const remImg = await win.webContents.capturePage();
  fs.writeFileSync('scratch/snap_rem_web.png', remImg.toPNG());
  console.log('Saved scratch/snap_rem_web.png');

  console.log('--- Switching to Takagi in Web Mode ---');
  await win.webContents.executeJavaScript(`
    window.app._switchCharacter('takagi');
  `);
  await new Promise(r => setTimeout(r, 2000));

  const takagiState = await win.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('live2d-container');
      const canvas = document.getElementById('live2d-canvas');
      const fb = document.getElementById('live2d-fallback');
      return {
        containerHtml: container ? container.outerHTML.substring(0, 300) : null,
        canvasDisplay: canvas ? canvas.style.display : null,
        hasFallback: !!fb,
        fbHtml: fb ? fb.outerHTML : null
      };
    })()
  `);
  console.log('Takagi Web Mode State:', JSON.stringify(takagiState, null, 2));

  const takagiImg = await win.webContents.capturePage();
  fs.writeFileSync('scratch/snap_takagi_web.png', takagiImg.toPNG());
  console.log('Saved scratch/snap_takagi_web.png');

  app.quit();
});
