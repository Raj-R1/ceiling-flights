import { describe, expect, it } from 'vitest';
import { sanitizeSettings } from '../shared/settingsSanitizer';

describe('sanitizeSettings', () => {
  it('migrates legacy gps/system modes to ip mode', () => {
    const settings = sanitizeSettings({
      home: { lat: 25, lon: 55 },
      zoom: 10,
      showMap: true,
      locationMode: 'gps'
    });

    expect(settings.locationMode).toBe('ip');

    const legacySystem = sanitizeSettings({
      home: { lat: 25, lon: 55 },
      zoom: 10,
      showMap: true,
      locationMode: 'system'
    });
    expect(legacySystem.locationMode).toBe('ip');
  });

  it('keeps random mode when explicitly selected', () => {
    const settings = sanitizeSettings({
      home: { lat: 25, lon: 55 },
      zoom: 10,
      showMap: true,
      locationMode: 'random'
    });

    expect(settings.locationMode).toBe('random');
  });

  it('clamps out-of-range location and zoom values', () => {
    const settings = sanitizeSettings({
      home: { lat: 999, lon: -999 },
      zoom: 99,
      showMap: true,
      locationMode: 'manual'
    });

    expect(settings.home.lat).toBe(90);
    expect(settings.home.lon).toBe(-180);
    expect(settings.zoom).toBe(12);
  });

  it('falls back to defaults for invalid values', () => {
    const settings = sanitizeSettings({
      home: { lat: Number.NaN, lon: undefined },
      zoom: Number.NaN,
      showMap: 'yes',
      locationMode: 'bad-mode'
    });

    expect(settings.home.lat).toBe(25.2048);
    expect(settings.home.lon).toBe(55.2708);
    expect(settings.zoom).toBe(10);
    expect(settings.showMap).toBe(true);
    expect(settings.locationMode).toBe('ip');
  });
});
