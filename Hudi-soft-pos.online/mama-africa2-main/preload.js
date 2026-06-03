const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    printSilent: (html) => ipcRenderer.send('print-silent', html),
});
