// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露API
contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: () => ipcRenderer.invoke('select-image'),
  splitImage: (data) => ipcRenderer.invoke('split-image', data),
  saveAsFiles: (data) => ipcRenderer.invoke('save-as-files', data),
  saveAsPdf: (data) => ipcRenderer.invoke('save-as-pdf', data)
});
