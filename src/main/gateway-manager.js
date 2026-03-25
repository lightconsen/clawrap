"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayManager = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const log = __importStar(require("electron-log"));
const util_1 = require("util");
const child_process_2 = require("child_process");
const execAsync = (0, util_1.promisify)(child_process_2.exec);
const execFileAsync = (0, util_1.promisify)(child_process_2.execFile);
class GatewayManager {
    gatewayProcess = null;
    gatewayPort = 18789;
    openclawPath = null;
    bundledNodePath = null;
    standaloneBinaryPath = null;
    useBundledNode = false;
    useStandaloneBinary = false;
    constructor() {
        this.detectStandaloneBinary();
        if (!this.useStandaloneBinary) {
            this.detectBundledNode();
        }
    }
    /**
     * Detect if standalone OpenClaw binary is available
     * This is a single binary that includes Node.js + OpenClaw
     */
    detectStandaloneBinary() {
        const platform = process.platform;
        const arch = process.arch;
        // Determine binary name based on platform
        let binaryName;
        if (platform === 'darwin') {
            binaryName = arch === 'arm64' ? 'openclaw-darwin-arm64' : 'openclaw-darwin-x64';
        }
        else if (platform === 'win32') {
            binaryName = 'openclaw-win-x64.exe';
        }
        else if (platform === 'linux') {
            binaryName = 'openclaw-linux-x64';
        }
        else {
            return;
        }
        // Check possible locations
        const possiblePaths = [
            // Development path
            path.join(__dirname, '../../resources/bin', binaryName),
            // Production path (extraResources)
            path.join(process.resourcesPath, 'bin', binaryName),
            // Same directory as app
            path.join(process.resourcesPath, binaryName)
        ];
        for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
                // Verify it's executable
                try {
                    fs.accessSync(testPath, fs.constants.X_OK);
                    this.standaloneBinaryPath = testPath;
                    this.useStandaloneBinary = true;
                    log.info(`Using standalone OpenClaw binary: ${testPath}`);
                    return;
                }
                catch {
                    // Try to make it executable (Unix)
                    if (platform !== 'win32') {
                        try {
                            fs.chmodSync(testPath, 0o755);
                            this.standaloneBinaryPath = testPath;
                            this.useStandaloneBinary = true;
                            log.info(`Made standalone binary executable: ${testPath}`);
                            return;
                        }
                        catch {
                            // Ignore chmod errors
                        }
                    }
                }
            }
        }
        log.info('No standalone OpenClaw binary found');
        this.useStandaloneBinary = false;
    }
    /**
     * Detect if bundled Node.js is available
     */
    detectBundledNode() {
        const platform = process.platform;
        const arch = process.arch;
        let nodeDir = null;
        if (platform === 'darwin') {
            nodeDir = arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
        }
        else if (platform === 'win32') {
            nodeDir = 'win-x64';
        }
        else if (platform === 'linux') {
            nodeDir = 'linux-x64';
        }
        if (nodeDir) {
            const possiblePaths = [
                // Development path
                path.join(__dirname, '../../resources/node', nodeDir),
                // Production path (extraResources)
                path.join(process.resourcesPath, 'node', nodeDir)
            ];
            for (const testPath of possiblePaths) {
                const nodeBinary = platform === 'win32'
                    ? path.join(testPath, 'node.exe')
                    : path.join(testPath, 'bin/node');
                const npmBinary = platform === 'win32'
                    ? path.join(testPath, 'npm.cmd')
                    : path.join(testPath, 'bin/npm');
                if (fs.existsSync(nodeBinary) && (fs.existsSync(npmBinary) || platform === 'win32')) {
                    this.bundledNodePath = testPath;
                    this.useBundledNode = true;
                    log.info(`Using bundled Node.js from: ${testPath}`);
                    return;
                }
            }
        }
        log.info('No bundled Node.js found, will use system Node.js');
        this.useBundledNode = false;
    }
    /**
     * Get the path to node binary
     */
    getNodePath() {
        if (this.useBundledNode && this.bundledNodePath) {
            const platform = process.platform;
            return platform === 'win32'
                ? path.join(this.bundledNodePath, 'node.exe')
                : path.join(this.bundledNodePath, 'bin/node');
        }
        return 'node';
    }
    /**
     * Get the path to npm binary
     */
    getNpmPath() {
        if (this.useBundledNode && this.bundledNodePath) {
            const platform = process.platform;
            return platform === 'win32'
                ? path.join(this.bundledNodePath, 'npm.cmd')
                : path.join(this.bundledNodePath, 'bin/npm');
        }
        return process.platform === 'win32' ? 'npm.cmd' : 'npm';
    }
    getStatus() {
        if (!this.gatewayProcess) {
            return { running: false };
        }
        return {
            running: !this.gatewayProcess.killed,
            port: this.gatewayPort,
            pid: this.gatewayProcess.pid
        };
    }
    /**
     * Check if we have a working runtime (standalone binary, bundled node, or system node)
     */
    async checkRuntime() {
        // Check standalone binary first
        if (this.useStandaloneBinary && this.standaloneBinaryPath) {
            try {
                const { stdout } = await execFileAsync(this.standaloneBinaryPath, ['--version']);
                return {
                    hasRuntime: true,
                    type: 'standalone',
                    message: `Standalone binary: ${stdout.trim()}`
                };
            }
            catch (error) {
                log.error('Standalone binary check failed:', error);
            }
        }
        // Check bundled Node.js
        if (this.useBundledNode) {
            try {
                const nodePath = this.getNodePath();
                const { stdout } = await execFileAsync(nodePath, ['--version']);
                return {
                    hasRuntime: true,
                    type: 'bundled-node',
                    message: `Bundled Node.js: ${stdout.trim()}`
                };
            }
            catch (error) {
                log.error('Bundled Node.js check failed:', error);
            }
        }
        // Check system Node.js
        try {
            const { stdout } = await execAsync('node --version');
            return {
                hasRuntime: true,
                type: 'system-node',
                message: `System Node.js: ${stdout.trim()}`
            };
        }
        catch {
            return {
                hasRuntime: false,
                type: 'none',
                message: 'No Node.js runtime found'
            };
        }
    }
    /**
     * Check if OpenClaw is available
     * (standalone binary or npm-installed)
     */
    async checkInstallation() {
        // Check standalone binary first
        if (this.useStandaloneBinary && this.standaloneBinaryPath) {
            try {
                const { stdout } = await execFileAsync(this.standaloneBinaryPath, ['--version']);
                return {
                    installed: true,
                    path: this.standaloneBinaryPath,
                    version: stdout.trim(),
                    type: 'standalone'
                };
            }
            catch {
                // Standalone binary exists but failed to run
            }
        }
        // Check npm-installed openclaw
        try {
            const { stdout } = await execAsync('which openclaw || where openclaw');
            const openclawPath = stdout.trim();
            if (openclawPath) {
                try {
                    const { stdout: versionOut } = await execAsync('openclaw --version');
                    return {
                        installed: true,
                        path: openclawPath,
                        version: versionOut.trim(),
                        type: 'npm'
                    };
                }
                catch {
                    return {
                        installed: true,
                        path: openclawPath,
                        type: 'npm'
                    };
                }
            }
        }
        catch {
            // not found in PATH
        }
        // Check common global npm locations
        const globalPaths = this.getGlobalNpmPaths();
        for (const globalPath of globalPaths) {
            const possiblePath = path.join(globalPath, 'openclaw');
            try {
                await execAsync(`"${possiblePath}" --version`);
                return {
                    installed: true,
                    path: possiblePath,
                    type: 'npm'
                };
            }
            catch {
                // not at this path
            }
        }
        return { installed: false, type: 'npm' };
    }
    /**
     * Install OpenClaw using npm (bundled or system)
     */
    async install(onProgress) {
        log.info('Installing OpenClaw...');
        const npmPath = this.getNpmPath();
        const nodePath = this.getNodePath();
        log.info(`Using npm: ${npmPath}, node: ${nodePath}`);
        return new Promise((resolve, reject) => {
            const env = {
                ...process.env,
                PATH: this.useBundledNode && this.bundledNodePath
                    ? `${path.dirname(nodePath)}${path.delimiter}${process.env.PATH}`
                    : process.env.PATH
            };
            const installProcess = (0, child_process_1.spawn)(npmPath, ['install', '-g', 'openclaw@latest'], {
                stdio: 'pipe',
                env,
                shell: process.platform === 'win32'
            });
            let errorOutput = '';
            installProcess.stdout?.on('data', (data) => {
                const chunk = data.toString().trim();
                log.info('[npm]', chunk);
                onProgress?.(chunk);
            });
            installProcess.stderr?.on('data', (data) => {
                const chunk = data.toString().trim();
                errorOutput += chunk;
                log.error('[npm error]', chunk);
                onProgress?.(chunk);
            });
            installProcess.on('close', (code) => {
                if (code === 0) {
                    log.info('OpenClaw installed successfully');
                    resolve();
                }
                else {
                    reject(new Error(`npm install failed with code ${code}: ${errorOutput}`));
                }
            });
            installProcess.on('error', (err) => {
                reject(new Error(`Failed to spawn npm: ${err.message}`));
            });
            // Timeout after 10 minutes
            setTimeout(() => {
                installProcess.kill();
                reject(new Error('Installation timeout after 10 minutes'));
            }, 10 * 60 * 1000);
        });
    }
    /**
     * Start the OpenClaw gateway
     */
    async start() {
        if (this.gatewayProcess && !this.gatewayProcess.killed) {
            log.info('Gateway already running');
            return this.gatewayPort;
        }
        // Check installation
        const check = await this.checkInstallation();
        if (!check.installed) {
            throw new Error('OpenClaw is not installed');
        }
        this.openclawPath = check.path || 'openclaw';
        log.info(`Starting OpenClaw gateway: ${this.openclawPath} (type: ${check.type})`);
        // Prepare environment
        const env = { ...process.env };
        // For standalone binary, no need to modify PATH for Node
        // For npm-installed, ensure Node is in PATH if using bundled
        if (check.type === 'npm' && this.useBundledNode && this.bundledNodePath) {
            const nodeBinDir = process.platform === 'win32'
                ? this.bundledNodePath
                : path.join(this.bundledNodePath, 'bin');
            env.PATH = `${nodeBinDir}${path.delimiter}${process.env.PATH}`;
        }
        return new Promise((resolve, reject) => {
            this.gatewayProcess = (0, child_process_1.spawn)(this.openclawPath, [
                'gateway',
                '--port', this.gatewayPort.toString(),
                '--verbose'
            ], { env });
            let startupOutput = '';
            let hasStarted = false;
            this.gatewayProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                startupOutput += output;
                log.info('[OpenClaw]', output.trim());
                if (output.includes('listening') || output.includes('ready') || output.includes('ws://')) {
                    if (!hasStarted) {
                        hasStarted = true;
                        setTimeout(() => resolve(this.gatewayPort), 1000);
                    }
                }
            });
            this.gatewayProcess.stderr?.on('data', (data) => {
                log.error('[OpenClaw Error]', data.toString().trim());
            });
            this.gatewayProcess.on('error', (error) => {
                reject(error);
            });
            this.gatewayProcess.on('exit', (code) => {
                this.gatewayProcess = null;
                if (!hasStarted) {
                    reject(new Error(`Gateway failed to start. Exit code: ${code}`));
                }
            });
            setTimeout(() => {
                if (!hasStarted) {
                    this.stop();
                    reject(new Error('Gateway startup timeout'));
                }
            }, 60000);
        });
    }
    async stop() {
        return new Promise((resolve) => {
            if (!this.gatewayProcess) {
                resolve();
                return;
            }
            log.info('Stopping OpenClaw gateway...');
            if (process.platform === 'win32') {
                (0, child_process_1.spawn)('taskkill', ['/pid', this.gatewayProcess.pid?.toString() || '', '/f', '/t']);
            }
            else {
                this.gatewayProcess.kill('SIGTERM');
            }
            setTimeout(() => {
                if (this.gatewayProcess && !this.gatewayProcess.killed) {
                    this.gatewayProcess.kill('SIGKILL');
                }
                this.gatewayProcess = null;
                resolve();
            }, 5000);
        });
    }
    async restart() {
        await this.stop();
        return this.start();
    }
    getGlobalNpmPaths() {
        const paths = [];
        const platform = process.platform;
        if (platform === 'darwin' || platform === 'linux') {
            paths.push('/usr/local/bin/openclaw', '/usr/bin/openclaw', path.join(process.env.HOME || '', '.npm-global/bin/openclaw'), path.join(process.env.HOME || '', '.local/bin/openclaw'), '/opt/homebrew/bin/openclaw');
        }
        else if (platform === 'win32') {
            const appData = process.env.APPDATA || '';
            const programFiles = process.env.PROGRAMFILES || '';
            paths.push(path.join(appData, 'npm/openclaw.cmd'), path.join(programFiles, 'nodejs/openclaw.cmd'), 'C:\\Program Files\\nodejs\\openclaw.cmd');
        }
        return paths;
    }
}
exports.GatewayManager = GatewayManager;
//# sourceMappingURL=gateway-manager.js.map