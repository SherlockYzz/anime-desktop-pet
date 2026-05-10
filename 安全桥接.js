const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),
  updateTrayLabel: (label, avatarPath) => ipcRenderer.invoke('update-tray-label', label, avatarPath),
});
