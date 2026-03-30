import React, { useState } from 'react';
import { useApp, useSetView, useModels, useGateway, useSkills, useTools, useChannels, useCron, useMemory, useAgent } from '../store/appStore';
import { TEXTS } from '../lib/texts';
import { AddModelModal } from './AddModelModal';
import { ModelConfig, PersonalityFile } from '@shared/types';
import { ipc } from '../lib/ipc';

export function SettingsView() {
  const setView = useSetView();
  const { state } = useApp();
  const { savedModels, primaryModel, fallbackModel, imageModel, addModel, updateModel, removeModel } = useModels();
  const { gatewayStatus, restartGateway } = useGateway();
  const { skills, setSkills } = useSkills();
  const { tools, setTools } = useTools();
  const { channels, setChannels } = useChannels();
  const { cronJobs, cronLogs, refreshCronJobs, refreshCronLogs, runJob, toggleJob } = useCron();
  const { memoryInfo, refreshMemory } = useMemory();
  const { agentInfo, refreshAgentInfo } = useAgent();

  const config = state.config;

  const [activeSection, setActiveSection] = useState('overview');
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [selectedJobForLogs, setSelectedJobForLogs] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [personalityFiles, setPersonalityFiles] = useState<PersonalityFile[]>([]);
  const [activePersonalityTab, setActivePersonalityTab] = useState<string>('SOUL');
  const [loadingPersonality, setLoadingPersonality] = useState(false);
  const [editingPersonality, setEditingPersonality] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [savingPersonality, setSavingPersonality] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Poll memory info when on memory section
  React.useEffect(() => {
    if (activeSection === 'memory') {
      refreshMemory();
      const interval = setInterval(refreshMemory, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSection, refreshMemory]);

  // Poll agent info when on agent section
  React.useEffect(() => {
    if (activeSection === 'agent') {
      refreshAgentInfo();
      const interval = setInterval(refreshAgentInfo, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSection, refreshAgentInfo]);

  // Load cron jobs when on crons section
  React.useEffect(() => {
    if (activeSection === 'crons') {
      refreshCronJobs();
    }
  }, [activeSection, refreshCronJobs]);

  // Load personality files when on memory section
  React.useEffect(() => {
    if (activeSection === 'memory') {
      setLoadingPersonality(true);
      ipc.getPersonalityFiles().then(({ files }) => {
        setPersonalityFiles(files);
        if (files.length > 0 && !files.find(f => f.name === activePersonalityTab)) {
          setActivePersonalityTab(files[0].name);
        }
        setLoadingPersonality(false);
      }).catch(() => {
        setLoadingPersonality(false);
      });
    }
  }, [activeSection]);

  // Update edited content when active tab changes
  React.useEffect(() => {
    const activeFile = personalityFiles.find(f => f.name === activePersonalityTab);
    if (activeFile) {
      setEditedContent(activeFile.content);
    }
  }, [activePersonalityTab, personalityFiles]);

  const handleSavePersonalityFile = async () => {
    setSavingPersonality(true);
    setSaveStatus(null);
    try {
      const result = await ipc.savePersonalityFile(activePersonalityTab, editedContent);
      if (result.success) {
        setSaveStatus({ success: true, message: 'Saved!' });
        setEditingPersonality(false);
        // Refresh the files list
        const { files } = await ipc.getPersonalityFiles();
        setPersonalityFiles(files);
      } else {
        setSaveStatus({ success: false, message: result.error || 'Failed to save' });
      }
    } catch (error) {
      setSaveStatus({ success: false, message: 'Failed to save' });
    } finally {
      setSavingPersonality(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

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

  const renderOverviewSection = () => (
    <div className="overview-section">
      <div className="section-header">
        <h2>Overview</h2>
        <p className="subtitle">Quick summary of your Clawrap configuration</p>
      </div>

      <div className="overview-grid">
        {/* Gateway Status */}
        <div className="overview-card">
          <h3>Gateway</h3>
          <div className="overview-stat">
            <div className="stat-row">
              <span className="stat-label">Status:</span>
              <span className={`stat-value ${gatewayStatus?.running ? 'success' : 'error'}`}>
                {gatewayStatus?.running ? 'Running' : 'Stopped'}
              </span>
            </div>
            {gatewayStatus?.port && (
              <div className="stat-row">
                <span className="stat-label">Port:</span>
                <span className="stat-value">{gatewayStatus.port}</span>
              </div>
            )}
          </div>
        </div>

        {/* Primary Model */}
        <div className="overview-card">
          <h3>Primary Model</h3>
          <div className="overview-stat">
            {primaryModel ? (
              <>
                <div className="stat-row">
                  <span className="stat-label">Provider:</span>
                  <span className="stat-value">{primaryModel.provider}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Model:</span>
                  <span className="stat-value">{primaryModel.name}</span>
                </div>
              </>
            ) : (
              <p className="help-text">No model configured</p>
            )}
          </div>
        </div>

        {/* Agent */}
        <div className="overview-card">
          <h3>Agent</h3>
          <div className="overview-stat">
            {agentInfo ? (
              <>
                <div className="stat-row">
                  <span className="stat-label">Name:</span>
                  <span className="stat-value">{agentInfo.name}</span>
                </div>
                {agentInfo.model && (
                  <div className="stat-row">
                    <span className="stat-label">Model:</span>
                    <span className="stat-value">{agentInfo.model}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="help-text">Loading...</p>
            )}
          </div>
        </div>

        {/* Memory Quick Stats */}
        <div className="overview-card">
          <h3>Memory</h3>
          <div className="overview-stat">
            {memoryInfo ? (
              <>
                <div className="stat-row">
                  <span className="stat-label">System:</span>
                  <span className="stat-value">{memoryInfo.systemMemory.percent.toFixed(1)}% used</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Process RSS:</span>
                  <span className="stat-value">{(memoryInfo.processMemory.rss / 1024 / 1024).toFixed(0)} MB</span>
                </div>
              </>
            ) : (
              <p className="help-text">Loading...</p>
            )}
          </div>
        </div>

        {/* Crons */}
        <div className="overview-card">
          <h3>Crons</h3>
          <div className="overview-stat">
            <div className="stat-row">
              <span className="stat-label">Total Jobs:</span>
              <span className="stat-value">{cronJobs.length}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Active:</span>
              <span className="stat-value">{cronJobs.filter(j => j.enabled).length}</span>
            </div>
          </div>
        </div>

        {/* Skills & Tools */}
        <div className="overview-card">
          <h3>Skills & Tools</h3>
          <div className="overview-stat">
            <div className="stat-row">
              <span className="stat-label">Skills:</span>
              <span className="stat-value">{skills.length}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Tools:</span>
              <span className="stat-value">{tools.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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

  const renderCronSection = () => {
    const handleRunJob = async (jobId: string) => {
      setRunningJobId(jobId);
      try {
        await runJob(jobId);
        await refreshCronJobs();
        await refreshCronLogs(jobId);
      } catch (error) {
        console.error('Failed to run job:', error);
      } finally {
        setRunningJobId(null);
      }
    };

    const handleViewLogs = (jobId: string) => {
      setSelectedJobForLogs(jobId === selectedJobForLogs ? null : jobId);
      refreshCronLogs(jobId);
    };

    return (
      <div className="cron-section">
        <div className="section-header">
          <h2>Crons</h2>
          <p className="subtitle">Manage and monitor scheduled cron jobs</p>
        </div>

        {cronJobs.length === 0 ? (
          <p className="help-text">No cron jobs configured. Add jobs in your OpenClaw config.yaml file.</p>
        ) : (
          <div className="cron-jobs-list">
            {cronJobs.map(job => (
              <div key={job.id} className="cron-job-card">
                <div className="cron-job-header">
                  <div className="cron-job-name">{job.name}</div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={job.enabled}
                      onChange={() => toggleJob(job.id, !job.enabled)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="cron-job-details">
                  <div className="cron-row">
                    <span className="cron-label">Schedule:</span>
                    <code className="cron-schedule">{job.schedule}</code>
                  </div>
                  <div className="cron-row">
                    <span className="cron-label">Command:</span>
                    <code className="cron-command">{job.command}</code>
                  </div>
                  <div className="cron-row">
                    <span className="cron-label">Last Run:</span>
                    <span>{job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}</span>
                  </div>
                  {job.nextRun && (
                    <div className="cron-row">
                      <span className="cron-label">Next Run:</span>
                      <span>{new Date(job.nextRun).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {job.lastOutput && (
                  <div className="cron-job-output">
                    <div className="cron-row">
                      <span className="cron-label">Last Output:</span>
                    </div>
                    <pre className="cron-output">{job.lastOutput}</pre>
                  </div>
                )}

                <div className="cron-job-actions">
                  <button
                    className="btn btn-sm"
                    onClick={() => handleRunJob(job.id)}
                    disabled={!job.enabled || runningJobId === job.id}
                  >
                    {runningJobId === job.id ? 'Running...' : 'Run Now'}
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleViewLogs(job.id)}
                  >
                    {selectedJobForLogs === job.id ? 'Hide Logs' : 'View Logs'}
                  </button>
                </div>

                {selectedJobForLogs === job.id && (
                  <div className="cron-job-logs">
                    <h4>Recent Logs</h4>
                    {cronLogs.filter(log => log.jobId === job.id).length === 0 ? (
                      <p className="help-text">No logs available</p>
                    ) : (
                      <div className="cron-logs-list">
                        {cronLogs.filter(log => log.jobId === job.id).map((log, idx) => (
                          <div key={idx} className="cron-log-entry">
                            <div className="log-header">
                              <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
                              <span className={`log-status ${log.exitCode === 0 ? 'success' : 'error'}`}>
                                {log.exitCode === 0 ? 'Success' : `Failed (code: ${log.exitCode})`}
                              </span>
                              <span className="log-duration">{(log.duration / 1000).toFixed(2)}s</span>
                            </div>
                            {log.output && <pre className="log-output">{log.output}</pre>}
                            {log.error && <pre className="log-error">{log.error}</pre>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAgentSection = () => {
    const formatTime = (timestamp?: number) => {
      if (!timestamp) return 'Never';
      return new Date(timestamp).toLocaleString();
    };

    const formatExpiry = (expires?: number) => {
      if (!expires) return 'No expiration';
      const now = Date.now();
      if (expires < now) return 'Expired';
      const days = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
      return `${days} day${days !== 1 ? 's' : ''} remaining`;
    };

    if (!agentInfo) {
      return (
        <div className="agent-section">
          <div className="section-header">
            <h2>Agent</h2>
            <p className="subtitle">View and manage your AI agent configuration</p>
          </div>
          <div className="loading-state">Loading agent information...</div>
        </div>
      );
    }

    return (
      <div className="agent-section">
        <div className="section-header">
          <h2>Agent</h2>
          <p className="subtitle">View and manage your AI agent configuration</p>
        </div>

        <div className="agent-grid">
          {/* Agent Info Card */}
          <div className="agent-card">
            <h3>Agent Configuration</h3>
            <div className="agent-stat">
              <div className="stat-row">
                <span className="stat-label">Name:</span>
                <span className="stat-value">{agentInfo.name}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">ID:</span>
                <span className="stat-value">{agentInfo.id}</span>
              </div>
              {agentInfo.model && (
                <div className="stat-row">
                  <span className="stat-label">Model:</span>
                  <span className="stat-value">{agentInfo.model}</span>
                </div>
              )}
              <div className="stat-row">
                <span className="stat-label">Config Path:</span>
                <span className="stat-value stat-code">{agentInfo.configPath}</span>
              </div>
            </div>
          </div>

          {/* Auth Profiles Card */}
          <div className="agent-card full-width">
            <h3>Authentication Profiles</h3>
            {agentInfo.authProfiles.length === 0 ? (
              <p className="help-text">No authentication profiles configured</p>
            ) : (
              <div className="auth-profiles-list">
                {agentInfo.authProfiles.map((profile, idx) => (
                  <div key={idx} className="auth-profile-card">
                    <div className="auth-profile-header">
                      <span className="auth-profile-name">{profile.profileId}</span>
                      <span className={`badge ${profile.type === 'oauth' ? 'badge-primary' : 'badge-secondary'}`}>
                        {profile.type === 'oauth' ? 'OAuth' : 'API Key'}
                      </span>
                    </div>
                    <div className="auth-profile-details">
                      {profile.provider && (
                        <div className="stat-row">
                          <span className="stat-label">Provider:</span>
                          <span className="stat-value">{profile.provider}</span>
                        </div>
                      )}
                      {profile.email && (
                        <div className="stat-row">
                          <span className="stat-label">Email:</span>
                          <span className="stat-value">{profile.email}</span>
                        </div>
                      )}
                      <div className="stat-row">
                        <span className="stat-label">Status:</span>
                        <span className={`stat-value ${profile.expires && profile.expires < Date.now() ? 'error' : 'success'}`}>
                          {profile.expires && profile.expires < Date.now() ? 'Expired' : 'Active'}
                        </span>
                      </div>
                      {profile.expires && (
                        <div className="stat-row">
                          <span className="stat-label">Expires:</span>
                          <span className="stat-value">{formatExpiry(profile.expires)}</span>
                        </div>
                      )}
                      {profile.created && (
                        <div className="stat-row">
                          <span className="stat-label">Created:</span>
                          <span className="stat-value">{formatTime(profile.created)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className="btn" onClick={refreshAgentInfo} style={{ marginTop: '24px' }}>
          Refresh
        </button>
      </div>
    );
  };

  const renderMemorySection = () => {
    const formatBytes = (bytes: number) => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let value = bytes;
      let unitIndex = 0;
      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
      }
      return `${value.toFixed(1)} ${units[unitIndex]}`;
    };

    if (!memoryInfo) {
      return (
        <div className="memory-section">
          <div className="section-header">
            <h2>Memory Usage</h2>
            <p className="subtitle">Monitor system and application memory</p>
          </div>
          <div className="loading-state">Loading memory information...</div>
        </div>
      );
    }

    return (
      <div className="memory-section">
        <div className="section-header">
          <h2>Memory Usage</h2>
          <p className="subtitle">Monitor system and application memory</p>
        </div>

        <div className="memory-grid">
          {/* System Memory */}
          <div className="memory-card">
            <h3>System Memory</h3>
            <div className="memory-stat">
              <div className="memory-bar-container">
                <div
                  className="memory-bar"
                  style={{ width: `${memoryInfo.systemMemory.percent}%` }}
                ></div>
              </div>
              <div className="memory-stats-row">
                <span className="memory-label">Used: {formatBytes(memoryInfo.systemMemory.used)}</span>
                <span className="memory-value">{memoryInfo.systemMemory.percent.toFixed(1)}%</span>
              </div>
              <div className="memory-stats-row">
                <span className="memory-label">Total: {formatBytes(memoryInfo.systemMemory.total)}</span>
                <span className="memory-label">Free: {formatBytes(memoryInfo.systemMemory.free)}</span>
              </div>
            </div>
          </div>

          {/* Process Memory */}
          <div className="memory-card">
            <h3>Clawrap Process</h3>
            <div className="memory-stat">
              <div className="memory-stats-row">
                <span className="memory-label">RSS:</span>
                <span className="memory-value">{formatBytes(memoryInfo.processMemory.rss)}</span>
              </div>
              <div className="memory-stats-row">
                <span className="memory-label">Heap Used:</span>
                <span className="memory-value">{formatBytes(memoryInfo.processMemory.heapUsed)}</span>
              </div>
              <div className="memory-stats-row">
                <span className="memory-label">Heap Total:</span>
                <span className="memory-value">{formatBytes(memoryInfo.processMemory.heapTotal)}</span>
              </div>
            </div>
          </div>

          {/* Gateway Memory */}
          {memoryInfo.gatewayMemory && memoryInfo.gatewayMemory.pid ? (
            <div className="memory-card">
              <h3>OpenClaw Gateway</h3>
              <div className="memory-stat">
                <div className="memory-stats-row">
                  <span className="memory-label">PID:</span>
                  <span className="memory-value">{memoryInfo.gatewayMemory.pid}</span>
                </div>
                {memoryInfo.gatewayMemory.memory && (
                  <div className="memory-stats-row">
                    <span className="memory-label">Memory:</span>
                    <span className="memory-value">{formatBytes(memoryInfo.gatewayMemory.memory)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="memory-card">
              <h3>OpenClaw Gateway</h3>
              <div className="memory-stat">
                <p className="help-text">Gateway process info not available</p>
              </div>
            </div>
          )}
        </div>

        <button className="btn" onClick={refreshMemory} style={{ marginTop: '24px' }}>
          Refresh
        </button>

        {/* Personality Files Tabs */}
        <div className="personality-section" style={{ marginTop: '40px' }}>
          <div className="section-header">
            <h2>Personality</h2>
            <p className="subtitle">Agent personality and behavior configuration</p>
          </div>

          {loadingPersonality ? (
            <div className="loading-state">Loading personality files...</div>
          ) : personalityFiles.length === 0 ? (
            <p className="help-text">No personality files found</p>
          ) : (
            <div className="personality-tabs">
              <div className="personality-tab-header">
                <div className="personality-tab-list">
                  {personalityFiles.map(file => (
                    <button
                      key={file.name}
                      className={`personality-tab ${activePersonalityTab === file.name ? 'active' : ''}`}
                      onClick={() => {
                        setActivePersonalityTab(file.name);
                        setEditingPersonality(false);
                      }}
                      disabled={editingPersonality}
                    >
                      {file.name}
                    </button>
                  ))}
                </div>
                <div className="personality-actions">
                  {editingPersonality ? (
                    <>
                      <button
                        className="btn btn-sm"
                        onClick={handleSavePersonalityFile}
                        disabled={savingPersonality}
                      >
                        {savingPersonality ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setEditingPersonality(false);
                          const activeFile = personalityFiles.find(f => f.name === activePersonalityTab);
                          if (activeFile) setEditedContent(activeFile.content);
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-sm"
                      onClick={() => setEditingPersonality(true)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              {saveStatus && (
                <div className={`save-status ${saveStatus.success ? 'success' : 'error'}`}>
                  {saveStatus.message}
                </div>
              )}
              <div className="personality-content">
                {editingPersonality ? (
                  <textarea
                    className="personality-editor"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  personalityFiles
                    .filter(f => f.name === activePersonalityTab)
                    .map(file => (
                      <pre key={file.name} className="personality-file-content">{file.content}</pre>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
            {(['overview', 'memory', 'agent', 'crons', 'skills', 'tools', 'channels', 'models', 'about'] as const).map(section => (
              <button
                key={section}
                className={`nav-item ${activeSection === section ? 'active' : ''}`}
                onClick={() => setActiveSection(section)}
              >
                {TEXTS.settings[section] || section}
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          {activeSection === 'overview' && renderOverviewSection()}
          {activeSection === 'memory' && renderMemorySection()}
          {activeSection === 'agent' && renderAgentSection()}
          {activeSection === 'crons' && renderCronSection()}
          {activeSection === 'skills' && renderSkillsSection()}
          {activeSection === 'tools' && renderToolsSection()}
          {activeSection === 'channels' && renderChannelsSection()}
          {activeSection === 'models' && renderModelsSection()}
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
