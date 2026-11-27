const { app, BrowserWindow, ipcMain, Tray, Menu, screen, globalShortcut, dialog, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, execFile, execFileSync } = require('child_process');
const { pathToFileURL, fileURLToPath } = require('url');

let mainWindow;
let tray;
let isQuitting = false;
let currentTrayLabel = '若曦';
let currentTrayAvatar = '角色-若曦/图片素材/头像.png';

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
    minWidth: 200,
    minHeight: 300,
    x: screenWidth - 420,
    y: screenHeight - 620,
    transparent: true,
    frame: false,
    thickFrame: false,                  // ★ 彻底消灭 Windows 10/11 在透明无边框窗口周围添加的系统级阴影与重绘边框
    backgroundColor: '#00000000',       // ★ 严格 32 位全透明，杜绝任何默认背景底色与虚边
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
      // ★ 2026-09-16 必须放开 file:// 本地文件访问：pixi-live2d-display 用 XHR 加载 model3.json/moc3，
      //    默认 webSecurity:true 会拦截 file:// 读取导致 Live2D 加载失败降级为封面图。桌宠为本地应用，风险可控。
      webSecurity: false,
      allowRunningInsecureContent: false,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true
    }
  });

  mainWindow.loadFile('核心通用代码/核心/index.html');

  // ★ 安全加固：拦截 window.open 和页面外跳，外部 http(s) 链接统一走系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appFilePrefix = pathToFileURL(path.resolve(__dirname)).href;
    if (!url.startsWith(appFilePrefix)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) {
        shell.openExternal(url).catch(() => {});
      }
    }
  });

  // ★ 功耗优化：窗口隐藏/最小化时通知渲染进程暂停动画循环，显示/恢复时重启
  const notifyVisibility = (visible) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-visibility-changed', visible);
    }
  };
  mainWindow.on('hide', () => notifyVisibility(false));
  mainWindow.on('minimize', () => notifyVisibility(false));
  mainWindow.on('show', () => notifyVisibility(true));
  mainWindow.on('restore', () => notifyVisibility(true));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // ★ 不再拦截 close 事件：让关闭行为直达
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createOrUpdateTray(label, avatarPath) {
  if (label) currentTrayLabel = label;
  if (avatarPath) {
    let resolvedAvatar = avatarPath;
    if (typeof resolvedAvatar === 'string' && resolvedAvatar.startsWith('file://')) {
      try { resolvedAvatar = fileURLToPath(resolvedAvatar); } catch (e) {}
    }
    const fullAvatar = path.isAbsolute(resolvedAvatar) ? resolvedAvatar : path.join(__dirname, resolvedAvatar);
    if (fs.existsSync(fullAvatar)) {
      currentTrayAvatar = resolvedAvatar;
    } else if (fullAvatar.includes('app.asar') && !fullAvatar.includes('app.asar.unpacked')) {
      const unpacked = fullAvatar.replace('app.asar', 'app.asar.unpacked');
      if (fs.existsSync(unpacked)) currentTrayAvatar = unpacked;
    }
  }

  let iconPath = path.isAbsolute(currentTrayAvatar) ? currentTrayAvatar : path.join(__dirname, currentTrayAvatar);
  // 兼容 asar 打包模式：Windows Tray 图标需从 app.asar.unpacked 真实磁盘路径读取
  if (iconPath.includes('app.asar') && !iconPath.includes('app.asar.unpacked')) {
    const unpackedPath = iconPath.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpackedPath)) iconPath = unpackedPath;
  }

  if (!tray) {
    try {
      tray = new Tray(iconPath);
      tray.on('double-click', () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
      });
    } catch (e) {
      console.warn('[Tray] 创建托盘图标失败:', e);
      return;
    }
  } else {
    try {
      tray.setImage(iconPath);
    } catch (e) {
      console.warn('[Tray] 更新托盘图片失败:', e);
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `显示${currentTrayLabel}`,
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
      }
    },
    {
      label: '切换网页/桌宠模式',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('toggle-mode-request');
        }
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
}

app.whenReady().then(() => {
  createWindow();
  createOrUpdateTray('桌宠');

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
  const display = mainWindow ? screen.getDisplayMatching(mainWindow.getBounds()) : screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  return { width, height };
});

ipcMain.handle('set-always-on-top', (event, flag) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(flag);
});

// ★ 鼠标穿透（透明区域忽略鼠标事件，悬浮角色实体与交互按钮时不忽略）
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (ignore) {
    mainWindow.setIgnoreMouseEvents(true, options || { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
  }
});

// ★ 桌宠透明态禁用窗口拖拽缩放，并在面板态恢复安全最小尺寸（防裁切输入框），桌宠态允许缩到 75%
ipcMain.on('set-resizable', (event, flag) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const allow = Boolean(flag);
    if (allow) {
      mainWindow.setMinimumSize(380, 540);
      mainWindow.setResizable(true);
    } else {
      mainWindow.setMinimumSize(200, 300);
      mainWindow.setResizable(false);
    }
  } catch (e) {}
});

// ★ 桌宠移动：多显示器工作区自适应
ipcMain.handle('get-work-area', () => {
  const display = mainWindow ? screen.getDisplayMatching(mainWindow.getBounds()) : screen.getPrimaryDisplay();
  const wa = display.workArea;
  return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
});

ipcMain.handle('get-window-bounds', () => {
  if (!mainWindow) return null;
  const [x, y] = mainWindow.getPosition();
  const [width, height] = mainWindow.getSize();
  return { x, y, width, height };
});

ipcMain.handle('set-window-bounds', (event, bounds) => {
  if (!mainWindow || !bounds) return null;
  const cur = mainWindow.getBounds();
  const targetDisplay = screen.getDisplayMatching(cur) || screen.getPrimaryDisplay();
  const wa = targetDisplay.workArea;

  // ★ 严格上限保护：窗口尺寸绝不允许超过当前显示器工作区，留出安全边距确保切换键 100% 可见
  const maxSafeW = Math.max(300, wa.width - 30);
  const maxSafeH = Math.max(400, wa.height - 40);

  const newW = Math.min(maxSafeW, Math.max(200, Math.round(bounds.width || cur.width)));
  const newH = Math.min(maxSafeH, Math.max(300, Math.round(bounds.height || cur.height)));

  // 保持底部与中心对齐（以人物脚底为锚点），且如果指定了坐标则优先使用
  const newX = bounds.x !== undefined ? Math.round(bounds.x) : Math.round(cur.x + (cur.width - newW) / 2);
  const newY = bounds.y !== undefined ? Math.round(bounds.y) : Math.round(cur.y + (cur.height - newH));

  const p = clampToWorkArea(newX, newY, newW, newH);
  // ★ Windows 下 resizable=false 时 setBounds 会被锁住宽高，先临时解锁再恢复
  const wasResizable = mainWindow.isResizable();
  if (!wasResizable) mainWindow.setResizable(true);
  mainWindow.setBounds({ x: p.x, y: p.y, width: newW, height: newH });
  if (!wasResizable) mainWindow.setResizable(false);
  return mainWindow.getBounds();
});

/** 把窗口限制在当前匹配显示器的工作区内，避免桌宠跑出屏幕，且支持多显示器自由游走 */
function clampToWorkArea(x, y, w, h) {
  const targetRect = { x: Math.round(x), y: Math.round(y), width: w, height: h };
  const targetDisplay = screen.getDisplayMatching(targetRect) || screen.getPrimaryDisplay();
  const wa = targetDisplay.workArea;
  // 确保窗口边界绝不溢出工作区
  const minX = wa.x;
  const maxX = Math.max(wa.x, wa.x + wa.width - w);
  const minY = wa.y;
  const maxY = Math.max(wa.y, wa.y + wa.height - h);
  const nx = Math.max(minX, Math.min(maxX, Math.round(x)));
  const ny = Math.max(minY, Math.min(maxY, Math.round(y)));
  return { x: nx, y: ny };
}

ipcMain.on('move-window-by', (event, dx, dy) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  const [w, h] = mainWindow.getSize();
  const p = clampToWorkArea(x + Number(dx || 0), y + Number(dy || 0), w, h);
  mainWindow.setPosition(p.x, p.y);
});

ipcMain.on('set-window-position', (event, x, y) => {
  if (!mainWindow) return;
  const [w, h] = mainWindow.getSize();
  const p = clampToWorkArea(x, y, w, h);
  mainWindow.setPosition(p.x, p.y);
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

// ★ 直接 destroy 窗口，跳过 close 事件链，立即退出
ipcMain.handle('close-window', () => {
  isQuitting = true;
  if (mainWindow) mainWindow.destroy();
  app.quit();
});

ipcMain.handle('update-tray-label', (event, label, avatarPath) => {
  const relPath = avatarPath ? avatarPath.replace(/^(\.\.\/)+/, '') : null;
  createOrUpdateTray(label, relPath);
});

// ===== 安全路径校验与用户数据目录（迁至 app.getPath('userData')，解决 Program Files 写权限与覆盖安装丢数据） =====

/** 校验目标路径严格位于指定根目录内部（防范 ../ 路径穿越与空子路径误删整目录） */
function resolveSafeSubPath(rootDir, subPath, allowRoot = false) {
  if (typeof subPath !== 'string' || !subPath.trim()) return null;
  if (subPath.includes('\0')) return null;
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(resolvedRoot, subPath);
  if (resolvedTarget === resolvedRoot) {
    return allowRoot ? resolvedTarget : null;
  }
  const rel = path.relative(resolvedRoot, resolvedTarget);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return resolvedTarget;
}

function getCustomCharsRoot() {
  const userRoot = path.join(app.getPath('userData'), 'custom-characters');
  const legacyRoot = path.join(__dirname, '自定义角色');
  try {
    if (!fs.existsSync(userRoot)) {
      fs.mkdirSync(userRoot, { recursive: true });
      if (fs.existsSync(legacyRoot)) {
        fs.cpSync(legacyRoot, userRoot, { recursive: true, errorOnExist: false });
      }
    }
  } catch (e) {
    console.warn('[UserData] 初始化或迁移自定义角色目录失败:', e);
  }
  return userRoot;
}

function getCanonicalOverridePath(folder) {
  const safeFolder = String(folder || '').replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '');
  if (!safeFolder) return null;
  const dir = path.join(app.getPath('userData'), 'canonical-lines');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${safeFolder}.txt`);
}

// ★ 高性能文件存在性检测（带根目录边界校验，防止任意路径探测）
ipcMain.handle('check-file-exists', (event, relPath) => {
  if (typeof relPath !== 'string' || !relPath.trim()) return false;
  try {
    // 允许检测应用根目录及 userData 下的自定义角色资源
    if (relPath.startsWith('file://')) {
      const filePath = decodeURIComponent(new URL(relPath).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
      const customRoot = getCustomCharsRoot();
      if (resolveSafeSubPath(customRoot, path.relative(customRoot, filePath)) || resolveSafeSubPath(__dirname, path.relative(__dirname, filePath))) {
        return fs.existsSync(filePath);
      }
      return false;
    }
    const basePath = path.join(__dirname, '核心通用代码', '核心');
    const fullPath = path.resolve(basePath, relPath);
    const appRoot = path.resolve(__dirname);
    const relToRoot = path.relative(appRoot, fullPath);
    if (!relToRoot || relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
      return false;
    }
    return fs.existsSync(fullPath);
  } catch (e) {
    return false;
  }
});

// ===== 安全 API Key 存储（Electron safeStorage / Windows DPAPI） =====

function getSecretsPath() {
  return path.join(app.getPath('userData'), 'secrets.json');
}

ipcMain.handle('get-secure-api-key', async () => {
  try {
    const file = getSecretsPath();
    if (!fs.existsSync(file)) return { success: true, apiKey: '' };
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!data.apiKeyEnc) return { success: true, apiKey: '' };
    if (safeStorage.isEncryptionAvailable() && data.encrypted) {
      const plain = safeStorage.decryptString(Buffer.from(data.apiKeyEnc, 'base64'));
      return { success: true, apiKey: plain };
    }
    return { success: true, apiKey: Buffer.from(data.apiKeyEnc, 'base64').toString('utf-8') };
  } catch (e) {
    return { success: false, apiKey: '', error: e.message };
  }
});

ipcMain.handle('set-secure-api-key', async (event, apiKey) => {
  try {
    const file = getSecretsPath();
    const raw = typeof apiKey === 'string' ? apiKey : '';
    let payload;
    if (!raw) {
      payload = { encrypted: false, apiKeyEnc: '' };
    } else if (safeStorage.isEncryptionAvailable()) {
      const buf = safeStorage.encryptString(raw);
      payload = { encrypted: true, apiKeyEnc: buf.toString('base64') };
    } else {
      payload = { encrypted: false, apiKeyEnc: Buffer.from(raw, 'utf-8').toString('base64') };
    }
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ===== 自定义角色 IPC =====

/** 安全化角色ID：只允许小写字母数字下划线和中文 */
function sanitizeId(name) {
  return 'custom_' + String(name || 'char').replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').toLowerCase().slice(0, 30)
    + '_' + Date.now().toString(36);
}

/** 递归查找解压目录中的 Live2D 入口模型文件 (.model3.json / .model.json) */
function findLive2DEntryFile(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && (e.name.endsWith('.model3.json') || e.name.endsWith('.model.json'))) {
      return full;
    }
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const found = findLive2DEntryFile(path.join(dir, e.name));
      if (found) return found;
    }
  }
  return null;
}

/** 过滤原作台词中的空行与 [开机] 等分节标题行 */
function parseCanonicalText(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^\[.+\]$/.test(l));
}

/** 保存角色数据到 userData 磁盘（共用逻辑，供创建和导入使用） */
function saveCharacterData(data) {
  const { name, series, tagline, description, systemPrompt, primaryColor, avatarBase64, coverBase64, live2dModelBase64, live2dModelFileName, canonicalLines } = data;

  const customRoot = getCustomCharsRoot();
  const charId = sanitizeId(name);
  const charDir = resolveSafeSubPath(customRoot, charId);
  if (!charDir) throw new Error('非法角色 ID');
  const imgDir = path.join(charDir, '图片素材');
  const live2dDir = path.join(charDir, 'Live2D模型');
  const dialogueDir = path.join(charDir, '触发台词');

  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(live2dDir, { recursive: true });
  fs.mkdirSync(dialogueDir, { recursive: true });

  const avatarAbsPath = path.join(imgDir, '头像.png');
  const avatarRelPath = pathToFileURL(avatarAbsPath).href;
  if (avatarBase64) {
    const buf = Buffer.from(avatarBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    fs.writeFileSync(avatarAbsPath, buf);
  }

  let coverRelPath = avatarRelPath;
  if (coverBase64) {
    const coverAbsPath = path.join(imgDir, '封面.png');
    const buf = Buffer.from(coverBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    fs.writeFileSync(coverAbsPath, buf);
    coverRelPath = pathToFileURL(coverAbsPath).href;
  }

  let live2dModelPath = '';
  if (live2dModelBase64 && live2dModelFileName) {
    const buf = Buffer.from(live2dModelBase64.replace(/^data:.+;base64,/, ''), 'base64');
    const baseName = path.basename(live2dModelFileName);
    if (baseName.toLowerCase().endsWith('.zip')) {
      // ★ 完整解压 Live2D 模型 zip 包（保留 moc3、贴图、动作与 model3.json）
      const tmpZip = path.join(live2dDir, '__upload.zip');
      fs.writeFileSync(tmpZip, buf);
      try {
        execFileSync('tar', ['-xf', tmpZip, '-C', live2dDir], { windowsHide: true, timeout: 15000 });
        const entryFile = findLive2DEntryFile(live2dDir);
        if (entryFile && resolveSafeSubPath(live2dDir, path.relative(live2dDir, entryFile))) {
          live2dModelPath = pathToFileURL(entryFile).href;
        }
      } catch (e) {
        console.warn('[CustomChar] 解压 Live2D zip 失败:', e.message);
      } finally {
        try { fs.rmSync(tmpZip, { force: true }); } catch (_) {}
      }
    } else {
      const fileName = baseName.endsWith('.model3.json') || baseName.endsWith('.model.json')
        ? baseName
        : 'model.model3.json';
      const live2dAbsPath = path.join(live2dDir, fileName);
      fs.writeFileSync(live2dAbsPath, buf);
      live2dModelPath = pathToFileURL(live2dAbsPath).href;
    }
  }

  fs.writeFileSync(path.join(charDir, '系统提示词.txt'), systemPrompt || '', 'utf-8');

  // 保存原作台词集
  if (canonicalLines && canonicalLines.length > 0) {
    fs.writeFileSync(path.join(charDir, '原作台词集.txt'), canonicalLines.join('\n'), 'utf-8');
  }

  const registryPath = path.join(customRoot, 'registry.json');
  let registry = {};
  try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8')); } catch {}

  registry[charId] = {
    id: charId,
    name: String(name || '未命名角色').trim(),
    series: String(series || '自定义角色').trim(),
    tagline: tagline ? String(tagline).trim() : '',
    description: description ? String(description).trim() : '',
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
  const customRoot = getCustomCharsRoot();
  const charDir = resolveSafeSubPath(customRoot, characterId);
  if (!charDir) return { success: false, message: '非法角色 ID' };

  const registryPath = path.join(customRoot, 'registry.json');
  let registry = {};
  try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8')); } catch {}
  const charMeta = registry[characterId];
  if (!charMeta) return { success: false, message: '角色不存在' };

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

  // 读取 Live2D 模型（如目录内含多文件则整体打包为 .zip 完整导出，确保 moc3/贴图不丢失）
  let live2dModelBase64 = '';
  let live2dModelFileName = '';
  const live2dDir = path.join(charDir, 'Live2D模型');
  if (charMeta.live2dModelPath && fs.existsSync(live2dDir)) {
    try {
      const entries = fs.readdirSync(live2dDir).filter(f => !f.startsWith('__'));
      if (entries.length > 1 || (entries.length === 1 && fs.statSync(path.join(live2dDir, entries[0])).isDirectory())) {
        const tmpExportZip = path.join(charDir, '__export_live2d.zip');
        try {
          execFileSync('tar', ['-a', '-c', '-f', tmpExportZip, '-C', live2dDir, ...entries], { windowsHide: true, timeout: 15000 });
          const buf = fs.readFileSync(tmpExportZip);
          live2dModelBase64 = `data:application/zip;base64,${buf.toString('base64')}`;
          live2dModelFileName = 'live2d_model.zip';
        } finally {
          try { fs.rmSync(tmpExportZip, { force: true }); } catch (_) {}
        }
      } else if (entries.length === 1) {
        const buf = fs.readFileSync(path.join(live2dDir, entries[0]));
        live2dModelBase64 = `data:application/octet-stream;base64,${buf.toString('base64')}`;
        live2dModelFileName = entries[0];
      }
    } catch (e) {
      console.warn('[CustomChar] 导出 Live2D 模型失败:', e.message);
    }
  }

  // 读取系统提示词
  let systemPrompt = '';
  try { systemPrompt = fs.readFileSync(path.join(charDir, '系统提示词.txt'), 'utf-8'); } catch {}

  // 读取原作台词集
  let canonicalLines = [];
  try {
    const canonText = fs.readFileSync(path.join(charDir, '原作台词集.txt'), 'utf-8');
    canonicalLines = canonText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  } catch {}

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
      canonicalLines,
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
      return { success: false, message: '无效的角色数据文件（缺少名称或系统提示词）' };
    }
    if (!data.character.canonicalLines || data.character.canonicalLines.length < 1) {
      return { success: false, message: '无效的角色数据文件（缺少原作台词集）' };
    }

    const result = saveCharacterData(data.character);
    return { success: true, id: result.id, name: data.character.name };
  } catch (e) {
    return { success: false, message: `导入失败: ${e.message}` };
  }
});

ipcMain.handle('get-custom-characters', async () => {
  const customRoot = getCustomCharsRoot();
  const registryPath = path.join(customRoot, 'registry.json');
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  } catch {
    return {};
  }
});

ipcMain.handle('delete-custom-character', async (event, id) => {
  // ★ 严格校验：拒绝空字符串与路径穿越，彻底防止误删整个自定义角色目录
  if (typeof id !== 'string' || !/^custom_[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(id)) {
    return { success: false, error: '非法角色 ID' };
  }
  const customRoot = getCustomCharsRoot();
  const charDir = resolveSafeSubPath(customRoot, id);
  if (!charDir) return { success: false, error: '非法角色路径' };

  try {
    fs.rmSync(charDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('删除角色目录失败:', e);
  }

  // 更新注册表
  const registryPath = path.join(customRoot, 'registry.json');
  let registry = {};
  try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8')); } catch {}
  delete registry[id];
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');

  return { success: true };
});

// ★ 保存原作台词集（同时支持内置角色 userData 覆写与自定义角色目录，严格路径校验）
ipcMain.handle('save-canonical-lines', async (event, folder, lines) => {
  if (!Array.isArray(lines)) return { success: false, error: '无效的台词列表' };
  const rawFolder = String(folder || '').trim();
  if (!rawFolder) return { success: false, error: '非法角色目录' };

  // 分支 A：自定义角色（传 custom_xxx 或 自定义角色/custom_xxx）
  const customId = rawFolder.startsWith('自定义角色/') ? rawFolder.slice('自定义角色/'.length) : rawFolder;
  if (/^custom_[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(customId)) {
    const charDir = resolveSafeSubPath(getCustomCharsRoot(), customId);
    if (!charDir) return { success: false, error: '非法自定义角色路径' };
    try {
      fs.mkdirSync(charDir, { recursive: true });
      fs.writeFileSync(path.join(charDir, '原作台词集.txt'), lines.join('\n'), 'utf-8');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // 分支 B：内置角色（写入 userData 覆写目录，兼容只读安装目录与 asar）
  const builtInTarget = resolveSafeSubPath(__dirname, path.join(rawFolder, '原作台词集.txt'));
  if (!builtInTarget) return { success: false, error: '非法角色目录' };
  const overridePath = getCanonicalOverridePath(rawFolder);
  if (!overridePath) return { success: false, error: '非法角色目录' };
  try {
    fs.writeFileSync(overridePath, lines.join('\n'), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ★ 读取原作台词集（自定义角色读 userData；内置角色优先读 userData 覆写，不存在回退内置文件）
ipcMain.handle('load-canonical-lines', async (event, folder) => {
  const rawFolder = String(folder || '').trim();
  if (!rawFolder) return [];

  // 分支 A：自定义角色
  const customId = rawFolder.startsWith('自定义角色/') ? rawFolder.slice('自定义角色/'.length) : rawFolder;
  if (/^custom_[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(customId)) {
    const charDir = resolveSafeSubPath(getCustomCharsRoot(), customId);
    if (!charDir) return [];
    try {
      const text = fs.readFileSync(path.join(charDir, '原作台词集.txt'), 'utf-8');
      return parseCanonicalText(text);
    } catch {
      return [];
    }
  }

  // 分支 B：内置角色
  const builtInTarget = resolveSafeSubPath(__dirname, path.join(rawFolder, '原作台词集.txt'));
  if (!builtInTarget) return [];
  const overridePath = getCanonicalOverridePath(rawFolder);
  try {
    const targetPath = (overridePath && fs.existsSync(overridePath)) ? overridePath : builtInTarget;
    const text = fs.readFileSync(targetPath, 'utf-8');
    return parseCanonicalText(text);
  } catch {
    return [];
  }
});

// ===== 本地 Ollama 探测、模型离线扫描与自启动服务 =====
const os = require('os');

/** 异步智能定位本地已安装的 ollama.exe（原生 Unicode 遍历 PATH，规避中文路径 GBK 乱码） */
function findOllamaExe() {
  const exeName = process.platform === 'win32' ? 'ollama.exe' : 'ollama';
  const candidates = [
    process.env.OLLAMA_EXE || '',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', exeName),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Ollama', exeName),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Ollama', exeName),
  ];

  // 直接遍历 process.env.PATH（Node.js 在 Windows 下走 Unicode API，天然支持中文目录且零子进程开销）
  const envPath = process.env.PATH || process.env.Path || '';
  for (const dir of envPath.split(path.delimiter)) {
    const cleanDir = dir.trim().replace(/^"(.*)"$/, '$1');
    if (cleanDir) {
      candidates.push(path.join(cleanDir, exeName));
    }
  }

  const seen = new Set();
  for (const p of candidates) {
    if (!p || seen.has(p)) continue;
    seen.add(p);
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return Promise.resolve(p);
      }
    } catch (_) {}
  }

  // 兜底：若 PATH 未命中，再回退系统命令（Windows 用 GBK 解码避免中文路径乱码）
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFile(cmd, ['ollama'], { encoding: 'buffer', timeout: 2000, windowsHide: true }, (err, stdoutBuf) => {
      if (err || !stdoutBuf || stdoutBuf.length === 0) return resolve(null);
      const decodeCandidates = [stdoutBuf.toString('utf-8')];
      if (process.platform === 'win32') {
        try {
          decodeCandidates.push(new TextDecoder('gbk').decode(stdoutBuf));
        } catch (_) {}
      }
      for (const text of decodeCandidates) {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          try {
            if (fs.existsSync(line) && fs.statSync(line).isFile()) {
              return resolve(line);
            }
          } catch (_) {}
        }
      }
      resolve(null);
    });
  });
}

/** 离线扫描本机 Ollama manifests 目录，获取已下载模型列表（服务未启动时的兜底） */
function scanLocalOllamaModels() {
  const roots = [
    process.env.OLLAMA_MODELS || '',
    path.join(os.homedir(), '.ollama', 'models'),
  ].filter(Boolean);

  const modelSet = new Set();
  const seenRoots = new Set();

  for (const root of roots) {
    const manifestsDir = path.join(root, 'manifests');
    const normRoot = path.resolve(manifestsDir).toLowerCase();
    if (seenRoots.has(normRoot)) continue;
    seenRoots.add(normRoot);
    if (!fs.existsSync(manifestsDir)) continue;

    // 递归遍历 manifests/<registry>/<namespace>/<model>/<tag>
    const walk = (dir, depth = 0) => {
      if (depth > 5) return;
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (_) {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full, depth + 1);
        } else if (entry.isFile()) {
          const rel = path.relative(manifestsDir, full);
          const parts = rel.split(path.sep).filter(Boolean);
          // 常见结构：registry.ollama.ai / library / qwen3 / 8b -> qwen3:8b
          // 第三方命名空间：registry.ollama.ai / user / model / tag -> user/model:tag
          if (parts.length >= 4) {
            const [registry, namespace, modelName, ...tagParts] = parts;
            const tag = tagParts.join('/');
            let id;
            if (registry === 'registry.ollama.ai' && namespace === 'library') {
              id = `${modelName}:${tag}`;
            } else if (registry === 'registry.ollama.ai') {
              id = `${namespace}/${modelName}:${tag}`;
            } else {
              id = `${registry}/${namespace}/${modelName}:${tag}`;
            }
            modelSet.add(id);
          }
        }
      }
    };
    walk(manifestsDir);
  }

  return Array.from(modelSet).map(id => ({
    id,
    name: `${id} (本机已装)`,
    offline: true,
  }));
}

/** 探测本地 Ollama 服务是否正在监听 */
function probeOllamaRunning(port = 11434, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/tags`, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

// ★ 检测本地 Ollama 状态
ipcMain.handle('detect-local-ollama', async () => {
  const [running, exePath] = await Promise.all([probeOllamaRunning(11434), findOllamaExe()]);
  return {
    running,
    installed: Boolean(exePath),
    exePath: exePath || '',
  };
});

// ★ 离线读取本机已下载的 Ollama 模型列表
ipcMain.handle('list-local-ollama-models', async () => {
  try {
    return scanLocalOllamaModels();
  } catch (e) {
    console.warn('[Ollama] 离线扫描本机模型失败:', e.message);
    return [];
  }
});

// ★ 一键后台启动本地 Ollama
ipcMain.handle('start-local-ollama', async () => {
  const alreadyRunning = await probeOllamaRunning(11434);
  if (alreadyRunning) {
    return { success: true, message: 'Ollama 服务已在运行中' };
  }

  const exePath = await findOllamaExe();
  if (!exePath) {
    return { success: false, message: '未找到本地 ollama.exe，请先下载安装 Ollama (ollama.com)' };
  }

  try {
    const child = spawn(exePath, ['serve'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: process.env,
    });
    child.unref();

    // 轮询等待端口启动（最多等 8 秒）
    for (let i = 0; i < 16; i++) {
      await new Promise(r => setTimeout(r, 500));
      const up = await probeOllamaRunning(11434);
      if (up) {
        return { success: true, message: 'Ollama 服务已成功在后台启动！' };
      }
    }
    return { success: false, message: '已发送启动指令，但 8 秒内未检测到 11434 端口就绪，请稍后重试' };
  } catch (err) {
    return { success: false, message: `启动失败: ${err.message}` };
  }
});

// ★ 桌面贴心管家：系统硬件负荷感知（CPU/内存探测）
let lastCpuMeasure = null;

function getCpuUsage() {
  const cpus = os.cpus() || [];
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  for (const cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    irq += cpu.times.irq;
    idle += cpu.times.idle;
  }
  const total = user + nice + sys + irq + idle;
  if (!lastCpuMeasure) {
    lastCpuMeasure = { total, idle };
    return 0;
  }
  const diffTotal = total - lastCpuMeasure.total;
  const diffIdle = idle - lastCpuMeasure.idle;
  lastCpuMeasure = { total, idle };
  if (diffTotal <= 0) return 0;
  const usage = Math.round(((diffTotal - diffIdle) / diffTotal) * 100);
  return Math.max(0, Math.min(100, usage));
}

ipcMain.handle('get-system-status', async () => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);
    const cpuPercent = getCpuUsage();
    return {
      success: true,
      totalMemMB: Math.round(totalMem / (1024 * 1024)),
      usedMemMB: Math.round(usedMem / (1024 * 1024)),
      memPercent,
      cpuPercent,
      cpuCount: os.cpus().length,
      platform: process.platform,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ★ 桌面贴心管家：晨间免Key轻量气象获取（公网开放接口）
ipcMain.handle('get-weather-info', async () => {
  return new Promise((resolve) => {
    const https = require('https');
    const req = https.get('https://wttr.in/?format=j1', { timeout: 3500 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const cur = json.current_condition?.[0] || {};
          const weatherDesc = cur.lang_zh?.[0]?.value || cur.weatherDesc?.[0]?.value || '晴';
          const tempC = cur.temp_C || '20';
          const humidity = cur.humidity || '50';
          resolve({ success: true, weather: weatherDesc, temp: tempC, humidity });
        } catch (e) {
          resolve({ success: false, error: 'parse_failed' });
        }
      });
    });
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'timeout' }); });
  });
});

// ★ 摸鱼街机 BGM：用户自选本机音频导入与持久化管理（存储于 userData/arcade-bgm/）
function getCustomArcadeBgmDir() {
  const dir = path.join(app.getPath('userData'), 'arcade-bgm');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readCustomArcadeBgmManifest() {
  const dir = getCustomArcadeBgmDir();
  const manifestPath = path.join(dir, 'manifest.json');
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(item => {
      if (!item || typeof item.fileName !== 'string') return false;
      const full = path.join(dir, path.basename(item.fileName));
      return fs.existsSync(full);
    }).map(item => {
      const full = path.join(dir, path.basename(item.fileName));
      return {
        ...item,
        url: `file:///${full.replace(/\\/g, '/')}`,
      };
    });
  } catch {
    return [];
  }
}

function writeCustomArcadeBgmManifest(list) {
  const dir = getCustomArcadeBgmDir();
  const manifestPath = path.join(dir, 'manifest.json');
  const clean = list.map(({ id, title, fileName, tag }) => ({ id, title, fileName, tag }));
  fs.writeFileSync(manifestPath, JSON.stringify(clean, null, 2), 'utf-8');
}

ipcMain.handle('arcade-bgm-list-custom', async () => {
  try {
    return { success: true, tracks: readCustomArcadeBgmManifest() };
  } catch (e) {
    return { success: false, tracks: [], error: e.message };
  }
});

ipcMain.handle('arcade-bgm-pick-files', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow || undefined, {
      title: '选择本机背景音乐添加到摸鱼街机',
      filters: [{ name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, canceled: true, tracks: [] };
    }

    const dir = getCustomArcadeBgmDir();
    const list = readCustomArcadeBgmManifest();
    const added = [];

    for (const srcPath of filePaths) {
      const ext = path.extname(srcPath).toLowerCase();
      if (!['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext)) continue;
      const baseTitle = path.basename(srcPath, ext).trim() || '本机音乐';
      const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const fileName = `${id}${ext}`;
      const destPath = path.join(dir, fileName);
      fs.copyFileSync(srcPath, destPath);
      const track = {
        id,
        title: baseTitle,
        fileName,
        tag: '本机导入',
        url: `file:///${destPath.replace(/\\/g, '/')}`,
      };
      list.push(track);
      added.push(track);
    }

    writeCustomArcadeBgmManifest(list);
    return { success: true, added, tracks: readCustomArcadeBgmManifest() };
  } catch (e) {
    return { success: false, error: e.message, tracks: [] };
  }
});

ipcMain.handle('arcade-bgm-delete-custom', async (_event, id) => {
  try {
    if (typeof id !== 'string' || !/^custom_[a-zA-Z0-9_]+$/.test(id)) {
      return { success: false, error: '非法曲目 ID' };
    }
    const dir = getCustomArcadeBgmDir();
    const list = readCustomArcadeBgmManifest();
    const target = list.find(t => t.id === id);
    if (target && target.fileName) {
      const full = path.join(dir, path.basename(target.fileName));
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
    const next = list.filter(t => t.id !== id);
    writeCustomArcadeBgmManifest(next);
    return { success: true, tracks: readCustomArcadeBgmManifest() };
  } catch (e) {
    return { success: false, error: e.message };
  }
});


