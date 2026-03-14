const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('claude', {
  chat: (apiKey, messages) => ipcRenderer.invoke('claude-chat', { apiKey, messages })
});
