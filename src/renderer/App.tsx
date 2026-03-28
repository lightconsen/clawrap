import React from 'react';
import { AppProvider, useApp } from './store/appStore';
import { InstallView } from './components/InstallView';
import { SetupView } from './components/SetupView';
import { TerminalView } from './components/TerminalView';
import { SettingsView } from './components/SettingsView';
import { TEXTS } from './lib/texts';

function AppContent() {
  const { state } = useApp();

  if (!state.initialViewLoaded) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>{TEXTS.common.loading}</p>
      </div>
    );
  }

  switch (state.view) {
    case 'install':
      return <InstallView />;
    case 'setup':
      return <SetupView />;
    case 'terminal':
      return <TerminalView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <TerminalView />;
  }
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
