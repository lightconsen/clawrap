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

    ipcMain.handle('config:setApiKey', async (_event, apiKey: string) => {
      await this.configManager.setApiKey(apiKey);
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

    // Open settings window
    ipcMain.handle('app:openSettings', () => {
      this.createSettingsWindow();
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
        additionalArguments: [`--gateway-port=${gatewayPort}`]
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
            label: 'Preferences...',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              // Show preferences window
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

  private async createSettingsWindow(): Promise<void> {
    const settingsWindow = new BrowserWindow({
      width: 700,
      height: 500,
      minWidth: 600,
      minHeight: 400,
      maximizable: true,
      minimizable: true,
      parent: this.mainWindow || undefined,
      modal: false,
      title: 'Settings',
      icon: this.getIconPath(),
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const config = this.configManager.getConfig();
    const status = this.gatewayManager.getStatus();
    const installCheck = await this.gatewayManager.checkInstallation();

    settingsWindow.loadURL(`data:text/html,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d1117;
            color: #e6edf3;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .header {
            background: #161b22;
            border-bottom: 1px solid #30363d;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .header h1 {
            font-size: 18px;
            color: #f0f6fc;
            font-weight: 600;
          }
          .close-btn {
            background: none;
            border: none;
            color: #8b949e;
            font-size: 20px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
          }
          .close-btn:hover {
            color: #e6edf3;
            background: #30363d;
          }
          .tabs-container {
            display: flex;
            background: #161b22;
            border-bottom: 1px solid #30363d;
            padding: 0 20px;
          }
          .tab {
            padding: 12px 20px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: #8b949e;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
            background: none;
            border-top: none;
            border-left: none;
            border-right: none;
          }
          .tab:hover {
            color: #e6edf3;
          }
          .tab.active {
            color: #58a6ff;
            border-bottom-color: #58a6ff;
          }
          .content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
          }
          .tab-content {
            display: none;
          }
          .tab-content.active {
            display: block;
          }
          .section-title {
            font-size: 14px;
            font-weight: 600;
            color: #f0f6fc;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #30363d;
          }
          .setting-item {
            margin-bottom: 16px;
            padding: 16px;
            background: #161b22;
            border-radius: 8px;
            border: 1px solid #30363d;
          }
          .setting-label {
            font-size: 12px;
            color: #8b949e;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .setting-value {
            font-size: 14px;
            color: #e6edf3;
            font-family: 'SF Mono', Monaco, monospace;
          }
          .setting-row {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
          }
          .setting-row .setting-item {
            flex: 1;
            min-width: 200px;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }
          .status-badge.running {
            background: #238636;
            color: white;
          }
          .status-badge.stopped {
            background: #f85149;
            color: white;
          }
          .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
          }
          .btn {
            padding: 8px 16px;
            background: #238636;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: background 0.2s;
            margin-right: 8px;
            margin-top: 8px;
          }
          .btn:hover {
            background: #2ea043;
          }
          .btn.secondary {
            background: #21262d;
            border: 1px solid #30363d;
          }
          .btn.secondary:hover {
            background: #30363d;
          }
          .btn.danger {
            background: #da3633;
          }
          .btn.danger:hover {
            background: #f85149;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }
          .model-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 16px;
          }
          .model-name {
            font-size: 14px;
            font-weight: 600;
            color: #f0f6fc;
            margin-bottom: 4px;
          }
          .model-provider {
            font-size: 12px;
            color: #8b949e;
          }
          .channel-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .channel-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
          }
          .channel-name {
            font-size: 13px;
            color: #e6edf3;
          }
          .channel-status {
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 10px;
            background: #238636;
            color: white;
          }
          .empty-state {
            text-align: center;
            padding: 40px;
            color: #8b949e;
          }
          .empty-state {
            text-align: center;
            padding: 40px;
            color: #8b949e;
          }
          .log-output {
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 12px;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 12px;
            color: #8b949e;
            max-height: 150px;
            overflow-y: auto;
            margin-top: 12px;
          }
          .skills-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .skill-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            transition: border-color 0.2s;
          }
          .skill-item:hover {
            border-color: #58a6ff;
          }
          .skill-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .skill-name {
            font-size: 13px;
            color: #e6edf3;
            font-weight: 500;
          }
          .skill-description {
            font-size: 11px;
            color: #8b949e;
          }
          .toggle-switch {
            position: relative;
            width: 44px;
            height: 24px;
            background: #21262d;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.2s;
            border: 1px solid #30363d;
          }
          .toggle-switch.enabled {
            background: #238636;
            border-color: #238636;
          }
          .toggle-switch::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 18px;
            height: 18px;
            background: #e6edf3;
            border-radius: 50%;
            transition: transform 0.2s;
          }
          .toggle-switch.enabled::after {
            transform: translateX(20px);
          }
          .tools-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .tool-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
          }
          .tool-name {
            font-size: 13px;
            color: #e6edf3;
            font-family: 'SF Mono', Monaco, monospace;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Settings</h1>
          <button class="close-btn" onclick="window.close()">&times;</button>
        </div>
        <div class="tabs-container">
          <button class="tab active" onclick="switchTab('overview')">Overview</button>
          <button class="tab" onclick="switchTab('model')">Model Settings</button>
          <button class="tab" onclick="switchTab('skills')">Skills</button>
          <button class="tab" onclick="switchTab('channels')">Channels</button>
          <button class="tab" onclick="switchTab('gateway')">Gateway Control</button>
        </div>
        <div class="content">
          <!-- Overview Tab -->
          <div id="overview" class="tab-content active">
            <div class="section-title">System Overview</div>
            <div class="info-grid">
              <div class="setting-item">
                <div class="setting-label">OpenClaw Desktop Version</div>
                <div class="setting-value">v1.0.1</div>
              </div>
              <div class="setting-item">
                <div class="setting-label">OpenClaw CLI Version</div>
                <div class="setting-value">${installCheck.version || 'Not installed'}</div>
              </div>
              <div class="setting-item">
                <div class="setting-label">Gateway Port</div>
                <div class="setting-value">${status.port || config.settings.gateway.port || 18789}</div>
              </div>
              <div class="setting-item">
                <div class="setting-label">Gateway Status</div>
                <span class="status-badge ${status.running ? 'running' : 'stopped'}">
                  <span class="status-dot"></span>
                  ${status.running ? 'Running' : 'Stopped'}
                </span>
              </div>
            </div>
            <div class="section-title" style="margin-top: 24px;">Configuration Paths</div>
            <div class="setting-item">
              <div class="setting-label">Config Directory</div>
              <div class="setting-value">${process.env.HOME || process.env.USERPROFILE}/.openclaw</div>
            </div>
          </div>

          <!-- Model Settings Tab -->
          <div id="model" class="tab-content">
            <div class="section-title">Current Model Configuration</div>
            ${config.settings.model ? `
            <div class="model-card">
              <div class="model-name">${config.settings.model.name}</div>
              <div class="model-provider">Provider: ${config.settings.model.provider}</div>
              <div class="model-provider">Model ID: ${config.settings.model.id}</div>
            </div>
            ` : '<div class="empty-state">No model configured. Please run setup to configure a model.</div>'}
            <div class="section-title" style="margin-top: 24px;">Available Presets</div>
            <div class="info-grid">
              <div class="model-card">
                <div class="model-name">Claude Sonnet 4.6</div>
                <div class="model-provider">Anthropic</div>
              </div>
              <div class="model-card">
                <div class="model-name">GPT-4o</div>
                <div class="model-provider">OpenAI</div>
              </div>
              <div class="model-card">
                <div class="model-name">DeepSeek-V3</div>
                <div class="model-provider">DeepSeek</div>
              </div>
              <div class="model-card">
                <div class="model-name">Gemini 2.5 Pro</div>
                <div class="model-provider">Google</div>
              </div>
            </div>
          </div>

          <!-- Channels Settings Tab -->
          <div id="channels" class="tab-content">
            <div class="section-title">Enabled Channels</div>
            <div class="channel-list">
              ${config.settings.bypass_channels && config.settings.bypass_channels.length > 0 ?
                config.settings.bypass_channels.map(ch => `
                  <div class="channel-item">
                    <span class="channel-name">${ch.type}</span>
                    <span class="channel-status">${ch.enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                `).join('')
                : '<div class="empty-state">No bypass channels configured</div>'
              }
            </div>
          </div>

          <!-- Skills Settings Tab -->
          <div id="skills" class="tab-content">
            <div class="section-title">Skills</div>
            <div class="skills-list">
              ${AVAILABLE_SKILLS.map(skill => {
                const isEnabled = (config.settings.skills?.enabled || []).includes(skill.id);
                return `
                  <div class="skill-item" data-skill-id="${skill.id}">
                    <div class="skill-info">
                      <span class="skill-name">${skill.name}</span>
                      <span class="skill-description">${skill.description}</span>
                    </div>
                    <div class="toggle-switch ${isEnabled ? 'enabled' : ''}" onclick="toggleSkill('${skill.id}', this)"></div>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="section-title" style="margin-top: 24px;">Tools</div>
            <div class="tools-list">
              ${['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Task'].map(tool => {
                const isEnabled = (config.settings.tools?.enabled || []).includes(tool);
                return `
                  <div class="tool-item">
                    <span class="tool-name">${tool}</span>
                    <div class="toggle-switch ${isEnabled ? 'enabled' : ''}" onclick="toggleTool('${tool}', this)"></div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Gateway Control Panel Tab -->
          <div id="gateway" class="tab-content">
            <div class="section-title">Gateway Control</div>
            <div class="setting-item">
              <div class="setting-label">Gateway Process</div>
              <div style="margin-top: 12px;">
                <button class="btn" onclick="alert('Restart gateway functionality would be implemented here')">Restart Gateway</button>
                <button class="btn secondary" onclick="alert('Stop gateway functionality would be implemented here')">Stop Gateway</button>
                <button class="btn danger" onclick="alert('Force kill functionality would be implemented here')">Force Kill</button>
              </div>
              <div class="log-output">
> Gateway PID: ${status.pid || 'N/A'}<br>
> Port: ${status.port || 'N/A'}<br>
> Token: ${status.token ? 'Configured' : 'Not set'}<br>
> Last checked: ${new Date().toLocaleTimeString()}
              </div>
            </div>
            <div class="section-title" style="margin-top: 24px;">Diagnostics</div>
            <div class="setting-row">
              <div class="setting-item" style="flex: 1;">
                <div class="setting-label">Installation Path</div>
                <div class="setting-value" style="font-size: 11px;">${installCheck.path || 'Not found'}</div>
              </div>
              <div class="setting-item" style="flex: 1;">
                <div class="setting-label">Node.js Version Check</div>
                <div class="setting-value">${installCheck.installed ? 'Pass' : 'Fail'}</div>
              </div>
            </div>
          </div>
        </div>
        <script>
          // Current state
          let enabledSkills = ${JSON.stringify(config.settings.skills?.enabled || [])};
          let enabledTools = ${JSON.stringify(config.settings.tools?.enabled || [])};

          function switchTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
              content.classList.remove('active');
            });
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
              tab.classList.remove('active');
            });
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            // Add active class to clicked tab
            event.target.classList.add('active');
          }

          function toggleSkill(skillId, toggleEl) {
            const isEnabled = enabledSkills.includes(skillId);
            if (isEnabled) {
              enabledSkills = enabledSkills.filter(id => id !== skillId);
              toggleEl.classList.remove('enabled');
            } else {
              enabledSkills.push(skillId);
              toggleEl.classList.add('enabled');
            }
            // Save to config
            window.electronAPI.setSkills(enabledSkills);
          }

          function toggleTool(toolName, toggleEl) {
            const isEnabled = enabledTools.includes(toolName);
            if (isEnabled) {
              enabledTools = enabledTools.filter(name => name !== toolName);
              toggleEl.classList.remove('enabled');
            } else {
              enabledTools.push(toolName);
              toggleEl.classList.add('enabled');
            }
            // Save to config
            window.electronAPI.setTools(enabledTools);
          }
        </script>
      </body>
      </html>
    `)}`);

    settingsWindow.once('ready-to-show', () => {
      settingsWindow.show();
    });
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
