import React, { useState, useEffect } from 'react';
import { useModels } from '../store/appStore';
import { TEXTS } from '../lib/texts';
import { PROVIDER_PRESETS, ModelConfig } from '@shared/types';

interface AddModelModalProps {
  editingModelId?: string | null;
  onClose: () => void;
}

export function AddModelModal({ editingModelId, onClose }: AddModelModalProps) {
  const { savedModels, addModel, updateModel } = useModels();

  const [provider, setProvider] = useState('');
  const [modelId, setModelId] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [authMethod, setAuthMethod] = useState<'api_key' | 'oauth'>('api_key');

  const editingModel = editingModelId ? savedModels.find(m => m.id === editingModelId) : null;

  useEffect(() => {
    if (editingModel) {
      setProvider(editingModel.provider);
      setModelId(editingModel.id);
      setCustomModelId(editingModel.provider === 'custom' ? editingModel.id : '');
      setApiKey(editingModel.apiKey || '');
      setBaseUrl(editingModel.baseUrl || '');
    }
  }, [editingModel]);

  const selectedProvider = PROVIDER_PRESETS.find(p => p.id === provider);
  const isCustom = provider === 'custom';

  function handleSubmit() {
    if (!provider || !modelId || (isCustom && !customModelId)) {
      alert(TEXTS.errors.modelRequired);
      return;
    }

    const finalModelId = isCustom ? customModelId : modelId;
    const finalModelName = isCustom ? customModelId : selectedProvider?.models.find(m => m.id === modelId)?.name || finalModelId;

    const modelConfig: ModelConfig = {
      id: finalModelId,
      name: finalModelName,
      provider,
      baseUrl: baseUrl || undefined,
      apiKey: apiKey || undefined,
      authMethod,
    };

    if (editingModel) {
      updateModel(modelConfig);
    } else {
      addModel(modelConfig);
    }

    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingModel ? TEXTS.settings.editModelTitle : TEXTS.settings.addModelTitle}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>{TEXTS.settings.provider}</label>
            <select
              className="form-select"
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setModelId(''); }}
            >
              <option value="">{TEXTS.settings.selectProvider}</option>
              {PROVIDER_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {!isCustom && provider && (
            <div className="form-group">
              <label>{TEXTS.settings.model}</label>
              <select
                className="form-select"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              >
                <option value="">{TEXTS.settings.selectModel}</option>
                {selectedProvider?.models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {isCustom && (
            <div className="form-group">
              <label>{TEXTS.settings.modelId}</label>
              <input
                type="text"
                className="form-input"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder={TEXTS.settings.modelIdPlaceholder}
              />
            </div>
          )}

          {provider && (
            <div className="auth-method-selector">
              <label>
                <input
                  type="radio"
                  name="auth-method"
                  value="api_key"
                  checked={authMethod === 'api_key'}
                  onChange={() => setAuthMethod('api_key')}
                />
                {TEXTS.settings.apiKeyRadio}
              </label>
              <label>
                <input
                  type="radio"
                  name="auth-method"
                  value="oauth"
                  checked={authMethod === 'oauth'}
                  onChange={() => setAuthMethod('oauth')}
                />
                {TEXTS.settings.oauthRadio}
              </label>
            </div>
          )}

          <div className="form-group">
            <label>{TEXTS.settings.apiKeyLabel}</label>
            <input
              type="password"
              className="form-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={TEXTS.settings.apiKeyPlaceholder}
            />
          </div>

          <div className="form-group">
            <label>{TEXTS.settings.baseUrlLabel}</label>
            <input
              type="text"
              className="form-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={TEXTS.settings.baseUrlPlaceholder}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {TEXTS.settings.cancel}
          </button>
          <button className="btn" onClick={handleSubmit}>
            {editingModel ? TEXTS.settings.update : TEXTS.settings.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
