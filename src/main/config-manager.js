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
exports.ConfigManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const log = __importStar(require("electron-log"));
const electron_1 = require("electron");
const CONFIG_FILE_NAME = 'config.yaml';
const DEFAULT_CONFIG_FILE_NAME = 'default-config.yaml';
class ConfigManager {
    config = null;
    configDir = '';
    configPath = '';
    async initialize() {
        this.configDir = this.getConfigDirectory();
        this.configPath = path.join(this.configDir, CONFIG_FILE_NAME);
        log.info(`Config directory: ${this.configDir}`);
        log.info(`Config path: ${this.configPath}`);
        // Ensure config directory exists
        await this.ensureDirectoryExists(this.configDir);
        // Load or create config
        const exists = await this.fileExists(this.configPath);
        if (exists) {
            await this.loadConfig();
        }
        else {
            await this.createDefaultConfig();
        }
    }
    getConfig() {
        if (!this.config) {
            throw new Error('Config not initialized');
        }
        return this.config;
    }
    async setModel(model) {
        if (!this.config) {
            throw new Error('Config not initialized');
        }
        this.config.settings.model = model;
        await this.saveConfig();
        log.info(`Model updated to: ${model.name}`);
    }
    async setApiKey(apiKey) {
        if (!this.config) {
            throw new Error('Config not initialized');
        }
        // In a production app, you might want to use the OS keychain
        // For now, we store in config file (not recommended for production)
        if (this.config.settings.model) {
            this.config.settings.model.apiKey = apiKey;
            await this.saveConfig();
            log.info('API key updated');
        }
    }
    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            this.config = yaml.load(content);
            log.info('Config loaded successfully');
        }
        catch (error) {
            log.error('Failed to load config:', error);
            // Create default config if loading fails
            await this.createDefaultConfig();
        }
    }
    async createDefaultConfig() {
        try {
            // Load default config from resources
            const defaultConfigPath = this.getDefaultConfigPath();
            const content = await fs.readFile(defaultConfigPath, 'utf-8');
            this.config = yaml.load(content);
            // Save to user config location
            await this.saveConfig();
            log.info('Default config created');
        }
        catch (error) {
            log.error('Failed to create default config:', error);
            // Fallback to hardcoded default
            this.config = this.getHardcodedDefaultConfig();
            await this.saveConfig();
        }
    }
    async saveConfig() {
        if (!this.config)
            return;
        const content = yaml.dump(this.config, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
        });
        await fs.writeFile(this.configPath, content, 'utf-8');
    }
    getConfigDirectory() {
        const platform = process.platform;
        const homeDir = electron_1.app.getPath('home');
        switch (platform) {
            case 'darwin':
                return path.join(homeDir, 'Library', 'Application Support', 'OpenClaw');
            case 'win32':
                return path.join(electron_1.app.getPath('appData'), 'OpenClaw');
            case 'linux':
            default:
                return path.join(homeDir, '.config', 'OpenClaw');
        }
    }
    getDefaultConfigPath() {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
            return path.join(__dirname, '../../resources', DEFAULT_CONFIG_FILE_NAME);
        }
        const exePath = electron_1.app.getPath('exe');
        return path.join(path.dirname(exePath), 'resources', DEFAULT_CONFIG_FILE_NAME);
    }
    async ensureDirectoryExists(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        }
        catch (error) {
            // Directory might already exist
        }
    }
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    getHardcodedDefaultConfig() {
        return {
            version: '1.0',
            settings: {
                gateway: {
                    port: 0,
                    host: '127.0.0.1'
                },
                skills: {
                    enabled: [
                        'everything-claude-code:plan',
                        'everything-claude-code:tdd',
                        'everything-claude-code:e2e',
                        'everything-claude-code:python-review',
                        'everything-claude-code:go-review',
                        'everything-claude-code:security-reviewer'
                    ]
                },
                tools: {
                    enabled: [
                        'Read',
                        'Write',
                        'Edit',
                        'Bash',
                        'Grep',
                        'Glob',
                        'Task'
                    ]
                },
                bypass_channels: [
                    {
                        type: 'claude_code',
                        enabled: true
                    }
                ],
                model: null
            }
        };
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config-manager.js.map