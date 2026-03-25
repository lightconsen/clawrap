import { OpenClawConfig, GatewayStatus, ModelConfig } from '../shared/types';

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

export {};
