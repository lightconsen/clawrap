/// <reference path="./assets.d.ts" />
import { OpenClawConfig, GatewayStatus, ModelConfig, CronJob, CronLog, MemoryInfo, AgentInfo, AgentAuthProfile, PersonalityFile, AgentSummary, TokenUsageInfo, PermissionInfo, PermissionSettings } from '../shared/types';

export interface ElectronAPI {
  // Config API
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

  // Model Management API
  getSavedModels: () => Promise<ModelConfig[]>;
  addModel: (model: ModelConfig) => Promise<boolean>;
  updateModel: (model: ModelConfig) => Promise<boolean>;
  removeModel: (modelId: string) => Promise<boolean>;

  // Skills Hub API
  fetchSkills: () => Promise<{ success: boolean; data: any[]; error?: string }>;
  installSkill: (skillId: string) => Promise<{ success: boolean; error?: string }>;

  // Gateway API
  getGatewayStatus: () => Promise<GatewayStatus>;
  restartGateway: () => Promise<GatewayStatus>;

  // Installation API
  checkInstall: () => Promise<{ installed: boolean; path?: string; version?: string }>;
  installOpenClaw: () => Promise<{ success: boolean; error?: string }>;
  completeInstall: () => Promise<boolean>;

  // Setup API
  completeSetup: (config: { model: ModelConfig; apiKey: string }) => Promise<boolean>;
  cancelSetup: () => Promise<void>;

  // Shell API
  openExternal: (url: string) => Promise<void>;

  // App API
  openSettings: () => Promise<void>;

  // OAuth API
  oauthStart: (provider: string) => Promise<{ success: boolean; authUrl?: string; error?: string }>;
  oauthGetStatus: (provider: string) => Promise<{ authenticated: boolean; email?: string; expires?: number }>;

  // Cron API
  getCronJobs: () => Promise<{ jobs: CronJob[] }>;
  getCronLogs: (jobId?: string) => Promise<{ logs: CronLog[] }>;
  runCronJob: (jobId: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  toggleCronJob: (jobId: string, enabled: boolean) => Promise<{ success: boolean }>;
  removeCronJob: (jobId: string) => Promise<{ success: boolean; error?: string }>;

  // Memory API
  getMemoryInfo: () => Promise<MemoryInfo>;

  // Token Usage API
  getTokenUsage: () => Promise<TokenUsageInfo>;

  // Agent API
  listAgents: () => Promise<{ agents: AgentSummary[] }>;
  getAgentInfo: (agentId?: string) => Promise<AgentInfo>;
  getAuthProfiles: (agentId?: string) => Promise<AgentAuthProfile[]>;

  // Personality API
  getPersonalityFiles: () => Promise<{ files: PersonalityFile[] }>;
  savePersonalityFile: (name: string, content: string) => Promise<{ success: boolean; error?: string }>;

  // Permission API
  getPermissionInfo: () => Promise<PermissionInfo>;
  getPermissionSettings: () => Promise<PermissionSettings>;
  updatePermissionSettings: (settings: PermissionSettings) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    __INITIAL_VIEW__?: 'install' | 'setup' | 'terminal' | 'settings';
  }
}

export {};
