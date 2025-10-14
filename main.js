const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
let autoUpdater;

// Konfigurimi i logger-it për përditësimet
try {
  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  log.info('Aplikacioni po fillon...');
} catch (e) {
  log.warn('electron-updater nuk u gjet; përditësimet automatike do të çaktivizohen.');
}

const USER_CONFIG = path.join(app.getPath('userData'), 'config.json');

function readJSONSafe(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return fallback; }
}

function writeJSONSafe(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function getConfig() { return readJSONSafe(USER_CONFIG, { dataDir: null }); }
function setDataDir(dir) { const cfg = getConfig(); cfg.dataDir = dir; writeJSONSafe(USER_CONFIG, cfg); return cfg; }

async function maybeAskForDataDir(win) {
  let cfg = getConfig();
  if (cfg.dataDir && fs.existsSync(cfg.dataDir)) return cfg.dataDir;
  const res = await dialog.showOpenDialog(win, { title:'Zgjidh folderin e të dhënave', properties:['openDirectory','createDirectory'] });
  if (!res.canceled && res.filePaths[0]) {
    const chosen = res.filePaths[0]; setDataDir(chosen); return chosen;
  } else {
    const fallback = path.join(app.getPath('documents'), 'PaneliKryesor', 'data');
    fs.mkdirSync(fallback, { recursive: true }); setDataDir(fallback); return fallback;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 850,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: { contextIsolation: true, preload: path.join(__dirname, 'preload.js') }
  });

  // Krijimi i Menysë së Aplikacionit
  const menuTemplate = [
    {
      label: 'Skedari',
      submenu: [
        { role: 'quit', label: 'Mbyll' }
      ]
    },
    {
      label: 'Ndihmë',
      submenu: [
        {
          label: 'Rreth Aplikacionit',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'Rreth Aplikacionit',
              message: 'Paneli Kryesor',
              detail: `Versioni: ${app.getVersion()}`
            });
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  win.loadFile('index.html');
  
  win.once('ready-to-show', () => {
     if (autoUpdater) {
        autoUpdater.checkForUpdatesAndNotify();
     }
  });

  win.webContents.on('did-finish-load', async () => {
    const dir = await maybeAskForDataDir(win);
    win.webContents.send('data-dir-ready', dir);
  });
}

app.whenReady().then(()=>{ createWindow(); app.on('activate', ()=>{ if(BrowserWindow.getAllWindows().length===0) createWindow(); }); });
app.on('window-all-closed', ()=>{ if(process.platform!=='darwin') app.quit(); });

// IPC Handlers
ipcMain.handle('config:get', ()=> getConfig());
ipcMain.handle('fs:chooseDataDir', async (e)=>{
  const win = BrowserWindow.fromWebContents(e.sender);
  const res = await dialog.showOpenDialog(win, { properties:['openDirectory','createDirectory'] });
  if (!res.canceled && res.filePaths[0]) return setDataDir(res.filePaths[0]);
  return getConfig();
});
ipcMain.handle('fs:readJSON', (_e, name, fallback)=>{
  const cfg = getConfig(); const file = path.join(cfg.dataDir||'', name);
  try { if(!fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file,'utf-8')); } catch { return fallback; }
});
ipcMain.handle('fs:writeJSON', (_e, name, data)=>{
  const cfg = getConfig(); const file = path.join(cfg.dataDir||'', name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});


// Eventet e Auto-Updater
if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => {
    log.info('Duke kërkuar për përditësim...');
    dialog.showMessageBox({ type: 'info', title: 'Përditësimi', message: 'Duke kërkuar për përditësim...' });
  });
  autoUpdater.on('update-available', (info) => {
    log.info('Përditësim i disponueshëm.');
    dialog.showMessageBox({ type: 'info', title: 'Përditësimi', message: `U gjet një version i ri: ${info.version}. Po shkarkohet tani...` });
  });
  autoUpdater.on('update-not-available', (info) => {
    log.info('Përditësimi nuk është i disponueshëm.');
    dialog.showMessageBox({ type: 'info', title: 'Përditësimi', message: 'Ju keni versionin më të fundit të instaluar.' });
  });
  autoUpdater.on('error', (err) => {
    log.error('Gabim në auto-updater: ' + err);
    dialog.showMessageBox({ type: 'error', title: 'Gabim Përditësimi', message: 'Ndodhi një gabim gjatë kontrollit për përditësime: ' + err.message });
  });
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Shpejtësia e shkarkimit: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Shkarkuar ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);
  });
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Përditësimi u shkarkua.');
    dialog.showMessageBox({
      type: 'info',
      title: 'Përditësimi Gati',
      message: 'Versioni i ri është shkarkuar. Aplikacioni do të mbyllet për t\'u përditësuar.',
      buttons: ['OK']
    }).then(() => {
      setImmediate(() => autoUpdater.quitAndInstall());
    });
  });
}

