import React, { useState } from 'react';
import { useApp, useSetView, useModels, useGateway, useSkills, useTools } from '../store/appStore';
import { TEXTS } from '../lib/texts';
import { AddModelModal } from './AddModelModal';
import { PROVIDER_PRESETS, ModelConfig } from '@shared/types';

export function SettingsView() {
  const setView = useSetView();
  const { state } = useApp();
  const { savedModels, primaryModel, fallbackModel, imageModel, setPrimaryModel, setFallbackModel, setImageModel, addModel, updateModel, removeModel } = useModels();
  const { gatewayStatus, restartGateway } = useGateway();
  const { skills, setSkills } = useSkills();
  const { tools, setTools } = useTools();

  const config = state.config;

  const [activeSection, setActiveSection] = useState('models');
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<string | null>(null);

  const AVAILABLE_SKILLS = [
    { id: 'everything-claude-code:plan', name: 'Plan' },
    { id: 'everything-claude-code:tdd', name: 'TDD' },
    { id: 'everything-claude-code:e2e', name: 'E2E' },
    { id: 'everything-claude-code:python-review', name: 'Python Review' },
    { id: 'everything-claude-code:go-review', name: 'Go Review' },
    { id: 'everything-claude-code:security-reviewer', name: 'Security Reviewer' },
  ];

  const handleProviderChange = async (slot: 'primary' | 'fallback' | 'image', providerId: string) => {
    const provider = PROVIDER_PRESETS.find(p => p.id === providerId);
    if (!provider) return;

    const currentModel = slot === 'primary' ? primaryModel : slot === 'fallback' ? fallbackModel : imageModel;
    const firstModel = provider.models[0];

    if (firstModel) {
      const newModel: ModelConfig = {
        id: firstModel.id,
        name: firstModel.name,
        provider: providerId,
        baseUrl: provider.defaultBaseUrl,
        apiKey: currentModel?.apiKey,
      };

      if (slot === 'primary') await setPrimaryModel(newModel);
      else if (slot === 'fallback') await setFallbackModel(newModel);
      else await setImageModel(newModel);
    }
  };

  const handleModelChange = async (slot: 'primary' | 'fallback' | 'image', modelId: string) => {
    const currentModel = slot === 'primary' ? primaryModel : slot === 'fallback' ? fallbackModel : imageModel;
    const provider = PROVIDER_PRESETS.find(p => p.id === currentModel?.provider);
    const model = provider?.models.find(m => m.id === modelId);

    if (model && currentModel) {
      const newModel: ModelConfig = {
        ...currentModel,
        id: model.id,
        name: model.name,
      };

      if (slot === 'primary') await setPrimaryModel(newModel);
      else if (slot === 'fallback') await setFallbackModel(newModel);
      else await setImageModel(newModel);
    }
  };

  const handleApiKeyChange = async (slot: 'primary' | 'fallback' | 'image', apiKey: string) => {
    const currentModel = slot === 'primary' ? primaryModel : slot === 'fallback' ? fallbackModel : imageModel;
    if (currentModel) {
      const newModel: ModelConfig = { ...currentModel, apiKey };
      if (slot === 'primary') await setPrimaryModel(newModel);
      else if (slot === 'fallback') await setFallbackModel(newModel);
      else await setImageModel(newModel);
    }
  };

  const handleBaseUrlChange = async (slot: 'primary' | 'fallback' | 'image', baseUrl: string) => {
    const currentModel = slot === 'primary' ? primaryModel : slot === 'fallback' ? fallbackModel : imageModel;
    if (currentModel) {
      const newModel: ModelConfig = { ...currentModel, baseUrl };
      if (slot === 'primary') await setPrimaryModel(newModel);
      else if (slot === 'fallback') await setFallbackModel(newModel);
      else await setImageModel(newModel);
    }
  };

  const handleSkillToggle = async (skillId: string) => {
    const newSkills = skills.includes(skillId)
      ? skills.filter(s => s !== skillId)
      : [...skills, skillId];
    await setSkills(newSkills);
  };

  const handleToolToggle = async (toolId: string) => {
    const newTools = tools.includes(toolId)
      ? tools.filter(t => t !== toolId)
      : [...tools, toolId];
    await setTools(newTools);
  };

  const handleEditModel = (modelId: string) => {
    setEditingModel(modelId);
    setShowAddModelModal(true);
  };

  const handleRemoveModel = async (modelId: string) => {
    if (confirm(`Remove model "${modelId}"?`)) {
      await removeModel(modelId);
    }
  };

  const renderModelsSection = () => (
    <div className="models-section">
      <div className="section-header">
        <h2>{TEXTS.settings.modelConfig}</h2>
        <p className="subtitle">{TEXTS.settings.modelConfigSubtitle}</p>
      </div>

      <div className="models-grid">
        {(['primary', 'fallback', 'image'] as const).map((slot) => {
          const model = slot === 'primary' ? primaryModel : slot === 'fallback' ? fallbackModel : imageModel;
          const provider = PROVIDER_PRESETS.find(p => p.id === model?.provider);

          return (
            <div key={slot} className="model-slot-card">
              <div className="model-slot-header">
                <span>{slot === 'primary' ? TEXTS.settings.primaryModel : slot === 'fallback' ? TEXTS.settings.fallbackModel : TEXTS.settings.imageModel}</span>
                <span className={`badge ${slot === 'primary' ? 'badge-primary' : 'badge-secondary'}`}>
                  {slot === 'primary' ? TEXTS.settings.required : TEXTS.settings.optional}
                </span>
              </div>

              <select
                className="form-select form-select-sm"
                value={model?.provider || ''}
                onChange={(e) => handleProviderChange(slot, e.target.value)}
              >
                <option value="">{TEXTS.settings.selectProvider}</option>
                {PROVIDER_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                className="form-select form-select-sm"
                style={{ marginTop: '8px' }}
                value={model?.id || ''}
                onChange={(e) => handleModelChange(slot, e.target.value)}
                disabled={!model?.provider}
              >
                <option value="">{TEXTS.settings.selectModel}</option>
                {provider?.models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>

              <div className="input-group input-group-sm" style={{ marginTop: '8px' }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder={TEXTS.settings.apiKey}
                  value={model?.apiKey || ''}
                  onChange={(e) => handleApiKeyChange(slot, e.target.value)}
                />
              </div>

              <input
                type="text"
                className="form-input form-input-sm"
                placeholder={TEXTS.settings.baseUrl}
                value={model?.baseUrl || ''}
                onChange={(e) => handleBaseUrlChange(slot, e.target.value)}
                style={{ marginTop: '8px' }}
              />

              {model && (
                <div className="model-info-sm" style={{ marginTop: '8px' }}>
                  {model.provider} • {model.id}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>{TEXTS.settings.modelList}</h3>
          <button className="btn btn-sm" onClick={() => { setEditingModel(null); setShowAddModelModal(true); }}>
            {TEXTS.settings.addModel}
          </button>
        </div>
        <div className="card-content">
          {savedModels.length === 0 ? (
            <p className="help-text">{TEXTS.settings.noSavedModels}</p>
          ) : (
            <div className="models-list">
              {savedModels.map(model => (
                <div key={model.id} className="model-item">
                  <div className="model-item-info">
                    <span className="model-item-name">{model.name}</span>
                    <span className="model-item-id">{model.provider}/{model.id}{model.baseUrl ? ` • ${model.baseUrl}` : ''}</span>
                    <span className="model-item-id">{model.apiKey ? TEXTS.settings.apiKeyConfigured : TEXTS.settings.noApiKey}</span>
                  </div>
                  <div className="model-item-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEditModel(model.id)}>
                      {TEXTS.settings.edit}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemoveModel(model.id)}>
                      {TEXTS.settings.remove}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSkillsSection = () => (
    <div className="skills-section">
      <div className="section-header">
        <h2>{TEXTS.settings.skills}</h2>
        <p className="subtitle">{TEXTS.skills.subtitle}</p>
      </div>
      <div className="skills-grid">
        {AVAILABLE_SKILLS.map(skill => (
          <div key={skill.id} className={`skill-card ${skills.includes(skill.id) ? 'enabled' : ''}`}>
            <label className="skill-toggle">
              <input
                type="checkbox"
                checked={skills.includes(skill.id)}
                onChange={() => handleSkillToggle(skill.id)}
              />
              <span className="skill-name">{skill.name}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderToolsSection = () => (
    <div className="tools-section">
      <div className="section-header">
        <h2>{TEXTS.settings.tools}</h2>
        <p className="subtitle">{TEXTS.tools.subtitle}</p>
      </div>
      <div className="tools-grid">
        {/* Tools would be populated similarly to skills */}
        <p className="help-text">Tools configuration coming soon...</p>
      </div>
    </div>
  );

  const renderGatewaySection = () => (
    <div className="gateway-section">
      <div className="section-header">
        <h2>{TEXTS.settings.gatewaySectionTitle}</h2>
        <p className="subtitle">{TEXTS.settings.gatewayStatusSubtitle}</p>
      </div>
      <div className="card">
        <div className="card-content">
          <div className="status-info">
            <div className="status-item">
              <span className="label">{TEXTS.settings.status}:</span>
              <span className="value" style={{ color: gatewayStatus?.running ? 'var(--success)' : 'var(--error)' }}>
                {gatewayStatus?.running ? TEXTS.settings.runningStatus : TEXTS.settings.stoppedStatus}
              </span>
            </div>
            <div className="status-item">
              <span className="label">{TEXTS.settings.portLabel}:</span>
              <span className="value">{gatewayStatus?.port || '-'}</span>
            </div>
          </div>
          <button className="btn" onClick={restartGateway}>
            {TEXTS.settings.restartGateway}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-view">
      <div className="settings-container">
        <div className="settings-sidebar">
          <div className="settings-header">
            <h1>{TEXTS.settings.title}</h1>
          </div>
          <nav className="settings-nav">
            {(['models', 'skills', 'tools', 'gateway', 'about'] as const).map(section => (
              <button
                key={section}
                className={`nav-item ${activeSection === section ? 'active' : ''}`}
                onClick={() => setActiveSection(section)}
              >
                {TEXTS.settings[section]}
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          {activeSection === 'models' && renderModelsSection()}
          {activeSection === 'skills' && renderSkillsSection()}
          {activeSection === 'tools' && renderToolsSection()}
          {activeSection === 'gateway' && renderGatewaySection()}
          {activeSection === 'about' && (
            <div className="about-section">
              <div className="section-header">
                <h2>{TEXTS.settings.about}</h2>
                <p className="subtitle">{TEXTS.settings.aboutSubtitle}</p>
              </div>
              <div className="card">
                <div className="card-content">
                  <div className="about-info">
                    <p><strong>{TEXTS.settings.version}:</strong> 1.0.1</p>
                    <p><strong>{TEXTS.settings.configDir}:</strong> ~/.openclaw</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModelModal && (
        <AddModelModal
          editingModelId={editingModel}
          onClose={() => {
            setShowAddModelModal(false);
            setEditingModel(null);
          }}
        />
      )}
    </div>
  );
}
