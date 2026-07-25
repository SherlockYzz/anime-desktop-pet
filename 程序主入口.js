const { app, BrowserWindow, ipcMain, Tray, Menu, screen, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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

// ===== 自定义角色 IPC =====

/** 安全化角色ID：只允许小写字母数字下划线 */
function sanitizeId(name) {
  return 'custom_' + name.replace(/[^a-zA-Z0-9一-鿿]/g, '_').toLowerCase().slice(0, 30)
    + '_' + Date.now().toString(36);
}

/** 保存角色数据到磁盘（共用逻辑，供创建和导入使用） */
function saveCharacterData(data) {
  const { name, series, tagline, description, systemPrompt, primaryColor, avatarBase64, coverBase64, live2dModelBase64, live2dModelFileName } = data;

  const charId = sanitizeId(name);
  const charDir = path.join(__dirname, '自定义角色', charId);
  const imgDir = path.join(charDir, '图片素材');
  const live2dDir = path.join(charDir, 'Live2D模型');

  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(live2dDir, { recursive: true });

  const avatarRelPath = `../../自定义角色/${charId}/图片素材/头像.png`;
  if (avatarBase64) {
    const buf = Buffer.from(avatarBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    fs.writeFileSync(path.join(imgDir, '头像.png'), buf);
  }

  let coverRelPath = avatarRelPath;
  if (coverBase64) {
    const buf = Buffer.from(coverBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    fs.writeFileSync(path.join(imgDir, '封面.png'), buf);
    coverRelPath = `../../自定义角色/${charId}/图片素材/封面.png`;
  }

  let live2dModelPath = '';
  if (live2dModelBase64 && live2dModelFileName) {
    const buf = Buffer.from(live2dModelBase64.replace(/^data:.+;base64,/, ''), 'base64');
    const fileName = live2dModelFileName.endsWith('.model3.json') ? live2dModelFileName : 'model.model3.json';
    fs.writeFileSync(path.join(live2dDir, fileName), buf);
    live2dModelPath = `../../自定义角色/${charId}/Live2D模型/${fileName}`;
  }

  fs.writeFileSync(path.join(charDir, '系统提示词.txt'), systemPrompt || '', 'utf-8');

  const registryPath = path.join(__dirname, '自定义角色', 'registry.json');
  let registry = {};
  try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8')); } catch {}

  registry[charId] = {
    id: charId, name: name.trim(), series: series.trim(),
    tagline: tagline ? tagline.trim() : '',
    description: description ? description.trim() : '',
    primaryColor: primaryColor || '#f0a0b0',
    systemPrompt: systemPrompt || '',
    avatar: avatarRelPath, cover: coverRelPath,
    live2dModelPath, createdAt: Date.now(),
  };

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');

  return { success: true, id: charId };
}

ipcMain.handle('save-custom-character', async (event, data) => {
  return saveCharacterData(data);
});

/** 导出角色：打包为 JSON 文件 */
ipcMain.handle('export-custom-character', async (event, characterId) => {
  const registryPath = path.join(__dirname, '自定义角色', 'registry.json');
  let registry = {};
  try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8')); } catch {}
  const charMeta = registry[characterId];
  if (!charMeta) return { success: false, message: '角色不存在' };

  const charDir = path.join(__dirname, '自定义角色', characterId);

  // 读取图片文件转 base64
  const imgToBase64 = (filePath) => {
    try {
      const buf = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/' + ext;
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch { return ''; }
  };

  const avatarBase64 = imgToBase64(path.join(charDir, '图片素材', '头像.png'));
  const coverBase64 = imgToBase64(path.join(charDir, '图片素材', '封面.png'));

  // 读取 Live2D 模型
  let live2dModelBase64 = '';
  let live2dModelFileName = '';
  if (charMeta.live2dModelPath) {
    const live2dFile = path.basename(charMeta.live2dModelPath);
    const live2dPath = path.join(charDir, 'Live2D模型', live2dFile);
    try {
      const buf = fs.readFileSync(live2dPath);
      live2dModelBase64 = `data:application/octet-stream;base64,${buf.toString('base64')}`;
      live2dModelFileName = live2dFile;
    } catch {}
  }

  // 读取系统提示词
  let systemPrompt = '';
  try { systemPrompt = fs.readFileSync(path.join(charDir, '系统提示词.txt'), 'utf-8'); } catch {}

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    character: {
      name: charMeta.name, series: charMeta.series,
      tagline: charMeta.tagline || '',
      description: charMeta.description || '',
      systemPrompt,
      primaryColor: charMeta.primaryColor || '#f0a0b0',
      avatarBase64, coverBase64,
      live2dModelBase64, live2dModelFileName,
    }
  };

  // 显示保存对话框
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: `${charMeta.name}_角色数据.json`,
    filters: [{ name: '桌宠角色数据', extensions: ['json'] }]
  });

  if (canceled) return { success: false, message: '取消导出' };

  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  return { success: true, filePath };
});

/** 导入角色：从 JSON 文件导入 */
ipcMain.handle('import-custom-character', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: '桌宠角色数据', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) return { success: false, message: '取消导入' };

  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(raw);

    if (!data.character || !data.character.name || !data.character.systemPrompt) {
      return { success: false, message: '无效的角色数据文件' };
    }

    const result = saveCharacterData(data.character);
    return { success: true, id: result.id, name: data.character.name };
  } catch (e) {
    return { success: false, message: `导入失败: ${e.message}` };
  }
});

ipcMain.handle('get-custom-characters', async () => {
  const registryPath = path.join(__dirname, '自定义角色', 'registry.json');
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  } catch {
    return {};
  }
});

ipcMain.handle('delete-custom-character', async (event, id) => {
  const charDir = path.join(__dirname, '自定义角色', id);
  try {
    fs.rmSync(charDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('删除角色目录失败:', e);
  }

  // 更新注册表
  const registryPath = path.join(__dirname, '自定义角色', 'registry.json');
  let registry = {};
  try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8')); } catch {}
  delete registry[id];
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');

  return { success: true };
});
