import React, { useState } from 'react';
import { useApp, useSetView, useModels, useGateway, useSkills, useTools, useChannels, useCron, useMemory, useAgent, useToken, usePermission, useTask, useHealth } from '../store/appStore';
import { TEXTS } from '../lib/texts';
import { AddModelModal } from './AddModelModal';
import { ConfirmDialog } from './ConfirmDialog';
import { AgentDialog } from './AgentDialog';
import { ModelConfig, PersonalityFile, AgentSummary, AgentInfo, AgentAuthProfile, PermissionSettings, TaskReliabilitySettings } from '@shared/types';
import { ipc } from '../lib/ipc';

export function SettingsView() {
  const setView = useSetView();
  const { state } = useApp();
  const { savedModels, primaryModel, fallbackModel, imageModel, addModel, updateModel, removeModel } = useModels();
  const { gatewayStatus, restartGateway } = useGateway();
  const { skills, setSkills } = useSkills();
  const { tools, setTools } = useTools();
  const { channels, setChannels } = useChannels();
  const { cronJobs, cronLogs, refreshCronJobs, refreshCronLogs, runJob, toggleJob, removeJob } = useCron();
  const { memoryInfo, refreshMemory } = useMemory();
  const { agentInfo, agentList, refreshAgentList, refreshAgentInfo } = useAgent();
  const { tokenUsage, refreshTokenUsage } = useToken();
  const { permissionInfo, permissionSettings, refreshPermissionInfo, refreshPermissionSettings, updatePermissionSettings } = usePermission();
  const { taskHistory, taskStats, taskReliabilitySettings, refreshTaskHistory, refreshTaskStats, refreshTaskReliabilitySettings, updateTaskReliabilitySettings } = useTask();
  const { healthCheck, runHealthCheck, fixIssue } = useHealth();

  const config = state.config;

  // Consolidated navigation: dashboard, permissions, models, extensions, agent, automation, gateway, about
  const [activeSection, setActiveSection] = useState('dashboard');
  // Tab states for consolidated sections
  const [extensionsTab, setExtensionsTab] = useState('skills');
  const [automationTab, setAutomationTab] = useState('crons');
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
  const [mainAgentInfo, setMainAgentInfo] = useState<AgentInfo | null>(null);
  const [selectedAgentForDialog, setSelectedAgentForDialog] = useState<AgentSummary | null>(null);
  const [dialogAgentInfo, setDialogAgentInfo] = useState<AgentInfo | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [localPermissionSettings, setLocalPermissionSettings] = useState<PermissionSettings | null>(null);
  const [localTaskReliabilitySettings, setLocalTaskReliabilitySettings] = useState<TaskReliabilitySettings | null>(null);
  const [fixingHealthIssue, setFixingHealthIssue] = useState<string | null>(null);

  // Skills Hub state
  const [hubSkills, setHubSkills] = useState<any[]>([]);
  const [loadingHubSkills, setLoadingHubSkills] = useState(false);
  const [installingSkill, setInstallingSkill] = useState<string | null>(null);
  const [uninstallingSkill, setUninstallingSkill] = useState<string | null>(null);
  const [showHubSkills, setShowHubSkills] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm?: () => void;
  } | null>({ show: false, title: '', message: '' });

  // Poll memory info when on memory/agent section
  React.useEffect(() => {
    if (activeSection === 'memory' || activeSection === 'agent') {
      refreshMemory();
      const interval = setInterval(refreshMemory, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSection, refreshMemory]);

  // Poll token usage when on dashboard section
  React.useEffect(() => {
    if (activeSection === 'dashboard') {
      refreshTokenUsage();
    }
  }, [activeSection, refreshTokenUsage]);

  // Load permission settings when on permissions section
  React.useEffect(() => {
    if (activeSection === 'permissions') {
      refreshPermissionSettings().then((settings) => {
        setLocalPermissionSettings(settings);
      });
      refreshPermissionInfo();
    }
  }, [activeSection, refreshPermissionSettings, refreshPermissionInfo]);

  // Load task data when on automation section
  React.useEffect(() => {
    if (activeSection === 'automation') {
      refreshTaskStats();
      refreshTaskHistory();
      refreshTaskReliabilitySettings().then((settings) => {
        setLocalTaskReliabilitySettings(settings);
      });
    }
  }, [activeSection, refreshTaskStats, refreshTaskHistory, refreshTaskReliabilitySettings]);

  // Load health check when on dashboard section
  React.useEffect(() => {
    if (activeSection === 'dashboard') {
      runHealthCheck();
    }
  }, [activeSection, runHealthCheck]);

  // Track if we've initialized the agent section
  const agentInitialized = React.useRef(false);

  // Poll agent info when on agent section
  React.useEffect(() => {
    if (activeSection === 'agent' && !agentInitialized.current) {
      agentInitialized.current = true;
      refreshAgentList().then((agents) => {
        if (agents.length > 0) {
          // Load main agent info first
          refreshAgentInfo('main');
        }
      });
    }
  }, [activeSection, refreshAgentList, refreshAgentInfo]);

  // Store main agent info when it loads
  React.useEffect(() => {
    if (agentInfo && agentInfo.id === 'main') {
      setMainAgentInfo(agentInfo);
    }
  }, [agentInfo]);

  // Load agent info when dialog is opened
  React.useEffect(() => {
    if (selectedAgentForDialog) {
      refreshAgentInfo(selectedAgentForDialog.id);
    }
  }, [selectedAgentForDialog, refreshAgentInfo]);

  // Update dialog agent info when agentInfo changes
  React.useEffect(() => {
    if (selectedAgentForDialog && agentInfo && agentInfo.id === selectedAgentForDialog.id) {
      setDialogAgentInfo(agentInfo);
    }
  }, [agentInfo, selectedAgentForDialog]);

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

  const fetchHubSkills = async () => {
    setLoadingHubSkills(true);
    try {
      const result = await ipc.fetchSkills();
      if (result.success) {
        setHubSkills(result.data || []);
        setShowHubSkills(true);
      }
    } finally {
      setLoadingHubSkills(false);
    }
  };

  const handleInstallSkill = async (skillId: string) => {
    setInstallingSkill(skillId);
    try {
      const result = await ipc.installSkill(skillId);
      if (result.success) {
        await setSkills([...skills, skillId]);
      }
    } finally {
      setInstallingSkill(null);
    }
  };

  const handleUninstallSkill = async (skillId: string) => {
    setUninstallingSkill(skillId);
    try {
      const result = await ipc.uninstallSkill(skillId);
      if (result.success) {
        await setSkills(skills.filter(s => s !== skillId));
      }
    } finally {
      setUninstallingSkill(null);
    }
  };

  const handleEditModel = (modelId: string) => {
    setEditingModel(modelId);
    setShowAddModelModal(true);
  };

  const handleRemoveModel = async (modelId: string, isPrimary: boolean) => {
    if (isPrimary) {
      setConfirmDialog({
        show: true,
        title: 'Cannot Remove',
        message: TEXTS.settings.cannotRemovePrimary,
        confirmText: 'OK',
        cancelText: '',
        isDestructive: false,
        onConfirm: () => setConfirmDialog(null),
      });
      return;
    }
    setConfirmDialog({
      show: true,
      title: 'Remove Model',
      message: `Are you sure you want to remove model "${modelId}"?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        await removeModel(modelId);
        setConfirmDialog(null);
      },
    });
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

        {/* Token Usage */}
        <div className="overview-card">
          <h3>Token Usage</h3>
          <div className="overview-stat">
            {tokenUsage ? (
              <>
                <div className="stat-row">
                  <span className="stat-label">Total Tokens:</span>
                  <span className="stat-value">{tokenUsage.totalTokens.toLocaleString()}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Est. Cost:</span>
                  <span className="stat-value">${tokenUsage.totalCost.toFixed(4)}</span>
                </div>
              </>
            ) : (
              <p className="help-text">Loading...</p>
            )}
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

  const renderUsageSection = () => (
    <div className="usage-section">
      <div className="section-header">
        <h2>Token Usage</h2>
        <p className="subtitle">Monitor token consumption and costs</p>
      </div>

      {!tokenUsage ? (
        <div className="loading-state">Loading usage information...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="usage-summary-grid">
            <div className="usage-card">
              <h3>Total Tokens</h3>
              <div className="usage-stat">{tokenUsage.totalTokens.toLocaleString()}</div>
            </div>
            <div className="usage-card">
              <h3>Estimated Cost</h3>
              <div className="usage-stat">${tokenUsage.totalCost.toFixed(4)}</div>
            </div>
            <div className="usage-card">
              <h3>Period</h3>
              <div className="usage-stat">
                {new Date(tokenUsage.period.start).toLocaleDateString()} - {new Date(tokenUsage.period.end).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* By Model Breakdown */}
          {tokenUsage.byModel && tokenUsage.byModel.length > 0 && (
            <div className="usage-section-block">
              <h3>Cost by Model</h3>
              <div className="usage-table">
                <table>
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Provider</th>
                      <th>Input Tokens</th>
                      <th>Output Tokens</th>
                      <th>Total Tokens</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenUsage.byModel.map((byModel, idx) => (
                      <tr key={idx}>
                        <td>{byModel.modelName}</td>
                        <td>{byModel.provider}</td>
                        <td>{byModel.inputTokens.toLocaleString()}</td>
                        <td>{byModel.outputTokens.toLocaleString()}</td>
                        <td>{byModel.totalTokens.toLocaleString()}</td>
                        <td>${byModel.cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily Usage */}
          {tokenUsage.dailyUsage && tokenUsage.dailyUsage.length > 0 && (
            <div className="usage-section-block">
              <h3>Daily Usage</h3>
              <div className="usage-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Input Tokens</th>
                      <th>Output Tokens</th>
                      <th>Total Tokens</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenUsage.dailyUsage.map((day, idx) => (
                      <tr key={idx}>
                        <td>{new Date(day.date).toLocaleDateString()}</td>
                        <td>{day.inputTokens.toLocaleString()}</td>
                        <td>{day.outputTokens.toLocaleString()}</td>
                        <td>{day.totalTokens.toLocaleString()}</td>
                        <td>${day.cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderPermissionsSection = () => {
    const handleSave = async () => {
      if (!localPermissionSettings) return;
      setSavingSettings(true);
      try {
        await updatePermissionSettings(localPermissionSettings);
      } finally {
        setSavingSettings(false);
      }
    };

    if (!localPermissionSettings || !permissionInfo) {
      return (
        <div className="permissions-section">
          <div className="section-header">
            <h2>Permissions</h2>
            <p className="subtitle">Control file access, network requests, and command execution</p>
          </div>
          <div className="loading-state">Loading permission settings...</div>
        </div>
      );
    }

    return (
      <div className="permissions-section">
        <div className="section-header">
          <h2>Permissions</h2>
          <p className="subtitle">Control file access, network requests, and command execution</p>
        </div>

        {/* Permission Dashboard */}
        <div className="permission-dashboard">
          <div className="permission-stat-card">
            <h3>File Access</h3>
            <div className="permission-stat">
              <div className="stat-row">
                <span className="stat-label">Mode:</span>
                <span className="stat-value">{permissionInfo.fileAccess.mode}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Reads:</span>
                <span className="stat-value">{permissionInfo.fileAccess.totalReads}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Writes:</span>
                <span className="stat-value">{permissionInfo.fileAccess.totalWrites}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Deletes:</span>
                <span className="stat-value">{permissionInfo.fileAccess.totalDeletes}</span>
              </div>
            </div>
          </div>

          <div className="permission-stat-card">
            <h3>Network Access</h3>
            <div className="permission-stat">
              <div className="stat-row">
                <span className="stat-label">Whitelist Mode:</span>
                <span className="stat-value">{permissionInfo.networkAccess.whitelistMode ? 'Yes' : 'No'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total Requests:</span>
                <span className="stat-value">{permissionInfo.networkAccess.totalRequests}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Blocked:</span>
                <span className="stat-value" style={{ color: permissionInfo.networkAccess.blockedRequests > 0 ? 'var(--error)' : 'inherit' }}>
                  {permissionInfo.networkAccess.blockedRequests}
                </span>
              </div>
            </div>
          </div>

          <div className="permission-stat-card">
            <h3>Command Execution</h3>
            <div className="permission-stat">
              <div className="stat-row">
                <span className="stat-label">Require Confirmation:</span>
                <span className="stat-value">{permissionInfo.commandExecution.requireConfirmation ? 'Yes' : 'No'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Executed:</span>
                <span className="stat-value">{permissionInfo.commandExecution.totalExecuted}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Blocked:</span>
                <span className="stat-value" style={{ color: permissionInfo.commandExecution.blockedCommands > 0 ? 'var(--error)' : 'inherit' }}>
                  {permissionInfo.commandExecution.blockedCommands}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* File Access Settings */}
        <div className="permission-settings-block">
          <h3>File Access</h3>
          <div className="form-group">
            <label>Access Mode</label>
            <select
              className="form-select"
              value={localPermissionSettings.fileAccess.mode}
              onChange={(e) => setLocalPermissionSettings({
                ...localPermissionSettings,
                fileAccess: { ...localPermissionSettings.fileAccess, mode: e.target.value as 'readonly' | 'specific_dirs' | 'full_access' },
              })}
            >
              <option value="readonly">Read Only</option>
              <option value="specific_dirs">Specific Directories</option>
              <option value="full_access">Full Access</option>
            </select>
          </div>

          {localPermissionSettings.fileAccess.mode === 'specific_dirs' && (
            <div className="form-group">
              <label>Allowed Directories (one per line)</label>
              <textarea
                className="form-input"
                rows={4}
                value={localPermissionSettings.fileAccess.allowedDirs.join('\n')}
                onChange={(e) => setLocalPermissionSettings({
                  ...localPermissionSettings,
                  fileAccess: { ...localPermissionSettings.fileAccess, allowedDirs: e.target.value.split('\n').filter(d => d.trim()) },
                })}
                placeholder="/Users/username/projects&#10;/Volumes/data"
              />
            </div>
          )}
        </div>

        {/* Network Settings */}
        <div className="permission-settings-block">
          <h3>Network Access</h3>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label className="toggle-switch" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={localPermissionSettings.network.whitelistMode}
                onChange={(e) => setLocalPermissionSettings({
                  ...localPermissionSettings,
                  network: { ...localPermissionSettings.network, whitelistMode: e.target.checked },
                })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span style={{ flex: 1 }}>Whitelist Mode (only allow listed hosts)</span>
          </div>

          {localPermissionSettings.network.whitelistMode && (
            <div className="form-group">
              <label>Allowed Hosts (one per line)</label>
              <textarea
                className="form-input"
                rows={4}
                value={localPermissionSettings.network.allowedHosts.join('\n')}
                onChange={(e) => setLocalPermissionSettings({
                  ...localPermissionSettings,
                  network: { ...localPermissionSettings.network, allowedHosts: e.target.value.split('\n').filter(h => h.trim()) },
                })}
                placeholder="api.anthropic.com&#10;api.openai.com"
              />
            </div>
          )}
        </div>

        {/* Command Execution Settings */}
        <div className="permission-settings-block">
          <h3>Command Execution</h3>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label className="toggle-switch" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={localPermissionSettings.commands.requireConfirmation}
                onChange={(e) => setLocalPermissionSettings({
                  ...localPermissionSettings,
                  commands: { ...localPermissionSettings.commands, requireConfirmation: e.target.checked },
                })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span style={{ flex: 1 }}>Require confirmation before executing commands</span>
          </div>
        </div>

        <button className="btn" onClick={handleSave} disabled={savingSettings} style={{ marginTop: '24px' }}>
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    );
  };

  const renderTasksSection = () => {
    const formatDuration = (ms?: number) => {
      if (!ms) return '-';
      const seconds = (ms / 1000).toFixed(1);
      return `${seconds}s`;
    };

    const formatTime = (timestamp?: number) => {
      if (!timestamp) return '-';
      return new Date(timestamp).toLocaleString();
    };

    const handleSaveReliabilitySettings = async () => {
      if (!localTaskReliabilitySettings) return;
      setSavingSettings(true);
      try {
        await updateTaskReliabilitySettings(localTaskReliabilitySettings);
      } finally {
        setSavingSettings(false);
      }
    };

    return (
      <div className="tasks-section">
        <div className="section-header">
          <h2>Task Reliability</h2>
          <p className="subtitle">Monitor task history and configure reliability settings</p>
        </div>

        {/* Task Statistics */}
        {taskStats && (
          <div className="task-stats-dashboard">
            <div className="task-stat-card">
              <h3>Overview</h3>
              <div className="task-stat">
                <div className="stat-row">
                  <span className="stat-label">Total Tasks:</span>
                  <span className="stat-value">{taskStats.totalTasks}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Completed:</span>
                  <span className="stat-value" style={{ color: 'var(--success)' }}>{taskStats.completedTasks}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Failed:</span>
                  <span className="stat-value" style={{ color: 'var(--error)' }}>{taskStats.failedTasks}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Running:</span>
                  <span className="stat-value">{taskStats.runningTasks}</span>
                </div>
              </div>
            </div>

            <div className="task-stat-card">
              <h3>Performance</h3>
              <div className="task-stat">
                <div className="stat-row">
                  <span className="stat-label">Avg Duration:</span>
                  <span className="stat-value">{formatDuration(taskStats.averageDuration)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Failure Rate:</span>
                  <span className="stat-value" style={{ color: taskStats.failureRate > 20 ? 'var(--error)' : 'var(--success)' }}>
                    {taskStats.failureRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Failures */}
        {taskStats && taskStats.recentFailures.length > 0 && (
          <div className="task-section-block">
            <h3>Recent Failures</h3>
            <div className="task-history-table">
              <table>
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Type</th>
                    <th>Start Time</th>
                    <th>Duration</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {taskStats.recentFailures.map((task) => (
                    <tr key={task.id}>
                      <td>{task.name}</td>
                      <td>{task.type}</td>
                      <td>{formatTime(task.startTime)}</td>
                      <td>{formatDuration(task.duration)}</td>
                      <td style={{ color: 'var(--error)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Task History */}
        <div className="task-section-block">
          <h3>Task History</h3>
          {taskHistory.length === 0 ? (
            <p className="help-text">No task history available</p>
          ) : (
            <div className="task-history-list">
              {taskHistory.slice().reverse().map((task) => (
                <div key={task.id} className="task-history-item">
                  <div className="task-history-header">
                    <div className="task-history-name">
                      <span>{task.name}</span>
                      <span className={`badge ${
                        task.status === 'completed' ? 'badge-success' :
                        task.status === 'failed' ? 'badge-error' :
                        task.status === 'running' ? 'badge-running' : 'badge-secondary'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <span className="task-history-type">{task.type}</span>
                  </div>
                  <div className="task-history-details">
                    <span>Start: {formatTime(task.startTime)}</span>
                    <span>Duration: {formatDuration(task.duration)}</span>
                    {task.retryCount > 0 && <span>Retries: {task.retryCount}</span>}
                  </div>
                  {task.error && <div className="task-history-error">{task.error}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reliability Settings */}
        {localTaskReliabilitySettings && (
          <div className="task-section-block">
            <h3>Reliability Settings</h3>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label className="toggle-switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={localTaskReliabilitySettings.autoRetry.enabled}
                  onChange={(e) => setLocalTaskReliabilitySettings({
                    ...localTaskReliabilitySettings,
                    autoRetry: { ...localTaskReliabilitySettings.autoRetry, enabled: e.target.checked },
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
              <span style={{ flex: 1 }}>Enable automatic retry on failure</span>
            </div>

            {localTaskReliabilitySettings.autoRetry.enabled && (
              <>
                <div className="form-group">
                  <label>Max Retries</label>
                  <input
                    type="number"
                    className="form-input"
                    value={localTaskReliabilitySettings.autoRetry.maxRetries}
                    onChange={(e) => setLocalTaskReliabilitySettings({
                      ...localTaskReliabilitySettings,
                      autoRetry: { ...localTaskReliabilitySettings.autoRetry, maxRetries: parseInt(e.target.value) || 0 },
                    })}
                    min={0}
                    max={10}
                  />
                </div>

                <div className="form-group">
                  <label>Retry Delay (ms)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={localTaskReliabilitySettings.autoRetry.retryDelay}
                    onChange={(e) => setLocalTaskReliabilitySettings({
                      ...localTaskReliabilitySettings,
                      autoRetry: { ...localTaskReliabilitySettings.autoRetry, retryDelay: parseInt(e.target.value) || 0 },
                    })}
                    min={0}
                    step={1000}
                  />
                </div>

                <div className="form-group">
                  <label>Backoff Multiplier</label>
                  <input
                    type="number"
                    className="form-input"
                    value={localTaskReliabilitySettings.autoRetry.backoffMultiplier}
                    onChange={(e) => setLocalTaskReliabilitySettings({
                      ...localTaskReliabilitySettings,
                      autoRetry: { ...localTaskReliabilitySettings.autoRetry, backoffMultiplier: parseFloat(e.target.value) || 1 },
                    })}
                    min={1}
                    max={5}
                    step={0.5}
                  />
                  <p className="help-text" style={{ marginTop: '8px' }}>
                    Each retry will wait {localTaskReliabilitySettings.autoRetry.backoffMultiplier}x longer than the previous
                  </p>
                </div>
              </>
            )}

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Task Timeout (ms, 0 = no timeout)</label>
              <input
                type="number"
                className="form-input"
                value={localTaskReliabilitySettings.timeout}
                onChange={(e) => setLocalTaskReliabilitySettings({
                  ...localTaskReliabilitySettings,
                  timeout: parseInt(e.target.value) || 0,
                })}
                min={0}
                step={60000}
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label className="toggle-switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={localTaskReliabilitySettings.notifyOnFailure}
                  onChange={(e) => setLocalTaskReliabilitySettings({
                    ...localTaskReliabilitySettings,
                    notifyOnFailure: e.target.checked,
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
              <span style={{ flex: 1 }}>Notify on task failure</span>
            </div>

            <div className="form-group" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label className="toggle-switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={localTaskReliabilitySettings.checkpointEnabled}
                  onChange={(e) => setLocalTaskReliabilitySettings({
                    ...localTaskReliabilitySettings,
                    checkpointEnabled: e.target.checked,
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
              <span style={{ flex: 1 }}>Enable checkpoint for long-running tasks (experimental)</span>
            </div>

            <button className="btn" onClick={handleSaveReliabilitySettings} disabled={savingSettings} style={{ marginTop: '24px' }}>
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Consolidated render functions for merged sections

  const renderDashboardSection = () => (
    <div className="dashboard-section">
      <div className="section-header">
        <h2>{TEXTS.settings.dashboard}</h2>
        <p className="subtitle">System status, token usage, and health overview</p>
      </div>

      {/* Health Status Banner */}
      {healthCheck && (
        <div className={`health-overall-status ${healthCheck.overall}`} style={{ marginBottom: '20px' }}>
          <div className="health-status-icon">
            {healthCheck.overall === 'healthy' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : healthCheck.overall === 'warning' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            )}
          </div>
          <div className="health-status-info">
            <h3>System Status: {healthCheck.overall === 'healthy' ? 'Healthy' : healthCheck.overall}</h3>
            <p className="subtitle">Last checked: {new Date(healthCheck.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Token Usage Summary */}
      {tokenUsage && (
        <div className="usage-summary-grid" style={{ marginBottom: '20px' }}>
          <div className="usage-card">
            <h3>Total Tokens</h3>
            <div className="usage-stat">{tokenUsage.totalTokens.toLocaleString()}</div>
          </div>
          <div className="usage-card">
            <h3>Estimated Cost</h3>
            <div className="usage-stat">${tokenUsage.totalCost.toFixed(4)}</div>
          </div>
          <div className="usage-card">
            <h3>Period</h3>
            <div className="usage-stat">
              {new Date(tokenUsage.period.start).toLocaleDateString()} - {new Date(tokenUsage.period.end).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* System Status Grid */}
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
      </div>

      {/* Health Checks List */}
      {healthCheck && healthCheck.checks && healthCheck.checks.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Health Checks</h3>
          <div className="health-checks-list">
            {healthCheck.checks.map((check) => (
              <div key={check.id} className={`health-check-item ${check.status}`}>
                <div className="health-check-header">
                  <div className="health-check-name">
                    <span>{check.name}</span>
                    <span className={`badge ${check.status === 'pass' ? 'badge-success' : check.status === 'warning' ? 'badge-warning' : 'badge-error'}`}>{check.status}</span>
                  </div>
                </div>
                {check.message && <p className="health-check-message">{check.message}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderExtensionsSection = () => (
    <div className="extensions-section">
      <div className="section-header">
        <h2>{TEXTS.settings.extensions}</h2>
        <p className="subtitle">Manage skills, tools, and channels</p>
      </div>

      {/* Tabs */}
      <div className="personality-tab-header" style={{ marginBottom: '20px' }}>
        <div className="personality-tab-list">
          <button
            className={`personality-tab ${extensionsTab === 'skills' ? 'active' : ''}`}
            onClick={() => setExtensionsTab('skills')}
          >
            {TEXTS.settings.skillsTab}
          </button>
          <button
            className={`personality-tab ${extensionsTab === 'tools' ? 'active' : ''}`}
            onClick={() => setExtensionsTab('tools')}
          >
            {TEXTS.settings.toolsTab}
          </button>
          <button
            className={`personality-tab ${extensionsTab === 'channels' ? 'active' : ''}`}
            onClick={() => setExtensionsTab('channels')}
          >
            {TEXTS.settings.channelsTab}
          </button>
        </div>
      </div>

      {/* Skills Tab */}
      {extensionsTab === 'skills' && (
        <div>
          <div className="section-subheader" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{TEXTS.skills.title}</h3>
            <button
              className="btn btn-sm btn-secondary"
              onClick={fetchHubSkills}
              disabled={loadingHubSkills}
            >
              {loadingHubSkills ? 'Loading...' : showHubSkills ? 'Refresh ClawHub' : 'Browse ClawHub'}
            </button>
          </div>

          {/* Installed Skills */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Installed Skills</h4>
            <div className="skills-list">
              {skills.length === 0 ? (
                <div className="loading-state">No installed skills</div>
              ) : (
                skills.map(skillId => {
                  const skillInfo = AVAILABLE_SKILLS.find(s => s.id === skillId);
                  return (
                    <div className={`skills-list-item enabled`} key={skillId}>
                      <label className="list-item-label">
                        <input
                          type="checkbox"
                          checked={skills.includes(skillId)}
                          onChange={() => handleSkillToggle(skillId)}
                        />
                        <span className="list-item-name">{skillInfo?.name || skillId}</span>
                      </label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="list-item-status">Installed</span>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleUninstallSkill(skillId)}
                          disabled={uninstallingSkill === skillId}
                        >
                          {uninstallingSkill === skillId ? '...' : 'Uninstall'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ClawHub Skills */}
          {showHubSkills && (
            <div>
              <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>ClawHub Skills</h4>
              <div className="skills-list">
                {loadingHubSkills ? (
                  <div className="loading-state">Loading skills from ClawHub...</div>
                ) : hubSkills.length === 0 ? (
                  <div className="loading-state">No skills available on ClawHub</div>
                ) : (
                  hubSkills.map((skill: any) => {
                    const isInstalled = skills.includes(skill.id);
                    return (
                      <div className={`skills-list-item ${isInstalled ? 'enabled' : ''}`} key={skill.id}>
                        <div className="list-item-label">
                          <span className="list-item-name">{skill.name || skill.id}</span>
                          {skill.description && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>{skill.description}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {isInstalled ? (
                            <>
                              <span className="list-item-status">Installed</span>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleUninstallSkill(skill.id)}
                                disabled={uninstallingSkill === skill.id}
                              >
                                {uninstallingSkill === skill.id ? '...' : 'Uninstall'}
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleInstallSkill(skill.id)}
                              disabled={installingSkill === skill.id}
                            >
                              {installingSkill === skill.id ? 'Installing...' : 'Install'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tools Tab */}
      {extensionsTab === 'tools' && (
        <div>
          <div className="section-subheader" style={{ marginBottom: '16px' }}>
            <h3>{TEXTS.tools.title}</h3>
          </div>
          <div className="tools-list">
            {tools.map(tool => (
              <div className={`tools-list-item ${tools.includes(tool) ? 'enabled' : ''}`} key={tool}>
                <label className="list-item-label">
                  <input
                    type="checkbox"
                    checked={tools.includes(tool)}
                    onChange={() => handleToolToggle(tool)}
                  />
                  <span className="list-item-name">{tool}</span>
                </label>
                <span className="list-item-status">{tools.includes(tool) ? 'Enabled' : 'Disabled'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channels Tab */}
      {extensionsTab === 'channels' && (
        <div>
          <div className="section-subheader" style={{ marginBottom: '16px' }}>
            <h3>{TEXTS.channels.title}</h3>
          </div>
          <div className="channels-list">
            {channels.map(channel => (
              <div className={`channels-list-item ${channel.enabled ? 'enabled' : ''}`} key={channel.type}>
                <label className="list-item-label">
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={() => handleChannelToggle(channel.type)}
                  />
                  <span className="list-item-name">{channel.type}</span>
                </label>
                <span className="list-item-status">{channel.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderAutomationSection = () => {
    const formatDuration = (ms?: number) => {
      if (!ms) return '-';
      const seconds = (ms / 1000).toFixed(1);
      return `${seconds}s`;
    };

    const formatTime = (timestamp?: number) => {
      if (!timestamp) return '-';
      return new Date(timestamp).toLocaleString();
    };

    return (
      <div className="automation-section">
        <div className="section-header">
          <h2>{TEXTS.settings.automation}</h2>
          <p className="subtitle">Scheduled tasks and execution history</p>
        </div>

        {/* Tabs */}
        <div className="personality-tab-header" style={{ marginBottom: '20px' }}>
          <div className="personality-tab-list">
            <button
              className={`personality-tab ${automationTab === 'crons' ? 'active' : ''}`}
              onClick={() => setAutomationTab('crons')}
            >
              {TEXTS.settings.cronJobsTab}
            </button>
            <button
              className={`personality-tab ${automationTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setAutomationTab('tasks')}
            >
              {TEXTS.settings.taskHistoryTab}
            </button>
            <button
              className={`personality-tab ${automationTab === 'reliability' ? 'active' : ''}`}
              onClick={() => setAutomationTab('reliability')}
            >
              {TEXTS.settings.reliabilitySettingsTab}
            </button>
          </div>
        </div>

        {/* Cron Jobs Tab */}
        {automationTab === 'crons' && (
          <div>
            <div className="cron-jobs-list">
              {cronJobs.length === 0 ? (
                <div className="loading-state">No scheduled jobs</div>
              ) : (
                cronJobs.map(job => (
                  <div key={job.id} className="cron-job-card">
                    <div className="cron-job-header">
                      <span className="cron-job-name">{job.name || job.id}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => runJob(job.id)}
                          disabled={runningJobId === job.id}
                        >
                          Run Now
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => toggleJob(job.id, !job.enabled)}
                        >
                          {job.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => removeJob(job.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="cron-job-details">
                      <div className="cron-row">
                        <span className="cron-label">Schedule:</span>
                        <span className="cron-schedule">{job.schedule}</span>
                      </div>
                      <div className="cron-row">
                        <span className="cron-label">Command:</span>
                        <span className="cron-command">{job.command}</span>
                      </div>
                    </div>
                    {selectedJobForLogs === job.id && cronLogs.length > 0 && (
                      <div className="cron-job-logs">
                        <h4>Recent Logs</h4>
                        <div className="cron-logs-list">
                          {cronLogs.slice(0, 5).map((log, idx) => (
                            <div key={idx} className="cron-log-entry">
                              <div className="log-header">
                                <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
                                <span className={`log-status ${log.exitCode === 0 ? 'success' : 'error'}`}>
                                  {log.exitCode === 0 ? 'Success' : 'Failed'}
                                </span>
                                <span className="log-duration">{formatDuration(log.duration)}</span>
                              </div>
                              {log.output && <div className="log-output"><pre>{log.output}</pre></div>}
                              {log.error && <div className="log-error"><pre>{log.error}</pre></div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="cron-job-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setSelectedJobForLogs(selectedJobForLogs === job.id ? null : job.id)}
                      >
                        {selectedJobForLogs === job.id ? 'Hide Logs' : 'View Logs'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Task History Tab */}
        {automationTab === 'tasks' && (
          <div>
            {taskStats && (
              <div className="task-stats-dashboard" style={{ marginBottom: '20px' }}>
                <div className="task-stat-card">
                  <h3>Total Tasks</h3>
                  <div className="task-stat">
                    <div className="stat-value" style={{ fontSize: '1.5rem' }}>{taskStats.totalTasks}</div>
                  </div>
                </div>
                <div className="task-stat-card">
                  <h3>Success Rate</h3>
                  <div className="task-stat">
                    <div className="stat-value success" style={{ fontSize: '1.5rem' }}>
                      {taskStats.totalTasks > 0 ? ((taskStats.totalTasks - (taskStats.failedTasks || 0)) / taskStats.totalTasks * 100).toFixed(1) : '0'}%
                    </div>
                  </div>
                </div>
                <div className="task-stat-card">
                  <h3>Avg Duration</h3>
                  <div className="task-stat">
                    <div className="stat-value" style={{ fontSize: '1.5rem' }}>{formatDuration(taskStats.averageDuration)}</div>
                  </div>
                </div>
              </div>
            )}
            <div className="task-history-list">
              {taskHistory.length === 0 ? (
                <div className="loading-state">No task history</div>
              ) : (
                taskHistory.slice(0, 20).map((task, idx) => (
                  <div key={idx} className="task-history-item">
                    <div className="task-history-header">
                      <div className="task-history-name">
                        <span>{task.name || task.type}</span>
                        <span className={`badge ${task.status === 'completed' ? 'badge-success' : task.status === 'failed' ? 'badge-error' : 'badge-running'}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                    <div className="task-history-details">
                      <span>Type: {task.type}</span>
                      <span>Duration: {formatDuration(task.duration)}</span>
                      <span>Time: {formatTime(task.startTime)}</span>
                    </div>
                    {task.error && <div className="task-history-error">{task.error}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Reliability Settings Tab */}
        {automationTab === 'reliability' && localTaskReliabilitySettings && (
          <div className="task-section-block">
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label className="toggle-switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={localTaskReliabilitySettings.autoRetry.enabled}
                  onChange={(e) => setLocalTaskReliabilitySettings({
                    ...localTaskReliabilitySettings,
                    autoRetry: { ...localTaskReliabilitySettings.autoRetry, enabled: e.target.checked },
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
              <span style={{ flex: 1 }}>Enable automatic retry on failure</span>
            </div>

            {localTaskReliabilitySettings.autoRetry.enabled && (
              <>
                <div className="form-group">
                  <label>Max Retries</label>
                  <input
                    type="number"
                    className="form-input"
                    value={localTaskReliabilitySettings.autoRetry.maxRetries}
                    onChange={(e) => setLocalTaskReliabilitySettings({
                      ...localTaskReliabilitySettings,
                      autoRetry: { ...localTaskReliabilitySettings.autoRetry, maxRetries: parseInt(e.target.value) || 0 },
                    })}
                    min={0}
                    max={10}
                  />
                </div>
                <div className="form-group">
                  <label>Retry Delay (ms)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={localTaskReliabilitySettings.autoRetry.retryDelay}
                    onChange={(e) => setLocalTaskReliabilitySettings({
                      ...localTaskReliabilitySettings,
                      autoRetry: { ...localTaskReliabilitySettings.autoRetry, retryDelay: parseInt(e.target.value) || 0 },
                    })}
                    min={0}
                    step={1000}
                  />
                </div>
              </>
            )}

            <button className="btn" onClick={async () => { await updateTaskReliabilitySettings(localTaskReliabilitySettings); }} disabled={savingSettings} style={{ marginTop: '24px' }}>
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAgentMergedSection = () => {
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

    return (
      <div className="agent-section">
        <div className="section-header">
          <h2>{TEXTS.settings.agent}</h2>
          <p className="subtitle">View and manage your AI agent configurations</p>
        </div>

        {agentList.length === 0 ? (
          <div className="loading-state">Loading agents...</div>
        ) : (
          <>
            {/* Main Agent */}
            {agentInfo && (
              <div className="agent-details" style={{ marginBottom: '32px' }}>
                <div className="agent-grid">
                  <div className="agent-card">
                    <h3>Main Agent Configuration</h3>
                    <div className="agent-stat">
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
                      <div className="stat-row">
                        <span className="stat-label">Config Path:</span>
                        <span className="stat-value" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{agentInfo.configPath}</span>
                      </div>
                    </div>
                  </div>

                  {/* Auth Profiles */}
                  {agentInfo.authProfiles && agentInfo.authProfiles.length > 0 && (
                    <div className="agent-card">
                      <h3>Auth Profiles</h3>
                      <div className="auth-profiles-list">
                        {agentInfo.authProfiles.map(profile => (
                          <div key={profile.profileId} className="auth-profile-card">
                            <div className="auth-profile-header">
                              <span className="auth-profile-name">{profile.provider || 'Unknown'}</span>
                              <span className="badge badge-primary">{profile.type}</span>
                            </div>
                            <div className="auth-profile-details">
                              {profile.email && (
                                <div className="stat-row">
                                  <span className="stat-label">Email:</span>
                                  <span className="stat-value">{profile.email}</span>
                                </div>
                              )}
                              <div className="stat-row">
                                <span className="stat-label">Expires:</span>
                                <span className="stat-value">{formatExpiry(profile.expires)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Personality Files */}
            <div className="personality-section" style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid var(--border)' }}>
              <div className="section-header">
                <h2>Personality Files</h2>
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
                      />
                    ) : (
                      <pre className="personality-file-content">
                        {personalityFiles.find(f => f.name === activePersonalityTab)?.content || ''}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

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

    const handleDisableJob = async (jobId: string) => {
      await toggleJob(jobId, false);
    };

    const handleRemoveJob = async (jobId: string) => {
      setConfirmDialog({
        show: true,
        title: 'Remove Cron Job',
        message: 'Are you sure you want to remove this cron job?',
        confirmText: 'Remove',
        cancelText: 'Cancel',
        isDestructive: true,
        onConfirm: async () => {
          await removeJob(jobId);
          setConfirmDialog(null);
        },
      });
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
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleDisableJob(job.id)}
                    disabled={!job.enabled}
                  >
                    Disable
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleRemoveJob(job.id)}
                  >
                    Remove
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

    // Separate main agent from created agents
    const mainAgentSummary = agentList.find(a => a.id === 'main');
    const createdAgents = agentList.filter(a => a.id !== 'main');

    return (
      <div className="agent-section">
        <div className="section-header">
          <h2>Agents</h2>
          <p className="subtitle">View and manage your AI agent configurations</p>
        </div>

        {agentList.length === 0 ? (
          <div className="loading-state">Loading agents...</div>
        ) : (
          <>
            {/* Main Agent - Always shown first */}
            {mainAgentSummary && (
              <div className="main-agent-section">
                {mainAgentInfo ? (
                  <div className="agent-details">
                    <div className="agent-grid">
                      {/* Agent Info Card */}
                      <div className="agent-card">
                        <h3>Main Agent Configuration</h3>
                        <div className="agent-stat">
                          <div className="stat-row">
                            <span className="stat-label">Name:</span>
                            <span className="stat-value">{mainAgentInfo.name}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">ID:</span>
                            <span className="stat-value">{mainAgentInfo.id}</span>
                          </div>
                          {mainAgentInfo.model && (
                            <div className="stat-row">
                              <span className="stat-label">Model:</span>
                              <span className="stat-value">{mainAgentInfo.model}</span>
                            </div>
                          )}
                          <div className="stat-row">
                            <span className="stat-label">Config Path:</span>
                            <span className="stat-value stat-code">{mainAgentInfo.configPath}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Auth Profiles Card */}
                    <div className="agent-card full-width" style={{ marginTop: '16px' }}>
                      <h3>Authentication Profiles</h3>
                      {mainAgentInfo.authProfiles.length === 0 ? (
                        <p className="help-text">No authentication profiles configured</p>
                      ) : (
                        <div className="auth-profiles-list">
                          {mainAgentInfo.authProfiles.map((profile: AgentAuthProfile, idx: number) => (
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
                ) : (
                  <div className="loading-state">Loading main agent details...</div>
                )}
              </div>
            )}

            {/* Created Agents - Shown as list below */}
            {createdAgents.length > 0 && (
              <div className="created-agents-section">
                <h3 style={{ marginBottom: '12px', fontSize: '15px', color: 'var(--text-secondary)' }}>Created Agents</h3>
                <div className="agent-list">
                  {createdAgents.map(agent => (
                    <div
                      key={agent.id}
                      className="agent-list-item"
                      onClick={() => {
                        setSelectedAgentForDialog(agent);
                        refreshAgentInfo(agent.id);
                      }}
                    >
                      <div className="agent-list-item-name">
                        <span>{agent.name}</span>
                        {agent.hasAuthProfiles && (
                          <span className="agent-list-item-indicator">🔐</span>
                        )}
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
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

  const renderHealthSection = () => {
    const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleString();
    };

    const getStatusBadgeClass = (status: string) => {
      switch (status) {
        case 'pass':
          return 'badge-success';
        case 'warning':
          return 'badge-warning';
        case 'error':
          return 'badge-error';
        default:
          return 'badge-secondary';
      }
    };

    const handleFixIssue = async (checkId: string) => {
      setFixingHealthIssue(checkId);
      try {
        await fixIssue(checkId);
      } finally {
        setFixingHealthIssue(null);
      }
    };

    return (
      <div className="health-section">
        <div className="section-header">
          <h2>Health Check</h2>
          <p className="subtitle">System health status and one-click fixes</p>
        </div>

        {!healthCheck ? (
          <div className="loading-state">Running health checks...</div>
        ) : (
          <>
            {/* Overall Status */}
            <div className={`health-overall-status ${healthCheck.overall}`}>
              <div className="health-status-icon">
                {healthCheck.overall === 'healthy' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : healthCheck.overall === 'warning' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                )}
              </div>
              <div className="health-status-info">
                <h3>Overall Status: {healthCheck.overall}</h3>
                <p className="subtitle">Last checked: {formatTime(healthCheck.timestamp)}</p>
              </div>
            </div>

            {/* Individual Checks */}
            <div className="health-checks-list">
              {healthCheck.checks.map((check) => (
                <div key={check.id} className={`health-check-item ${check.status}`}>
                  <div className="health-check-header">
                    <div className="health-check-name">
                      <span className="health-check-icon">
                        {check.status === 'pass' ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : check.status === 'warning' ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                        )}
                      </span>
                      <span>{check.name}</span>
                      <span className={`badge ${getStatusBadgeClass(check.status)}`}>{check.status}</span>
                    </div>
                    {check.canFix && check.status !== 'pass' && (
                      <button
                        className="btn btn-sm"
                        onClick={() => handleFixIssue(check.id)}
                        disabled={fixingHealthIssue === check.id}
                      >
                        {fixingHealthIssue === check.id ? 'Fixing...' : 'Fix Issue'}
                      </button>
                    )}
                  </div>
                  <p className="health-check-message">{check.message}</p>
                </div>
              ))}
            </div>

            <button className="btn" onClick={runHealthCheck} style={{ marginTop: '24px' }}>
              Re-run Health Check
            </button>
          </>
        )}
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
            {(['dashboard', 'permissions', 'models', 'extensions', 'agent', 'automation', 'gateway', 'about'] as const).map(section => (
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
          {activeSection === 'dashboard' && renderDashboardSection()}
          {activeSection === 'permissions' && renderPermissionsSection()}
          {activeSection === 'models' && renderModelsSection()}
          {activeSection === 'extensions' && renderExtensionsSection()}
          {activeSection === 'agent' && renderAgentMergedSection()}
          {activeSection === 'automation' && renderAutomationSection()}
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

      {confirmDialog && confirmDialog.show && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.onConfirm || (() => {})}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {selectedAgentForDialog && dialogAgentInfo && (
        <AgentDialog
          agentInfo={dialogAgentInfo}
          onClose={() => {
            setSelectedAgentForDialog(null);
            setDialogAgentInfo(null);
          }}
        />
      )}
    </div>
  );
}
