// Installation wizard logic

// State management
const STATES = ['check', 'not-installed', 'installing', 'error', 'success', 'manual'] as const;
type State = typeof STATES[number];

let currentState: State = 'check';
let installAttempts = 0;
const MAX_INSTALL_ATTEMPTS = 2;

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
  await checkInstallation();
});

function showState(state: State) {
  // Hide all states
  STATES.forEach(s => {
    const el = document.getElementById(`state-${s}`);
    if (el) el.classList.remove('active');
  });

  // Show target state
  const targetEl = document.getElementById(`state-${state}`);
  if (targetEl) targetEl.classList.add('active');

  currentState = state;
}

async function checkInstallation() {
  showState('check');

  try {
    const result = await window.electronAPI.checkInstall();

    if (result.installed) {
      // Already installed, proceed
      showState('success');
      // Auto-continue after a brief delay
      setTimeout(() => continueToSetup(), 1500);
    } else {
      // Not installed
      showState('not-installed');
    }
  } catch (error) {
    console.error('Failed to check installation:', error);
    showError('Failed to check OpenClaw installation. Please try again.');
  }
}

async function startInstall() {
  installAttempts++;
  showState('installing');

  // Simulate progress animation
  const progressBar = document.getElementById('progress-bar') as HTMLElement;
  const statusText = document.getElementById('install-status');
  const logOutput = document.getElementById('install-log');

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 3;
    if (progress > 90) progress = 90; // Hold at 90% until complete
    if (progressBar) progressBar.style.width = `${progress}%`;
  }, 500);

  // Update status messages
  const statusMessages = [
    'Downloading OpenClaw...',
    'Installing dependencies...',
    'Setting up gateway...',
    'Finishing up...'
  ];
  let messageIndex = 0;
  const messageInterval = setInterval(() => {
    if (statusText && messageIndex < statusMessages.length) {
      statusText.textContent = statusMessages[messageIndex];
      if (logOutput) logOutput.textContent += `${statusMessages[messageIndex]}\n`;
      messageIndex++;
    }
  }, 2000);

  try {
    const result = await window.electronAPI.installOpenClaw();

    clearInterval(progressInterval);
    clearInterval(messageInterval);

    if (result.success) {
      if (progressBar) progressBar.style.width = '100%';
      if (statusText) statusText.textContent = 'Installation complete!';
      setTimeout(() => showState('success'), 500);
    } else {
      // Installation failed
      if (installAttempts >= MAX_INSTALL_ATTEMPTS) {
        // Show manual instructions after multiple failures
        showState('manual');
      } else {
        showError(result.error || 'Installation failed. Please try again.');
      }
    }
  } catch (error) {
    clearInterval(progressInterval);
    clearInterval(messageInterval);

    console.error('Installation error:', error);

    if (installAttempts >= MAX_INSTALL_ATTEMPTS) {
      showState('manual');
    } else {
      showError((error as Error).message || 'Installation failed. Please try again.');
    }
  }
}

function showError(message: string) {
  const errorMessageEl = document.getElementById('error-message');
  if (errorMessageEl) errorMessageEl.textContent = message;
  showState('error');
}

function retryInstall() {
  startInstall();
}

function cancelInstall() {
  window.electronAPI.cancelSetup();
}

async function continueToSetup() {
  await window.electronAPI.completeInstall();
}

async function checkAgain() {
  await checkInstallation();
}

function copyCommand() {
  const command = 'npm install -g openclaw@latest';
  navigator.clipboard.writeText(command).then(() => {
    const btn = document.querySelector('.btn-copy') as HTMLElement;
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  });
}

function openDocs() {
  window.electronAPI.openExternal('https://docs.openclaw.ai/install');
}

function openIssues() {
  window.electronAPI.openExternal('https://github.com/openclaw/openclaw/issues');
}
