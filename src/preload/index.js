"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Config API
    getConfig: () => electron_1.ipcRenderer.invoke('config:get'),
    setModel: (model) => electron_1.ipcRenderer.invoke('config:setModel', model),
    setApiKey: (apiKey) => electron_1.ipcRenderer.invoke('config:setApiKey', apiKey),
    // Gateway API
    getGatewayStatus: () => electron_1.ipcRenderer.invoke('gateway:status'),
    restartGateway: () => electron_1.ipcRenderer.invoke('gateway:restart'),
    // Installation API
    checkInstall: () => electron_1.ipcRenderer.invoke('install:check'),
    installOpenClaw: () => electron_1.ipcRenderer.invoke('install:install'),
    completeInstall: () => electron_1.ipcRenderer.invoke('install:complete'),
    // Setup API
    completeSetup: (config) => electron_1.ipcRenderer.invoke('setup:complete', config),
    cancelSetup: () => electron_1.ipcRenderer.invoke('setup:cancel'),
    // Shell API
    openExternal: (url) => electron_1.ipcRenderer.invoke('shell:openExternal', url)
});
//# sourceMappingURL=index.js.map