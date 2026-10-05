const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const rootDir = 'F:/Desktop/.DeskBox/文件夹/项目与开发/二次元桌宠项目';
const unpackedAppDir = path.join(rootDir, 'dist/win-unpacked/resources/app');

// 注入 check-file-exists
ipcMain.handle('check-file-exists', (event, relPath) => {
  if (!relPath) return false;
  try {
    const basePath = path.join(unpackedAppDir, '核心通用代码/核心');
    const fullPath = path.resolve(basePath, relPath);
    return fs.existsSync(fullPath);
  } catch (e) {
    return false;
  }
});

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(unpackedAppDir, '安全桥接.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true
    }
  });

  const toastsFound = [];
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (message.includes('未找到') || message.includes('Live2D模型未找到')) {
      toastsFound.push(message);
    }
  });

  const indexPath = path.join(unpackedAppDir, '核心通用代码/核心/index.html');
  await win.loadFile(indexPath);
  await new Promise(r => setTimeout(r, 2000));

  const report = await win.webContents.executeJavaScript(`
    (async () => {
      const results = {
        bootCharacter: null,
        characters: [],
        toastsInDom: []
      };

      const bootChar = window.characterManager.getCurrentCharacter();
      results.bootCharacter = {
        id: bootChar?.id,
        name: bootChar?.name,
        renderMode: window.app.petMode._renderMode,
        spriteReady: !!window.spriteAtlasManager?.ready
      };

      const list = window.DEFAULT_CHARACTER_ORDER || ['ruoxi', 'megumi', 'megumin', 'rem', 'miku', 'takagi', 'zerotwo', 'yukino'];

      for (const id of list) {
        try {
          await window.app._switchCharacter(id);
          await new Promise(r => setTimeout(r, 1000));

          const cur = window.characterManager.getCurrentCharacter();
          const mode = window.app.petMode._renderMode;
          const model = window.app.petMode._model;
          const fb = document.querySelector('.pet-fallback-img');
          const toasts = [...document.querySelectorAll('.toast')].map(t => t.textContent);

          results.characters.push({
            id,
            name: cur?.name,
            mode,
            modelReady: mode === 'sprite' ? !!window.spriteAtlasManager?.ready : (mode === 'live2d' ? !!model : true),
            hasFallbackOverlay: !!fb,
            dims: model ? { w: Math.round(model.width), h: Math.round(model.height) } : null,
            toasts
          });
        } catch (e) {
          results.characters.push({ id, error: e.message });
        }
      }

      // 检查 DOM 中是否有报错 Toast
      results.toastsInDom = [...document.querySelectorAll('.toast')].map(t => t.textContent);

      return results;
    })()
  `);

  console.log('=== FULL UNPACKED APP VERIFICATION ===');
  console.log(JSON.stringify(report, null, 2));
  console.log('Toasts count in log:', toastsFound.length);
  app.quit();
});
