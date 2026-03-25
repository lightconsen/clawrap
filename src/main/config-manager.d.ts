import { OpenClawConfig, ModelConfig } from '../shared/types';
export declare class ConfigManager {
    private config;
    private configDir;
    private configPath;
    initialize(): Promise<void>;
    getConfig(): OpenClawConfig;
    setModel(model: ModelConfig): Promise<void>;
    setApiKey(apiKey: string): Promise<void>;
    private loadConfig;
    private createDefaultConfig;
    private saveConfig;
    private getConfigDirectory;
    private getDefaultConfigPath;
    private ensureDirectoryExists;
    private fileExists;
    private getHardcodedDefaultConfig;
}
//# sourceMappingURL=config-manager.d.ts.map