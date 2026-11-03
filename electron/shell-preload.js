const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('win:minimize'),
  toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
  close: () => ipcRenderer.send('win:close'),
  navigate: (action) => ipcRenderer.send('win:navigate', action),
  newWindow: () => ipcRenderer.send('app:new-window'),
  getWinState: () => ipcRenderer.invoke('win:state'),
  getLean: () => ipcRenderer.invoke('app:get-lean'),
  setLean: (on) => ipcRenderer.invoke('app:set-lean', on),
  onMemory: (cb) => ipcRenderer.on('app:memory-tick', (_e, data) => cb(data)),
  onLoading: (cb) => ipcRenderer.on('app:loading', (_e, on) => cb(on)),
  onWinState: (cb) => ipcRenderer.on('app:win-state', (_e, data) => cb(data)),
  getSetting: (key) => ipcRenderer.invoke('app:get-setting', key),
  setSetting: (key, val) => ipcRenderer.invoke('app:set-setting', key, val),
  clearAuth: () => ipcRenderer.invoke('app:clear-auth'),
  setPanel: (h) => ipcRenderer.send('win:set-panel', h),
});
