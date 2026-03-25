export interface GatewayConfig {
    port: number;
    host: string;
}
export interface SkillConfig {
    enabled: string[];
}
export interface ToolConfig {
    enabled: string[];
}
export interface BypassChannel {
    type: string;
    enabled: boolean;
}
export interface ModelConfig {
    id: string;
    name: string;
    provider: string;
    apiKey?: string;
    baseUrl?: string;
}
export interface OpenClawConfig {
    version: string;
    settings: {
        gateway: GatewayConfig;
        skills: SkillConfig;
        tools: ToolConfig;
        bypass_channels: BypassChannel[];
        model: ModelConfig | null;
    };
}
export interface GatewayStatus {
    running: boolean;
    port?: number;
    pid?: number;
    error?: string;
}
export interface NodeCheckResult {
    installed: boolean;
    version: string | null;
    majorVersion: number;
    isVersionValid: boolean;
    message: string;
}
export declare const PRESET_MODELS: ModelConfig[];
//# sourceMappingURL=types.d.ts.map