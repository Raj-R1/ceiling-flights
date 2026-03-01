import { DEFAULT_SETTINGS } from './defaults';
import type { AppSettings } from './types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeLocationMode = (value: unknown): AppSettings['locationMode'] => {
  if (value === 'manual') return 'manual';
  if (value === 'ip') return 'ip';
  if (value === 'random') return 'random';
  // Legacy modes are migrated to IP mode.
  if (value === 'system' || value === 'gps') return 'ip';
  return DEFAULT_SETTINGS.locationMode;
};

export const sanitizeSettings = (raw: unknown): AppSettings => {
  const value = (raw ?? {}) as Partial<AppSettings>;
  const home = (value.home ?? {}) as Partial<AppSettings['home']>;

  return {
    home: {
      lat: clamp(finiteOr(home.lat, DEFAULT_SETTINGS.home.lat), -90, 90),
      lon: clamp(finiteOr(home.lon, DEFAULT_SETTINGS.home.lon), -180, 180)
    },
    zoom: clamp(Math.round(finiteOr(value.zoom, DEFAULT_SETTINGS.zoom)), 3, 12),
    showMap: typeof value.showMap === 'boolean' ? value.showMap : DEFAULT_SETTINGS.showMap,
    locationMode: normalizeLocationMode(value.locationMode)
  };
};
