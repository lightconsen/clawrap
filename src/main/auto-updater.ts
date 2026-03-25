/**
 * Auto-updater module for OpenClaw Desktop
 * Handles automatic updates using electron-updater
 */

import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow } from 'electron';
import * as log from 'electron-log';

let updateWindow: BrowserWindow | null = null;

export function initializeAutoUpdater(): void {
  // Configure auto-updater
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false; // We'll prompt the user first
  autoUpdater.autoInstallOnAppQuit = true;

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    promptForUpdate(info.version);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('Update not available');
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
    log.info(message);

    if (updateWindow) {
      updateWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);

    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded successfully',
      detail: 'The update will be installed when you restart the application.',
      buttons: ['Restart Now', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}

export function checkForUpdates(): void {
  // Only check for updates in production
  if (process.env.NODE_ENV === 'development') {
    log.info('Skipping update check in development mode');
    return;
  }

  autoUpdater.checkForUpdates().catch((err) => {
    log.error('Failed to check for updates:', err);
  });
}

async function promptForUpdate(version: string): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `A new version (${version}) is available!`,
    detail: 'Would you like to download and install it now?',
    buttons: ['Download', 'Skip'],
    defaultId: 0
  });

  if (result.response === 0) {
    autoUpdater.downloadUpdate().catch((err) => {
      log.error('Failed to download update:', err);
      dialog.showErrorBox('Update Error', 'Failed to download update: ' + err.message);
    });
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
