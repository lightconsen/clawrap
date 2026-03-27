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
}

export interface OpenClawConfig {
  version: string;
  settings: {
    gateway: GatewayConfig;
    skills: SkillConfig;
    tools: ToolConfig;
    bypass_channels: BypassChannel[];
    model: ModelConfig | null;
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
