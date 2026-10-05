const { app, BrowserWindow } = require('electron');
const path = require('path');

const rootDir = 'F:/Desktop/.DeskBox/文件夹/项目与开发/二次元桌宠项目';

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 600,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(rootDir, 'dist/win-unpacked/resources/app/安全桥接.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true
    }
  });

  const logs = [];
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    logs.push(`[L${level}] [${sourceId}:${line}] ${message}`);
  });

  const indexPath = path.join(rootDir, 'dist/win-unpacked/resources/app/核心通用代码/核心/index.html');
  await win.loadFile(indexPath);

  console.log('Page loaded. Waiting 3 seconds for boot and animation...');
  await new Promise(r => setTimeout(r, 3000));

  const diag = await win.webContents.executeJavaScript(`
    (() => {
      const p = window.app?.petMode;
      const s = window.spriteAtlasManager;
      const petArea = document.getElementById('pet-character-area');
      const petCanvas = document.getElementById('pet-canvas');
      const spriteCanvas = document.getElementById('pet-sprite-canvas');
      const fb = document.querySelector('.pet-fallback-img');
      const gif = document.getElementById('pet-gif');

      return {
        currentChar: window.characterManager?.getCurrentCharacter()?.id,
        petRenderMode: p?._renderMode,
        spriteAtlasReady: s?.ready,
        spriteAnim: s?.S?.anim,
        spriteFrame: s?.S?.frame,
        spritePaused: s?.S?.paused,
        spriteLoopRunning: !!s?._raf,
        canvasVisible: {
          petCanvas: petCanvas?.style.display,
          spriteCanvas: spriteCanvas?.style.display,
          gif: gif?.style.display
        },
        spriteCanvasDimensions: spriteCanvas ? {
          width: spriteCanvas.width,
          height: spriteCanvas.height,
          clientWidth: spriteCanvas.clientWidth,
          clientHeight: spriteCanvas.clientHeight,
          styleW: spriteCanvas.style.width,
          styleH: spriteCanvas.style.height
        } : null,
        fallbackImg: fb ? { src: fb.src, style: fb.style.cssText } : null,
        isFallbackInDom: !!fb
      };
    })()
  `);

  console.log('=== REAL TIME RUNTIME DIAGNOSTIC ===');
  console.log(JSON.stringify(diag, null, 2));

  // 记录连续 5 帧的状态变化，看帧号有没有在走
  const frames = [];
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 200));
    const frameState = await win.webContents.executeJavaScript(`
      (() => {
        const s = window.spriteAtlasManager;
        return { anim: s?.S?.anim, frame: s?.S?.frame, elapsed: s?.S?.elapsed };
      })()
    `);
    frames.push(frameState);
  }
  console.log('Frames progression:', frames);

  console.log('=== LOGS ===');
  console.log(logs.slice(-20));

  app.quit();
});
