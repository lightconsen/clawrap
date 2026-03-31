import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { OpenClawConfig, GatewayStatus, ModelConfig, CronJob, CronLog, MemoryInfo, AgentInfo, AgentAuthProfile, AgentSummary } from '@shared/types';
import { ipc } from '../lib/ipc';

export type AppView = 'install' | 'setup' | 'terminal' | 'settings';

interface AppState {
  view: AppView;
  config: OpenClawConfig | null;
  gatewayStatus: GatewayStatus | null;
  savedModels: ModelConfig[];
  skills: string[];
  tools: string[];
  channels: { type: string; enabled: boolean }[];
  isLoading: boolean;
  error: string | null;
  initialViewLoaded: boolean;
  cronJobs: CronJob[];
  cronLogs: CronLog[];
  memoryInfo: MemoryInfo | null;
  agentInfo: AgentInfo | null;
  agentList: AgentSummary[];
}

type Action =
  | { type: 'SET_VIEW'; payload: AppView }
  | { type: 'SET_CONFIG'; payload: OpenClawConfig }
  | { type: 'SET_GATEWAY_STATUS'; payload: GatewayStatus }
  | { type: 'SET_SAVED_MODELS'; payload: ModelConfig[] }
  | { type: 'SET_SKILLS'; payload: string[] }
  | { type: 'SET_TOOLS'; payload: string[] }
  | { type: 'SET_CHANNELS'; payload: { type: string; enabled: boolean }[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIAL_VIEW_LOADED'; payload: boolean }
  | { type: 'UPDATE_MODEL'; payload: { slot: 'primary' | 'fallback' | 'image'; model: ModelConfig | null } }
  | { type: 'SET_CRON_JOBS'; payload: CronJob[] }
  | { type: 'SET_CRON_LOGS'; payload: CronLog[] }
  | { type: 'SET_MEMORY_INFO'; payload: MemoryInfo }
  | { type: 'SET_AGENT_INFO'; payload: AgentInfo }
  | { type: 'SET_AGENT_LIST'; payload: AgentSummary[] };

const initialState: AppState = {
  view: 'install',
  config: null,
  gatewayStatus: null,
  savedModels: [],
  skills: [],
  tools: [],
  channels: [],
  isLoading: true,
  error: null,
  initialViewLoaded: false,
  cronJobs: [],
  cronLogs: [],
  memoryInfo: null,
  agentInfo: null,
  agentList: [],
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'SET_GATEWAY_STATUS':
      return { ...state, gatewayStatus: action.payload };
    case 'SET_SAVED_MODELS':
      return { ...state, savedModels: action.payload };
    case 'SET_SKILLS':
      return { ...state, skills: action.payload };
    case 'SET_TOOLS':
      return { ...state, tools: action.payload };
    case 'SET_CHANNELS':
      return { ...state, channels: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_INITIAL_VIEW_LOADED':
      return { ...state, initialViewLoaded: action.payload };
    case 'UPDATE_MODEL':
      if (!state.config) return state;
      return {
        ...state,
        config: {
          ...state.config,
          settings: {
            ...state.config.settings,
            [action.payload.slot === 'primary' ? 'model' : action.payload.slot === 'fallback' ? 'fallbackModel' : 'imageModel']: action.payload.model,
          },
        },
      };
    case 'SET_CRON_JOBS':
      return { ...state, cronJobs: action.payload };
    case 'SET_CRON_LOGS':
      return { ...state, cronLogs: action.payload };
    case 'SET_MEMORY_INFO':
      return { ...state, memoryInfo: action.payload };
    case 'SET_AGENT_INFO':
      return { ...state, agentInfo: action.payload };
    case 'SET_AGENT_LIST':
      return { ...state, agentList: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Determine initial view based on installation and config status
  useEffect(() => {
    async function checkInitialView() {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const installCheck = await ipc.checkInstall();
        const config = await ipc.getConfig();

        dispatch({ type: 'SET_CONFIG', payload: config });
        dispatch({ type: 'SET_SKILLS', payload: config.settings.skills?.enabled || [] });
        dispatch({ type: 'SET_TOOLS', payload: config.settings.tools?.enabled || [] });
        dispatch({ type: 'SET_CHANNELS', payload: config.settings.bypass_channels || [] });
        dispatch({ type: 'SET_SAVED_MODELS', payload: config.settings.savedModels || [] });

        let initialView: AppView = 'terminal';
        if (!installCheck.installed) {
          initialView = 'install';
        } else if (!config.settings.model) {
          initialView = 'setup';
        }

        dispatch({ type: 'SET_VIEW', payload: initialView });
        dispatch({ type: 'SET_INITIAL_VIEW_LOADED', payload: true });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }

    checkInitialView();
  }, []);

  // Poll gateway status
  useEffect(() => {
    if (!state.initialViewLoaded) return;

    async function pollGateway() {
      try {
        const status = await ipc.getGatewayStatus();
        dispatch({ type: 'SET_GATEWAY_STATUS', payload: status });
      } catch (error) {
        console.error('Failed to get gateway status:', error);
      }
    }

    pollGateway();
    const interval = setInterval(pollGateway, 5000);
    return () => clearInterval(interval);
  }, [state.initialViewLoaded]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export function useSetView() {
  const { dispatch } = useApp();
  return useCallback((view: AppView) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  }, [dispatch]);
}

export function useConfig() {
  const { state, dispatch } = useApp();

  const refreshConfig = useCallback(async () => {
    const config = await ipc.getConfig();
    dispatch({ type: 'SET_CONFIG', payload: config });
  }, [dispatch]);

  return { config: state.config, refreshConfig };
}

export function useModels() {
  const { state, dispatch } = useApp();

  const addModel = useCallback(async (model: ModelConfig) => {
    await ipc.addModel(model);
    const models = await ipc.getSavedModels();
    dispatch({ type: 'SET_SAVED_MODELS', payload: models });
  }, [dispatch]);

  const updateModel = useCallback(async (model: ModelConfig) => {
    await ipc.updateModel(model);
    const models = await ipc.getSavedModels();
    dispatch({ type: 'SET_SAVED_MODELS', payload: models });
  }, [dispatch]);

  const removeModel = useCallback(async (modelId: string) => {
    await ipc.removeModel(modelId);
    const models = await ipc.getSavedModels();
    dispatch({ type: 'SET_SAVED_MODELS', payload: models });
  }, [dispatch]);

  const setPrimaryModel = useCallback(async (model: ModelConfig | null) => {
    if (model) {
      await ipc.setModel(model);
    }
    const config = await ipc.getConfig();
    dispatch({ type: 'SET_CONFIG', payload: config });
  }, [dispatch]);

  const setFallbackModel = useCallback(async (model: ModelConfig | null) => {
    await ipc.setFallbackModel(model);
    const config = await ipc.getConfig();
    dispatch({ type: 'SET_CONFIG', payload: config });
  }, [dispatch]);

  const setImageModel = useCallback(async (model: ModelConfig | null) => {
    await ipc.setImageModel(model);
    const config = await ipc.getConfig();
    dispatch({ type: 'SET_CONFIG', payload: config });
  }, [dispatch]);

  return {
    savedModels: state.savedModels,
    primaryModel: state.config?.settings.model || null,
    fallbackModel: state.config?.settings.fallbackModel || null,
    imageModel: state.config?.settings.imageModel || null,
    addModel,
    updateModel,
    removeModel,
    setPrimaryModel,
    setFallbackModel,
    setImageModel,
  };
}

export function useGateway() {
  const { state, dispatch } = useApp();

  const restartGateway = useCallback(async () => {
    const status = await ipc.restartGateway();
    dispatch({ type: 'SET_GATEWAY_STATUS', payload: status });
  }, [dispatch]);

  return {
    gatewayStatus: state.gatewayStatus,
    restartGateway,
  };
}

export function useSkills() {
  const { state, dispatch } = useApp();

  const setSkills = useCallback(async (skills: string[]) => {
    await ipc.setSkills(skills);
    dispatch({ type: 'SET_SKILLS', payload: skills });
  }, [dispatch]);

  return {
    skills: state.skills,
    setSkills,
  };
}

export function useTools() {
  const { state, dispatch } = useApp();

  const setTools = useCallback(async (tools: string[]) => {
    await ipc.setTools(tools);
    dispatch({ type: 'SET_TOOLS', payload: tools });
  }, [dispatch]);

  return {
    tools: state.tools,
    setTools,
  };
}

export function useChannels() {
  const { state, dispatch } = useApp();

  const setChannels = useCallback(async (channels: { type: string; enabled: boolean }[]) => {
    await ipc.setChannels(channels);
    dispatch({ type: 'SET_CHANNELS', payload: channels });
  }, [dispatch]);

  return {
    channels: state.channels,
    setChannels,
  };
}

export function useCron() {
  const { state, dispatch } = useApp();

  const refreshCronJobs = useCallback(async () => {
    const result = await ipc.getCronJobs();
    dispatch({ type: 'SET_CRON_JOBS', payload: result.jobs });
  }, [dispatch]);

  const refreshCronLogs = useCallback(async (jobId?: string) => {
    const result = await ipc.getCronLogs(jobId);
    dispatch({ type: 'SET_CRON_LOGS', payload: result.logs });
  }, [dispatch]);

  const runJob = useCallback(async (jobId: string) => {
    return await ipc.runCronJob(jobId);
  }, []);

  const toggleJob = useCallback(async (jobId: string, enabled: boolean) => {
    const result = await ipc.toggleCronJob(jobId, enabled);
    if (result.success) {
      await refreshCronJobs();
    }
    return result;
  }, [dispatch, refreshCronJobs]);

  const removeJob = useCallback(async (jobId: string) => {
    const result = await ipc.removeCronJob(jobId);
    if (result.success) {
      await refreshCronJobs();
    }
    return result;
  }, [dispatch, refreshCronJobs]);

  return {
    cronJobs: state.cronJobs,
    cronLogs: state.cronLogs,
    refreshCronJobs,
    refreshCronLogs,
    runJob,
    toggleJob,
    removeJob,
  };
}

export function useMemory() {
  const { state, dispatch } = useApp();

  const refreshMemory = useCallback(async () => {
    const result = await ipc.getMemoryInfo();
    dispatch({ type: 'SET_MEMORY_INFO', payload: result });
  }, [dispatch]);

  return {
    memoryInfo: state.memoryInfo,
    refreshMemory,
  };
}

export function useAgent() {
  const { state, dispatch } = useApp();

  const refreshAgentList = useCallback(async () => {
    const result = await ipc.listAgents();
    dispatch({ type: 'SET_AGENT_LIST', payload: result.agents });
    return result.agents;
  }, [dispatch]);

  const refreshAgentInfo = useCallback(async (agentId?: string) => {
    const result = await ipc.getAgentInfo(agentId);
    dispatch({ type: 'SET_AGENT_INFO', payload: result });
  }, [dispatch]);

  const refreshAuthProfiles = useCallback(async (agentId?: string) => {
    return await ipc.getAuthProfiles(agentId);
  }, []);

  return {
    agentInfo: state.agentInfo,
    agentList: state.agentList,
    refreshAgentList,
    refreshAgentInfo,
    refreshAuthProfiles,
  };
}
