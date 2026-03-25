import { contextBridge, ipcRenderer } from 'electron';
import { OpenClawConfig, GatewayStatus, ModelConfig } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Config API
  getConfig: (): Promise<OpenClawConfig> => ipcRenderer.invoke('config:get'),
  setModel: (model: ModelConfig): Promise<boolean> => ipcRenderer.invoke('config:setModel', model),
  setApiKey: (apiKey: string): Promise<boolean> => ipcRenderer.invoke('config:setApiKey', apiKey),

  // Gateway API
  getGatewayStatus: (): Promise<GatewayStatus> => ipcRenderer.invoke('gateway:status'),
  restartGateway: (): Promise<GatewayStatus> => ipcRenderer.invoke('gateway:restart'),

  // Installation API
  checkInstall: (): Promise<{ installed: boolean; path?: string; version?: string }> =>
    ipcRenderer.invoke('install:check'),
  installOpenClaw: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('install:install'),
  completeInstall: (): Promise<boolean> => ipcRenderer.invoke('install:complete'),

  // Setup API
  completeSetup: (config: { model: ModelConfig; apiKey: string }): Promise<boolean> =>
    ipcRenderer.invoke('setup:complete', config),
  cancelSetup: (): Promise<void> => ipcRenderer.invoke('setup:cancel'),

  // Shell API
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url)
});

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<OpenClawConfig>;
      setModel: (model: ModelConfig) => Promise<boolean>;
      setApiKey: (apiKey: string) => Promise<boolean>;
      getGatewayStatus: () => Promise<GatewayStatus>;
      restartGateway: () => Promise<GatewayStatus>;
      checkInstall: () => Promise<{ installed: boolean; path?: string; version?: string }>;
      installOpenClaw: () => Promise<{ success: boolean; error?: string }>;
      completeInstall: () => Promise<boolean>;
      completeSetup: (config: { model: ModelConfig; apiKey: string }) => Promise<boolean>;
      cancelSetup: () => Promise<void>;
      openExternal: (url: string) => Promise<void>;
    };
  }
}
