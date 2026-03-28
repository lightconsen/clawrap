// Type-safe IPC wrapper for React components
import { ModelConfig, OpenClawConfig, GatewayStatus } from '@shared/types';

export const ipc = {
  // Config
  getConfig: (): Promise<OpenClawConfig> => window.electronAPI.getConfig(),
  setModel: (model: ModelConfig): Promise<boolean> => window.electronAPI.setModel(model),
  setFallbackModel: (model: ModelConfig | null): Promise<boolean> => window.electronAPI.setFallbackModel(model),
  setImageModel: (model: ModelConfig | null): Promise<boolean> => window.electronAPI.setImageModel(model),
  setApiKey: (apiKey: string): Promise<boolean> => window.electronAPI.setApiKey(apiKey),
  setModelApiKey: (modelId: string, apiKey: string): Promise<boolean> => window.electronAPI.setModelApiKey(modelId, apiKey),
  getSkills: (): Promise<string[]> => window.electronAPI.getSkills(),
  setSkills: (skills: string[]): Promise<boolean> => window.electronAPI.setSkills(skills),
  getTools: (): Promise<string[]> => window.electronAPI.getTools(),
  setTools: (tools: string[]): Promise<boolean> => window.electronAPI.setTools(tools),
  getChannels: (): Promise<{ type: string; enabled: boolean }[]> => window.electronAPI.getChannels(),
  setChannels: (channels: { type: string; enabled: boolean }[]): Promise<boolean> => window.electronAPI.setChannels(channels),

  // Models
  getSavedModels: (): Promise<ModelConfig[]> => window.electronAPI.getSavedModels(),
  addModel: (model: ModelConfig): Promise<boolean> => window.electronAPI.addModel(model),
  updateModel: (model: ModelConfig): Promise<boolean> => window.electronAPI.updateModel(model),
  removeModel: (id: string): Promise<boolean> => window.electronAPI.removeModel(id),

  // Gateway
  getGatewayStatus: (): Promise<GatewayStatus> => window.electronAPI.getGatewayStatus(),
  restartGateway: (): Promise<GatewayStatus> => window.electronAPI.restartGateway(),

  // Installation
  checkInstall: (): Promise<{ installed: boolean; path?: string; version?: string }> => window.electronAPI.checkInstall(),
  installOpenClaw: (): Promise<{ success: boolean; error?: string }> => window.electronAPI.installOpenClaw(),
  completeInstall: (): Promise<boolean> => window.electronAPI.completeInstall(),

  // Setup
  completeSetup: (config: { model: ModelConfig; apiKey: string }): Promise<boolean> => window.electronAPI.completeSetup(config),
  cancelSetup: (): Promise<void> => window.electronAPI.cancelSetup(),

  // External
  openExternal: (url: string): Promise<void> => window.electronAPI.openExternal(url),

  // Settings
  openSettings: (): Promise<void> => window.electronAPI.openSettings(),

  // Skills Hub
  fetchSkills: (): Promise<{ success: boolean; data: any[]; error?: string }> => window.electronAPI.fetchSkills(),
  installSkill: (skillId: string): Promise<{ success: boolean; error?: string }> => window.electronAPI.installSkill(skillId),
};
