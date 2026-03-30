import { contextBridge, ipcRenderer } from 'electron';
import { OpenClawConfig, GatewayStatus, ModelConfig, CronJob, CronLog, MemoryInfo } from '../shared/types';

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
  setFallbackModel: (model: ModelConfig | null): Promise<boolean> => debugInvoke('config:setFallbackModel', model),
  setImageModel: (model: ModelConfig | null): Promise<boolean> => debugInvoke('config:setImageModel', model),
  setApiKey: (apiKey: string): Promise<boolean> => debugInvoke('config:setApiKey', apiKey),
  setModelApiKey: (modelId: string, apiKey: string): Promise<boolean> => debugInvoke('config:setModelApiKey', { modelId, apiKey }),
  getSkills: (): Promise<string[]> => debugInvoke('config:getSkills'),
  setSkills: (skills: string[]): Promise<boolean> => debugInvoke('config:setSkills', skills),
  getTools: (): Promise<string[]> => debugInvoke('config:getTools'),
  setTools: (tools: string[]): Promise<boolean> => debugInvoke('config:setTools', tools),
  getChannels: (): Promise<{ type: string; enabled: boolean }[]> => debugInvoke('config:getChannels'),
  setChannels: (channels: { type: string; enabled: boolean }[]): Promise<boolean> => debugInvoke('config:setChannels', channels),

  // Model Management API
  getSavedModels: (): Promise<ModelConfig[]> => debugInvoke('models:get'),
  addModel: (model: ModelConfig): Promise<boolean> => debugInvoke('models:add', model),
  updateModel: (model: ModelConfig): Promise<boolean> => debugInvoke('models:update', model),
  removeModel: (modelId: string): Promise<boolean> => debugInvoke('models:remove', modelId),

  // Skills Hub API
  fetchSkills: () => debugInvoke('skills:fetch'),
  installSkill: (skillId: string) => debugInvoke('skills:install', skillId),

  // Settings API
  getSettingsData: (): Promise<{ config: OpenClawConfig; status: GatewayStatus; installCheck: { installed: boolean; path?: string; version?: string } }> =>
    debugInvoke('settings:get'),

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
  openSettings: (): Promise<void> => debugInvoke('app:openSettings'),

  // OAuth API
  oauthStart: (provider: string): Promise<{ success: boolean; authUrl?: string; error?: string }> =>
    debugInvoke('oauth:start', provider),
  oauthGetStatus: (provider: string): Promise<{ authenticated: boolean; email?: string; expires?: number }> =>
    debugInvoke('oauth:getStatus', provider),

  // Cron API
  getCronJobs: (): Promise<{ jobs: CronJob[] }> => debugInvoke('cron:getJobs'),
  getCronLogs: (jobId?: string): Promise<{ logs: CronLog[] }> => debugInvoke('cron:getLogs', jobId),
  runCronJob: (jobId: string): Promise<{ success: boolean; output?: string; error?: string }> => debugInvoke('cron:run', jobId),
  toggleCronJob: (jobId: string, enabled: boolean): Promise<{ success: boolean }> => debugInvoke('cron:toggle', { jobId, enabled }),

  // Memory API
  getMemoryInfo: (): Promise<MemoryInfo> => debugInvoke('memory:getInfo')
});

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<OpenClawConfig>;
      setModel: (model: ModelConfig) => Promise<boolean>;
      setFallbackModel: (model: ModelConfig | null) => Promise<boolean>;
      setImageModel: (model: ModelConfig | null) => Promise<boolean>;
      setApiKey: (apiKey: string) => Promise<boolean>;
      setModelApiKey: (modelId: string, apiKey: string) => Promise<boolean>;
      getSkills: () => Promise<string[]>;
      setSkills: (skills: string[]) => Promise<boolean>;
      getTools: () => Promise<string[]>;
      setTools: (tools: string[]) => Promise<boolean>;
      getChannels: () => Promise<{ type: string; enabled: boolean }[]>;
      setChannels: (channels: { type: string; enabled: boolean }[]) => Promise<boolean>;
      getSettingsData: () => Promise<{ config: OpenClawConfig; status: GatewayStatus; installCheck: { installed: boolean; path?: string; version?: string } }>;
      getGatewayStatus: () => Promise<GatewayStatus>;
      restartGateway: () => Promise<GatewayStatus>;
      checkInstall: () => Promise<{ installed: boolean; path?: string; version?: string }>;
      installOpenClaw: () => Promise<{ success: boolean; error?: string }>;
      completeInstall: () => Promise<boolean>;
      completeSetup: (config: { model: ModelConfig; apiKey: string }) => Promise<boolean>;
      cancelSetup: () => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      openSettings: () => Promise<void>;
      // Model Management API
      getSavedModels: () => Promise<ModelConfig[]>;
      addModel: (model: ModelConfig) => Promise<boolean>;
      updateModel: (model: ModelConfig) => Promise<boolean>;
      removeModel: (modelId: string) => Promise<boolean>;
      // Skills Hub API
      fetchSkills: () => Promise<{ success: boolean; data: any[]; error?: string }>;
      installSkill: (skillId: string) => Promise<{ success: boolean; error?: string }>;
      // OAuth API
      oauthStart: (provider: string) => Promise<{ success: boolean; authUrl?: string; error?: string }>;
      oauthGetStatus: (provider: string) => Promise<{ authenticated: boolean; email?: string; expires?: number }>;
    };
  }
}
