<<<<<<< HEAD
<<<<<<< HEAD
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Funksionet e vjetra për skedarët
=======

const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
>>>>>>> e208e02bc1c34bfd19e6b967ba14b4626e327dbb
=======

const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
>>>>>>> e208e02bc1c34bfd19e6b967ba14b4626e327dbb
  onDataDirReady: (cb) => ipcRenderer.on('data-dir-ready', (_e, dir) => cb(dir)),
  getConfig: () => ipcRenderer.invoke('config:get'),
  chooseDataDir: () => ipcRenderer.invoke('fs:chooseDataDir'),
  readJSON: (name, fallback) => ipcRenderer.invoke('fs:readJSON', name, fallback),
<<<<<<< HEAD
<<<<<<< HEAD
  writeJSON: (name, data) => ipcRenderer.invoke('fs:writeJSON', name, data),
  
  // Funksionet e reja për kontrollin e dritares dhe përditësimet
  getVersion: () => ipcRenderer.invoke('app:getVersion'), // Për të marrë versionin
  windowControls: (action) => ipcRenderer.send('window-controls', action),
  onUpdaterEvent: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
  restartApp: () => ipcRenderer.send('restart-app')
});
=======
=======
>>>>>>> e208e02bc1c34bfd19e6b967ba14b4626e327dbb
  writeJSON: (name, data) => ipcRenderer.invoke('fs:writeJSON', name, data)
});

contextBridge.exposeInMainWorld('api', {
  // ... funksionet e tjera ...
  windowControls: (action) => ipcRenderer.send('window-controls', action),
<<<<<<< HEAD
});
>>>>>>> e208e02bc1c34bfd19e6b967ba14b4626e327dbb
=======
});
>>>>>>> e208e02bc1c34bfd19e6b967ba14b4626e327dbb
