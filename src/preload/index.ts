import { contextBridge, ipcRenderer } from 'electron';
import { OpenClawConfig, GatewayStatus, ModelConfig } from '../shared/types';

// Debug: log all IPC calls
const debugInvoke = (channel: string, ...args: any[]) => {
  console.log(`[IPC] Calling ${channel}`, args);
  return ipcRenderer.invoke(channel, ...args);
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Config API
  getConfig: (): Promise<OpenClawConfig> => debugInvoke('config:get'),
  setModel: (model: ModelConfig): Promise<boolean> => debugInvoke('config:setModel', model),
  setApiKey: (apiKey: string): Promise<boolean> => debugInvoke('config:setApiKey', apiKey),

  // Gateway API
  getGatewayStatus: (): Promise<GatewayStatus> => debugInvoke('gateway:status'),
  restartGateway: (): Promise<GatewayStatus> => debugInvoke('gateway:restart'),

  // Installation API
  checkInstall: (): Promise<{ installed: boolean; path?: string; version?: string }> =>
    debugInvoke('install:check'),
  installOpenClaw: (): Promise<{ success: boolean; error?: string }> =>
    debugInvoke('install:install'),
  completeInstall: (): Promise<boolean> => debugInvoke('install:complete'),

  // Setup API
  completeSetup: (config: { model: ModelConfig; apiKey: string }): Promise<boolean> =>
    debugInvoke('setup:complete', config),
  cancelSetup: (): Promise<void> => debugInvoke('setup:cancel'),

  // Shell API
  openExternal: (url: string): Promise<void> => debugInvoke('shell:openExternal', url),

  // App API
  openSettings: (): Promise<void> => debugInvoke('app:openSettings')
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
      openSettings: () => Promise<void>;
    };
  }
}
