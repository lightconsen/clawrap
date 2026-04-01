// Type-safe IPC wrapper for React components
import { ModelConfig, OpenClawConfig, GatewayStatus, CronJob, CronLog, MemoryInfo, AgentInfo, AgentAuthProfile, PersonalityFile, AgentSummary, TokenUsageInfo, PermissionInfo, PermissionSettings, TaskHistory, TaskStats, TaskReliabilitySettings, HealthCheckResult } from '@shared/types';

export const ipc = {
  // Config
  getConfig: (): Promise<OpenClawConfig> => window.electronAPI.getConfig(),
  setModel: (model: ModelConfig): Promise<boolean> => window.electronAPI.setModel(model),
  setFallbackModel: (model: ModelConfig | null): Promise<boolean> => window.electronAPI.setFallbackModel(model),
  setImageModel: (model: ModelConfig | null): Promise<boolean> => window.electronAPI.setImageModel(model),
  setApiKey: (apiKey: string): Promise<boolean> => window.electronAPI.setApiKey(apiKey),
  setModelApiKey: (modelId: string, apiKey: string): Promise<boolean> => window.electronAPI.setModelApiKey(modelId, apiKey),
  getSkills: (): Promise<string[]> => window.electronAPI.getSkills(),
  setSkills: (skills: string[]): Promise<boolean> => window.electronAPI.setSkills(skills),
  getTools: (): Promise<string[]> => window.electronAPI.getTools(),
  setTools: (tools: string[]): Promise<boolean> => window.electronAPI.setTools(tools),
  getChannels: (): Promise<{ type: string; enabled: boolean }[]> => window.electronAPI.getChannels(),
  setChannels: (channels: { type: string; enabled: boolean }[]): Promise<boolean> => window.electronAPI.setChannels(channels),
  // Channels CLI API
  listChannels: (): Promise<{ success: boolean; output: string; error?: string }> => window.electronAPI.listChannels(),
  addChannel: (options: { channel: string; name?: string; token?: string; [key: string]: string | undefined }): Promise<{ success: boolean; output: string; message?: string; error?: string }> =>
    window.electronAPI.addChannel(options),
  removeChannel: (options: { channel: string; account?: string; delete?: boolean }): Promise<{ success: boolean; output: string; message?: string; error?: string }> =>
    window.electronAPI.removeChannel(options),

  // Models
  getSavedModels: (): Promise<ModelConfig[]> => window.electronAPI.getSavedModels(),
  addModel: (model: ModelConfig): Promise<boolean> => window.electronAPI.addModel(model),
  updateModel: (model: ModelConfig): Promise<boolean> => window.electronAPI.updateModel(model),
  removeModel: (id: string): Promise<boolean> => window.electronAPI.removeModel(id),

  // Gateway
  getGatewayStatus: (): Promise<GatewayStatus> => window.electronAPI.getGatewayStatus(),
  restartGateway: (): Promise<GatewayStatus> => window.electronAPI.restartGateway(),

  // Installation
  checkInstall: (): Promise<{ installed: boolean; path?: string; version?: string }> => window.electronAPI.checkInstall(),
  installOpenClaw: (): Promise<{ success: boolean; error?: string }> => window.electronAPI.installOpenClaw(),
  completeInstall: (): Promise<boolean> => window.electronAPI.completeInstall(),

  // Setup
  completeSetup: (config: { model: ModelConfig; apiKey: string }): Promise<boolean> => window.electronAPI.completeSetup(config),
  cancelSetup: (): Promise<void> => window.electronAPI.cancelSetup(),

  // External
  openExternal: (url: string): Promise<void> => window.electronAPI.openExternal(url),

  // Settings
  openSettings: (): Promise<void> => window.electronAPI.openSettings(),

  // Skills Hub
  fetchSkills: (): Promise<{ success: boolean; data: any[]; error?: string }> => window.electronAPI.fetchSkills(),
  installSkill: (skillId: string): Promise<{ success: boolean; error?: string }> => window.electronAPI.installSkill(skillId),
  uninstallSkill: (skillId: string): Promise<{ success: boolean; error?: string }> => window.electronAPI.uninstallSkill(skillId),
  installSkillFromZip: (): Promise<{ success: boolean; skillId?: string | null; skillName?: string; skillDescription?: string; skillVersion?: string; skillAuthor?: string; skillsDir?: string; error?: string }> => window.electronAPI.installSkillFromZip(),

  // Cron
  getCronJobs: (): Promise<{ jobs: CronJob[] }> => window.electronAPI.getCronJobs(),
  getCronLogs: (jobId?: string): Promise<{ logs: CronLog[] }> => window.electronAPI.getCronLogs(jobId),
  runCronJob: (jobId: string): Promise<{ success: boolean; output?: string; error?: string }> => window.electronAPI.runCronJob(jobId),
  toggleCronJob: (jobId: string, enabled: boolean): Promise<{ success: boolean }> => window.electronAPI.toggleCronJob(jobId, enabled),
  removeCronJob: (jobId: string): Promise<{ success: boolean; error?: string }> => window.electronAPI.removeCronJob(jobId),

  // Memory
  getMemoryInfo: (): Promise<MemoryInfo> => window.electronAPI.getMemoryInfo(),

  // Token Usage
  getTokenUsage: (): Promise<TokenUsageInfo> => window.electronAPI.getTokenUsage(),

  // Agent
  listAgents: (): Promise<{ agents: AgentSummary[] }> => window.electronAPI.listAgents(),
  getAgentInfo: (agentId?: string): Promise<AgentInfo> => window.electronAPI.getAgentInfo(agentId),
  getAuthProfiles: (agentId?: string): Promise<AgentAuthProfile[]> => window.electronAPI.getAuthProfiles(agentId),

  // Personality
  getPersonalityFiles: (): Promise<{ files: PersonalityFile[] }> => window.electronAPI.getPersonalityFiles(),
  savePersonalityFile: (name: string, content: string): Promise<{ success: boolean; error?: string }> => window.electronAPI.savePersonalityFile(name, content),

  // Permission
  getPermissionInfo: (): Promise<PermissionInfo> => window.electronAPI.getPermissionInfo(),
  getPermissionSettings: (): Promise<PermissionSettings> => window.electronAPI.getPermissionSettings(),
  updatePermissionSettings: (settings: PermissionSettings): Promise<{ success: boolean; error?: string }> => window.electronAPI.updatePermissionSettings(settings),

  // Task Reliability
  getTaskHistory: (): Promise<{ history: TaskHistory[] }> => window.electronAPI.getTaskHistory(),
  getTaskStats: (): Promise<TaskStats> => window.electronAPI.getTaskStats(),
  getTaskReliabilitySettings: (): Promise<TaskReliabilitySettings> => window.electronAPI.getTaskReliabilitySettings(),
  updateTaskReliabilitySettings: (settings: TaskReliabilitySettings): Promise<{ success: boolean; error?: string }> => window.electronAPI.updateTaskReliabilitySettings(settings),

  // Health Check
  runHealthCheck: (): Promise<HealthCheckResult> => window.electronAPI.runHealthCheck(),
  fixHealthIssue: (checkId: string): Promise<{ success: boolean; message?: string }> => window.electronAPI.fixHealthIssue(checkId),
};
