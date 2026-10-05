const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),
  updateTrayLabel: (label, avatarPath) => ipcRenderer.invoke('update-tray-label', label, avatarPath),

  // ★ 鼠标穿透（透明区域穿透，实体区域交互）
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),

  // ★ 桌宠移动
  getWorkArea: () => ipcRenderer.invoke('get-work-area'),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  moveWindowBy: (dx, dy) => ipcRenderer.send('move-window-by', dx, dy),
  setWindowPosition: (x, y) => ipcRenderer.send('set-window-position', x, y),

  // 自定义角色
  saveCustomCharacter: (data) => ipcRenderer.invoke('save-custom-character', data),
  getCustomCharacters: () => ipcRenderer.invoke('get-custom-characters'),
  deleteCustomCharacter: (id) => ipcRenderer.invoke('delete-custom-character', id),
  exportCustomCharacter: (id) => ipcRenderer.invoke('export-custom-character', id),
  importCustomCharacter: () => ipcRenderer.invoke('import-custom-character'),

  // 原作台词集
  saveCanonicalLines: (folder, lines) => ipcRenderer.invoke('save-canonical-lines', folder, lines),
  loadCanonicalLines: (folder) => ipcRenderer.invoke('load-canonical-lines', folder),
});
