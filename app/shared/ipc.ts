import type {
  AircraftSnapshot,
  AppSettings,
  GeoPoint,
  LocationResult,
  LocationSearchResult
} from './types';

export const IPC_CHANNELS = {
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  autoLocate: 'location:auto-locate',
  searchLocation: 'location:search',
  fetchSnapshot: 'flights:fetch-snapshot',
  toggleFullscreen: 'window:toggle-fullscreen',
  getFullscreen: 'window:get-fullscreen'
} as const;

export type RendererApi = {
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: AppSettings) => Promise<AppSettings>;
  autoLocate: () => Promise<LocationResult>;
  searchLocation: (query: string) => Promise<LocationSearchResult>;
  fetchSnapshot: (center: GeoPoint, radiusKm: number) => Promise<AircraftSnapshot[]>;
  toggleFullscreen: () => Promise<boolean>;
  getFullscreen: () => Promise<boolean>;
};
