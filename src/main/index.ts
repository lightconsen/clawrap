import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as log from 'electron-log';
import { GatewayManager } from './gateway-manager';
import { ConfigManager } from './config-manager';
import { initializeAutoUpdater, checkForUpdates } from './auto-updater';
import { GatewayStatus, ModelConfig, AVAILABLE_SKILLS, PROVIDER_PRESETS, AgentInfo, AgentAuthProfile, AgentSummary } from '../shared/types';
import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { URL } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';

const isDev = process.env.NODE_ENV === 'development';

class OpenClawApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private gatewayManager: GatewayManager;
  private configManager: ConfigManager;
  private oauthState: Map<string, { state: string; codeVerifier: string; resolve: (token: string) => void; reject: (error: Error) => void }> = new Map();
  private oauthServers: Map<string, Server> = new Map();

  constructor() {
    this.configManager = new ConfigManager();
    this.gatewayManager = new GatewayManager();
    this.setupIpcHandlers();
  }

  async initialize(): Promise<void> {
    log.info('Initializing OpenClaw Desktop...');

    await app.whenReady();

    // Set app icon for macOS dock
    if (process.platform === 'darwin' && app.dock) {
      const iconPath = this.getIconPath();
      try {
        app.dock.setIcon(iconPath);
        log.info('Set dock icon:', iconPath);
      } catch (error) {
        log.warn('Failed to set dock icon:', error);
      }
    }

    // Initialize config
    await this.configManager.initialize();

    // Create tray
    this.createTray();

    // Create application menu
    this.createApplicationMenu();

    // Initialize auto-updater
    initializeAutoUpdater();

    // Check for updates (only in production)
    if (!isDev) {
      setTimeout(() => checkForUpdates(), 5000);
    }

    // Start gateway and create main window
    const port = await this.gatewayManager.start();
    log.info(`Gateway started on port ${port}`);
    await this.createMainWindow(port);

    // App event handlers
    app.on('window-all-closed', this.handleWindowAllClosed.bind(this));
    app.on('activate', this.handleActivate.bind(this));
    app.on('before-quit', this.handleBeforeQuit.bind(this));
  }

  private setupIpcHandlers(): void {
    // Config IPC
    ipcMain.handle('config:get', () => {
      return this.configManager.getConfig();
    });

    ipcMain.handle('config:setModel', async (_event, model: ModelConfig) => {
      await this.configManager.setModel(model);
      return true;
    });

    ipcMain.handle('config:setFallbackModel', async (_event, model: ModelConfig | null) => {
      await this.configManager.setFallbackModel(model);
      return true;
    });

    ipcMain.handle('config:setImageModel', async (_event, model: ModelConfig | null) => {
      await this.configManager.setImageModel(model);
      return true;
    });

    ipcMain.handle('config:setApiKey', async (_event, apiKey: string) => {
      await this.configManager.setApiKey(apiKey);
      return true;
    });

    ipcMain.handle('config:setModelApiKey', async (_event, { modelId, apiKey }: { modelId: string; apiKey: string }) => {
      await this.configManager.setModelApiKey(modelId, apiKey);
      return true;
    });

    ipcMain.handle('config:getSkills', async () => {
      const config = this.configManager.getConfig();
      return config.settings.skills?.enabled || [];
    });

    ipcMain.handle('config:setSkills', async (_event, skills: string[]) => {
      await this.configManager.setSkills(skills);
      return true;
    });

    ipcMain.handle('config:getTools', async () => {
      const config = this.configManager.getConfig();
      return config.settings.tools?.enabled || [];
    });

    ipcMain.handle('config:setTools', async (_event, tools: string[]) => {
      await this.configManager.setTools(tools);
      return true;
    });

    // Channels IPC
    ipcMain.handle('config:getChannels', async () => {
      const config = this.configManager.getConfig();
      return config.settings.bypass_channels || [];
    });

    ipcMain.handle('config:setChannels', async (_event, channels: { type: string; enabled: boolean }[]) => {
      await this.configManager.setChannels(channels);
      return true;
    });

    // Model Management IPC
    ipcMain.handle('models:get', async () => {
      const config = this.configManager.getConfig();
      return config.settings.savedModels || [];
    });

    ipcMain.handle('models:add', async (_event, model: ModelConfig) => {
      await this.configManager.addModel(model);
      return true;
    });

    ipcMain.handle('models:update', async (_event, model: ModelConfig) => {
      await this.configManager.updateModel(model);
      return true;
    });

    ipcMain.handle('models:remove', async (_event, modelId: string) => {
      await this.configManager.removeModel(modelId);
      return true;
    });

    // Skills Hub IPC
    ipcMain.handle('skills:fetch', async () => {
      try {
        const https = await import('https');
        const zlib = await import('zlib');
        const { promisify } = await import('util');
        const gunzip = promisify(zlib.gunzip);

        // Fetch from clawhub.ai skills API
        const response = await new Promise<any>((resolve, reject) => {
          https.get('https://clawhub.ai/api/skills', {
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip'
            }
          }, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', async () => {
              try {
                const data = Buffer.concat(chunks);
                let result: any;
                if (res.headers['content-encoding'] === 'gzip') {
                  result = JSON.parse((await gunzip(data)).toString());
                } else {
                  result = JSON.parse(data.toString());
                }
                resolve(result);
              } catch (e) {
                reject(e);
              }
            });
          }).on('error', reject);
        });

        return { success: true, data: response.data || response.skills || [] };
      } catch (error) {
        log.error('Failed to fetch skills from clawhub.ai:', error);
        return { success: false, error: (error as Error).message, data: [] };
      }
    });

    ipcMain.handle('skills:install', async (_event, skillId: string) => {
      try {
        const config = this.configManager.getConfig();
        const enabledSkills = config.settings.skills?.enabled || [];

        if (!enabledSkills.includes(skillId)) {
          enabledSkills.push(skillId);
          await this.configManager.setSkills(enabledSkills);
        }

        return { success: true };
      } catch (error) {
        log.error('Failed to install skill:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Gateway IPC
    ipcMain.handle('gateway:status', (): GatewayStatus => {
      return this.gatewayManager.getStatus();
    });

    ipcMain.handle('gateway:restart', async () => {
      await this.gatewayManager.restart();
      return this.gatewayManager.getStatus();
    });

    // Installation IPC
    ipcMain.handle('install:check', async () => {
      return this.gatewayManager.checkInstallation();
    });

    ipcMain.handle('install:install', async () => {
      try {
        await this.gatewayManager.install();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('install:complete', async () => {
      // Just acknowledge - React app handles navigation
      return true;
    });

    // Setup IPC
    ipcMain.handle('setup:complete', async (_event, config: { model: ModelConfig; apiKey: string }) => {
      await this.configManager.setModel(config.model);
      await this.configManager.setApiKey(config.apiKey);
      return true;
    });

    ipcMain.handle('setup:cancel', () => {
      app.quit();
    });

    // Memory IPC
    ipcMain.handle('memory:getInfo', async () => {
      return this.getMemoryInfo();
    });

    // External links
    ipcMain.handle('shell:openExternal', (_event, url: string) => {
      shell.openExternal(url);
    });

    // Settings - now just a view change, no separate window
    ipcMain.handle('app:openSettings', async () => {
      // Notify renderer to show settings view
      this.mainWindow?.webContents.send('show-settings');
    });

    // OAuth IPC Handlers
    ipcMain.handle('oauth:start', async (_event, provider: string) => {
      return this.handleOAuthStart(provider);
    });

    ipcMain.handle('oauth:getStatus', async (_event, provider: string) => {
      return this.handleOAuthGetStatus(provider);
    });

    // Cron IPC Handlers
    ipcMain.handle('cron:getJobs', async () => {
      return this.getCronJobs();
    });

    ipcMain.handle('cron:getLogs', async (_event, jobId?: string) => {
      return this.getCronLogs(jobId);
    });

    ipcMain.handle('cron:run', async (_event, jobId: string) => {
      return this.runCronJob(jobId);
    });

    ipcMain.handle('cron:toggle', async (_event, { jobId, enabled }: { jobId: string; enabled: boolean }) => {
      return this.toggleCronJob(jobId, enabled);
    });

    // Agent IPC Handlers
    ipcMain.handle('agent:list', async () => {
      return this.listAgents();
    });

    ipcMain.handle('agent:getInfo', async (_event, agentId?: string) => {
      return this.getAgentInfo(agentId);
    });

    ipcMain.handle('agent:getAuthProfiles', async (_event, agentId?: string) => {
      return this.getAuthProfiles(agentId);
    });

    // Personality Files IPC Handler
    ipcMain.handle('personality:getFiles', async () => {
      return this.getPersonalityFiles();
    });

    ipcMain.handle('personality:saveFile', async (_event, { name, content }: { name: string; content: string }) => {
      return this.savePersonalityFile(name, content);
    });
  }

  private async handleOAuthStart(provider: string): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      const providerConfig = PROVIDER_PRESETS.find(p => p.id === provider);
      if (!providerConfig) {
        return { success: false, error: `Unknown provider: ${provider}` };
      }

      // Generate PKCE parameters
      const state = randomBytes(16).toString('hex');
      const codeVerifier = randomBytes(32).toString('hex');
      const codeChallenge = require('node:crypto').createHash('sha256').update(codeVerifier).digest('base64url');

      // Get OAuth config for provider
      const oauthConfig = this.getOAuthConfigForProvider(provider);
      if (!oauthConfig) {
        return { success: false, error: `OAuth not configured for provider: ${provider}` };
      }

      // Create local callback server
      const port = await this.findOpenPort();
      const redirectUri = `http://127.0.0.1:${port}/callback`;

      // Build authorization URL
      const authUrl = this.buildAuthUrl({
        ...oauthConfig,
        redirectUri,
        state,
        codeChallenge,
      });

      // Store state for callback validation
      this.oauthState.set(state, {
        state,
        codeVerifier,
        resolve: (token: string) => {
          log.info(`OAuth completed for provider: ${provider}`);
        },
        reject: (error: Error) => {
          log.error(`OAuth failed for provider: ${provider}`, error);
        },
      });

      // Start callback server
      await this.startOAuthCallbackServer(port, state);

      // Open browser for authorization
      await shell.openExternal(authUrl);

      return { success: true, authUrl };
    } catch (error) {
      log.error('OAuth start failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleOAuthGetStatus(provider: string): Promise<{ authenticated: boolean; email?: string; expires?: number }> {
    try {
      // Check OpenClaw auth-profiles.json for OAuth credentials
      const authStorePath = path.join(require('os').homedir(), '.openclaw', 'agents', 'agent', 'auth-profiles.json');

      if (!require('fs').existsSync(authStorePath)) {
        return { authenticated: false };
      }

      const authStore = JSON.parse(require('fs').readFileSync(authStorePath, 'utf-8'));
      const profiles = authStore.profiles || {};

      // Find OAuth credential for this provider
      for (const [profileId, credential] of Object.entries(profiles as Record<string, any>)) {
        if (credential.type === 'oauth' && credential.provider === provider) {
          const now = Date.now();
          const expires = credential.expires as number | undefined;

          // Check if token is expired
          if (expires && now > expires) {
            log.info(`OAuth token expired for provider: ${provider}`);
            return { authenticated: false };
          }

          return {
            authenticated: true,
            email: credential.email as string | undefined,
            expires,
          };
        }
      }

      return { authenticated: false };
    } catch (error) {
      log.error('OAuth status check failed:', error);
      return { authenticated: false };
    }
  }

  private getOAuthConfigForProvider(provider: string): { clientId: string; authorizeUrl: string; tokenUrl: string; scopes: string[] } | null {
    // OAuth configuration for supported providers
    const oauthConfigs: Record<string, { clientId: string; authorizeUrl: string; tokenUrl: string; scopes: string[] }> = {
      'openai-codex': {
        clientId: 'codex-cli',
        authorizeUrl: 'https://chatgpt.com/oauth/authorize',
        tokenUrl: 'https://chatgpt.com/backend-api/oauth/token',
        scopes: ['models.read', 'models.write'],
      },
      // Add more providers as needed
    };
    return oauthConfigs[provider] || null;
  }

  private buildAuthUrl(config: { clientId: string; redirectUri: string; scopes: string[]; state: string; codeChallenge: string; authorizeUrl: string }): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: config.state,
      code_challenge: config.codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${config.authorizeUrl}?${params.toString()}`;
  }

  private async findOpenPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        server.close(() => {
          if (typeof address === 'object' && address !== null) {
            resolve(address.port);
          } else {
            reject(new Error('Failed to get port'));
          }
        });
      });
      server.on('error', reject);
    });
  }

  private async startOAuthCallbackServer(port: number, expectedState: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        try {
          const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

          if (url.pathname === '/callback') {
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            if (error) {
              res.statusCode = 400;
              res.end(`OAuth error: ${error}`);
              this.oauthState.delete(expectedState);
              reject(new Error(`OAuth error: ${error}`));
              return;
            }

            if (!code || !state) {
              res.statusCode = 400;
              res.end('Missing code or state');
              reject(new Error('Missing code or state'));
              return;
            }

            if (state !== expectedState) {
              res.statusCode = 400;
              res.end('State mismatch');
              this.oauthState.delete(expectedState);
              reject(new Error('OAuth state mismatch'));
              return;
            }

            // Success - show completion page
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(`
              <!DOCTYPE html>
              <html>
                <head><title>OAuth Complete</title></head>
                <body>
                  <h1>Authentication Complete</h1>
                  <p>You can close this window and return to OpenClaw.</p>
                </body>
              </html>
            `);

            // Resolve the promise - the actual token exchange happens via OpenClaw CLI
            this.oauthState.delete(expectedState);
            server.close();
            resolve();
          } else {
            res.statusCode = 404;
            res.end('Not found');
          }
        } catch (err) {
          res.statusCode = 500;
          res.end('Server error');
          reject(err);
        }
      });

      server.listen(port, '127.0.0.1', () => {
        this.oauthServers.set(`${port}`, server);
        resolve();
      });

      server.on('error', (err: Error) => {
        this.oauthServers.delete(`${port}`);
        reject(err);
      });
    });
  }

  private async createMainWindow(gatewayPort: number): Promise<void> {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        additionalArguments: [`--gateway-port=${gatewayPort}`],
        devTools: isDev
      },
      title: 'OpenClaw',
      icon: this.getIconPath(),
      show: false
    });

    // Configure webRequest to strip CSP headers that prevent framing
    this.configureGatewayCSP(gatewayPort);

    // Load the React app
    const rendererIndexPath = path.join(__dirname, '../renderer/index.html');
    log.info(`Loading React app from: ${rendererIndexPath}`);

    try {
      await this.mainWindow.loadFile(rendererIndexPath);
      log.info('React app loaded successfully');
    } catch (error) {
      log.error('Failed to load React app:', error);
      this.mainWindow.show();
      return;
    }

    this.mainWindow.once('ready-to-show', () => {
      log.info('Main window ready to show');
      this.mainWindow?.show();
      if (isDev) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Fallback: show window after a timeout
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        log.info('Showing window via timeout fallback');
        this.mainWindow.show();
      }
    }, 2000);

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  /**
   * Configure webRequest to strip CSP headers that prevent framing gateway content.
   */
  private configureGatewayCSP(gatewayPort: number): void {
    if (!this.mainWindow) return;

    const { session } = this.mainWindow.webContents;

    session.webRequest.onHeadersReceived({
      urls: [`http://127.0.0.1:${gatewayPort}/*`, `http://localhost:${gatewayPort}/*`]
    }, (details, callback) => {
      const responseHeaders = details.responseHeaders || {};

      const cspHeaders = [
        'content-security-policy',
        'Content-Security-Policy',
        'content-security-policy-report-only',
        'Content-Security-Policy-Report-Only',
        'x-frame-options',
        'X-Frame-Options'
      ];

      for (const header of cspHeaders) {
        if (responseHeaders[header]) {
          delete responseHeaders[header];
        }
      }

      callback({ responseHeaders });
    });

    log.info(`Configured CSP stripping for gateway on port ${gatewayPort}`);
  }

  private createTray(): void {
    const iconPath = this.getIconPath();
    this.tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show OpenClaw',
        click: () => {
          this.mainWindow?.show();
        }
      },
      { type: 'separator' },
      {
        label: 'Restart Gateway',
        click: async () => {
          await this.gatewayManager.restart();
        }
      },
      { type: 'separator' },
      {
        label: 'Check for Updates',
        click: () => {
          checkForUpdates();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);

    this.tray.setToolTip('OpenClaw');
    this.tray.setContextMenu(contextMenu);

    this.tray.on('click', () => {
      this.mainWindow?.show();
    });
  }

  private createApplicationMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'OpenClaw',
        submenu: [
          {
            label: 'About OpenClaw',
            click: () => {
              // Show about dialog
            }
          },
          {
            label: 'Check for Updates...',
            click: () => {
              checkForUpdates();
            }
          },
          { type: 'separator' },
          {
            label: 'Settings...',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.mainWindow?.webContents.send('show-settings');
            }
          },
          { type: 'separator' },
          {
            label: 'Hide OpenClaw',
            accelerator: 'CmdOrCtrl+H',
            role: 'hide'
          },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Gateway',
        submenu: [
          {
            label: 'Restart Gateway',
            click: async () => {
              await this.gatewayManager.restart();
            }
          },
          {
            label: 'Stop Gateway',
            click: async () => {
              await this.gatewayManager.stop();
              log.info('Gateway stopped manually');
            }
          },
          { type: 'separator' },
          {
            label: 'View Gateway Status',
            click: () => {
              const status = this.gatewayManager.getStatus();
              // Show status dialog
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Documentation',
            click: () => {
              shell.openExternal('https://github.com/openclaw/desktop');
            }
          },
          {
            label: 'Report Issue',
            click: () => {
              shell.openExternal('https://github.com/openclaw/desktop/issues');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private getIconPath(): string {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    return path.join(__dirname, '../../build', iconName);
  }

  // Cron Job Handlers
  private async getCronJobs(): Promise<{ jobs: any[] }> {
    try {
      const os = require('os');
      const path = require('path');
      const cronJobsPath = path.join(os.homedir(), '.openclaw', 'cron', 'jobs.json');

      console.log('[Cron] Checking for cron jobs at:', cronJobsPath);
      console.log('[Cron] File exists:', fs.existsSync(cronJobsPath));

      if (!fs.existsSync(cronJobsPath)) {
        console.log('[Cron] File does not exist, returning empty jobs');
        return { jobs: [] };
      }

      const cronData = JSON.parse(fs.readFileSync(cronJobsPath, 'utf-8'));
      const jobs = cronData.jobs || [];

      console.log('[Cron] Raw cron data:', JSON.stringify(cronData, null, 2));
      console.log('[Cron] Jobs count:', jobs.length);

      // Transform to the format expected by the UI
      const transformedJobs = jobs.map((job: any) => {
        // Parse schedule from cron format
        let schedule = '* * * * *';
        if (job.schedule?.kind === 'every') {
          const everyMs = job.schedule.everyMs || 0;
          const minutes = Math.round(everyMs / 60000);
          if (minutes > 0 && minutes <= 59) {
            schedule = `*/${minutes} * * * *`;
          } else if (minutes >= 60 && minutes < 120) {
            schedule = `0 */${Math.round(minutes / 60)} * * *`;
          } else if (minutes >= 120) {
            schedule = `0 ${Math.round(minutes / 60)} * * *`;
          }
        }

        // Get command/description from payload
        let command = 'Unknown';
        if (job.payload?.kind === 'agentTurn') {
          command = `Say: ${job.payload.message || job.payload.text || 'Hello'}`;
        } else if (job.payload?.kind === 'systemEvent') {
          command = `Event: ${job.payload.text || 'System event'}`;
        } else if (job.payload?.text) {
          command = `Event: ${job.payload.text}`;
        }

        const transformed = {
          id: job.id,
          name: job.name || 'Unnamed Job',
          schedule,
          command,
          enabled: job.enabled ?? false,
          lastRun: job.state?.lastRunAtMs,
          lastOutput: job.state?.lastStatus || job.state?.lastRunStatus,
          lastError: job.state?.lastError,
          nextRun: job.state?.nextRunAtMs,
        };

        console.log('[Cron] Transformed job:', JSON.stringify(transformed, null, 2));
        return transformed;
      });

      console.log('[Cron] Returning transformed jobs:', transformedJobs.length);
      return { jobs: transformedJobs };
    } catch (error) {
      console.error('[Cron] Error getting cron jobs:', error);
      log.error('Failed to get cron jobs:', error);
      return { jobs: [] };
    }
  }

  private async getCronLogs(jobId?: string): Promise<{ logs: any[] }> {
    try {
      const os = require('os');
      const path = require('path');
      const runsDir = path.join(os.homedir(), '.openclaw', 'cron', 'runs');

      if (!fs.existsSync(runsDir)) {
        return { logs: [] };
      }

      const logs: any[] = [];

      // Read all job run files
      const files = fs.readdirSync(runsDir);
      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;

        const filePath = path.join(runsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const run = JSON.parse(line);
            if (run.action === 'finished') {
              logs.push({
                jobId: run.jobId,
                jobName: jobId || file.replace('.jsonl', ''),
                timestamp: run.ts || run.runAtMs,
                output: run.summary || '',
                error: run.error || undefined,
                duration: run.durationMs || 0,
                exitCode: run.status === 'error' ? 1 : 0,
              });
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }

      // Sort by timestamp descending (newest first)
      logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Filter by jobId if specified
      if (jobId) {
        return { logs: logs.filter(log => log.jobId === jobId) };
      }

      // Return last 100 logs
      return { logs: logs.slice(0, 100) };
    } catch (error) {
      log.error('Failed to get cron logs:', error);
      return { logs: [] };
    }
  }

  private async runCronJob(jobId: string): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      const os = require('os');
      const path = require('path');
      const cronJobsPath = path.join(os.homedir(), '.openclaw', 'cron', 'jobs.json');

      if (!fs.existsSync(cronJobsPath)) {
        return { success: false, error: 'Cron jobs file not found' };
      }

      const cronData = JSON.parse(fs.readFileSync(cronJobsPath, 'utf-8'));
      const jobIndex = (cronData.jobs || []).findIndex((j: any) => j.id === jobId);

      if (jobIndex === -1) {
        return { success: false, error: 'Job not found' };
      }

      const job = cronData.jobs[jobIndex];

      if (!job.enabled) {
        return { success: false, error: 'Job is disabled' };
      }

      // Note: Actual job execution is handled by OpenClaw's internal scheduler
      // This just returns info about the job
      return {
        success: true,
        output: `Job "${job.name}" triggered. Schedule: ${job.schedule?.kind === 'every' ? `Every ${job.schedule.everyMs}ms` : 'Unknown'}`,
      };
    } catch (error) {
      log.error('Failed to run cron job:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async toggleCronJob(jobId: string, enabled: boolean): Promise<{ success: boolean }> {
    try {
      const os = require('os');
      const path = require('path');
      const cronJobsPath = path.join(os.homedir(), '.openclaw', 'cron', 'jobs.json');

      if (!fs.existsSync(cronJobsPath)) {
        return { success: false };
      }

      const cronData = JSON.parse(fs.readFileSync(cronJobsPath, 'utf-8'));
      const jobIndex = (cronData.jobs || []).findIndex((j: any) => j.id === jobId);

      if (jobIndex === -1) {
        return { success: false };
      }

      cronData.jobs[jobIndex].enabled = enabled;
      cronData.jobs[jobIndex].updatedAtMs = Date.now();

      fs.writeFileSync(cronJobsPath, JSON.stringify(cronData, null, 2));

      return { success: true };
    } catch (error) {
      log.error('Failed to toggle cron job:', error);
      return { success: false };
    }
  }

  private async getMemoryInfo(): Promise<{
    systemMemory: { total: number; free: number; used: number; percent: number };
    processMemory: { heapUsed: number; heapTotal: number; rss: number };
    gatewayMemory?: { pid?: number; memory?: number };
  }> {
    const os = require('os');
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    const processMem = process.memoryUsage();

    const gatewayInfo = this.gatewayManager.getProcessInfo();

    return {
      systemMemory: {
        total,
        free,
        used,
        percent: (used / total) * 100,
      },
      processMemory: {
        heapUsed: processMem.heapUsed,
        heapTotal: processMem.heapTotal,
        rss: processMem.rss,
      },
      gatewayMemory: gatewayInfo.pid ? {
        pid: gatewayInfo.pid,
        memory: gatewayInfo.memory,
      } : undefined,
    };
  }

  private async getAgentInfo(agentId?: string): Promise<AgentInfo> {
    try {
      const os = require('os');
      const path = require('path');
      const agentsDir = path.join(os.homedir(), '.openclaw', 'agents');
      const id = agentId || 'main';
      const agentDir = path.join(agentsDir, id);
      const configPath = path.join(agentDir, 'config.json');

      let agentConfig: any = {};
      if (fs.existsSync(configPath)) {
        agentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }

      // Get auth profiles for this agent
      const authProfiles = await this.getAuthProfiles(id);

      // Get model from agents.defaults if available
      const config = this.configManager.getConfig();
      let model: string | undefined;

      if (config?.agents?.defaults?.model) {
        model = config.agents.defaults.model.id || config.agents.defaults.model.name;
      }

      return {
        id,
        name: agentConfig.name || id.charAt(0).toUpperCase() + id.slice(1),
        model,
        authProfiles,
        configPath: agentDir,
      };
    } catch (error) {
      log.error('Failed to get agent info:', error);
      const id = agentId || 'main';
      return {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        authProfiles: [],
        configPath: path.join(require('os').homedir(), '.openclaw', 'agents', id),
      };
    }
  }

  private async listAgents(): Promise<{ agents: AgentSummary[] }> {
    try {
      const os = require('os');
      const path = require('path');
      const agentsDir = path.join(os.homedir(), '.openclaw', 'agents');

      if (!fs.existsSync(agentsDir)) {
        return { agents: [] };
      }

      const entries = fs.readdirSync(agentsDir);
      const agents: AgentSummary[] = [];

      for (const entry of entries) {
        const agentPath = path.join(agentsDir, entry);
        if (fs.statSync(agentPath).isDirectory()) {
          // Check for auth-profiles.json
          const authProfilePath = path.join(agentPath, 'auth-profiles.json');
          const hasAuthProfiles = fs.existsSync(authProfilePath);

          // Try to get name from config.json
          let name = entry.charAt(0).toUpperCase() + entry.slice(1);
          const configPath = path.join(agentPath, 'config.json');
          if (fs.existsSync(configPath)) {
            try {
              const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
              if (config.name) {
                name = config.name;
              }
            } catch {
              // Use default name
            }
          }

          agents.push({
            id: entry,
            name,
            configPath: agentPath,
            hasAuthProfiles,
          });
        }
      }

      return { agents };
    } catch (error) {
      log.error('Failed to list agents:', error);
      return { agents: [] };
    }
  }

  private async getAuthProfiles(agentId?: string): Promise<AgentAuthProfile[]> {
    try {
      const os = require('os');
      const path = require('path');
      const agentsDir = path.join(os.homedir(), '.openclaw', 'agents');
      const id = agentId || 'main';
      const authStorePath = path.join(agentsDir, id, 'auth-profiles.json');

      if (!fs.existsSync(authStorePath)) {
        return [];
      }

      const authStore = JSON.parse(fs.readFileSync(authStorePath, 'utf-8'));
      const profiles = authStore.profiles || {};
      const result: AgentAuthProfile[] = [];

      for (const [profileId, profile] of Object.entries(profiles as Record<string, any>)) {
        result.push({
          profileId,
          type: profile.type as 'api_key' | 'oauth',
          provider: profile.provider,
          email: profile.email,
          expires: profile.expires,
          created: profile.created,
        });
      }

      return result;
    } catch (error) {
      log.error('Failed to get auth profiles:', error);
      return [];
    }
  }

  private async getPersonalityFiles(): Promise<{ files: { name: string; content: string }[] }> {
    try {
      const os = require('os');
      const path = require('path');
      const workspacePath = path.join(os.homedir(), '.openclaw', 'workspace');

      if (!fs.existsSync(workspacePath)) {
        return { files: [] };
      }

      const files: { name: string; content: string }[] = [];
      const personalityFiles = [
        'SOUL.md',
        'IDENTITY.md',
        'USER.md',
        'AGENTS.md',
        'TOOLS.md',
        'BOOTSTRAP.md',
        'HEARTBEAT.md',
      ];

      for (const fileName of personalityFiles) {
        const filePath = path.join(workspacePath, fileName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          files.push({ name: fileName.replace('.md', ''), content });
        }
      }

      return { files };
    } catch (error) {
      log.error('Failed to get personality files:', error);
      return { files: [] };
    }
  }

  private async savePersonalityFile(name: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      const os = require('os');
      const path = require('path');
      const workspacePath = path.join(os.homedir(), '.openclaw', 'workspace');

      if (!fs.existsSync(workspacePath)) {
        return { success: false, error: 'Workspace directory not found' };
      }

      const fileName = `${name}.md`;
      const filePath = path.join(workspacePath, fileName);

      // Verify file exists before allowing save
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File ${fileName} not found` };
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      log.info(`Saved personality file: ${fileName}`);
      return { success: true };
    } catch (error) {
      log.error('Failed to save personality file:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private handleWindowAllClosed(): void {
    // Always quit the app when window closes, gateway continues running in background
    app.quit();
  }

  private async handleActivate(): Promise<void> {
    if (!this.mainWindow) {
      await this.startGatewayAndShowMain();
    }
  }

  private async startGatewayAndShowMain(): Promise<void> {
    try {
      const port = await this.gatewayManager.start();
      log.info(`Gateway restarted on port ${port}`);
      await this.createMainWindow(port);
    } catch (error) {
      log.error('Failed to start gateway:', error);
      throw error;
    }
  }

  private async handleBeforeQuit(): Promise<void> {
    log.info('App quitting - gateway will continue running in background');
  }
}

// Initialize app
const openClawApp = new OpenClawApp();
openClawApp.initialize().catch((error) => {
  log.error('Failed to initialize app:', error);
  app.quit();
});
