const { app, BrowserWindow, ipcMain, Tray, Menu, screen, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, execSync } = require('child_process');

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
      // ★ 2026-09-16 必须放开 file:// 本地文件访问：pixi-live2d-display 用 XHR 加载 model3.json/moc3，
      //    默认 webSecurity:true 会拦截 file:// 读取导致 Live2D 加载失败降级为封面图。桌宠为本地应用，风险可控。
      webSecurity: false,
      allowRunningInsecureContent: false,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true
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

function createOrUpdateTray(label, avatarPath) {
  if (label) currentTrayLabel = label;
  if (avatarPath) {
    const fullAvatar = path.isAbsolute(avatarPath) ? avatarPath : path.join(__dirname, avatarPath);
    if (fs.existsSync(fullAvatar)) {
      currentTrayAvatar = avatarPath;
    }
  }

  const iconPath = path.isAbsolute(currentTrayAvatar) ? currentTrayAvatar : path.join(__dirname, currentTrayAvatar);

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
  if (!mainWindow) return;
  mainWindow.setIgnoreMouseEvents(Boolean(ignore), options || { forward: true });
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
  mainWindow.setBounds({ x: p.x, y: p.y, width: newW, height: newH });
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

// ★ 高性能文件存在性检测（彻底解决渲染进程 file:// 协议下 fetch HEAD 抛出 Failed to fetch 的致命问题）
ipcMain.handle('check-file-exists', (event, relPath) => {
  if (!relPath) return false;
  try {
    const basePath = path.join(__dirname, '核心通用代码', '核心');
    const fullPath = path.resolve(basePath, relPath);
    return fs.existsSync(fullPath);
  } catch (e) {
    return false;
  }
});

// ===== 自定义角色 IPC =====

/** 安全化角色ID：只允许小写字母数字下划线 */
function sanitizeId(name) {
  return 'custom_' + name.replace(/[^a-zA-Z0-9一-鿿]/g, '_').toLowerCase().slice(0, 30)
    + '_' + Date.now().toString(36);
}

/** 保存角色数据到磁盘（共用逻辑，供创建和导入使用） */
function saveCharacterData(data) {
  const { name, series, tagline, description, systemPrompt, primaryColor, avatarBase64, coverBase64, live2dModelBase64, live2dModelFileName, canonicalLines } = data;

  const charId = sanitizeId(name);
  const charDir = path.join(__dirname, '自定义角色', charId);
  const imgDir = path.join(charDir, '图片素材');
  const live2dDir = path.join(charDir, 'Live2D模型');
  const dialogueDir = path.join(charDir, '触发台词');

  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(live2dDir, { recursive: true });
  fs.mkdirSync(dialogueDir, { recursive: true });

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

  // 保存原作台词集
  if (canonicalLines && canonicalLines.length > 0) {
    fs.writeFileSync(path.join(charDir, '原作台词集.txt'), canonicalLines.join('\n'), 'utf-8');
  }

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

// ★ 保存原作台词集到文件
ipcMain.handle('save-canonical-lines', async (event, folder, lines) => {
  const filePath = path.join(__dirname, folder, '原作台词集.txt');
  try {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ★ 读取原作台词集
ipcMain.handle('load-canonical-lines', async (event, folder) => {
  const filePath = path.join(__dirname, folder, '原作台词集.txt');
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  } catch {
    return [];
  }
});

// ===== 本地 Ollama 探测与自启动服务 =====

/** 智能定位本地已安装的 ollama.exe */
function findOllamaExe() {
  const candidates = [
    'F:\\开发工具\\Ollama\\ollama.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Ollama', 'ollama.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Ollama', 'ollama.exe'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const stdout = execSync('where ollama', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && fs.existsSync(lines[0])) return lines[0];
  } catch (e) {}
  return null;
}

/** 探测本地 Ollama 服务是否正在监听 */
function probeOllamaRunning(port = 11434, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/tags`, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

// ★ 检测本地 Ollama 状态
ipcMain.handle('detect-local-ollama', async () => {
  const running = await probeOllamaRunning(11434);
  const exePath = findOllamaExe();
  return {
    running,
    installed: Boolean(exePath),
    exePath: exePath || '',
  };
});

// ★ 一键后台启动本地 Ollama
ipcMain.handle('start-local-ollama', async () => {
  const alreadyRunning = await probeOllamaRunning(11434);
  if (alreadyRunning) {
    return { success: true, message: 'Ollama 服务已在运行中' };
  }

  const exePath = findOllamaExe();
  if (!exePath) {
    return { success: false, message: '未找到本地 ollama.exe，请先下载安装 Ollama (ollama.com)' };
  }

  try {
    const child = spawn(exePath, ['serve'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    // 轮询等待端口启动（最多等 6 秒）
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 500));
      const up = await probeOllamaRunning(11434);
      if (up) {
        return { success: true, message: 'Ollama 服务已成功在后台启动！' };
      }
    }
    return { success: true, message: '已发送启动指令，服务正在初始化...' };
  } catch (err) {
    return { success: false, message: `启动失败: ${err.message}` };
  }
});

// ★ 桌面贴心管家：系统硬件负荷感知（CPU/内存探测）
const os = require('os');
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


