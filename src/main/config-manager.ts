import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as log from 'electron-log';
import { app } from 'electron';
import { OpenClawConfig, ModelConfig } from '../shared/types';

const CONFIG_FILE_NAME = 'config.yaml';
const DEFAULT_CONFIG_FILE_NAME = 'default-config.yaml';

export class ConfigManager {
  private config: OpenClawConfig | null = null;
  private configDir: string = '';
  private configPath: string = '';

  async initialize(): Promise<void> {
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
    } else {
      await this.createDefaultConfig();
    }
  }

  getConfig(): OpenClawConfig {
    if (!this.config) {
      throw new Error('Config not initialized');
    }
    return this.config;
  }

  async setModel(model: ModelConfig): Promise<void> {
    if (!this.config) {
      throw new Error('Config not initialized');
    }

    this.config.settings.model = model;
    await this.saveConfig();
    log.info(`Model updated to: ${model.name}`);
  }

  async setApiKey(apiKey: string): Promise<void> {
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

  private async loadConfig(): Promise<void> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = yaml.load(content) as OpenClawConfig;
      log.info('Config loaded successfully');
    } catch (error) {
      log.error('Failed to load config:', error);
      // Create default config if loading fails
      await this.createDefaultConfig();
    }
  }

  private async createDefaultConfig(): Promise<void> {
    try {
      // Load default config from resources
      const defaultConfigPath = this.getDefaultConfigPath();
      const content = await fs.readFile(defaultConfigPath, 'utf-8');
      this.config = yaml.load(content) as OpenClawConfig;

      // Save to user config location
      await this.saveConfig();
      log.info('Default config created');
    } catch (error) {
      log.error('Failed to create default config:', error);
      // Fallback to hardcoded default
      this.config = this.getHardcodedDefaultConfig();
      await this.saveConfig();
    }
  }

  private async saveConfig(): Promise<void> {
    if (!this.config) return;

    const content = yaml.dump(this.config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });

    await fs.writeFile(this.configPath, content, 'utf-8');
  }

  private getConfigDirectory(): string {
    const platform = process.platform;
    const homeDir = app.getPath('home');

    switch (platform) {
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'OpenClaw');
      case 'win32':
        return path.join(app.getPath('appData'), 'OpenClaw');
      case 'linux':
      default:
        return path.join(homeDir, '.config', 'OpenClaw');
    }
  }

  private getDefaultConfigPath(): string {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      return path.join(__dirname, '../../resources', DEFAULT_CONFIG_FILE_NAME);
    }

    const exePath = app.getPath('exe');
    return path.join(path.dirname(exePath), 'resources', DEFAULT_CONFIG_FILE_NAME);
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getHardcodedDefaultConfig(): OpenClawConfig {
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
