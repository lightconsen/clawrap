import React, { useState } from 'react';
import { useApp, useSetView, useModels, useGateway, useSkills, useTools, useChannels } from '../store/appStore';
import { TEXTS } from '../lib/texts';
import { AddModelModal } from './AddModelModal';
import { ModelConfig } from '@shared/types';

export function SettingsView() {
  const setView = useSetView();
  const { state } = useApp();
  const { savedModels, primaryModel, fallbackModel, imageModel, addModel, updateModel, removeModel } = useModels();
  const { gatewayStatus, restartGateway } = useGateway();
  const { skills, setSkills } = useSkills();
  const { tools, setTools } = useTools();
  const { channels, setChannels } = useChannels();

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

  const handleChannelToggle = async (channelType: string) => {
    const newChannels = channels.map(c =>
      c.type === channelType ? { ...c, enabled: !c.enabled } : c
    );
    await setChannels(newChannels);
  };

  const handleEditModel = (modelId: string) => {
    setEditingModel(modelId);
    setShowAddModelModal(true);
  };

  const handleRemoveModel = async (modelId: string, isPrimary: boolean) => {
    if (isPrimary) {
      alert(TEXTS.settings.cannotRemovePrimary);
      return;
    }
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

      {/* Model Status - Read-only, shown first */}
      <div className="model-slots-section">
        <h3 style={{ marginBottom: '16px' }}>{TEXTS.settings.modelStatus}</h3>
        <div className="models-grid">
          {(['primary', 'fallback', 'image'] as const).map((slot) => {
            const model = slot === 'primary' ? primaryModel : slot === 'fallback' ? fallbackModel : imageModel;

            return (
              <div key={slot} className="model-slot">
                <div className="model-slot-header">
                  <span>{slot === 'primary' ? TEXTS.settings.primaryModel : slot === 'fallback' ? TEXTS.settings.fallbackModel : TEXTS.settings.imageModel}</span>
                  <span className={`badge ${slot === 'primary' ? 'badge-primary' : 'badge-secondary'}`}>
                    {slot === 'primary' ? TEXTS.settings.required : TEXTS.settings.optional}
                  </span>
                </div>
                {model ? (
                  <div className="model-status-info">
                    <div className="status-row">
                      <span className="status-label">{TEXTS.settings.provider}:</span>
                      <span className="status-value">{model.provider}</span>
                    </div>
                    <div className="status-row">
                      <span className="status-label">{TEXTS.settings.model}:</span>
                      <span className="status-value">{model.name}</span>
                    </div>
                  </div>
                ) : (
                  <p className="help-text">{TEXTS.settings.notConfigured}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Model List */}
      <div className="model-list-section" style={{ marginTop: '32px' }}>
        <div className="section-subheader">
          <h3>{TEXTS.settings.modelList}</h3>
          <button className="btn btn-sm" onClick={() => { setEditingModel(null); setShowAddModelModal(true); }}>
            {TEXTS.settings.addModel}
          </button>
        </div>
        {savedModels.length === 0 ? (
          <p className="help-text">{TEXTS.settings.noSavedModels}</p>
        ) : (
          <div className="models-list">
            {savedModels.map(model => {
              const isPrimary = primaryModel?.id === model.id && primaryModel?.provider === model.provider;
              return (
                <div key={model.id} className="model-item">
                  <div className="model-item-info">
                    <span className="model-item-name">
                      {model.name}
                      {isPrimary && <span className="badge badge-primary" style={{ marginLeft: '8px' }}>{TEXTS.settings.primaryModel}</span>}
                    </span>
                    <span className="model-item-id">{model.provider}/{model.id}{model.baseUrl ? ` • ${model.baseUrl}` : ''}</span>
                    <span className="model-item-id">{model.apiKey ? TEXTS.settings.apiKeyConfigured : TEXTS.settings.noApiKey}</span>
                  </div>
                  <div className="model-item-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEditModel(model.id)}>
                      {TEXTS.settings.edit}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleRemoveModel(model.id, isPrimary)}
                      disabled={isPrimary}
                    >
                      {TEXTS.settings.remove}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
        <p className="help-text">Tools configuration coming soon...</p>
      </div>
    </div>
  );

  const renderChannelsSection = () => (
    <div className="channels-section">
      <div className="section-header">
        <h2>{TEXTS.settings.channels}</h2>
        <p className="subtitle">{TEXTS.channels.subtitle}</p>
      </div>
      <div className="channels-grid">
        {channels.map(channel => {
          const channelName = (TEXTS.channels as any)[channel.type] || channel.type;
          return (
            <div key={channel.type} className={`channel-card ${channel.enabled ? 'enabled' : ''}`}>
              <label className="channel-toggle">
                <input
                  type="checkbox"
                  checked={channel.enabled}
                  onChange={() => handleChannelToggle(channel.type)}
                />
                <span className="channel-name">{channelName}</span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGatewaySection = () => (
    <div className="gateway-section">
      <div className="section-header">
        <h2>{TEXTS.settings.gatewaySectionTitle}</h2>
        <p className="subtitle">{TEXTS.settings.gatewayStatusSubtitle}</p>
      </div>
      <div className="gateway-status-info">
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
        <button className="btn" onClick={restartGateway} style={{ marginTop: '16px' }}>
          {TEXTS.settings.restartGateway}
        </button>
      </div>
    </div>
  );

  return (
    <div className="settings-view">
      <div className="settings-container">
        <div className="settings-sidebar">
          <div className="settings-header">
            <button className="btn-icon back-btn" onClick={() => setView('terminal')} title={TEXTS.common.back}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1>{TEXTS.settings.title}</h1>
          </div>
          <nav className="settings-nav">
            {(['models', 'skills', 'tools', 'channels', 'gateway', 'about'] as const).map(section => (
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
          {activeSection === 'channels' && renderChannelsSection()}
          {activeSection === 'gateway' && renderGatewaySection()}
          {activeSection === 'about' && (
            <div className="about-section">
              <div className="section-header">
                <h2>{TEXTS.settings.about}</h2>
                <p className="subtitle">{TEXTS.settings.aboutSubtitle}</p>
              </div>
              <div className="about-info">
                <p><strong>{TEXTS.settings.version}:</strong> 1.0.1</p>
                <p><strong>{TEXTS.settings.configDir}:</strong> ~/.openclaw</p>
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
