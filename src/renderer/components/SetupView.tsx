import React, { useState } from 'react';
import { useApp, useSetView } from '../store/appStore';
import { ipc } from '../lib/ipc';
import { TEXTS } from '../lib/texts';
import { PROVIDER_PRESETS, ModelConfig } from '@shared/types';

const PROVIDER_LINKS: Record<string, { url: string; name: string }> = {
  anthropic: { url: 'https://console.anthropic.com/', name: 'Anthropic Console' },
  openai: { url: 'https://platform.openai.com/api-keys', name: 'OpenAI Platform' },
  google: { url: 'https://makersuite.google.com/app/apikey', name: 'Google AI Studio' },
  deepseek: { url: 'https://platform.deepseek.com/api_keys', name: 'DeepSeek Platform' },
  alibaba: { url: 'https://dashscope.aliyun.com/', name: 'Alibaba DashScope' },
  tencent: { url: 'https://console.cloud.tencent.com/hunyuan', name: 'Tencent Hunyuan' },
  baidu: { url: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application', name: 'Baidu Qianfan' },
  bytedance: { url: 'https://console.volcengine.com/ark/', name: 'VolcEngine Ark' },
  custom: { url: '', name: 'Your Provider' },
};

export function SetupView() {
  const setView = useSetView();
  const [step, setStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const internationalModels = PROVIDER_PRESETS.filter(p => ['anthropic', 'openai', 'google'].includes(p.id));
  const chinaModels = PROVIDER_PRESETS.filter(p => ['deepseek', 'alibaba', 'tencent', 'baidu', 'bytedance'].includes(p.id));

  function selectModel(providerId: string, modelId: string, modelName: string) {
    const provider = PROVIDER_PRESETS.find(p => p.id === providerId);
    setSelectedModel({
      id: modelId,
      name: modelName,
      provider: providerId,
      baseUrl: provider?.defaultBaseUrl,
    });
  }

  function selectCustomModel() {
    setSelectedModel({
      id: 'custom',
      name: 'Custom Model',
      provider: 'custom',
    });
  }

  function updateCustomModel() {
    if (selectedModel?.id !== 'custom') return;
    setSelectedModel({
      ...selectedModel,
      id: customModelId,
      name: customModelId,
      baseUrl: customBaseUrl || undefined,
    });
  }

  async function handleNext() {
    if (step === 0 && selectedModel) {
      setStep(1);
    } else if (step === 1 && apiKey.trim()) {
      setStep(2);
    } else if (step === 2) {
      await completeSetup();
    }
  }

  async function completeSetup() {
    setIsLaunching(true);
    try {
      const modelConfig: ModelConfig = {
        ...selectedModel!,
        id: selectedModel!.id === 'custom' ? customModelId : selectedModel!.id,
        baseUrl: selectedModel!.id === 'custom' ? (customBaseUrl || undefined) : undefined,
      };

      await ipc.completeSetup({
        model: modelConfig,
        apiKey: apiKey.trim(),
      });

      setView('terminal');
    } catch (error) {
      alert('Setup failed: ' + (error as Error).message);
      setIsLaunching(false);
    }
  }

  function getProviderLink() {
    if (!selectedModel) return null;
    return PROVIDER_LINKS[selectedModel.provider];
  }

  return (
    <div className="setup-view">
      <div className="setup-container">
        <div className="setup-progress">
          <div className={`progress-step ${step >= 0 ? 'active' : ''}`}>1</div>
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>2</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>3</div>
        </div>

        {step === 0 && (
          <div className="setup-step">
            <h2>{TEXTS.setup.selectModel}</h2>
            <p>{TEXTS.setup.selectModelDesc}</p>

            <div className="model-section">
              <h3>{TEXTS.setup.internationalModels}</h3>
              <div className="model-grid">
                {internationalModels.map(provider => (
                  <div key={provider.id} className="model-provider-group">
                    <h4>{provider.name}</h4>
                    {provider.models.map(model => (
                      <div
                        key={model.id}
                        className={`model-option ${selectedModel?.id === model.id ? 'selected' : ''}`}
                        onClick={() => selectModel(provider.id, model.id, model.name)}
                      >
                        <input type="radio" name="model" checked={selectedModel?.id === model.id} onChange={() => {}} />
                        <span>{model.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="model-section">
              <h3>{TEXTS.setup.chinaModels}</h3>
              <div className="model-grid">
                {chinaModels.map(provider => (
                  <div key={provider.id} className="model-provider-group">
                    <h4>{provider.name}</h4>
                    {provider.models.map(model => (
                      <div
                        key={model.id}
                        className={`model-option ${selectedModel?.id === model.id ? 'selected' : ''}`}
                        onClick={() => selectModel(provider.id, model.id, model.name)}
                      >
                        <input type="radio" name="model" checked={selectedModel?.id === model.id} onChange={() => {}} />
                        <span>{model.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`model-option custom ${selectedModel?.provider === 'custom' ? 'selected' : ''}`}
              onClick={selectCustomModel}
            >
              <input type="radio" name="model" checked={selectedModel?.provider === 'custom'} onChange={() => {}} />
              <span>Custom Model</span>
            </div>

            {selectedModel?.provider === 'custom' && (
              <div className="custom-model-inputs">
                <div className="form-group">
                  <label>{TEXTS.setup.customModelId}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customModelId}
                    onChange={(e) => { setCustomModelId(e.target.value); updateCustomModel(); }}
                    placeholder="e.g., claude-sonnet-4-6"
                  />
                </div>
                <div className="form-group">
                  <label>{TEXTS.setup.customBaseUrl}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customBaseUrl}
                    onChange={(e) => { setCustomBaseUrl(e.target.value); updateCustomModel(); }}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="setup-step">
            <h2>{TEXTS.setup.enterApiKey}</h2>
            <p>{TEXTS.setup.enterApiKeyDesc}</p>

            <div className="form-group">
              <label>{TEXTS.setup.apiKeyLabel}</label>
              <div className="input-group">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="form-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={TEXTS.setup.apiKeyPlaceholder}
                />
                <button className="btn-icon" onClick={() => setShowKey(!showKey)}>
                  {showKey ? TEXTS.setup.hideKey : TEXTS.setup.showKey}
                </button>
              </div>
            </div>

            {getProviderLink()?.url && (
              <div className="provider-link">
                <p>Don't have an API key?</p>
                <a href="#" onClick={(e) => { e.preventDefault(); ipc.openExternal(getProviderLink()!.url); }}>
                  Get one from {getProviderLink()?.name} →
                </a>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="setup-step">
            <h2>{TEXTS.setup.confirm}</h2>
            <p>{TEXTS.setup.confirmDesc}</p>

            <div className="confirm-card">
              <div className="confirm-row">
                <span className="label">{TEXTS.setup.selectedModel}:</span>
                <span className="value">{selectedModel?.name}</span>
              </div>
              <div className="confirm-row">
                <span className="label">{TEXTS.setup.provider}:</span>
                <span className="value">{selectedModel?.provider}</span>
              </div>
              <div className="confirm-row">
                <span className="label">{TEXTS.setup.apiKeyLabel}:</span>
                <span className="value">{apiKey ? '••••••••' : 'Not set'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="setup-footer">
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              {TEXTS.setup.back}
            </button>
          )}
          <button
            className="btn"
            onClick={handleNext}
            disabled={
              (step === 0 && !selectedModel) ||
              (step === 1 && !apiKey.trim()) ||
              (step === 0 && selectedModel?.id === 'custom' && !customModelId) ||
              isLaunching
            }
          >
            {step === 2 ? (isLaunching ? TEXTS.setup.launching : TEXTS.setup.launch) : TEXTS.setup.next}
          </button>
        </div>
      </div>
    </div>
  );
}
