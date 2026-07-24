const { app, BrowserWindow, ipcMain, Tray, Menu, screen, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let isQuitting = false;
let currentTrayLabel = '桌宠';
let currentTrayAvatar = '角色-加藤惠/图片素材/头像.png';

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: screenWidth - 420,
    y: screenHeight - 620,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    hasShadow: false,
    show: true,                       // ← ★ 立即显示，不等 ready-to-show
    paintWhenInitiallyHidden: false,
    webPreferences: {
      preload: path.join(__dirname, '安全桥接.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      v8CacheOptions: 'code',
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.loadFile('核心通用代码/核心/index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // ★ 不再拦截 close 事件：让关闭行为直达
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(label, avatarPath) {
  currentTrayLabel = label || currentTrayLabel;
  if (avatarPath) currentTrayAvatar = avatarPath;

  if (tray) tray.destroy();

  tray = new Tray(path.join(__dirname, currentTrayAvatar));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `显示${currentTrayLabel}`,
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
      }
    },
    {
      label: '设置',
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.webContents.send('show-settings'); }
      }
    },
    { type: 'separator' },
    { label: '隐藏到托盘', click: () => { if (mainWindow) mainWindow.hide(); } },
    {
      label: '告别并退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip(currentTrayLabel);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray('桌宠');

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) { mainWindow.hide(); }
      else { mainWindow.show(); mainWindow.focus(); }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', () => { globalShortcut.unregisterAll(); });

// IPC
ipcMain.handle('get-screen-size', () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return { width, height };
});

ipcMain.handle('set-always-on-top', (event, flag) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(flag);
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

// ★ 直接 destroy 窗口，跳过 close 事件链，立即退出
ipcMain.handle('close-window', () => {
  isQuitting = true;
  if (mainWindow) mainWindow.destroy();
  app.quit();
});

ipcMain.handle('update-tray-label', (event, label, avatarPath) => {
  const relPath = avatarPath ? avatarPath.replace(/^(\.\.\/)+/, '') : null;
  createTray(label, relPath);
});
