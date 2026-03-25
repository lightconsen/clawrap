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

    // Also update OpenClaw's native config
    await this.updateOpenClawConfig(model, null);
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

      // Also update OpenClaw's native config
      await this.updateOpenClawConfig(this.config.settings.model, apiKey);
    }
  }

  /**
   * Update OpenClaw's native config file (~/.openclaw/openclaw.json)
   * This is required for the gateway to use the correct model and API key
   */
  private async updateOpenClawConfig(model: ModelConfig, apiKey: string | null): Promise<void> {
    try {
      const openclawDir = path.join(process.env.HOME || '', '.openclaw');
      const openclawConfigPath = path.join(openclawDir, 'openclaw.json');

      // Ensure directory exists
      await this.ensureDirectoryExists(openclawDir);

      // Load existing OpenClaw config or create new one
      let openclawConfig: any = {};
      try {
        const content = await fs.readFile(openclawConfigPath, 'utf-8');
        openclawConfig = JSON.parse(content);
      } catch {
        // File doesn't exist or is invalid, start fresh
        openclawConfig = {
          meta: {
            lastTouchedVersion: '1.0.0',
            lastTouchedAt: new Date().toISOString()
          }
        };
      }

      // Map our model config to OpenClaw's format
      const providerMapping: Record<string, string> = {
        'anthropic': 'anthropic',
        'openai': 'openai',
        'google': 'google',
        'deepseek': 'deepseek',
        'alibaba': 'bailian',
        'tencent': 'tencent',
        'baidu': 'baidu',
        'bytedance': 'bytedance'
      };

      const openclawProvider = providerMapping[model.provider] || model.provider;

      // Update agents.defaults.model
      if (!openclawConfig.agents) {
        openclawConfig.agents = { defaults: {} };
      }
      if (!openclawConfig.agents.defaults) {
        openclawConfig.agents.defaults = {};
      }

      openclawConfig.agents.defaults.model = {
        primary: `${openclawProvider}/${model.id}`
      };

      // Update models configuration
      if (!openclawConfig.models) {
        openclawConfig.models = { mode: 'merge', providers: {} };
      }
      if (!openclawConfig.models.providers) {
        openclawConfig.models.providers = {};
      }

      // Set up provider config with API key
      const providerConfig: any = {
        apiKey: apiKey || model.apiKey || '',
        models: [{
          id: model.id,
          name: model.name,
          api: 'openai-completions'
        }]
      };

      // Add baseUrl for specific providers
      const baseUrls: Record<string, string> = {
        'deepseek': 'https://api.deepseek.com/v1',
        'alibaba': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        'bailian': 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      };

      if (baseUrls[openclawProvider]) {
        providerConfig.baseUrl = baseUrls[openclawProvider];
      }

      openclawConfig.models.providers[openclawProvider] = providerConfig;

      // Save OpenClaw config
      await fs.writeFile(openclawConfigPath, JSON.stringify(openclawConfig, null, 2), 'utf-8');
      log.info(`OpenClaw config updated with model: ${openclawProvider}/${model.id}`);
    } catch (error) {
      log.error('Failed to update OpenClaw config:', error);
      // Don't throw - the local config is still saved
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
