// Setup wizard logic
import { ModelConfig } from '../../shared/types';

// Expose functions to window for HTML onclick handlers
declare global {
  interface Window {
    nextStep: () => void;
    prevStep: () => void;
    selectModel: (modelId: string) => void;
    completeSetup: () => void;
    togglePasswordVisibility: () => void;
    openProviderLink: (url: string) => void;
  }
}

const PRESET_MODELS: ModelConfig[] = [
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

const PROVIDER_LINKS: Record<string, { url: string; name: string }> = {
  anthropic: { url: "https://console.anthropic.com/", name: "Anthropic Console" },
  openai: { url: "https://platform.openai.com/api-keys", name: "OpenAI Platform" },
  google: { url: "https://makersuite.google.com/app/apikey", name: "Google AI Studio" },
  deepseek: { url: "https://platform.deepseek.com/api_keys", name: "DeepSeek Platform" },
  alibaba: { url: "https://dashscope.aliyun.com/", name: "Alibaba DashScope" },
  tencent: { url: "https://console.cloud.tencent.com/hunyuan", name: "Tencent Hunyuan" },
  baidu: { url: "https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application", name: "Baidu Qianfan" },
  bytedance: { url: "https://console.volcengine.com/ark/", name: "VolcEngine Ark" },
  custom: { url: "", name: "Your Provider" }
};

let currentStep = 0;
const steps = ['welcome', 'model', 'apikey', 'confirm'];
let selectedModel: ModelConfig | null = null;
let apiKey = '';

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  // Expose functions to window for HTML onclick handlers
  window.nextStep = nextStep;
  window.prevStep = prevStep;
  window.selectModel = selectModel;
  window.completeSetup = completeSetup;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.openProviderLink = openProviderLink;

  populateModelLists();
  setupEventListeners();
});

function populateModelLists() {
  const internationalModels = PRESET_MODELS.filter(m =>
    ['anthropic', 'openai', 'google'].includes(m.provider)
  );
  const chinaModels = PRESET_MODELS.filter(m =>
    ['deepseek', 'alibaba', 'tencent', 'baidu', 'bytedance'].includes(m.provider)
  );
  const customModel = PRESET_MODELS.find(m => m.provider === 'custom');

  const intlContainer = document.getElementById('international-models');
  const chinaContainer = document.getElementById('china-models');

  if (intlContainer) {
    intlContainer.innerHTML = internationalModels.map(model => createModelOption(model)).join('');
  }

  if (chinaContainer) {
    chinaContainer.innerHTML = chinaModels.map(model => createModelOption(model)).join('');
  }
}

function createModelOption(model: typeof PRESET_MODELS[0]) {
  return `
    <div class="model-option" data-model-id="${model.id}" onclick="selectModel('${model.id}')">
      <input type="radio" name="model" value="${model.id}" id="model-${model.id}">
      <div class="model-info">
        <span class="model-name">${model.name}</span>
        <span class="model-provider">${model.provider}</span>
      </div>
    </div>
  `;
}

function setupEventListeners() {
  // API key input - support both input and paste events
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', (e) => {
      apiKey = (e.target as HTMLInputElement).value.trim();
      updateButtonState();
    });

    // Handle keyboard paste (Ctrl+V / Cmd+V)
    apiKeyInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Let the default paste happen, then update state
        setTimeout(() => {
          apiKey = apiKeyInput.value.trim();
          updateButtonState();
        }, 0);
      }
    });

    // Also try the paste event
    apiKeyInput.addEventListener('paste', (e) => {
      // Don't prevent default - let the browser handle it
      setTimeout(() => {
        apiKey = apiKeyInput.value.trim();
        updateButtonState();
      }, 0);
    });
  }

  // Custom model inputs
  const customModelId = document.getElementById('custom-model-id') as HTMLInputElement;
  const customBaseUrl = document.getElementById('custom-base-url') as HTMLInputElement;

  customModelId?.addEventListener('input', updateCustomModel);
  customBaseUrl?.addEventListener('input', updateCustomModel);
}

function selectModel(modelId: string) {
  // Update UI
  document.querySelectorAll('.model-option').forEach(el => {
    el.classList.remove('selected');
  });
  document.querySelector(`[data-model-id="${modelId}"]`)?.classList.add('selected');

  // Update selected model
  selectedModel = PRESET_MODELS.find(m => m.id === modelId) || null;

  // Show/hide custom model section
  const customSection = document.getElementById('custom-model-section');
  if (customSection) {
    customSection.style.display = modelId === 'custom' ? 'block' : 'none';
  }

  updateButtonState();
}

function updateCustomModel() {
  if (selectedModel?.id !== 'custom') return;

  const modelId = (document.getElementById('custom-model-id') as HTMLInputElement)?.value.trim();
  const baseUrl = (document.getElementById('custom-base-url') as HTMLInputElement)?.value.trim();

  if (modelId) {
    selectedModel = {
      ...selectedModel,
      id: modelId,
      name: modelId,
      baseUrl: baseUrl || undefined
    };
  }

  updateButtonState();
}

function updateButtonState() {
  // Model step
  const modelNextBtn = document.getElementById('btn-model-next') as HTMLButtonElement;
  if (modelNextBtn) {
    modelNextBtn.disabled = !selectedModel || (selectedModel.id === 'custom' && !selectedModel.name);
  }

  // API key step
  const apiKeyNextBtn = document.getElementById('btn-apikey-next') as HTMLButtonElement;
  if (apiKeyNextBtn) {
    apiKeyNextBtn.disabled = !apiKey || apiKey.length < 10;
  }
}

function nextStep() {
  if (currentStep < steps.length - 1) {
    // Update step UI
    document.getElementById(`step-${steps[currentStep]}`)?.classList.remove('active');
    currentStep++;
    document.getElementById(`step-${steps[currentStep]}`)?.classList.add('active');

    // Update content for next step
    if (steps[currentStep] === 'apikey') {
      updateApiKeyStep();
    } else if (steps[currentStep] === 'confirm') {
      updateConfirmStep();
    }
  }
}

function prevStep() {
  if (currentStep > 0) {
    document.getElementById(`step-${steps[currentStep]}`)?.classList.remove('active');
    currentStep--;
    document.getElementById(`step-${steps[currentStep]}`)?.classList.add('active');
  }
}

function updateApiKeyStep() {
  const modelNameEl = document.getElementById('selected-model-name');
  if (modelNameEl && selectedModel) {
    modelNameEl.textContent = selectedModel.name;
  }

  // Update provider links
  const linksContainer = document.getElementById('provider-links');
  if (linksContainer && selectedModel) {
    const provider = PROVIDER_LINKS[selectedModel.provider];
    if (provider?.url) {
      linksContainer.innerHTML = `
        <p>Don't have an API key?</p>
        <a href="#" onclick="openProviderLink('${provider.url}'); return false;">
          Get one from ${provider.name} →
        </a>
      `;
    } else {
      linksContainer.innerHTML = '';
    }
  }

  // Update help text based on provider
  const helpText = document.getElementById('api-key-help');
  if (helpText && selectedModel) {
    const providerNames: Record<string, string> = {
      anthropic: 'Anthropic',
      openai: 'OpenAI',
      google: 'Google AI',
      deepseek: 'DeepSeek',
      alibaba: 'Alibaba DashScope',
      tencent: 'Tencent Cloud',
      baidu: 'Baidu Qianfan',
      bytedance: 'VolcEngine',
      custom: 'your provider'
    };
    helpText.textContent = `Enter your ${providerNames[selectedModel.provider] || selectedModel.provider} API key. It will be stored securely on your local machine.`;
  }
}

function updateConfirmStep() {
  const confirmModel = document.getElementById('confirm-model');
  const confirmProvider = document.getElementById('confirm-provider');

  if (confirmModel && selectedModel) {
    confirmModel.textContent = selectedModel.name;
  }
  if (confirmProvider && selectedModel) {
    confirmProvider.textContent = selectedModel.provider;
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById('api-key') as HTMLInputElement;
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

function openProviderLink(url: string) {
  window.electronAPI.openExternal(url);
}

async function completeSetup() {
  const launchBtn = document.getElementById('btn-launch') as HTMLButtonElement;
  if (launchBtn) {
    launchBtn.disabled = true;
    launchBtn.textContent = 'Launching...';
  }

  if (!selectedModel || !apiKey) {
    alert('Please complete all steps');
    return;
  }

  try {
    const customModelId = (document.getElementById('custom-model-id') as HTMLInputElement)?.value.trim();
    const customBaseUrl = (document.getElementById('custom-base-url') as HTMLInputElement)?.value.trim();

    const modelConfig = {
      ...selectedModel,
      id: selectedModel.id === 'custom' ? (customModelId || 'custom') : selectedModel.id,
      baseUrl: selectedModel.id === 'custom' ? (customBaseUrl || undefined) : undefined
    };

    await window.electronAPI.completeSetup({
      model: modelConfig,
      apiKey: apiKey
    });
  } catch (error) {
    console.error('Setup failed:', error);
    alert('Setup failed: ' + (error as Error).message);

    if (launchBtn) {
      launchBtn.disabled = false;
      launchBtn.textContent = 'Launch OpenClaw';
    }
  }
}
