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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const log = __importStar(require("electron-log"));
const gateway_manager_1 = require("./gateway-manager");
const config_manager_1 = require("./config-manager");
const auto_updater_1 = require("./auto-updater");
const isDev = process.env.NODE_ENV === 'development';
class OpenClawApp {
    mainWindow = null;
    setupWindow = null;
    installWindow = null;
    tray = null;
    gatewayManager;
    configManager;
    constructor() {
        this.configManager = new config_manager_1.ConfigManager();
        this.gatewayManager = new gateway_manager_1.GatewayManager();
        this.setupIpcHandlers();
    }
    async initialize() {
        log.info('Initializing OpenClaw Desktop...');
        await electron_1.app.whenReady();
        // Initialize config
        await this.configManager.initialize();
        // Create tray
        this.createTray();
        // Create application menu
        this.createApplicationMenu();
        // Initialize auto-updater
        (0, auto_updater_1.initializeAutoUpdater)();
        // Check for updates (only in production)
        if (!isDev) {
            setTimeout(() => (0, auto_updater_1.checkForUpdates)(), 5000);
        }
        // Check if OpenClaw is installed
        const installCheck = await this.gatewayManager.checkInstallation();
        if (!installCheck.installed) {
            // OpenClaw not installed - show installation window
            await this.createInstallWindow();
        }
        else {
            log.info(`OpenClaw found at: ${installCheck.path}, version: ${installCheck.version || 'unknown'}`);
            // Check if first run (no model configured)
            const config = this.configManager.getConfig();
            if (!config.settings.model) {
                // First run - show setup wizard
                await this.createSetupWindow();
            }
            else {
                // Normal run - start gateway and show main window
                await this.startGatewayAndShowMain();
            }
        }
        // App event handlers
        electron_1.app.on('window-all-closed', this.handleWindowAllClosed.bind(this));
        electron_1.app.on('activate', this.handleActivate.bind(this));
        electron_1.app.on('before-quit', this.handleBeforeQuit.bind(this));
    }
    setupIpcHandlers() {
        // Config IPC
        electron_1.ipcMain.handle('config:get', () => {
            return this.configManager.getConfig();
        });
        electron_1.ipcMain.handle('config:setModel', async (_event, model) => {
            await this.configManager.setModel(model);
            return true;
        });
        electron_1.ipcMain.handle('config:setApiKey', async (_event, apiKey) => {
            await this.configManager.setApiKey(apiKey);
            return true;
        });
        // Gateway IPC
        electron_1.ipcMain.handle('gateway:status', () => {
            return this.gatewayManager.getStatus();
        });
        electron_1.ipcMain.handle('gateway:restart', async () => {
            await this.gatewayManager.restart();
            return this.gatewayManager.getStatus();
        });
        // Installation IPC
        electron_1.ipcMain.handle('install:check', async () => {
            return this.gatewayManager.checkInstallation();
        });
        electron_1.ipcMain.handle('install:install', async () => {
            try {
                await this.gatewayManager.install();
                return { success: true };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
        electron_1.ipcMain.handle('install:complete', async () => {
            // Close install window and proceed to setup or main
            if (this.installWindow) {
                this.installWindow.close();
                this.installWindow = null;
            }
            const config = this.configManager.getConfig();
            if (!config.settings.model) {
                await this.createSetupWindow();
            }
            else {
                await this.startGatewayAndShowMain();
            }
            return true;
        });
        // Setup IPC
        electron_1.ipcMain.handle('setup:complete', async (_event, config) => {
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
        electron_1.ipcMain.handle('setup:cancel', () => {
            electron_1.app.quit();
        });
        // External links
        electron_1.ipcMain.handle('shell:openExternal', (_event, url) => {
            electron_1.shell.openExternal(url);
        });
    }
    async createSetupWindow() {
        this.setupWindow = new electron_1.BrowserWindow({
            width: 600,
            height: 500,
            resizable: false,
            maximizable: false,
            minimizable: false,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                contextIsolation: true,
                nodeIntegration: false
            },
            title: 'OpenClaw Setup',
            icon: this.getIconPath()
        });
        const setupHtmlPath = path.join(__dirname, '../renderer/setup/index.html');
        await this.setupWindow.loadFile(setupHtmlPath);
        if (isDev) {
            this.setupWindow.webContents.openDevTools();
        }
        this.setupWindow.on('closed', () => {
            this.setupWindow = null;
            // If setup was cancelled (no main window), quit app
            if (!this.mainWindow) {
                electron_1.app.quit();
            }
        });
    }
    async createInstallWindow() {
        this.installWindow = new electron_1.BrowserWindow({
            width: 600,
            height: 500,
            resizable: false,
            maximizable: false,
            minimizable: false,
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
        if (isDev) {
            this.installWindow.webContents.openDevTools();
        }
        this.installWindow.on('closed', () => {
            this.installWindow = null;
            // If install was cancelled (no other window), quit app
            if (!this.mainWindow && !this.setupWindow) {
                electron_1.app.quit();
            }
        });
    }
    async createMainWindow(gatewayPort) {
        this.mainWindow = new electron_1.BrowserWindow({
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
        // Load the terminal UI
        // In production, this would be the actual OpenClaw web terminal
        // For now, we create a simple wrapper that loads the local gateway
        const terminalHtmlPath = path.join(__dirname, '../renderer/terminal/index.html');
        await this.mainWindow.loadFile(terminalHtmlPath);
        // Inject gateway port into the window
        this.mainWindow.webContents.executeJavaScript(`
      window.__OPENCLAW_GATEWAY_PORT__ = ${gatewayPort};
      window.__OPENCLAW_CONFIG__ = ${JSON.stringify(this.configManager.getConfig())};
    `);
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });
        if (isDev) {
            this.mainWindow.webContents.openDevTools();
        }
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        });
    }
    async startGatewayAndShowMain() {
        try {
            const port = await this.gatewayManager.start();
            log.info(`Gateway started on port ${port}`);
            await this.createMainWindow(port);
        }
        catch (error) {
            log.error('Failed to start gateway:', error);
            // Show error dialog or retry
            throw error;
        }
    }
    createTray() {
        // Use a placeholder icon - replace with actual icon
        const iconPath = this.getIconPath();
        this.tray = new electron_1.Tray(iconPath);
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Show OpenClaw',
                click: () => {
                    if (this.mainWindow) {
                        this.mainWindow.show();
                    }
                    else if (this.setupWindow) {
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
                    (0, auto_updater_1.checkForUpdates)();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    electron_1.app.quit();
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
    createApplicationMenu() {
        const template = [
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
                            (0, auto_updater_1.checkForUpdates)();
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
                            electron_1.app.quit();
                        }
                    }
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
                            electron_1.shell.openExternal('https://github.com/openclaw/desktop');
                        }
                    },
                    {
                        label: 'Report Issue',
                        click: () => {
                            electron_1.shell.openExternal('https://github.com/openclaw/desktop/issues');
                        }
                    }
                ]
            }
        ];
        const menu = electron_1.Menu.buildFromTemplate(template);
        electron_1.Menu.setApplicationMenu(menu);
    }
    getIconPath() {
        // Return platform-specific icon path
        const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
        return path.join(__dirname, '../../build', iconName);
    }
    handleWindowAllClosed() {
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    }
    async handleActivate() {
        if (this.mainWindow === null && this.setupWindow === null) {
            const config = this.configManager.getConfig();
            if (config.settings.model) {
                await this.startGatewayAndShowMain();
            }
            else {
                await this.createSetupWindow();
            }
        }
    }
    async handleBeforeQuit() {
        log.info('Shutting down...');
        await this.gatewayManager.stop();
    }
}
// Initialize app
const openClawApp = new OpenClawApp();
openClawApp.initialize().catch((error) => {
    log.error('Failed to initialize app:', error);
    electron_1.app.quit();
});
//# sourceMappingURL=index.js.map