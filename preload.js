const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Funksionet për menaxhimin e skedarëve dhe konfigurimit
  onDataDirReady: (cb) => ipcRenderer.on('data-dir-ready', (_e, dir) => cb(dir)),
  getConfig: () => ipcRenderer.invoke('config:get'),
  chooseDataDir: () => ipcRenderer.invoke('fs:chooseDataDir'),
  readJSON: (name, fallback) => ipcRenderer.invoke('fs:readJSON', name, fallback),
  writeJSON: (name, data) => ipcRenderer.invoke('fs:writeJSON', name, data),
  
  // Funksionet për kontrollin e dritares
  windowControls: (action) => ipcRenderer.send('window-controls', action),

  // Funksionet për përditësimet automatike
  onUpdaterEvent: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
  restartApp: () => ipcRenderer.send('restart-app')
});