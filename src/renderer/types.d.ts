import { OpenClawConfig, GatewayStatus, ModelConfig } from '../shared/types';

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
      getSavedModels: () => Promise<ModelConfig[]>;
      addModel: (model: ModelConfig) => Promise<boolean>;
      updateModel: (model: ModelConfig) => Promise<boolean>;
      removeModel: (modelId: string) => Promise<boolean>;
      fetchSkills: () => Promise<{ success: boolean; data: any[]; error?: string }>;
      installSkill: (skillId: string) => Promise<{ success: boolean; error?: string }>;
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
    };
  }
}

export {};
