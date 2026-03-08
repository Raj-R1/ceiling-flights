import type {
  AircraftSnapshot,
  AppSettings,
  GeoPoint,
  LocationResult,
  LocationSearchResult,
  UpdateCheckResult
} from './types';

export const IPC_CHANNELS = {
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  autoLocate: 'location:auto-locate',
  searchLocation: 'location:search',
  fetchSnapshot: 'flights:fetch-snapshot',
  toggleFullscreen: 'window:toggle-fullscreen',
  getFullscreen: 'window:get-fullscreen',
  checkForUpdate: 'app:check-for-update',
  skipUpdate: 'app:skip-update',
  openUpdateUrl: 'app:open-update-url'
} as const;

export type RendererApi = {
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: AppSettings) => Promise<AppSettings>;
  autoLocate: () => Promise<LocationResult>;
  searchLocation: (query: string) => Promise<LocationSearchResult>;
  fetchSnapshot: (center: GeoPoint, radiusKm: number) => Promise<AircraftSnapshot[]>;
  toggleFullscreen: () => Promise<boolean>;
  getFullscreen: () => Promise<boolean>;
  checkForUpdate: () => Promise<UpdateCheckResult>;
  skipUpdate: (version: string) => Promise<void>;
  openUpdateUrl: (url: string) => Promise<void>;
};
