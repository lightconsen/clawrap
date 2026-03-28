// Centralized text labels - change once, update everywhere
export const TEXTS = {
  // App
  app: {
    title: 'OpenClaw',
  },

  // Install View
  install: {
    title: 'Install OpenClaw',
    subtitle: 'Set up your local OpenClaw environment',
    checking: 'Checking installation...',
    notInstalled: 'OpenClaw is not installed',
    notInstalledDesc: 'Install the OpenClaw CLI to continue',
    installing: 'Installing OpenClaw...',
    installSuccess: 'Installation complete!',
    retry: 'Retry',
    continue: 'Continue',
    cancel: 'Cancel',
    manualTitle: 'Manual Installation Required',
    manualDesc: 'Automatic installation failed. Please install manually:',
    copyCommand: 'Copy',
    copied: 'Copied!',
    openDocs: 'Open Documentation',
    reportIssue: 'Report Issue',
    checkAgain: 'Check Again',
    installStatus: 'Installing...',
  },

  // Setup View
  setup: {
    title: 'Setup OpenClaw',
    welcomeTitle: 'Welcome to OpenClaw',
    welcomeDesc: 'Configure your AI model to get started',
    selectModel: 'Select a Model',
    selectModelDesc: 'Choose your primary AI model',
    internationalModels: 'International Models',
    chinaModels: 'China Models',
    enterApiKey: 'Enter API Key',
    enterApiKeyDesc: 'Configure your API credentials',
    confirm: 'Confirm Configuration',
    confirmDesc: 'Review your settings',
    launch: 'Launch OpenClaw',
    launching: 'Launching...',
    back: 'Back',
    next: 'Next',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Enter your API key',
    showKey: 'Show',
    hideKey: 'Hide',
    getApiKey: 'Get API Key',
    customModelId: 'Model ID',
    customBaseUrl: 'Base URL (optional)',
    selectedModel: 'Selected Model',
    provider: 'Provider',
    apiKeyMasked: '••••••••',
  },

  // Terminal View (Main)
  terminal: {
    title: 'ClawRap',
    gatewayStatus: 'Gateway Status',
    running: 'Running',
    stopped: 'Stopped',
    port: 'Port',
    openSettings: 'Settings',
    skills: 'Skills',
    tools: 'Tools',
    models: 'Models',
  },

  // Settings View
  settings: {
    title: 'Settings',
    models: 'Models',
    skills: 'Skills',
    tools: 'Tools',
    channels: 'Channels',
    gateway: 'Gateway',
    about: 'About',

    // Models section
    modelConfig: 'Model Configuration',
    modelConfigSubtitle: 'Configure your primary, fallback, and image models',
    modelStatus: 'Model Status',
    primaryModel: 'Primary Model',
    fallbackModel: 'Fallback Model',
    imageModel: 'Image Model',
    required: 'Required',
    optional: 'Optional',
    selectProvider: 'Select provider...',
    selectModel: 'Select model...',
    apiKey: 'API Key',
    baseUrl: 'Base URL (optional)',
    show: 'Show',
    hide: 'Hide',
    notSet: 'Not set',
    notConfigured: 'Not configured',
    cannotRemovePrimary: 'Cannot remove the primary model. Please select a different primary model first.',

    // Model List
    modelList: 'Model List',
    addModel: '+ Add Model',
    noSavedModels: 'No saved models. Click "Add Model" to add one.',
    edit: 'Edit',
    remove: 'Remove',
    apiKeyConfigured: '🔒 API key configured',
    noApiKey: '⚠️ No API key',

    // Add/Edit Model Modal
    addModelTitle: 'Add New Model',
    editModelTitle: 'Edit Model',
    provider: 'Provider',
    model: 'Model',
    modelId: 'Model ID',
    modelIdPlaceholder: 'e.g., claude-sonnet-4-6',
    apiKeyLabel: 'API Key / OAuth Token',
    apiKeyPlaceholder: 'Enter API key or OAuth token',
    baseUrlLabel: 'Base URL (optional)',
    baseUrlPlaceholder: 'https://api.example.com/v1',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Add Model',
    update: 'Update Model',

    // Auth method
    apiKeyRadio: 'API Key',
    oauthRadio: 'OAuth',

    // Gateway section
    gatewaySectionTitle: 'Gateway Status',
    gatewayStatusSubtitle: 'View and manage the OpenClaw gateway',
    status: 'Status',
    runningStatus: 'Running',
    stoppedStatus: 'Stopped',
    portLabel: 'Port',
    restartGateway: 'Restart Gateway',

    // About section
    aboutSubtitle: 'OpenClaw Desktop Application',
    version: 'Version',
    configDir: 'Config Directory',
    openclawVersion: 'OpenClaw',
  },

  // Skills View
  skills: {
    title: 'Skills',
    subtitle: 'Manage enabled skills for your agent',
    enableAll: 'Enable All',
    disableAll: 'Disable All',
  },

  // Tools View
  tools: {
    title: 'Tools',
    subtitle: 'Manage enabled tools for your agent',
  },

  // Channels View
  channels: {
    title: 'Channels',
    subtitle: 'Manage bypass channels for different AI assistants',
    claude_code: 'Claude Code',
  },

  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    retry: 'Retry',
    close: 'Close',
    back: 'Back',
    next: 'Next',
  },

  // Errors
  errors: {
    required: 'This field is required',
    invalidApiKey: 'Invalid API key',
    installFailed: 'Installation failed',
    setupFailed: 'Setup failed',
    modelRequired: 'Please select a model',
  },
};
