const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),
  updateTrayLabel: (label, avatarPath) => ipcRenderer.invoke('update-tray-label', label, avatarPath),

  // 自定义角色
  saveCustomCharacter: (data) => ipcRenderer.invoke('save-custom-character', data),
  getCustomCharacters: () => ipcRenderer.invoke('get-custom-characters'),
  deleteCustomCharacter: (id) => ipcRenderer.invoke('delete-custom-character', id),
  exportCustomCharacter: (id) => ipcRenderer.invoke('export-custom-character', id),
  importCustomCharacter: () => ipcRenderer.invoke('import-custom-character'),
});
