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

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message}`);
  });

  // load simple HTML with pixi and live2d
  const html = `
    <!DOCTYPE html>
    <html>
    <body>
      <div id="container" style="width: 400px; height: 300px;">
        <canvas id="c"></canvas>
      </div>
      <script src="核心通用代码/lib/pixi.min.js"></script>
      <script src="核心通用代码/lib/live2d.min.js"></script>
      <script src="scratch/live2dcubismcore_5.min.js"></script>
      <script src="核心通用代码/lib/pixi-live2d-display.min.js"></script>
      <script>
        async function runTests() {
          const app = new PIXI.Application({ view: document.getElementById('c'), width: 400, height: 300, transparent: true });
          const models = [
            { name: 'megumi', path: '角色-加藤惠/Live2D模型/katou_01.model.json' },
            { name: 'rem', path: '角色-蕾姆/Live2D模型/model.json' },
            { name: 'megumin', path: '角色-惠惠/Live2D模型/1024100.model3.json' },
            { name: 'miku', path: '角色-初音未来/Live2D模型/miku.model.json' },
            { name: 'takagi', path: '角色-高木同学/Live2D模型/model.model3.json' }
          ];
          for (const m of models) {
            try {
              console.log('--- Loading ' + m.name + ' ---');
              const model = await PIXI.live2d.Live2DModel.from(m.path);
              app.stage.addChild(model);
              console.log('[SUCCESS] ' + m.name + ' loaded! width=' + model.width + ' height=' + model.height);
              app.stage.removeChild(model);
              model.destroy({ children: true });
            } catch (e) {
              console.error('[FAILED] ' + m.name + ' error:', e.message || String(e));
            }
          }
          console.log('=== ALL TESTS DONE ===');
        }
        window.addEventListener('load', runTests);
      </script>
    </body>
    </html>
  `;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html), {
    baseURLForDataURL: 'file://' + path.resolve('.').replace(/\\/g, '/') + '/'
  });

  await new Promise(r => setTimeout(r, 6000));
  app.quit();
});
