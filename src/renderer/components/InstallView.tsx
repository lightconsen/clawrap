import React, { useState, useEffect } from 'react';
import { useApp, useSetView } from '../store/appStore';
import { ipc } from '../lib/ipc';
import { TEXTS } from '../lib/texts';
import logo from '../assets/icon.png';

/// <reference path="../assets.d.ts" />

export function InstallView() {
  const setView = useSetView();
  const [status, setStatus] = useState<'check' | 'not-installed' | 'installing' | 'error' | 'success' | 'manual'>('check');
  const [errorMessage, setErrorMessage] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatus, setInstallStatus] = useState('');

  useEffect(() => {
    checkInstallation();
  }, []);

  async function checkInstallation() {
    setStatus('check');
    try {
      const result = await ipc.checkInstall();
      if (result.installed) {
        setStatus('success');
        setTimeout(() => continueToSetup(), 1500);
      } else {
        setStatus('not-installed');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage((error as Error).message);
    }
  }

  async function startInstall() {
    setStatus('installing');
    setInstallProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setInstallProgress(prev => Math.min(prev + Math.random() * 3, 90));
    }, 500);

    const statusMessages = [
      TEXTS.install.installing,
      'Downloading OpenClaw...',
      'Installing dependencies...',
      'Setting up gateway...',
      'Finishing up...',
    ];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      if (msgIndex < statusMessages.length) {
        setInstallStatus(statusMessages[msgIndex]);
        msgIndex++;
      }
    }, 2000);

    try {
      const result = await ipc.installOpenClaw();
      clearInterval(progressInterval);
      clearInterval(msgInterval);

      if (result.success) {
        setInstallProgress(100);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(result.error || TEXTS.errors.installFailed);
      }
    } catch (error) {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      setStatus('error');
      setErrorMessage((error as Error).message);
    }
  }

  async function continueToSetup() {
    await ipc.completeInstall();
    setView('setup');
  }

  function copyCommand() {
    const command = 'npm install -g openclaw@latest';
    navigator.clipboard.writeText(command);
  }

  function openDocs() {
    ipc.openExternal('https://docs.openclaw.ai/install');
  }

  function openIssues() {
    ipc.openExternal('https://github.com/openclaw/openclaw/issues');
  }

  return (
    <div className="install-view">
      <div className="install-container">
        <div className="install-header">
          <img src={logo} alt="ClawRap Logo" className="install-logo" />
          <h1>{TEXTS.install.title}</h1>
          <p>{TEXTS.install.subtitle}</p>
        </div>

        {status === 'check' && (
          <div className="install-state">
            <div className="loading-spinner"></div>
            <p>{TEXTS.install.checking}</p>
          </div>
        )}

        {status === 'not-installed' && (
          <div className="install-state">
            <h2>{TEXTS.install.notInstalled}</h2>
            <p>{TEXTS.install.notInstalledDesc}</p>
            <button className="btn" onClick={startInstall}>
              Install OpenClaw
            </button>
          </div>
        )}

        {status === 'installing' && (
          <div className="install-state">
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${installProgress}%` }}></div>
            </div>
            <p>{installStatus || TEXTS.install.installing}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="install-state">
            <h2>{TEXTS.common.error}</h2>
            <p className="error-message">{errorMessage}</p>
            <div className="button-row">
              <button className="btn btn-secondary" onClick={checkInstallation}>
                {TEXTS.install.retry}
              </button>
              <button className="btn" onClick={() => setStatus('manual')}>
                Manual Installation
              </button>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="install-state">
            <div className="success-icon">✓</div>
            <h2>{TEXTS.install.installSuccess}</h2>
            <button className="btn" onClick={continueToSetup}>
              {TEXTS.install.continue}
            </button>
          </div>
        )}

        {status === 'manual' && (
          <div className="install-state">
            <h2>{TEXTS.install.manualTitle}</h2>
            <p>{TEXTS.install.manualDesc}</p>
            <div className="manual-command">
              <code>npm install -g openclaw@latest</code>
              <button className="btn-icon btn-copy" onClick={copyCommand}>
                {TEXTS.install.copyCommand}
              </button>
            </div>
            <div className="button-row">
              <button className="btn" onClick={openDocs}>
                {TEXTS.install.openDocs}
              </button>
              <button className="btn btn-secondary" onClick={openIssues}>
                {TEXTS.install.reportIssue}
              </button>
              <button className="btn btn-secondary" onClick={checkInstallation}>
                {TEXTS.install.checkAgain}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
