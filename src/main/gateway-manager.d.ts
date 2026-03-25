import { GatewayStatus } from '../shared/types';
export declare class GatewayManager {
    private gatewayProcess;
    private gatewayPort;
    private openclawPath;
    private bundledNodePath;
    private standaloneBinaryPath;
    private useBundledNode;
    private useStandaloneBinary;
    constructor();
    /**
     * Detect if standalone OpenClaw binary is available
     * This is a single binary that includes Node.js + OpenClaw
     */
    private detectStandaloneBinary;
    /**
     * Detect if bundled Node.js is available
     */
    private detectBundledNode;
    /**
     * Get the path to node binary
     */
    private getNodePath;
    /**
     * Get the path to npm binary
     */
    private getNpmPath;
    getStatus(): GatewayStatus;
    /**
     * Check if we have a working runtime (standalone binary, bundled node, or system node)
     */
    checkRuntime(): Promise<{
        hasRuntime: boolean;
        type: 'standalone' | 'bundled-node' | 'system-node' | 'none';
        message: string;
    }>;
    /**
     * Check if OpenClaw is available
     * (standalone binary or npm-installed)
     */
    checkInstallation(): Promise<{
        installed: boolean;
        path?: string;
        version?: string;
        type: 'standalone' | 'npm';
    }>;
    /**
     * Install OpenClaw using npm (bundled or system)
     */
    install(onProgress?: (message: string) => void): Promise<void>;
    /**
     * Start the OpenClaw gateway
     */
    start(): Promise<number>;
    stop(): Promise<void>;
    restart(): Promise<number>;
    private getGlobalNpmPaths;
}
//# sourceMappingURL=gateway-manager.d.ts.map