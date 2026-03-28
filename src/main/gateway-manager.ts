import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as log from 'electron-log';
import { GatewayStatus, NodeCheckResult } from '../shared/types';
import { randomBytes } from 'crypto';
import { promisify } from 'util';
import { exec, execFile, execFileSync } from 'child_process';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export class GatewayManager {
  private gatewayProcess: ChildProcess | null = null;
  private gatewayPort: number = 18789;
  private gatewayToken: string | null = null;
  private openclawPath: string | null = null;
  private bundledNodePath: string | null = null;
  private standaloneBinaryPath: string | null = null;
  private useBundledNode: boolean = false;
  private useStandaloneBinary: boolean = false;
  private externalGatewayDetected: boolean = false;

  constructor() {
    this.detectStandaloneBinary();
    if (!this.useStandaloneBinary) {
      this.detectBundledNode();
    }
    this.loadOrCreateGatewayToken();
  }

  /**
   * Load existing gateway token from OpenClaw config or create a new one
   */
  private loadOrCreateGatewayToken(): void {
    const openclawConfigPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');

    try {
      if (fs.existsSync(openclawConfigPath)) {
        const config = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf8'));
        if (config.gateway?.auth?.token) {
          this.gatewayToken = config.gateway.auth.token;
          log.info('Loaded gateway token from OpenClaw config');
          return;
        }
      }
    } catch (error) {
      log.warn('Failed to read OpenClaw config:', error);
    }

    // Generate new token if not found
    this.gatewayToken = this.generateSecureToken();
    log.info('Generated new gateway token');

    // Try to save it to config
    try {
      this.saveGatewayTokenToConfig(openclawConfigPath, this.gatewayToken);
    } catch (error) {
      log.warn('Failed to save gateway token to config:', error);
    }
  }

  /**
   * Save gateway token to OpenClaw config file
   */
  private saveGatewayTokenToConfig(configPath: string, token: string): void {
    let config: any = {};

    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    if (!config.gateway) {
      config.gateway = {};
    }
    if (!config.gateway.auth) {
      config.gateway.auth = {};
    }

    config.gateway.auth.mode = 'token';
    config.gateway.auth.token = token;

    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    log.info('Saved gateway token to OpenClaw config');
  }

  /**
   * Detect if standalone OpenClaw binary is available
   * This is a single binary that includes Node.js + OpenClaw
   */
  private detectStandaloneBinary(): void {
    const platform = process.platform;
    const arch = process.arch;

    // Determine binary name based on platform
    let binaryName: string;
    if (platform === 'darwin') {
      binaryName = arch === 'arm64' ? 'openclaw-darwin-arm64' : 'openclaw-darwin-x64';
    } else if (platform === 'win32') {
      binaryName = 'openclaw-win-x64.exe';
    } else if (platform === 'linux') {
      binaryName = 'openclaw-linux-x64';
    } else {
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
        } catch {
          // Try to make it executable (Unix)
          if (platform !== 'win32') {
            try {
              fs.chmodSync(testPath, 0o755);
              this.standaloneBinaryPath = testPath;
              this.useStandaloneBinary = true;
              log.info(`Made standalone binary executable: ${testPath}`);
              return;
            } catch {
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
   * Detect if bundled Node.js is available and meets version requirements
   */
  private detectBundledNode(): void {
    const platform = process.platform;
    const arch = process.arch;

    let nodeDir: string | null = null;

    if (platform === 'darwin') {
      nodeDir = arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
    } else if (platform === 'win32') {
      nodeDir = 'win-x64';
    } else if (platform === 'linux') {
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
          // Check if bundled Node.js meets minimum version (v22.12.0)
          try {
            const output = execFileSync(nodeBinary, ['--version']);
            const version = output.toString().trim();
            const major = parseInt(version.slice(1).split('.')[0], 10);
            const minor = parseInt(version.slice(1).split('.')[1], 10);

            // Need Node >= 22.12.0
            if (major > 22 || (major === 22 && minor >= 12)) {
              this.bundledNodePath = testPath;
              this.useBundledNode = true;
              log.info(`Using bundled Node.js ${version} from: ${testPath}`);
              return;
            } else {
              log.warn(`Bundled Node.js ${version} is too old (requires >= 22.12.0), will use system Node.js`);
            }
          } catch {
            log.warn('Failed to check bundled Node.js version, will use system Node.js');
          }
        }
      }
    }

    log.info('No suitable bundled Node.js found, will use system Node.js');
    this.useBundledNode = false;
  }

  /**
   * Get the path to node binary
   */
  private getNodePath(): string {
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
  private getNpmPath(): string {
    if (this.useBundledNode && this.bundledNodePath) {
      const platform = process.platform;
      return platform === 'win32'
        ? path.join(this.bundledNodePath, 'npm.cmd')
        : path.join(this.bundledNodePath, 'bin/npm');
    }
    return process.platform === 'win32' ? 'npm.cmd' : 'npm';
  }

  getStatus(): GatewayStatus {
    // If we started the gateway ourselves
    if (this.gatewayProcess) {
      return {
        running: !this.gatewayProcess.killed,
        port: this.gatewayPort,
        pid: this.gatewayProcess.pid,
        token: this.gatewayToken || undefined
      };
    }

    // If we detected an external gateway
    if (this.externalGatewayDetected) {
      return {
        running: true,
        port: this.gatewayPort,
        token: this.gatewayToken || undefined
      };
    }

    return { running: false };
  }

  /**
   * Check if we have a working runtime (standalone binary, bundled node, or system node)
   */
  async checkRuntime(): Promise<{
    hasRuntime: boolean;
    type: 'standalone' | 'bundled-node' | 'system-node' | 'none';
    message: string;
  }> {
    // Check standalone binary first
    if (this.useStandaloneBinary && this.standaloneBinaryPath) {
      try {
        const { stdout } = await execFileAsync(this.standaloneBinaryPath, ['--version']);
        return {
          hasRuntime: true,
          type: 'standalone',
          message: `Standalone binary: ${stdout.trim()}`
        };
      } catch (error) {
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
      } catch (error) {
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
    } catch {
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
  async checkInstallation(): Promise<{ installed: boolean; path?: string; version?: string; type: 'standalone' | 'npm' }> {
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
      } catch {
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
        } catch {
          return {
            installed: true,
            path: openclawPath,
            type: 'npm'
          };
        }
      }
    } catch {
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
      } catch {
        // not at this path
      }
    }

    return { installed: false, type: 'npm' };
  }

  /**
   * Install OpenClaw using npm (bundled or system)
   */
  async install(onProgress?: (message: string) => void): Promise<void> {
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

      const installProcess = spawn(npmPath, ['install', '-g', 'openclaw@latest'], {
        stdio: 'pipe',
        env,
        shell: process.platform === 'win32'
      });

      let errorOutput = '';

      installProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString().trim();
        log.info('[npm]', chunk);
        onProgress?.(chunk);
      });

      installProcess.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString().trim();
        errorOutput += chunk;
        log.error('[npm error]', chunk);
        onProgress?.(chunk);
      });

      installProcess.on('close', (code) => {
        if (code === 0) {
          log.info('OpenClaw installed successfully');
          resolve();
        } else {
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
   * Check if gateway is already running by probing the port
   */
  async probeExistingGateway(): Promise<{ running: boolean; port?: number; token?: string }> {
    const portsToCheck = [18789, 18790, 18791, 9090, this.gatewayPort];

    for (const port of portsToCheck) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`);
        if (response.ok) {
          log.info(`Found existing gateway running on port ${port}`);
          this.externalGatewayDetected = true;
          this.gatewayPort = port;
          // Reload token from config to match the running gateway
          this.loadOrCreateGatewayToken();
          return { running: true, port, token: this.gatewayToken || undefined };
        }
      } catch {
        // Port not responding, try next
      }
    }

    this.externalGatewayDetected = false;
    return { running: false };
  }

  /**
   * Start the OpenClaw gateway
   */
  async start(): Promise<number> {
    if (this.gatewayProcess && !this.gatewayProcess.killed) {
      log.info('Gateway already running (tracked)');
      return this.gatewayPort;
    }

    // Check if gateway is already running externally
    const existing = await this.probeExistingGateway();
    if (existing.running && existing.port) {
      log.info(`Using existing gateway on port ${existing.port}`);
      this.externalGatewayDetected = true;
      this.gatewayPort = existing.port;
      if (existing.token) {
        this.gatewayToken = existing.token;
      }
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

    // Ensure we have a token loaded or created
    if (!this.gatewayToken) {
      this.loadOrCreateGatewayToken();
    }

    log.info('Using gateway token for authentication');

    return new Promise((resolve, reject) => {
      // Pass token via environment variable to ensure gateway uses it
      const gatewayEnv = {
        ...env,
        OPENCLAW_GATEWAY_TOKEN: this.gatewayToken!
      };

      this.gatewayProcess = spawn(this.openclawPath!, [
        'gateway',
        '--port', this.gatewayPort.toString(),
        '--verbose',
        '--allow-unconfigured'
      ], { env: gatewayEnv });

      let startupOutput = '';
      let hasStarted = false;
      let alreadyRunningDetected = false;

      this.gatewayProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        startupOutput += output;
        log.info('[OpenClaw]', output.trim());

        if (output.includes('listening') || output.includes('ready') || output.includes('ws://')) {
          if (!hasStarted) {
            hasStarted = true;
            // Gateway is ready, resolve immediately since we already have the token
            setTimeout(() => {
              log.info(`Gateway ready on port ${this.gatewayPort}`);
              resolve(this.gatewayPort);
            }, 500);
          }
        }
      });

      this.gatewayProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        log.error('[OpenClaw Error]', output);

        // Detect if gateway is already running
        if (output.includes('already running') || output.includes('launchd')) {
          alreadyRunningDetected = true;
          log.info('Detected existing gateway from stderr, will probe for it');

          // Give the existing gateway a moment to be fully ready, then probe
          setTimeout(async () => {
            const existing = await this.probeExistingGateway();
            if (existing.running && existing.port) {
              log.info(`Connected to existing gateway on port ${existing.port}`);
              this.gatewayPort = existing.port;
              this.externalGatewayDetected = true;
              if (existing.token) {
                this.gatewayToken = existing.token;
              }
              hasStarted = true;
              resolve(this.gatewayPort);
            }
          }, 3000);
        }
      });

      this.gatewayProcess.on('error', (error) => {
        reject(error);
      });

      this.gatewayProcess.on('exit', (code) => {
        this.gatewayProcess = null;
        if (!hasStarted && !alreadyRunningDetected) {
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

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.gatewayProcess) {
        resolve();
        return;
      }

      log.info('Stopping OpenClaw gateway...');

      // Clear the token when stopping
      this.gatewayToken = null;

      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', this.gatewayProcess.pid?.toString() || '', '/f', '/t']);
      } else {
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

  async restart(): Promise<number> {
    await this.stop();
    return this.start();
  }

  private getGlobalNpmPaths(): string[] {
    const paths: string[] = [];
    const platform = process.platform;

    if (platform === 'darwin' || platform === 'linux') {
      paths.push(
        '/usr/local/bin/openclaw',
        '/usr/bin/openclaw',
        path.join(process.env.HOME || '', '.npm-global/bin/openclaw'),
        path.join(process.env.HOME || '', '.local/bin/openclaw'),
        '/opt/homebrew/bin/openclaw'
      );
    } else if (platform === 'win32') {
      const appData = process.env.APPDATA || '';
      const programFiles = process.env.PROGRAMFILES || '';
      paths.push(
        path.join(appData, 'npm/openclaw.cmd'),
        path.join(programFiles, 'nodejs/openclaw.cmd'),
        'C:\\Program Files\\nodejs\\openclaw.cmd'
      );
    }

    return paths;
  }

  /**
   * Generate a secure random token for gateway authentication
   */
  private generateSecureToken(): string {
    // Generate 32 bytes of random data and encode as hex
    return randomBytes(32).toString('hex');
  }
}
