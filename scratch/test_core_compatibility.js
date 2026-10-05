const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  
  // 分别测试原版的 core 和 5.0 的 core
  const res = await win.webContents.executeJavaScript(`
    (async () => {
      const fs = require('fs');
      
      function testCore(coreScriptPath) {
        // 创建沙箱运行
        const coreCode = fs.readFileSync(coreScriptPath, 'utf8');
        const script = document.createElement('script');
        script.textContent = coreCode;
        document.head.appendChild(script);
        const Core = window.Live2DCubismCore;
        
        function tryMoc(mocPath) {
          try {
            const buf = fs.readFileSync(mocPath);
            const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            const moc = Core.Moc.fromArrayBuffer(ab);
            return { ok: !!moc, hasNative: !!(moc && moc._nativeMoc) };
          } catch(e) {
            return { ok: false, error: e.message };
          }
        }
        
        const meguminRes = tryMoc('角色-惠惠/Live2D模型/1024100.moc3');
        const takagiRes = tryMoc('角色-高木同学/Live2D模型/Takagi.moc3');
        return { megumin: meguminRes, takagi: takagiRes };
      }
      
      return {
        originalCore: testCore('核心通用代码/lib/live2dcubismcore.min.js')
      };
    })()
  `);
  
  console.log('Original Core Result:', JSON.stringify(res, null, 2));
  
  const win2 = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  const res2 = await win2.webContents.executeJavaScript(`
    (async () => {
      const fs = require('fs');
      const coreCode = fs.readFileSync('scratch/live2dcubismcore_5.min.js', 'utf8');
      const script = document.createElement('script');
      script.textContent = coreCode;
      document.head.appendChild(script);
      const Core = window.Live2DCubismCore;
      
      function tryMoc(mocPath) {
        try {
          const buf = fs.readFileSync(mocPath);
          const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
          const moc = Core.Moc.fromArrayBuffer(ab);
          return { ok: !!moc, hasNative: !!(moc && moc._ptr) };
        } catch(e) {
          return { ok: false, error: e.message };
        }
      }
      
      return {
        core5: {
          megumin: tryMoc('角色-惠惠/Live2D模型/1024100.moc3'),
          takagi: tryMoc('角色-高木同学/Live2D模型/Takagi.moc3')
        }
      };
    })()
  `);
  
  console.log('Core 5 Result:', JSON.stringify(res2, null, 2));
  app.quit();
});
