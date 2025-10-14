
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  onDataDirReady: (cb) => ipcRenderer.on('data-dir-ready', (_e, dir) => cb(dir)),
  getConfig: () => ipcRenderer.invoke('config:get'),
  chooseDataDir: () => ipcRenderer.invoke('fs:chooseDataDir'),
  readJSON: (name, fallback) => ipcRenderer.invoke('fs:readJSON', name, fallback),
  writeJSON: (name, data) => ipcRenderer.invoke('fs:writeJSON', name, data)
});
