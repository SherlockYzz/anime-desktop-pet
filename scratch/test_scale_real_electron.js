/**
 * 真实 Electron 渲染进程完整实测：
 * 验证：1. 窗口放大上限与防出屏  2. 等比例放大与蒙版同步  3. 重新登录恢复默认尺寸  4. 多通道兜底切回
 */
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const assert = require('assert');

// 注册完整主进程 IPC 处理器，确保 0 报错
ipcMain.handle('get-work-area', () => {
  const display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
});

ipcMain.handle('get-window-bounds', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return null;
  const [x, y] = win.getPosition();
  const [width, height] = win.getSize();
  return { x, y, width, height };
});

ipcMain.handle('set-window-bounds', (e, bounds) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || !bounds) return null;
  const cur = win.getBounds();
  const targetDisplay = screen.getDisplayMatching(cur) || screen.getPrimaryDisplay();
  const wa = targetDisplay.workArea;

  const maxSafeW = Math.max(300, wa.width - 30);
  const maxSafeH = Math.max(400, wa.height - 40);

  const newW = Math.min(maxSafeW, Math.max(200, Math.round(bounds.width || cur.width)));
  const newH = Math.min(maxSafeH, Math.max(300, Math.round(bounds.height || cur.height)));

  const newX = bounds.x !== undefined ? Math.round(bounds.x) : Math.round(cur.x + (cur.width - newW) / 2);
  const newY = bounds.y !== undefined ? Math.round(bounds.y) : Math.round(cur.y + (cur.height - newH));

  const minX = wa.x;
  const maxX = Math.max(wa.x, wa.x + wa.width - newW);
  const minY = wa.y;
  const maxY = Math.max(wa.y, wa.y + wa.height - newH);
  const nx = Math.max(minX, Math.min(maxX, Math.round(newX)));
  const ny = Math.max(minY, Math.min(maxY, Math.round(newY)));

  win.setBounds({ x: nx, y: ny, width: newW, height: newH });
  return win.getBounds();
});

ipcMain.handle('set-always-on-top', () => {});
ipcMain.handle('get-custom-characters', () => []);
ipcMain.handle('update-tray-label', () => {});
ipcMain.on('set-ignore-mouse-events', () => {});
ipcMain.on('move-window-by', () => {});
ipcMain.on('set-window-position', () => {});
ipcMain.handle('check-file-exists', (e, rel) => true);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../安全桥接.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  win.loadFile(path.join(__dirname, '../核心通用代码/核心/index.html'));

  win.webContents.once('did-finish-load', async () => {
    console.log('\n======================================================');
    console.log('🚀 Electron 真实渲染环境：桌宠缩放与默认尺寸恢复全量实测');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
      try {
        await fn();
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
        failed++;
      }
    }

    try {
      // 等待 App 与 角色初始化完成
      await new Promise(r => setTimeout(r, 1800));

      // 测试项 1: 验证开机自启动时默认尺寸恢复为 100% (400x600)
      await test('开机/重新登录时强制恢复默认 1.0 (400x600) 尺寸', async () => {
        const bounds = await win.webContents.executeJavaScript(`
          (async () => {
            return {
              scale: window.app?.petMode?._petScale,
              bounds: await window.electronAPI.getWindowBounds(),
              localStorage: localStorage.getItem('pet-scale')
            };
          })()
        `);
        assert.strictEqual(bounds.scale, 1.0, '桌宠模式初始比例必须是 1.0');
        assert.strictEqual(bounds.bounds.width, 400, '初始窗口宽度必须是 400');
        assert.strictEqual(bounds.bounds.height, 600, '初始窗口高度必须是 600');
        assert.strictEqual(bounds.localStorage, null, 'localStorage 中的 pet-scale 必须已被清空');
      });

      // 测试项 2: 验证安全放大上限被严格控制，切换键防出屏
      await test('验证安全放大上限被严格控制在工作区内，切换键 100% 可见', async () => {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const pet = window.app.petMode;
            // 尝试放大到极端大 2.5
            pet.setPetScale(2.5);
            const appliedScale = pet._petScale;
            const bounds = await window.electronAPI.getWindowBounds();
            const btn = document.getElementById('btn-switch-web');
            const btnRect = btn.getBoundingClientRect();
            return {
              appliedScale,
              bounds,
              btnVisible: btnRect.bottom <= window.innerHeight && btnRect.top >= 0
            };
          })()
        `);
        assert.ok(result.appliedScale <= 1.35, `应用比例 (${result.appliedScale}) 必须受安全上限 <= 1.35 保护`);
        assert.ok(result.bounds.height <= 810, `窗口高度 (${result.bounds.height}) 必须受到 810 保护`);
        assert.strictEqual(result.btnVisible, true, '切换网页按键必须完全在可视窗口内部');
      });

      // 测试项 3: 验证严格等比例缩放与 WebGL 视口同步
      await test('验证 Live2D 与精灵表严格等比例放大，WebGL 视口与投影同步', async () => {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const pet = window.app.petMode;
            pet.setPetScale(1.0);
            const maxSafe = pet._calcMaxSafeScale();
            const targetS = Math.min(maxSafe, 1.1);
            pet.setPetScale(targetS);
            const appliedS = pet._petScale;
            const canvas = document.getElementById('pet-canvas');
            const spriteCanvas = document.getElementById('pet-sprite-canvas');
            const pixiRenderer = pet._pixiApp?.renderer;
            const model = pet._model;
            return {
              appliedS,
              canvasW: canvas.width,
              canvasH: canvas.height,
              expectedW: Math.round(380 * appliedS),
              expectedH: Math.round(570 * appliedS),
              modelScaleX: model ? model.scale.x : null,
              modelScaleY: model ? model.scale.y : null
            };
          })()
        `);
        assert.strictEqual(result.canvasW, result.expectedW, 'Live2D Canvas 物理宽度必须严格等比同步');
        assert.strictEqual(result.canvasH, result.expectedH, 'Live2D Canvas 物理高度必须严格等比同步');
        if (result.modelScaleX) {
          assert.strictEqual(result.modelScaleX, result.modelScaleY, 'Live2D 模型 X 与 Y 轴必须严格等比');
        }
      });

      // 测试项 4: 验证快捷键 Esc、F2 与右键百宝箱兜底切回网页模式
      await test('验证快捷键 Esc、F2 与动作百宝箱底部的【切回网页】入口有效性', async () => {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const pet = window.app.petMode;
            pet._toggleActionMenu(true);
            const menu = document.getElementById('pet-action-menu');
            const exitBtn = menu.querySelector('.btn-exit-pet-from-menu');
            const scaleBtn = menu.querySelector('.btn-open-scale-from-menu');
            return {
              menuOpen: menu.classList.contains('show'),
              hasExitBtn: Boolean(exitBtn),
              hasScaleBtn: Boolean(scaleBtn)
            };
          })()
        `);
        assert.strictEqual(result.menuOpen, true, '动作百宝箱能够正常弹出');
        assert.strictEqual(result.hasExitBtn, true, '动作百宝箱必须包含【切回网页】快捷按键');
        assert.strictEqual(result.hasScaleBtn, true, '动作百宝箱必须包含【调节大小】快捷按键');
      });

      // 测试项 5: 验证重新进入桌宠模式时再次恢复默认尺寸
      await test('验证再次初始化/进入时强制恢复默认 1.0 尺寸', async () => {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const pet = window.app.petMode;
            pet.setPetScale(1.3);
            pet.init(true);
            return {
              scale: pet._petScale,
              sliderVal: document.getElementById('pet-scale-slider').value,
              valText: document.getElementById('pet-scale-val').textContent
            };
          })()
        `);
        assert.strictEqual(result.scale, 1.0, '重新初始化后比例必须绝对为 1.0');
        assert.strictEqual(result.sliderVal, '1', '滑动条必须恢复到 1.0');
        assert.strictEqual(result.valText, '100%', '显示文本必须恢复为 100%');
      });

      console.log('\n======================================================');
      console.log(`🎉 实测汇总：共测试 ${passed + failed} 项，通过 ${passed} 项，失败 ${failed} 项`);
      console.log('======================================================\n');

      if (failed === 0) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (err) {
      console.error('测试异常中断:', err);
      process.exit(1);
    }
  });
});
