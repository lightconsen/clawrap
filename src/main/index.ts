import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as log from 'electron-log';
import { GatewayManager } from './gateway-manager';
import { ConfigManager } from './config-manager';
import { initializeAutoUpdater, checkForUpdates } from './auto-updater';
import { GatewayStatus, ModelConfig, AVAILABLE_SKILLS, PROVIDER_PRESETS, AgentInfo, AgentAuthProfile, AgentSummary, TokenUsageInfo, PermissionInfo, PermissionSettings, TaskHistory, TaskStats, TaskReliabilitySettings, HealthCheckResult, HealthCheckItem, HealthCheckStatus, NodeJsCheck, ConfigCheck, GatewayCheck } from '../shared/types';
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

    // Token Usage IPC
    ipcMain.handle('token:getUsage', async () => {
      return this.getTokenUsage();
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

    ipcMain.handle('cron:remove', async (_event, jobId: string) => {
      return this.removeCronJob(jobId);
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

    // Permission IPC Handlers
    ipcMain.handle('permission:getInfo', async () => {
      return this.getPermissionInfo();
    });

    ipcMain.handle('permission:getSettings', async () => {
      return this.getPermissionSettings();
    });

    ipcMain.handle('permission:updateSettings', async (_event, settings: PermissionSettings) => {
      return this.updatePermissionSettings(settings);
    });

    // Task Reliability IPC Handlers
    ipcMain.handle('task:getHistory', async () => {
      return this.getTaskHistory();
    });

    ipcMain.handle('task:getStats', async () => {
      return this.getTaskStats();
    });

    ipcMain.handle('task:getReliabilitySettings', async () => {
      return this.getTaskReliabilitySettings();
    });

    ipcMain.handle('task:updateReliabilitySettings', async (_event, settings: TaskReliabilitySettings) => {
      return this.updateTaskReliabilitySettings(settings);
    });

    // Health Check IPC Handlers
    ipcMain.handle('health:check', async () => {
      return this.runHealthCheck();
    });

    ipcMain.handle('health:fix', async (_event, checkId: string) => {
      return this.fixHealthIssue(checkId);
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

  private async removeCronJob(jobId: string): Promise<{ success: boolean; error?: string }> {
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

      cronData.jobs.splice(jobIndex, 1);
      fs.writeFileSync(cronJobsPath, JSON.stringify(cronData, null, 2));

      return { success: true };
    } catch (error) {
      log.error('Failed to remove cron job:', error);
      return { success: false, error: (error as Error).message };
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

  private async getTokenUsage(): Promise<TokenUsageInfo> {
    const os = require('os');
    const path = require('path');
    const usageDir = path.join(os.homedir(), '.openclaw', 'usage');
    const usageFilePath = path.join(usageDir, 'tokens.json');

    // Check if usage data exists
    if (!fs.existsSync(usageFilePath)) {
      // Return empty usage data
      return {
        totalTokens: 0,
        totalCost: 0,
        currency: 'USD',
        period: {
          start: Date.now() - 7 * 24 * 60 * 60 * 1000,
          end: Date.now(),
        },
        byModel: [],
        dailyUsage: [],
      };
    }

    try {
      const usageData = JSON.parse(fs.readFileSync(usageFilePath, 'utf-8'));
      return usageData;
    } catch (error) {
      log.error('Failed to read token usage:', error);
      return {
        totalTokens: 0,
        totalCost: 0,
        currency: 'USD',
        period: {
          start: Date.now() - 7 * 24 * 60 * 60 * 1000,
          end: Date.now(),
        },
        byModel: [],
        dailyUsage: [],
      };
    }
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

  private async getPermissionInfo(): Promise<PermissionInfo> {
    const os = require('os');
    const path = require('path');
    const permissionsPath = path.join(os.homedir(), '.openclaw', 'permissions.json');
    const logPath = path.join(os.homedir(), '.openclaw', 'permission-log.json');

    // Default permission info
    const defaultInfo: PermissionInfo = {
      fileAccess: {
        mode: 'readonly',
        allowedDirs: [],
        recentAccesses: [],
        totalReads: 0,
        totalWrites: 0,
        totalDeletes: 0,
      },
      networkAccess: {
        whitelistMode: false,
        allowedHosts: [],
        recentRequests: [],
        totalRequests: 0,
        blockedRequests: 0,
      },
      commandExecution: {
        requireConfirmation: true,
        recentCommands: [],
        totalExecuted: 0,
        blockedCommands: 0,
      },
    };

    try {
      // Read permission settings
      let settings = defaultInfo;
      if (fs.existsSync(permissionsPath)) {
        settings = { ...defaultInfo, ...JSON.parse(fs.readFileSync(permissionsPath, 'utf-8')) };
      }

      // Read permission logs
      if (fs.existsSync(logPath)) {
        const logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
        if (logs.fileAccesses) settings.fileAccess.recentAccesses = logs.fileAccesses.slice(-10);
        if (logs.networkRequests) settings.networkAccess.recentRequests = logs.networkRequests.slice(-10);
        if (logs.commands) settings.commandExecution.recentCommands = logs.commands.slice(-10);
        if (logs.totals) {
          settings.fileAccess.totalReads = logs.totals.reads || 0;
          settings.fileAccess.totalWrites = logs.totals.writes || 0;
          settings.fileAccess.totalDeletes = logs.totals.deletes || 0;
          settings.networkAccess.totalRequests = logs.totals.networkRequests || 0;
          settings.networkAccess.blockedRequests = logs.totals.blockedRequests || 0;
          settings.commandExecution.totalExecuted = logs.totals.commandsExecuted || 0;
          settings.commandExecution.blockedCommands = logs.totals.blockedCommands || 0;
        }
      }

      return settings;
    } catch (error) {
      log.error('Failed to get permission info:', error);
      return defaultInfo;
    }
  }

  private async getPermissionSettings(): Promise<PermissionSettings> {
    const os = require('os');
    const path = require('path');
    const permissionsPath = path.join(os.homedir(), '.openclaw', 'permissions.json');

    const defaultSettings: PermissionSettings = {
      fileAccess: {
        mode: 'readonly',
        allowedDirs: [],
      },
      network: {
        whitelistMode: false,
        allowedHosts: [],
      },
      commands: {
        requireConfirmation: true,
      },
    };

    try {
      if (fs.existsSync(permissionsPath)) {
        const saved = JSON.parse(fs.readFileSync(permissionsPath, 'utf-8'));
        return {
          fileAccess: { ...defaultSettings.fileAccess, ...saved.fileAccess },
          network: { ...defaultSettings.network, ...saved.network },
          commands: { ...defaultSettings.commands, ...saved.commands },
        };
      }
      return defaultSettings;
    } catch (error) {
      log.error('Failed to get permission settings:', error);
      return defaultSettings;
    }
  }

  private async updatePermissionSettings(settings: PermissionSettings): Promise<{ success: boolean; error?: string }> {
    try {
      const os = require('os');
      const path = require('path');
      const permissionsPath = path.join(os.homedir(), '.openclaw', 'permissions.json');

      // Ensure directory exists
      const permissionsDir = path.dirname(permissionsPath);
      if (!fs.existsSync(permissionsDir)) {
        fs.mkdirSync(permissionsDir, { recursive: true });
      }

      fs.writeFileSync(permissionsPath, JSON.stringify(settings, null, 2), 'utf-8');
      log.info('Permission settings updated');
      return { success: true };
    } catch (error) {
      log.error('Failed to update permission settings:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async getTaskHistory(): Promise<{ history: TaskHistory[] }> {
    try {
      const os = require('os');
      const path = require('path');
      const taskHistoryPath = path.join(os.homedir(), '.openclaw', 'task-history.json');

      if (!fs.existsSync(taskHistoryPath)) {
        return { history: [] };
      }

      const data = JSON.parse(fs.readFileSync(taskHistoryPath, 'utf-8'));
      // Return last 50 tasks
      return { history: (data.history || []).slice(-50) };
    } catch (error) {
      log.error('Failed to get task history:', error);
      return { history: [] };
    }
  }

  private async getTaskStats(): Promise<TaskStats> {
    try {
      const os = require('os');
      const path = require('path');
      const taskHistoryPath = path.join(os.homedir(), '.openclaw', 'task-history.json');

      const defaultStats: TaskStats = {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        runningTasks: 0,
        averageDuration: 0,
        failureRate: 0,
        recentFailures: [],
      };

      if (!fs.existsSync(taskHistoryPath)) {
        return defaultStats;
      }

      const data = JSON.parse(fs.readFileSync(taskHistoryPath, 'utf-8'));
      const history: TaskHistory[] = data.history || [];

      if (history.length === 0) {
        return defaultStats;
      }

      const completedTasks = history.filter(t => t.status === 'completed').length;
      const failedTasks = history.filter(t => t.status === 'failed').length;
      const runningTasks = history.filter(t => t.status === 'running').length;
      const totalTasks = history.length;

      const durations = history.filter(t => t.duration).map(t => t.duration!) as number[];
      const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

      const failureRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;

      const recentFailures = history.filter(t => t.status === 'failed').slice(-5);

      return {
        totalTasks,
        completedTasks,
        failedTasks,
        runningTasks,
        averageDuration,
        failureRate,
        recentFailures,
      };
    } catch (error) {
      log.error('Failed to get task stats:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        runningTasks: 0,
        averageDuration: 0,
        failureRate: 0,
        recentFailures: [],
      };
    }
  }

  private async getTaskReliabilitySettings(): Promise<TaskReliabilitySettings> {
    const os = require('os');
    const path = require('path');
    const settingsPath = path.join(os.homedir(), '.openclaw', 'task-reliability.json');

    const defaultSettings: TaskReliabilitySettings = {
      autoRetry: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 5000,
        backoffMultiplier: 2,
      },
      timeout: 30 * 60 * 1000, // 30 minutes
      notifyOnFailure: true,
      checkpointEnabled: false,
    };

    try {
      if (fs.existsSync(settingsPath)) {
        const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        return {
          autoRetry: { ...defaultSettings.autoRetry, ...saved.autoRetry },
          timeout: saved.timeout ?? defaultSettings.timeout,
          notifyOnFailure: saved.notifyOnFailure ?? defaultSettings.notifyOnFailure,
          checkpointEnabled: saved.checkpointEnabled ?? defaultSettings.checkpointEnabled,
        };
      }
      return defaultSettings;
    } catch (error) {
      log.error('Failed to get task reliability settings:', error);
      return defaultSettings;
    }
  }

  private async updateTaskReliabilitySettings(settings: TaskReliabilitySettings): Promise<{ success: boolean; error?: string }> {
    try {
      const os = require('os');
      const path = require('path');
      const settingsPath = path.join(os.homedir(), '.openclaw', 'task-reliability.json');

      // Ensure directory exists
      const settingsDir = path.dirname(settingsPath);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      log.info('Task reliability settings updated');
      return { success: true };
    } catch (error) {
      log.error('Failed to update task reliability settings:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async runHealthCheck(): Promise<HealthCheckResult> {
    const os = require('os');
    const path = require('path');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    const checks: HealthCheckItem[] = [];
    let overall: 'healthy' | 'warning' | 'error' = 'healthy';

    // Check Node.js
    try {
      const nodeCheck: NodeJsCheck = await this.checkNodeJs(execPromise);
      checks.push({
        id: 'nodejs',
        name: 'Node.js Environment',
        status: nodeCheck.isValid ? 'pass' : nodeCheck.installed ? 'warning' : 'error',
        message: nodeCheck.message,
        canFix: !nodeCheck.installed,
      });
      if (!nodeCheck.isValid) overall = nodeCheck.installed ? 'warning' : 'error';
    } catch (error) {
      checks.push({
        id: 'nodejs',
        name: 'Node.js Environment',
        status: 'error',
        message: 'Failed to check Node.js',
        canFix: true,
      });
      overall = 'error';
    }

    // Check configuration
    try {
      const configCheck: ConfigCheck = await this.checkConfig();
      checks.push({
        id: 'config',
        name: 'Configuration',
        status: configCheck.exists && configCheck.isValid ? 'pass' : 'error',
        message: configCheck.message,
        canFix: !configCheck.exists || !configCheck.isValid,
      });
      if (!configCheck.exists || !configCheck.isValid) overall = 'error';
    } catch (error) {
      checks.push({
        id: 'config',
        name: 'Configuration',
        status: 'error',
        message: 'Failed to check configuration',
        canFix: true,
      });
      overall = 'error';
    }

    // Check gateway
    try {
      const gatewayCheck: GatewayCheck = await this.checkGateway();
      checks.push({
        id: 'gateway',
        name: 'Gateway Service',
        status: gatewayCheck.running && gatewayCheck.reachable ? 'pass' : 'error',
        message: gatewayCheck.message,
        canFix: !gatewayCheck.running,
      });
      if (!gatewayCheck.running || !gatewayCheck.reachable) overall = overall === 'error' ? 'error' : 'warning';
    } catch (error) {
      checks.push({
        id: 'gateway',
        name: 'Gateway Service',
        status: 'error',
        message: 'Failed to check gateway',
        canFix: true,
      });
      overall = overall === 'error' ? 'error' : 'warning';
    }

    return {
      overall,
      checks,
      timestamp: Date.now(),
    };
  }

  private async checkNodeJs(execPromise: any): Promise<NodeJsCheck> {
    try {
      const { stdout } = await execPromise('node --version');
      const version = stdout.trim().replace('v', '');
      const majorVersion = parseInt(version.split('.')[0]);
      const minVersion = 18;
      const isValid = majorVersion >= minVersion;

      return {
        installed: true,
        version,
        majorVersion,
        isValid,
        message: isValid
          ? `Node.js ${version} installed`
          : `Node.js ${version} installed (minimum required: ${minVersion}.x)`,
      };
    } catch (error) {
      return {
        installed: false,
        version: '',
        majorVersion: 0,
        isValid: false,
        message: 'Node.js not found',
      };
    }
  }

  private async checkConfig(): Promise<ConfigCheck> {
    try {
      const os = require('os');
      const path = require('path');
      const configPath = path.join(os.homedir(), '.openclaw', 'config.yaml');

      if (!fs.existsSync(configPath)) {
        return {
          exists: false,
          isValid: false,
          hasModel: false,
          hasApiKey: false,
          message: 'Configuration file not found',
        };
      }

      const config = this.configManager.getConfig();
      const hasModel = !!config.settings.model;
      const hasApiKey = !!config.settings.model?.apiKey;

      return {
        exists: true,
        isValid: true,
        hasModel,
        hasApiKey,
        message: hasModel && hasApiKey
          ? 'Configuration valid'
          : hasModel
            ? 'Model configured, API key missing'
            : 'Model not configured',
      };
    } catch (error) {
      return {
        exists: true,
        isValid: false,
        hasModel: false,
        hasApiKey: false,
        message: 'Configuration file is invalid',
      };
    }
  }

  private async checkGateway(): Promise<GatewayCheck> {
    try {
      const status = await this.gatewayManager.getStatus();
      const running = status.running;
      const port = status.port;

      if (!running) {
        return {
          running: false,
          port: undefined,
          reachable: false,
          message: 'Gateway not running',
        };
      }

      // Try to reach the gateway
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/health`, (res: any) => {
          resolve({
            running: true,
            port,
            reachable: res.statusCode === 200,
            message: res.statusCode === 200 ? 'Gateway healthy' : `Gateway returned ${res.statusCode}`,
          });
        });

        req.on('error', () => {
          resolve({
            running: true,
            port,
            reachable: false,
            message: 'Gateway not reachable',
          });
        });

        req.setTimeout(5000, () => {
          req.destroy();
          resolve({
            running: true,
            port,
            reachable: false,
            message: 'Gateway timeout',
          });
        });
      });
    } catch (error) {
      return {
        running: false,
        port: undefined,
        reachable: false,
        message: 'Failed to check gateway',
      };
    }
  }

  private async fixHealthIssue(checkId: string): Promise<{ success: boolean; message: string }> {
    const os = require('os');
    const path = require('path');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    try {
      switch (checkId) {
        case 'nodejs':
          // Check if Node.js is installed
          const nodeCheck = await this.checkNodeJs(execPromise);
          if (nodeCheck.installed) {
            return { success: true, message: 'Node.js is already installed' };
          }
          return {
            success: false,
            message: 'Please install Node.js from https://nodejs.org',
          };

        case 'config':
          // Try to initialize config if missing
          const configPath = path.join(os.homedir(), '.openclaw', 'config.yaml');
          if (!fs.existsSync(configPath)) {
            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
              fs.mkdirSync(configDir, { recursive: true });
            }
            // Create minimal config
            const minimalConfig = `version: "1.0"
settings:
  gateway:
    port: 8080
    host: localhost
  skills:
    enabled: []
  tools:
    enabled: []
  bypass_channels: []
`;
            fs.writeFileSync(configPath, minimalConfig, 'utf-8');
            return {
              success: true,
              message: 'Configuration file created',
            };
          }
          return {
            success: true,
            message: 'Configuration file exists, please complete setup in the app',
          };

        case 'gateway':
          // Restart the gateway
          try {
            await this.gatewayManager.restart();
            return {
              success: true,
              message: 'Gateway restarted successfully',
            };
          } catch (error) {
            return {
              success: false,
              message: 'Failed to restart gateway',
            };
          }

        default:
          return {
            success: false,
            message: 'Unknown check ID',
          };
      }
    } catch (error) {
      log.error('Failed to fix health issue:', error);
      return {
        success: false,
        message: (error as Error).message,
      };
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
