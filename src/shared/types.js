"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESET_MODELS = void 0;
exports.PRESET_MODELS = [
    // International Models
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5 (Anthropic)", provider: "anthropic" },
    { id: "claude-opus-4-5", name: "Claude Opus 4.5 (Anthropic)", provider: "anthropic" },
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
    { id: "custom", name: "Custom Model (Other)", provider: "custom" }
];
//# sourceMappingURL=types.js.map