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

  const indexPath = path.resolve('核心通用代码/核心/index.html');
  await win.loadFile(indexPath);
  await new Promise(r => setTimeout(r, 2000));

  const res = await win.webContents.executeJavaScript(`
    (async () => {
      const results = {};
      
      // 测试高木同学
      try {
        const okTakagi = await window.characterManager.switchCharacter('takagi');
        await new Promise(r => setTimeout(r, 1500));
        const modeTakagi = window.app.petMode._renderMode;
        const modelTakagi = !!window.app.petMode._model;
        results.takagi = { ok: okTakagi, mode: modeTakagi, model: modelTakagi };
      } catch(e) {
        results.takagi = { error: e.message };
      }

      // 测试惠惠
      try {
        const okMegumin = await window.characterManager.switchCharacter('megumin');
        await new Promise(r => setTimeout(r, 1500));
        const modeMegumin = window.app.petMode._renderMode;
        const modelMegumin = !!window.app.petMode._model;
        results.megumin = { ok: okMegumin, mode: modeMegumin, model: modelMegumin };
      } catch(e) {
        results.megumin = { error: e.message };
      }

      return results;
    })()
  `);

  console.log('=== TEST RESULT FOR CORE 5 ===');
  console.log(JSON.stringify(res, null, 2));
  app.quit();
});
