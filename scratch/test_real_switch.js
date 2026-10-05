const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      webSecurity: false,
      allowFileAccessFromFileURLs: true
    }
  });

  win.webContents.on('console-message', (e, level, msg) => {
    console.log(`[BROWSER CONSOLE ${level}] ${msg}`);
  });

  const indexPath = path.resolve('核心通用代码/核心/index.html');
  await win.loadFile(indexPath);
  await new Promise(r => setTimeout(r, 2000));

  const res = await win.webContents.executeJavaScript(`
    (async () => {
      const results = {};
      
      // 测试高木同学
      try {
        await window.app._switchCharacter('takagi');
        await new Promise(r => setTimeout(r, 2000));
        const modeTakagi = window.app.petMode._renderMode;
        const modelTakagi = !!window.app.petMode._model;
        results.takagi = { mode: modeTakagi, model: modelTakagi };
      } catch(e) {
        results.takagi = { error: e.message };
      }

      // 测试惠惠
      try {
        await window.app._switchCharacter('megumin');
        await new Promise(r => setTimeout(r, 2000));
        const modeMegumin = window.app.petMode._renderMode;
        const modelMegumin = !!window.app.petMode._model;
        results.megumin = { mode: modeMegumin, model: modelMegumin };
      } catch(e) {
        results.megumin = { error: e.message };
      }

      return results;
    })()
  `);

  console.log('=== REAL SWITCH TEST RESULT ===');
  console.log(JSON.stringify(res, null, 2));
  app.quit();
});
