import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as log from 'electron-log';
import { GatewayManager } from './gateway-manager';
import { ConfigManager } from './config-manager';
import { initializeAutoUpdater, checkForUpdates } from './auto-updater';
import { GatewayStatus, ModelConfig, AVAILABLE_SKILLS } from '../shared/types';

const isDev = process.env.NODE_ENV === 'development';

class OpenClawApp {
  private mainWindow: BrowserWindow | null = null;
  private setupWindow: BrowserWindow | null = null;
  private installWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private gatewayManager: GatewayManager;
  private configManager: ConfigManager;
  private installCompleted: boolean = false;
  private setupCompleted: boolean = false;

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

    // Check if OpenClaw is installed
    const installCheck = await this.gatewayManager.checkInstallation();

    if (!installCheck.installed) {
      // OpenClaw not installed - show installation window
      await this.createInstallWindow();
    } else {
      log.info(`OpenClaw found at: ${installCheck.path}, version: ${installCheck.version || 'unknown'}`);

      // Check if first run (no model configured)
      const config = this.configManager.getConfig();

      if (!config.settings.model) {
        // First run - show setup wizard
        await this.createSetupWindow();
      } else {
        // Normal run - start gateway and show main window
        await this.startGatewayAndShowMain();
      }
    }

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
        // Skills are enabled/disabled via config, no actual installation needed
        // Just enable the skill in config
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
      log.info('>>> install:complete handler called <<<');

      // Mark installation as completed so window closed handler doesn't quit app
      this.installCompleted = true;

      try {
        log.info('Getting config...');
        const config = this.configManager.getConfig();
        log.info(`Config retrieved. Model value: ${JSON.stringify(config.settings.model)}`);
        log.info(`Install complete - checking config. Model configured: ${!!config.settings.model}`);

        if (!config.settings.model) {
          // Create setup window first, then close install window
          log.info('No model configured, showing setup window');
          await this.createSetupWindow();
          if (this.installWindow) {
            this.installWindow.close();
            this.installWindow = null;
          }
        } else {
          // Close install window first, then start gateway
          log.info('Model already configured, starting main window');
          if (this.installWindow) {
            this.installWindow.close();
            this.installWindow = null;
          }
          await this.startGatewayAndShowMain();
        }
        log.info('>>> install:complete handler finished successfully <<<');
        return true;
      } catch (error) {
        log.error('!!! Error in install:complete handler:', error);
        throw error;
      }
    });

    // Setup IPC
    ipcMain.handle('setup:complete', async (_event, config: { model: ModelConfig; apiKey: string }) => {
      // Mark setup as completed so window closed handler doesn't quit app
      this.setupCompleted = true;

      await this.configManager.setModel(config.model);
      await this.configManager.setApiKey(config.apiKey);

      // Close setup window and open main window
      if (this.setupWindow) {
        this.setupWindow.close();
        this.setupWindow = null;
      }

      await this.startGatewayAndShowMain();
      return true;
    });

    ipcMain.handle('setup:cancel', () => {
      app.quit();
    });

    // External links
    ipcMain.handle('shell:openExternal', (_event, url: string) => {
      shell.openExternal(url);
    });

    // Settings window
    ipcMain.handle('app:openSettings', async () => {
      await this.createSettingsWindow();
    });

    // Settings API - get all data needed for settings page
    ipcMain.handle('settings:get', async () => {
      const appDataPath = process.env.HOME || process.env.USERPROFILE || '';
      return {
        config: this.configManager.getConfig(),
        status: this.gatewayManager.getStatus(),
        installCheck: await this.gatewayManager.checkInstallation(),
        configDir: `${appDataPath}/.openclaw`
      };
    });
  }

  private async createSetupWindow(): Promise<void> {
    log.info('Creating setup window...');
    try {
      this.setupWindow = new BrowserWindow({
        width: 600,
        height: 500,
        resizable: true,
        maximizable: true,
        minimizable: true,
        webPreferences: {
          preload: path.join(__dirname, '../preload/index.js'),
          contextIsolation: true,
          nodeIntegration: false
        },
        title: 'OpenClaw Setup',
        icon: this.getIconPath()
      });

      const setupHtmlPath = path.join(__dirname, '../renderer/setup/index.html');
      log.info(`Loading setup HTML from: ${setupHtmlPath}`);
      await this.setupWindow.loadFile(setupHtmlPath);
      log.info('Setup window loaded successfully');

      this.setupWindow.on('closed', () => {
        this.setupWindow = null;
        // If setup was cancelled (no main window and setup not completed), quit app
        if (!this.mainWindow && !this.setupCompleted) {
          app.quit();
        }
      });
    } catch (error) {
      log.error('Failed to create setup window:', error);
      throw error;
    }
  }

  private async createSettingsWindow(): Promise<void> {
    log.info('Creating settings window...');
    try {
      const settingsWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        resizable: true,
        maximizable: true,
        minimizable: true,
        webPreferences: {
          preload: path.join(__dirname, '../preload/index.js'),
          contextIsolation: true,
          nodeIntegration: false
        },
        title: 'OpenClaw Settings',
        icon: this.getIconPath(),
        parent: this.mainWindow || undefined
      });

      const settingsHtmlPath = path.join(__dirname, '../renderer/settings/index.html');
      log.info(`Loading settings HTML from: ${settingsHtmlPath}`);
      await settingsWindow.loadFile(settingsHtmlPath);
      log.info('Settings window loaded successfully');

      settingsWindow.on('closed', () => {
        // Window closed, no cleanup needed
      });
    } catch (error) {
      log.error('Failed to create settings window:', error);
    }
  }

  private async createInstallWindow(): Promise<void> {
    this.installWindow = new BrowserWindow({
      width: 600,
      height: 500,
      resizable: true,
      maximizable: true,
      minimizable: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      title: 'Install OpenClaw',
      icon: this.getIconPath()
    });

    const installHtmlPath = path.join(__dirname, '../renderer/install/index.html');
    await this.installWindow.loadFile(installHtmlPath);

    this.installWindow.on('closed', () => {
      this.installWindow = null;
      // If install was cancelled (no other window and install not completed), quit app
      if (!this.mainWindow && !this.setupWindow && !this.installCompleted) {
        app.quit();
      }
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
        devTools: true
      },
      title: 'OpenClaw',
      icon: this.getIconPath(),
      show: false // Show when ready
    });

    // Configure webRequest to strip CSP headers that prevent framing
    this.configureGatewayCSP(gatewayPort);

    // Inject gateway info BEFORE loading the page
    // This ensures window.__OPENCLAW_* variables are available immediately
    this.mainWindow.webContents.on('dom-ready', () => {
      this.mainWindow?.webContents.executeJavaScript(`
        window.__OPENCLAW_GATEWAY_PORT__ = ${gatewayPort};
        window.__OPENCLAW_GATEWAY_TOKEN__ = ${JSON.stringify(this.gatewayManager.getStatus().token || null)};
        window.__OPENCLAW_CONFIG__ = ${JSON.stringify(this.configManager.getConfig())};
        console.log('[OpenClaw Desktop] Gateway config injected:', {
          port: window.__OPENCLAW_GATEWAY_PORT__,
          hasToken: !!window.__OPENCLAW_GATEWAY_TOKEN__
        });
      `);
    });

    // Load the terminal UI
    const terminalHtmlPath = path.join(__dirname, '../renderer/terminal/index.html');
    log.info(`Loading terminal from: ${terminalHtmlPath}`);

    try {
      await this.mainWindow.loadFile(terminalHtmlPath);
      log.info('Terminal HTML loaded successfully');
    } catch (error) {
      log.error('Failed to load terminal HTML:', error);
      // Try to show window anyway
      this.mainWindow.show();
      return;
    }

    this.mainWindow.once('ready-to-show', () => {
      log.info('Main window ready to show');
      this.mainWindow?.show();
      this.mainWindow?.webContents.openDevTools();
    });

    // Fallback: show window after a timeout even if ready-to-show didn't fire
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
   * The gateway sends frame-ancestors 'none' which prevents embedding in our iframe.
   */
  private configureGatewayCSP(gatewayPort: number): void {
    if (!this.mainWindow) return;

    const { session } = this.mainWindow.webContents;

    session.webRequest.onHeadersReceived({
      urls: [`http://127.0.0.1:${gatewayPort}/*`]
    }, (details, callback) => {
      const responseHeaders = details.responseHeaders || {};

      // Remove or modify CSP headers that prevent framing
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

  private async startGatewayAndShowMain(): Promise<void> {
    try {
      const port = await this.gatewayManager.start();
      log.info(`Gateway started on port ${port}`);
      await this.createMainWindow(port);
    } catch (error) {
      log.error('Failed to start gateway:', error);
      // Show error dialog or retry
      throw error;
    }
  }

  private createTray(): void {
    // Use a placeholder icon - replace with actual icon
    const iconPath = this.getIconPath();
    this.tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show OpenClaw',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
          } else if (this.setupWindow) {
            this.setupWindow.show();
          }
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
      if (this.mainWindow) {
        this.mainWindow.show();
      }
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
            click: async () => {
              await this.createSettingsWindow();
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
    // Return platform-specific icon path
    const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    return path.join(__dirname, '../../build', iconName);
  }

  private handleWindowAllClosed(): void {
    // Quit app when all windows are closed (on all platforms)
    app.quit();
  }

  private async handleActivate(): Promise<void> {
    if (this.mainWindow === null && this.setupWindow === null) {
      const config = this.configManager.getConfig();
      if (config.settings.model) {
        await this.startGatewayAndShowMain();
      } else {
        await this.createSetupWindow();
      }
    }
  }

  private async handleBeforeQuit(): Promise<void> {
    log.info('App quitting - gateway will continue running in background');
    // Note: We intentionally do NOT stop the gateway here
    // The gateway continues running after the app closes
  }
}

// Initialize app
const openClawApp = new OpenClawApp();
openClawApp.initialize().catch((error) => {
  log.error('Failed to initialize app:', error);
  app.quit();
});
