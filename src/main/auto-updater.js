"use strict";
/**
 * Auto-updater module for OpenClaw Desktop
 * Handles automatic updates using electron-updater
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAutoUpdater = initializeAutoUpdater;
exports.checkForUpdates = checkForUpdates;
exports.quitAndInstall = quitAndInstall;
const electron_updater_1 = require("electron-updater");
const electron_1 = require("electron");
const log = __importStar(require("electron-log"));
let updateWindow = null;
function initializeAutoUpdater() {
    // Configure auto-updater
    electron_updater_1.autoUpdater.logger = log;
    electron_updater_1.autoUpdater.autoDownload = false; // We'll prompt the user first
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
    // Event handlers
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        log.info('Checking for update...');
    });
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        log.info('Update available:', info);
        promptForUpdate(info.version);
    });
    electron_updater_1.autoUpdater.on('update-not-available', () => {
        log.info('Update not available');
    });
    electron_updater_1.autoUpdater.on('error', (err) => {
        log.error('Error in auto-updater:', err);
    });
    electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
        const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
        log.info(message);
        if (updateWindow) {
            updateWindow.webContents.send('download-progress', progressObj);
        }
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded:', info);
        electron_1.dialog.showMessageBox({
            type: 'info',
            title: 'Update Ready',
            message: 'Update downloaded successfully',
            detail: 'The update will be installed when you restart the application.',
            buttons: ['Restart Now', 'Later']
        }).then((result) => {
            if (result.response === 0) {
                electron_updater_1.autoUpdater.quitAndInstall();
            }
        });
    });
}
function checkForUpdates() {
    // Only check for updates in production
    if (process.env.NODE_ENV === 'development') {
        log.info('Skipping update check in development mode');
        return;
    }
    electron_updater_1.autoUpdater.checkForUpdates().catch((err) => {
        log.error('Failed to check for updates:', err);
    });
}
async function promptForUpdate(version) {
    const result = await electron_1.dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${version}) is available!`,
        detail: 'Would you like to download and install it now?',
        buttons: ['Download', 'Skip'],
        defaultId: 0
    });
    if (result.response === 0) {
        electron_updater_1.autoUpdater.downloadUpdate().catch((err) => {
            log.error('Failed to download update:', err);
            electron_1.dialog.showErrorBox('Update Error', 'Failed to download update: ' + err.message);
        });
    }
}
function quitAndInstall() {
    electron_updater_1.autoUpdater.quitAndInstall();
}
//# sourceMappingURL=auto-updater.js.map