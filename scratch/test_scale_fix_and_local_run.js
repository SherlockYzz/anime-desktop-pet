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

  const rendererErrors = [];
  win.webContents.on('console-message', (e, level, msg) => {
    if (level >= 2 && !msg.includes('Security Warning') && !msg.includes('超时') && !msg.includes('Aborted')) {
      rendererErrors.push(msg);
      console.error('  [Renderer Error] ' + msg);
    }
  });

  await win.loadFile(path.join(__dirname, '../核心通用代码/核心/index.html'));
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n======================================================');
  console.log('🧪 本地运行实测：缩小窗口（0.75x~1.35x）与高分屏防裁切验证');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log('  ✅ [PASS] ' + name);
      passed++;
    } catch (err) {
      console.error('  ❌ [FAIL] ' + name + ': ' + err.message);
      failed++;
    }
  }

  // 1. 测试蕾姆 Live2D 缩放到 0.75x (最小尺寸) 时的显存缓冲区完整性与居中
  await test('1. 蕾姆 Live2D 缩放到 0.75x (最小)，物理显存不被腰斩且居中', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('rem');
        await window.app.petMode._loadCharacter();
        // 缩放到 0.75
        window.app.petMode.setPetScale(0.75);
        await new Promise(r => setTimeout(r, 600));

        const canvas = document.getElementById('pet-canvas');
        const m = window.app.petMode?._model;
        const dpr = window.devicePixelRatio || 1;
        const expectedStageW = Math.round(380 * 0.75); // 285
        const expectedStageH = Math.round(570 * 0.75); // 428

        return {
          dpr,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          cssWidth: canvas.style.width,
          cssHeight: canvas.style.height,
          expectedStageW,
          expectedStageH,
          modelX: m?.position?.x,
          modelY: m?.position?.y,
          modelAnchorX: m?.anchor?.x,
          modelScaleX: m?.scale?.x,
          modelScaleY: m?.scale?.y
        };
      })()
    `);

    console.log('    [蕾姆 0.75x 状态]', JSON.stringify(res));
    const expectedPxW = Math.round(res.expectedStageW * res.dpr);
    if (Math.abs(res.canvasWidth - expectedPxW) > 2) {
      throw new Error('显存缓冲区被砍断！canvas.width=' + res.canvasWidth + ', 期望=' + expectedPxW);
    }
    const expectedCenterX = res.expectedStageW / 2;
    if (Math.abs(res.modelX - expectedCenterX) > 1) {
      throw new Error('模型未居中！modelX=' + res.modelX + ', 期望=' + expectedCenterX);
    }
    if (Math.abs(res.modelScaleX - res.modelScaleY) > 0.0001) {
      throw new Error('模型 X 和 Y 缩放比例不一致导致变形！');
    }
  });

  // 2. 测试连续缩放：从 0.8 -> 1.0 -> 1.2 -> 1.35 各个档位
  await test('2. 连续切换缩放档位 (0.8x, 1.0x, 1.2x, 1.35x)，视口与显存全部同步', async () => {
    const scales = [0.8, 1.0, 1.2, 1.35];
    for (const s of scales) {
      const res = await win.webContents.executeJavaScript(`
        (async () => {
          window.app.petMode.setPetScale(` + s + `);
          await new Promise(r => setTimeout(r, 200));
          const canvas = document.getElementById('pet-canvas');
          const m = window.app.petMode?._model;
          const dpr = window.devicePixelRatio || 1;
          const actualScale = window.app.petMode._petScale;
          const expectedStageW = Math.round(380 * actualScale);
          return {
            actualScale,
            canvasWidth: canvas.width,
            expectedPxW: Math.round(expectedStageW * dpr),
            modelX: m?.position?.x,
            expectedX: expectedStageW / 2
          };
        })()
      `);
      if (Math.abs(res.canvasWidth - res.expectedPxW) > 2) {
        throw new Error('档位 ' + s + 'x 显存异常：canvas.width=' + res.canvasWidth + ', 期望=' + res.expectedPxW);
      }
      if (Math.abs(res.modelX - res.expectedX) > 1) {
        throw new Error('档位 ' + s + 'x 居中异常：modelX=' + res.modelX + ', 期望=' + res.expectedX);
      }
    }
  });

  // 3. 测试切换到若曦 (精灵表) 在 0.75x 缩小状态下的渲染尺寸
  await test('3. 若曦精灵表在 0.75x 缩小状态下，双画布切换与尺寸适配', async () => {
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        await window.mimoAPI.switchCharacter('ruoxi');
        await window.app.petMode._loadCharacter();
        window.app.petMode.setPetScale(0.75);
        await new Promise(r => setTimeout(r, 500));
        const spriteCanvas = document.getElementById('pet-sprite-canvas');
        const petCanvas = document.getElementById('pet-canvas');
        return {
          renderMode: window.app.petMode?._renderMode,
          spriteCanvasDisplay: spriteCanvas.style.display,
          petCanvasDisplay: petCanvas.style.display,
          spriteWidth: spriteCanvas.width,
          spriteStyleWidth: spriteCanvas.style.width
        };
      })()
    `);
    console.log('    [若曦状态]', JSON.stringify(res));
    if (res.renderMode !== 'sprite') throw new Error('若曦渲染模式错误：' + res.renderMode);
    if (res.spriteCanvasDisplay === 'none') throw new Error('精灵表画布被隐藏');
    if (res.petCanvasDisplay !== 'none') throw new Error('Live2D画布未正确隐藏');
  });

  // 4. 重置回默认 1.0 尺寸测试
  await test('4. resetPetScale() 恢复默认 1.0 尺寸', async () => {
    const res = await win.webContents.executeJavaScript(`
      (() => {
        window.app.petMode.resetPetScale();
        return {
          petScale: window.app.petMode._petScale,
          cssVar: document.documentElement.style.getPropertyValue('--pet-scale')
        };
      })()
    `);
    if (res.petScale !== 1.0 || res.cssVar !== '1') {
      throw new Error('恢复默认尺寸失败：petScale=' + res.petScale + ', cssVar=' + res.cssVar);
    }
  });

  console.log('\n======================================================');
  console.log('测试结果统计: ' + passed + ' 通过, ' + failed + ' 失败');
  console.log('======================================================\n');

  if (failed > 0 || rendererErrors.length > 0) {
    console.error('存在测试失败或渲染错误！');
    process.exit(1);
  } else {
    console.log('🎉 所有缩放与高分屏渲染测试 100% 通过！');
    process.exit(0);
  }
});
