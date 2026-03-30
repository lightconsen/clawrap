export interface GatewayConfig {
  port: number;
  host: string;
}

export interface SkillConfig {
  enabled: string[];
}

export interface ToolConfig {
  enabled: string[];
}

export interface BypassChannel {
  type: string;
  enabled: boolean;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  authMethod?: 'api_key' | 'oauth';  // Authentication method
}

export interface ProviderPreset {
  id: string;
  name: string;
  authMethods: ('api_key' | 'oauth')[];
  defaultAuthMethod: 'api_key' | 'oauth';
  models: { id: string; name: string }[];
  defaultBaseUrl?: string;
  description?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
    ],
    defaultBaseUrl: 'https://api.anthropic.com'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    authMethods: ['api_key', 'oauth'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'o1', name: 'o1' },
      { id: 'o1-mini', name: 'o1 Mini' }
    ],
    defaultBaseUrl: 'https://api.openai.com/v1'
  },
  {
    id: 'openai-codex',
    name: 'OpenAI Codex (ChatGPT OAuth)',
    authMethods: ['oauth'],
    defaultAuthMethod: 'oauth',
    models: [
      { id: 'codex-mini-latest', name: 'Codex Mini Latest' },
      { id: 'gpt-4o-canmore', name: 'GPT-4o Canmore' }
    ],
    defaultBaseUrl: 'https://chatgpt.com/backend-api'
  },
  {
    id: 'google',
    name: 'Google',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' }
    ],
    defaultBaseUrl: 'https://generativelanguage.googleapis.com'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1' }
    ],
    defaultBaseUrl: 'https://api.deepseek.com/v1'
  },
  {
    id: 'alibaba',
    name: 'Alibaba (DashScope)',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'qwen-max', name: 'Qwen Max' },
      { id: 'qwen-plus', name: 'Qwen Plus' },
      { id: 'qwen-turbo', name: 'Qwen Turbo' }
    ],
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  {
    id: 'tencent',
    name: 'Tencent (Hunyuan)',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'hunyuan-standard', name: 'Hunyuan Standard' },
      { id: 'hunyuan-pro', name: 'Hunyuan Pro' }
    ]
  },
  {
    id: 'baidu',
    name: 'Baidu (Qianfan)',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'ernie-4.0', name: 'ERNIE 4.0' },
      { id: 'ernie-3.5', name: 'ERNIE 3.5' }
    ],
    defaultBaseUrl: 'https://qianfan.baidubce.com/v2'
  },
  {
    id: 'bytedance',
    name: 'ByteDance (Doubao)',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'doubao-pro', name: 'Doubao Pro' },
      { id: 'doubao-lite', name: 'Doubao Lite' }
    ]
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'grok-2', name: 'Grok 2' },
      { id: 'grok-3', name: 'Grok 3' }
    ],
    defaultBaseUrl: 'https://api.x.ai/v1'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'mistral-large', name: 'Mistral Large' },
      { id: 'mistral-medium', name: 'Mistral Medium' },
      { id: 'mistral-small', name: 'Mistral Small' }
    ],
    defaultBaseUrl: 'https://api.mistral.ai/v1'
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'kimi-k2.5', name: 'Kimi K2.5' },
      { id: 'kimi-k2', name: 'Kimi K2' }
    ],
    defaultBaseUrl: 'https://api.moonshot.cn/v1'
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'minimax', name: 'MiniMax' }
    ],
    defaultBaseUrl: 'https://api.minimax.chat/v1'
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'ollama-default', name: 'Local Model' }
    ],
    defaultBaseUrl: 'http://localhost:11434/v1'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'openrouter-default', name: 'OpenRouter Models' }
    ],
    defaultBaseUrl: 'https://openrouter.ai/api/v1'
  },
  {
    id: 'together',
    name: 'Together AI',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'together-default', name: 'Together Models' }
    ],
    defaultBaseUrl: 'https://api.together.xyz/v1'
  },
  {
    id: 'vllm',
    name: 'vLLM',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'vllm-default', name: 'vLLM Models' }
    ],
    defaultBaseUrl: 'http://localhost:8000/v1'
  },
  {
    id: 'litellm',
    name: 'LiteLLM',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [
      { id: 'litellm-default', name: 'LiteLLM Proxy' }
    ],
    defaultBaseUrl: 'http://localhost:4000/v1'
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    authMethods: ['api_key'],
    defaultAuthMethod: 'api_key',
    models: [],
    description: 'Configure a custom OpenAI-compatible API endpoint'
  }
];

export interface OpenClawConfig {
  version: string;
  settings: {
    gateway: GatewayConfig;
    skills: SkillConfig;
    tools: ToolConfig;
    bypass_channels: BypassChannel[];
    model: ModelConfig | null;          // Primary model
    fallbackModel: ModelConfig | null;   // Fallback model
    imageModel: ModelConfig | null;      // Image-capable model
    savedModels: ModelConfig[];          // List of all saved models
    cronJobs?: CronJob[];                // Scheduled cron jobs
  };
}

export interface GatewayStatus {
  running: boolean;
  port?: number;
  pid?: number;
  token?: string;
  error?: string;
}

export interface NodeCheckResult {
  installed: boolean;
  version: string | null;
  majorVersion: number;
  isVersionValid: boolean;
  message: string;
}

export const PRESET_MODELS: ModelConfig[] = [
  // International Models
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (Anthropic)", provider: "anthropic" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6 (Anthropic)", provider: "anthropic" },
  { id: "gpt-4o", name: "GPT-4o (OpenAI)", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (OpenAI)", provider: "openai" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Google)", provider: "google" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Google)", provider: "google" },

  // China Models
  { id: "deepseek-chat", name: "DeepSeek-V3 (DeepSeek)", provider: "deepseek" },
  { id: "deepseek-reasoner", name: "DeepSeek-R1 (DeepSeek)", provider: "deepseek" },
  { id: "qwen-max", name: "Qwen Max (Alibaba)", provider: "alibaba" },
  { id: "qwen-plus", name: "Qwen Plus (Alibaba)", provider: "alibaba" },
  { id: "hunyuan-standard", name: "Hunyuan Standard (Tencent)", provider: "tencent" },
  { id: "hunyuan-pro", name: "Hunyuan Pro (Tencent)", provider: "tencent" },
  { id: "ernie-4.0", name: "ERNIE 4.0 (Baidu)", provider: "baidu" },
  { id: "doubao-pro", name: "Doubao Pro (ByteDance)", provider: "bytedance" },

  // Additional Providers from OpenClaw
  { id: "grok-2", name: "Grok 2 (xAI)", provider: "xai" },
  { id: "grok-3", name: "Grok 3 (xAI)", provider: "xai" },
  { id: "mistral-large", name: "Mistral Large (Mistral AI)", provider: "mistral" },
  { id: "mistral-medium", name: "Mistral Medium (Mistral AI)", provider: "mistral" },
  { id: "kimi-k2.5", name: "Kimi K2.5 (Moonshot)", provider: "moonshot" },
  { id: "minimax", name: "MiniMax (MiniMax)", provider: "minimax" },
  { id: "ollama-default", name: "Ollama (Local)", provider: "ollama" },
  { id: "openrouter-default", name: "OpenRouter", provider: "openrouter" },
  { id: "together-default", name: "Together AI", provider: "together" },
  { id: "sglang-default", name: "SGLang", provider: "sglang" },
  { id: "vllm-default", name: "vLLM", provider: "vllm" },
  { id: "litellm-default", name: "LiteLLM", provider: "litellm" },
  { id: "huggingface-default", name: "Hugging Face", provider: "huggingface" },
  { id: "vercel-default", name: "Vercel AI Gateway", provider: "vercel" },
  { id: "cloudflare-default", name: "Cloudflare AI Gateway", provider: "cloudflare" },
  { id: "kilo-default", name: "Kilo Gateway", provider: "kilo" },
  { id: "byteplus-default", name: "BytePlus", provider: "byteplus" },
  { id: "chutes-default", name: "Chutes", provider: "chutes" },
  { id: "copilot-default", name: "Copilot", provider: "copilot" },
  { id: "kimi-code", name: "Kimi Code", provider: "kimi" },
  { id: "opencode-default", name: "OpenCode", provider: "opencode" },
  { id: "qianfan-default", name: "Qianfan (Baidu)", provider: "qianfan" },
  { id: "alibaba-studio", name: "Qwen (Alibaba Cloud Model Studio)", provider: "alibaba-cloud" },
  { id: "venice-default", name: "Venice AI", provider: "venice" },
  { id: "volcano-default", name: "Volcano Engine", provider: "volcano" },
  { id: "xiaomi-default", name: "Xiaomi", provider: "xiaomi" },
  { id: "zai-default", name: "Z.AI", provider: "zai" },
  { id: "synthetic-default", name: "Synthetic", provider: "synthetic" },
  { id: "custom", name: "Custom Model (Other)", provider: "custom" }
];

export const AVAILABLE_SKILLS = [
  { id: "everything-claude-code:plan", name: "Plan", description: "Plan mode for architectural planning" },
  { id: "everything-claude-code:tdd", name: "TDD", description: "Test-driven development mode" },
  { id: "everything-claude-code:e2e", name: "E2E", description: "End-to-end testing mode" },
  { id: "everything-claude-code:python-review", name: "Python Review", description: "Python code review" },
  { id: "everything-claude-code:go-review", name: "Go Review", description: "Go code review" },
  { id: "everything-claude-code:security-reviewer", name: "Security Reviewer", description: "Security analysis" }
];

export interface CronJob {
  id: string;
  name: string;
  schedule: string;  // Cron expression (e.g., "0 9 * * *")
  command: string;
  enabled: boolean;
  lastRun?: number;  // Timestamp
  lastOutput?: string;
  lastError?: string;
  nextRun?: number;  // Timestamp
}

export interface CronLog {
  jobId: string;
  jobName: string;
  timestamp: number;
  output: string;
  error?: string;
  duration: number;  // milliseconds
  exitCode: number;
}
