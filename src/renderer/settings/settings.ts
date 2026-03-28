// Settings page logic
import { ModelConfig, PRESET_MODELS, OpenClawConfig, GatewayStatus } from '../../shared/types';

let config: OpenClawConfig | null = null;
let savedModels: ModelConfig[] = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  setupNavigation();
});

async function loadSettings() {
  try {
    config = await window.electronAPI.getConfig();
    savedModels = await window.electronAPI.getSavedModels();

    populateModelSelects();
    populateSavedModelsList();
    populateCurrentModels();
    populateGatewayStatus();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

function populateModelSelects() {
  const providers: Record<string, string> = {
    'anthropic': 'Anthropic',
    'openai': 'OpenAI',
    'google': 'Google',
    'deepseek': 'DeepSeek',
    'alibaba': 'Alibaba (DashScope)',
    'tencent': 'Tencent (Hunyuan)',
    'baidu': 'Baidu (Qianfan)',
    'bytedance': 'ByteDance (Doubao)',
    'xai': 'xAI (Grok)',
    'mistral': 'Mistral AI',
    'moonshot': 'Moonshot (Kimi)',
    'minimax': 'MiniMax',
    'ollama': 'Ollama (Local)',
    'openrouter': 'OpenRouter',
    'together': 'Together AI',
    'vllm': 'vLLM',
    'litellm': 'LiteLLM',
    'custom': 'Custom'
  };

  const selects = ['primary-model', 'fallback-model', 'image-model'];

  selects.forEach(selectId => {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (select) {
      // Keep the first option (placeholder)
      const firstOption = select.firstElementChild;
      select.innerHTML = '';
      if (firstOption) select.appendChild(firstOption);

      // Add preset models grouped by provider
      let currentProvider = '';
      PRESET_MODELS.forEach(model => {
        if (model.provider !== currentProvider) {
          if (currentProvider !== '') {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────';
            select.appendChild(separator);
          }
          currentProvider = model.provider;
        }

        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        option.dataset.provider = model.provider;
        select.appendChild(option);
      });

      // Add saved models that aren't in presets
      savedModels.forEach(model => {
        const exists = PRESET_MODELS.some(m => m.id === model.id);
        if (!exists) {
          const option = document.createElement('option');
          option.value = model.id;
          option.textContent = model.name;
          option.dataset.provider = model.provider;
          select.appendChild(option);
        }
      });
    }
  });
}

function populateCurrentModels() {
  if (!config) return;

  // Primary model
  const primarySelect = document.getElementById('primary-model') as HTMLSelectElement;
  const primaryApiKey = document.getElementById('primary-api-key') as HTMLInputElement;
  const primaryInfo = document.getElementById('primary-model-info');

  if (primarySelect && config.settings.model) {
    primarySelect.value = config.settings.model.id;
  }
  if (primaryApiKey && config.settings.model) {
    primaryApiKey.value = config.settings.model.apiKey || '';
  }
  if (primaryInfo && config.settings.model) {
    primaryInfo.textContent = `Provider: ${config.settings.model.provider}`;
  }

  // Fallback model
  const fallbackSelect = document.getElementById('fallback-model') as HTMLSelectElement;
  const fallbackApiKey = document.getElementById('fallback-api-key') as HTMLInputElement;
  const fallbackInfo = document.getElementById('fallback-model-info');

  if (fallbackSelect && config.settings.fallbackModel) {
    fallbackSelect.value = config.settings.fallbackModel.id;
  }
  if (fallbackApiKey && config.settings.fallbackModel) {
    fallbackApiKey.value = config.settings.fallbackModel.apiKey || '';
  }
  if (fallbackInfo && config.settings.fallbackModel) {
    fallbackInfo.textContent = `Provider: ${config.settings.fallbackModel.provider}`;
  }

  // Image model
  const imageSelect = document.getElementById('image-model') as HTMLSelectElement;
  const imageApiKey = document.getElementById('image-api-key') as HTMLInputElement;
  const imageInfo = document.getElementById('image-model-info');

  if (imageSelect && config.settings.imageModel) {
    imageSelect.value = config.settings.imageModel.id;
  }
  if (imageApiKey && config.settings.imageModel) {
    imageApiKey.value = config.settings.imageModel.apiKey || '';
  }
  if (imageInfo && config.settings.imageModel) {
    imageInfo.textContent = `Provider: ${config.settings.imageModel.provider}`;
  }
}

function populateSavedModelsList() {
  const container = document.getElementById('saved-models-list');
  if (!container) return;

  if (savedModels.length === 0) {
    container.innerHTML = '<p class="help-text">No saved models. Click "Add Model" to add one.</p>';
    return;
  }

  container.innerHTML = savedModels.map(model => `
    <div class="model-item" data-model-id="${model.id}">
      <div class="model-item-info">
        <span class="model-item-name">${model.name}</span>
        <span class="model-item-id">${model.provider}/${model.id}${model.baseUrl ? ` • ${model.baseUrl}` : ''}</span>
        <span class="model-item-id">${model.apiKey ? '🔒 API key configured' : '⚠️ No API key'}</span>
      </div>
      <div class="model-item-actions">
        <button class="btn btn-sm btn-secondary edit-model" data-model-id="${model.id}">Edit</button>
        <button class="btn btn-sm btn-danger remove-model" data-model-id="${model.id}">Remove</button>
      </div>
    </div>
  `).join('');

  // Add event listeners for edit/remove buttons
  container.querySelectorAll('.edit-model').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modelId = (e.target as HTMLElement).dataset.modelId;
      editModel(modelId!);
    });
  });

  container.querySelectorAll('.remove-model').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modelId = (e.target as HTMLElement).dataset.modelId;
      removeModel(modelId!);
    });
  });
}

async function populateGatewayStatus() {
  try {
    const status = await window.electronAPI.getGatewayStatus();
    const statusEl = document.getElementById('gateway-status');
    const portEl = document.getElementById('gateway-port');

    if (statusEl) {
      statusEl.textContent = status.running ? 'Running' : 'Stopped';
      statusEl.style.color = status.running ? 'var(--success)' : 'var(--error)';
    }
    if (portEl) {
      portEl.textContent = status.port?.toString() || '-';
    }
  } catch (error) {
    console.error('Failed to get gateway status:', error);
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = (e.target as HTMLElement).dataset.section;

      // Update nav active state
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      (e.target as HTMLElement).classList.add('active');

      // Update section active state
      document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
      document.getElementById(`section-${section}`)?.classList.add('active');
    });
  });
}

function setupEventListeners() {
  // Toggle password visibility
  ['primary', 'fallback', 'image'].forEach(type => {
    const toggleBtn = document.getElementById(`toggle-${type}-key`);
    const apiKeyInput = document.getElementById(`${type}-api-key`) as HTMLInputElement;

    toggleBtn?.addEventListener('click', () => {
      if (apiKeyInput) {
        apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
      }
    });
  });

  // Model selection changes
  document.getElementById('primary-model')?.addEventListener('change', (e) => {
    const modelId = (e.target as HTMLSelectElement).value;
    updateSelectedModel('primary', modelId);
  });

  document.getElementById('fallback-model')?.addEventListener('change', (e) => {
    const modelId = (e.target as HTMLSelectElement).value;
    updateSelectedModel('fallback', modelId);
  });

  document.getElementById('image-model')?.addEventListener('change', (e) => {
    const modelId = (e.target as HTMLSelectElement).value;
    updateSelectedModel('image', modelId);
  });

  // API key changes
  document.getElementById('primary-api-key')?.addEventListener('change', async (e) => {
    const apiKey = (e.target as HTMLInputElement).value;
    if (config?.settings.model) {
      await window.electronAPI.setModelApiKey(config.settings.model.id, apiKey);
    }
  });

  document.getElementById('fallback-api-key')?.addEventListener('change', async (e) => {
    const apiKey = (e.target as HTMLInputElement).value;
    if (config?.settings.fallbackModel) {
      await window.electronAPI.setModelApiKey(config.settings.fallbackModel.id, apiKey);
    }
  });

  document.getElementById('image-api-key')?.addEventListener('change', async (e) => {
    const apiKey = (e.target as HTMLInputElement).value;
    if (config?.settings.imageModel) {
      await window.electronAPI.setModelApiKey(config.settings.imageModel.id, apiKey);
    }
  });

  // Add model modal
  const modal = document.getElementById('add-model-modal');
  const addModelBtn = document.getElementById('btn-add-model');
  const closeBtn = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('cancel-add-model');
  const confirmBtn = document.getElementById('confirm-add-model');

  addModelBtn?.addEventListener('click', () => {
    modal?.classList.add('active');
  });

  closeBtn?.addEventListener('click', () => {
    modal?.classList.remove('active');
  });

  cancelBtn?.addEventListener('click', () => {
    modal?.classList.remove('active');
  });

  confirmBtn?.addEventListener('click', async () => {
    await confirmAddModel();
  });

  // Restart gateway
  document.getElementById('btn-restart-gateway')?.addEventListener('click', async () => {
    await window.electronAPI.restartGateway();
    await populateGatewayStatus();
  });

  // Close modal on outside click
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}

async function updateSelectedModel(type: 'primary' | 'fallback' | 'image', modelId: string) {
  if (!config) return;

  const model = PRESET_MODELS.find(m => m.id === modelId) || savedModels.find(m => m.id === modelId);

  if (!model) {
    // No model selected
    if (type === 'primary') {
      await window.electronAPI.setModel({ id: '', name: '', provider: '' });
    } else if (type === 'fallback') {
      await window.electronAPI.setFallbackModel(null);
    } else if (type === 'image') {
      await window.electronAPI.setImageModel(null);
    }
    return;
  }

  // Get existing API key if available
  const existingModel = savedModels.find(m => m.id === modelId);
  const modelWithKey: ModelConfig = {
    ...model,
    apiKey: existingModel?.apiKey || model.apiKey
  };

  if (type === 'primary') {
    await window.electronAPI.setModel(modelWithKey);
  } else if (type === 'fallback') {
    await window.electronAPI.setFallbackModel(modelWithKey);
  } else if (type === 'image') {
    await window.electronAPI.setImageModel(modelWithKey);
  }

  // Update info display
  const infoEl = document.getElementById(`${type}-model-info`);
  if (infoEl) {
    infoEl.textContent = `Provider: ${model.provider}`;
  }

  // Update API key field
  const apiKeyInput = document.getElementById(`${type}-api-key`) as HTMLInputElement;
  if (apiKeyInput) {
    apiKeyInput.value = modelWithKey.apiKey || '';
  }

  // Reload config
  await loadSettings();
}

async function confirmAddModel() {
  const provider = (document.getElementById('new-model-provider') as HTMLSelectElement).value;
  const modelId = (document.getElementById('new-model-id') as HTMLInputElement).value.trim();
  const modelName = (document.getElementById('new-model-name') as HTMLInputElement).value.trim();
  const baseUrl = (document.getElementById('new-base-url') as HTMLInputElement).value.trim();
  const apiKey = (document.getElementById('new-api-key') as HTMLInputElement).value.trim();

  if (!provider || !modelId || !modelName) {
    alert('Please fill in provider, model ID, and model name');
    return;
  }

  const newModel: ModelConfig = {
    id: modelId,
    name: modelName,
    provider,
    baseUrl: baseUrl || undefined,
    apiKey: apiKey || undefined
  };

  try {
    await window.electronAPI.addModel(newModel);

    // Close modal
    const modal = document.getElementById('add-model-modal');
    modal?.classList.remove('active');

    // Clear form
    (document.getElementById('new-model-provider') as HTMLSelectElement).value = '';
    (document.getElementById('new-model-id') as HTMLInputElement).value = '';
    (document.getElementById('new-model-name') as HTMLInputElement).value = '';
    (document.getElementById('new-base-url') as HTMLInputElement).value = '';
    (document.getElementById('new-api-key') as HTMLInputElement).value = '';

    // Reload and repopulate
    await loadSettings();
  } catch (error) {
    alert('Failed to add model: ' + (error as Error).message);
  }
}

async function editModel(modelId: string) {
  const model = savedModels.find(m => m.id === modelId);
  if (!model) return;

  const modal = document.getElementById('add-model-modal');
  const modalTitle = modal?.querySelector('.modal-header h3');
  if (modalTitle) modalTitle.textContent = 'Edit Model';

  // Fill form with existing data
  (document.getElementById('new-model-provider') as HTMLSelectElement).value = model.provider;
  (document.getElementById('new-model-id') as HTMLInputElement).value = model.id;
  (document.getElementById('new-model-name') as HTMLInputElement).value = model.name;
  (document.getElementById('new-base-url') as HTMLInputElement).value = model.baseUrl || '';
  (document.getElementById('new-api-key') as HTMLInputElement).value = model.apiKey || '';

  // Change confirm button behavior to update
  const confirmBtn = document.getElementById('confirm-add-model');
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      await confirmUpdateModel(modelId);
    };
  }

  modal?.classList.add('active');
}

async function confirmUpdateModel(modelId: string) {
  const provider = (document.getElementById('new-model-provider') as HTMLSelectElement).value;
  const id = (document.getElementById('new-model-id') as HTMLInputElement).value.trim();
  const name = (document.getElementById('new-model-name') as HTMLInputElement).value.trim();
  const baseUrl = (document.getElementById('new-base-url') as HTMLInputElement).value.trim();
  const apiKey = (document.getElementById('new-api-key') as HTMLInputElement).value.trim();

  if (!provider || !id || !name) {
    alert('Please fill in provider, model ID, and model name');
    return;
  }

  const updatedModel: ModelConfig = {
    id,
    name,
    provider,
    baseUrl: baseUrl || undefined,
    apiKey: apiKey || undefined
  };

  try {
    await window.electronAPI.updateModel(updatedModel);

    // Close modal
    const modal = document.getElementById('add-model-modal');
    modal?.classList.remove('active');

    // Reset modal title and button
    const modalTitle = modal?.querySelector('.modal-header h3');
    if (modalTitle) modalTitle.textContent = 'Add New Model';
    const confirmBtn = document.getElementById('confirm-add-model');
    if (confirmBtn) confirmBtn.onclick = () => confirmAddModel();

    // Clear form
    (document.getElementById('new-model-provider') as HTMLSelectElement).value = '';
    (document.getElementById('new-model-id') as HTMLInputElement).value = '';
    (document.getElementById('new-model-name') as HTMLInputElement).value = '';
    (document.getElementById('new-base-url') as HTMLInputElement).value = '';
    (document.getElementById('new-api-key') as HTMLInputElement).value = '';

    // Reload and repopulate
    await loadSettings();
  } catch (error) {
    alert('Failed to update model: ' + (error as Error).message);
  }
}

async function removeModel(modelId: string) {
  if (!confirm(`Are you sure you want to remove the model "${modelId}"?`)) {
    return;
  }

  try {
    await window.electronAPI.removeModel(modelId);
    await loadSettings();
  } catch (error) {
    alert('Failed to remove model: ' + (error as Error).message);
  }
}
