const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  win.webContents.on('console-message', (event, level, message) => {
    console.log('[CONSOLE]', message);
  });

  await win.loadFile('核心通用代码/核心/index.html');
  await new Promise(r => setTimeout(r, 1500));

  const testRes = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        console.log('Testing Rem PIXI.live2d.Live2DModel.from...');
        const m = await PIXI.live2d.Live2DModel.from('../../角色-蕾姆/Live2D模型/model.json');
        console.log('Rem model loaded!', m.width, m.height);
        return { success: true, width: m.width, height: m.height };
      } catch (e) {
        console.error('Rem load error:', e.stack || e.message);
        return { success: false, error: e.stack || e.message };
      }
    })()
  `);

  console.log('TEST RESULT:', JSON.stringify(testRes, null, 2));
  app.quit();
});
