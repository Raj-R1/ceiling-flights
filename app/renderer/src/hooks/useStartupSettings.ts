import { useCallback, useEffect, useRef, useState } from 'react';
import type { RendererApi } from '../../../shared/ipc';
import { DEFAULT_SETTINGS } from '../../../shared/defaults';
import type { AppSettings, LocationResult } from '../../../shared/types';
import { pickRandomCity } from '../../../shared/randomCities';
import { debugLog } from '../services/debugLog';

export type LocateStatusTone = 'neutral' | 'success' | 'warning' | 'error';
export type LocateStatus = { tone: LocateStatusTone; icon: string; text: string };

const LOCATE_IDLE: LocateStatus = { tone: 'neutral', icon: '◎', text: 'Select mode and press Locate' };

const modeReadyStatus = (mode: AppSettings['locationMode']): LocateStatus => {
  if (mode === 'manual') {
    return { tone: 'neutral', icon: '◎', text: 'Manual mode active. Edit latitude/longitude directly.' };
  }
  if (mode === 'random') {
    return { tone: 'neutral', icon: '◎', text: 'Random mode selected. Press Locate.' };
  }
  return { tone: 'neutral', icon: '◎', text: 'IP mode selected. Press Locate.' };
};

const humanReadableLocateFailure = (result: LocationResult): string => {
  if (result.errorCode === 'timeout') return 'Network location timed out';
  if (result.errorCode === 'network') return 'Network location request failed';
  return 'Network location is currently unavailable';
};

export const useStartupSettings = (api: RendererApi) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [locateStatus, setLocateStatus] = useState<LocateStatus>(LOCATE_IDLE);
  // Incrementing request ids let us safely ignore stale async locate responses.
  const locateRequestIdRef = useRef(0);

  const getIpLocation = useCallback(async (): Promise<LocationResult> => {
    debugLog('location', 'Requesting network location');
    try {
      return await api.autoLocate();
    } catch {
      return { ok: false, source: 'none', errorCode: 'network', message: 'IPC auto-locate request failed' };
    }
  }, [api]);

  const setLocationMode = useCallback((mode: AppSettings['locationMode']) => {
    // Cancel in-flight locate result from older mode context.
    locateRequestIdRef.current += 1;
    setSettings((prev) => ({ ...prev, locationMode: mode }));
    setLocateStatus(modeReadyStatus(mode));
    debugLog('location', 'Location mode changed', { mode });
  }, []);

  const runAutoLocate = useCallback(async (): Promise<void> => {
    const requestId = locateRequestIdRef.current + 1;
    locateRequestIdRef.current = requestId;
    const currentMode = settings.locationMode;

    if (currentMode === 'manual') {
      setLocateStatus(modeReadyStatus('manual'));
      debugLog('location', 'Skipping locate because manual mode is selected');
      return;
    }

    if (currentMode === 'random') {
      const city = pickRandomCity();
      setSettings((prev) => ({ ...prev, home: city.point }));
      setLocateStatus({ tone: 'success', icon: '✓', text: `Random city: ${city.name}, ${city.country}` });
      debugLog('location', 'Locate success', {
        mode: currentMode,
        source: 'random-city',
        requestId,
        city: city.name,
        country: city.country,
        coordinates: city.point
      });
      return;
    }

    setLocateStatus({
      tone: 'neutral',
      icon: '◎',
      text: 'Locating using network position...'
    });
    debugLog('location', 'Starting locate', { mode: currentMode, requestId });

    const result = await getIpLocation();

    if (requestId !== locateRequestIdRef.current) {
      debugLog('location', 'Discarded stale locate result', { mode: currentMode, requestId });
      return;
    }

    const point = result.point;
    if (result.ok && point) {
      setSettings((prev) => ({ ...prev, home: { lat: point.lat, lon: point.lon } }));
      setLocateStatus({ tone: 'success', icon: '✓', text: 'Using network location' });
      debugLog('location', 'Locate success', {
        mode: currentMode,
        source: result.source,
        requestId,
        coordinates: { lat: point.lat, lon: point.lon }
      });
      return;
    }

    const failLabel = humanReadableLocateFailure(result);
    setLocateStatus({ tone: 'error', icon: '✕', text: `${failLabel}. Keeping saved location.` });
    debugLog('location', 'Locate failed', { mode: currentMode, result, requestId });
  }, [getIpLocation, settings.locationMode]);

  const refreshFullscreen = useCallback(async (): Promise<void> => {
    setIsFullscreen(await api.getFullscreen());
  }, [api]);

  const toggleFullscreen = useCallback(async (): Promise<void> => {
    const next = await api.toggleFullscreen();
    setIsFullscreen(next);
  }, [api]);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      try {
        const saved = await api.getSettings();
        debugLog('startup', 'Loaded saved settings', saved);
        if (disposed) return;
        setSettings(saved);
        setLocateStatus(modeReadyStatus(saved.locationMode));
        await refreshFullscreen();
      } finally {
        if (!disposed) {
          setHasBootstrapped(true);
        }
      }
    };

    void load();
    return () => {
      disposed = true;
    };
  }, [api, refreshFullscreen]);

  useEffect(() => {
    if (!hasBootstrapped) return;
    void api.setSettings(settings);
  }, [api, hasBootstrapped, settings]);

  return {
    settings,
    setSettings,
    setLocationMode,
    isFullscreen,
    hasBootstrapped,
    locateStatus,
    runAutoLocate,
    toggleFullscreen
  };
};
