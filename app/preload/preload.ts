import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type RendererApi } from '../shared/ipc';
import type { AppSettings, GeoPoint } from '../shared/types';

// Expose only the minimal typed API required by the renderer.
const api: RendererApi = {
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.getSettings),
  setSettings: (settings: AppSettings) => ipcRenderer.invoke(IPC_CHANNELS.setSettings, settings),
  autoLocate: () => ipcRenderer.invoke(IPC_CHANNELS.autoLocate),
  fetchSnapshot: (center: GeoPoint, radiusKm: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.fetchSnapshot, center, radiusKm),
  toggleFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.toggleFullscreen),
  getFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.getFullscreen)
};

contextBridge.exposeInMainWorld('ceilingFlights', api);
