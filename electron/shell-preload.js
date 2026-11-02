const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('win:minimize'),
  toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
  close: () => ipcRenderer.send('win:close'),
  navigate: (action) => ipcRenderer.send('win:navigate', action),
  getWinState: () => ipcRenderer.invoke('win:state'),
  getLean: () => ipcRenderer.invoke('app:get-lean'),
  setLean: (on) => ipcRenderer.invoke('app:set-lean', on),
  onMemory: (cb) => ipcRenderer.on('app:memory-tick', (_e, data) => cb(data)),
  onWinState: (cb) => ipcRenderer.on('app:win-state', (_e, data) => cb(data)),
});
