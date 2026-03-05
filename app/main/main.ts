import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { IPC_CHANNELS } from '../shared/ipc';
import { getSettings, setSettings } from './settingsStore';
import type { AppSettings, GeoPoint } from '../shared/types';
import { fetchAdsbSnapshot } from './services/adsbService';
import { createDiagnostics } from './services/diagnostics';
import { autoLocateByIp } from './services/locationService';

let mainWindow: BrowserWindow | null = null;

// Dev-only toggles are environment driven so production behavior stays deterministic.
const isDev = !app.isPackaged;
const shouldOpenDevTools = process.env.CEILING_FLIGHTS_OPEN_DEVTOOLS === '1';
const { debugMain, appendRendererLog } = createDiagnostics(isDev);
const DEV_SERVER_URL = 'http://127.0.0.1:5173';
const PRELOAD_BUNDLE_PATH = path.join(__dirname, '../../preload/preload/preload.js');
const RENDERER_BUNDLE_PATH = path.join(__dirname, '../../renderer/index.html');

// Creates the single app window and attaches runtime diagnostics listeners.
const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      // Preload is the only trusted bridge to privileged APIs.
      preload: PRELOAD_BUNDLE_PATH,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  if (isDev) {
    await mainWindow.loadURL(DEV_SERVER_URL);
    if (shouldOpenDevTools) {
      mainWindow.webContents.openDevTools({ mode: 'right' });
    }
  } else {
    await mainWindow.loadFile(RENDERER_BUNDLE_PATH);
  }

  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
    console.error('Renderer load failed', { code, desc, url });
  });

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('Preload failed', { preloadPath, error });
  });

  mainWindow.webContents.on('console-message', (event) => {
    const { level, message, lineNumber, sourceId } = event;
    // Mirror renderer logs into main diagnostics so packaged builds keep traceability.
    appendRendererLog(`level=${level} line=${lineNumber} source=${sourceId ?? ''} message=${message}`);
    const isWarnOrError = level === 'warning' || level === 'error';
    if (isWarnOrError) {
      console.error('Renderer console', { level, message, line: lineNumber, sourceId });
    } else if (message.includes('[location]') || message.includes('[startup]') || message.includes('[ui]') || message.includes('[runtime]')) {
      console.log('Renderer console', { level, message, line: lineNumber, sourceId });
    }
  });
};

// IPC bridge between renderer and main-owned services.
const registerIpc = (): void => {
  ipcMain.handle(IPC_CHANNELS.getSettings, () => getSettings());

  ipcMain.handle(IPC_CHANNELS.setSettings, (_event, settings: AppSettings) => setSettings(settings));
  ipcMain.handle(IPC_CHANNELS.autoLocate, () => autoLocateByIp(debugMain));
  ipcMain.handle(IPC_CHANNELS.fetchSnapshot, (_event, center: GeoPoint, radiusKm: number) =>
    fetchAdsbSnapshot(center, radiusKm)
  );

  ipcMain.handle(IPC_CHANNELS.toggleFullscreen, () => {
    if (!mainWindow) return false;
    const next = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(next);
    debugMain('window', 'Fullscreen toggled', { next });
    return next;
  });

  ipcMain.handle(IPC_CHANNELS.getFullscreen, () => !!mainWindow?.isFullScreen());
};

app.whenReady().then(async () => {
  registerIpc();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep standard macOS behavior: app remains active until explicit quit.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
