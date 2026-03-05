import { useCallback, useEffect, useRef, useState } from 'react';
import type { RendererApi } from '../../../shared/ipc';
import { DEFAULT_SETTINGS } from '../../../shared/defaults';
import type { AppSettings, LocationResult } from '../../../shared/types';
import { pickRandomCity } from '../../../shared/randomCities';
import { debugLog } from '../services/debugLog';

export type LocateStatusTone = 'neutral' | 'success' | 'warning' | 'error';
export type LocateStatus = { tone: LocateStatusTone; icon: string; text: string };

const LOCATE_IDLE: LocateStatus = { tone: 'neutral', icon: '◎', text: 'Select location mode to update position' };

const modeReadyStatus = (mode: AppSettings['locationMode']): LocateStatus => {
  if (mode === 'manual') {
    return { tone: 'neutral', icon: '◎', text: 'Manual location mode active.' };
  }
  if (mode === 'random') {
    return { tone: 'neutral', icon: '◎', text: 'Random city mode active.' };
  }
  return { tone: 'neutral', icon: '◎', text: 'IP location mode active.' };
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
  const [isLocating, setIsLocating] = useState(false);
  const locatingCounterRef = useRef(0);
  // Incrementing request ids let us safely ignore stale async locate responses.
  const locateRequestIdRef = useRef(0);

  const beginLocate = useCallback(() => {
    locatingCounterRef.current += 1;
    setIsLocating(true);
  }, []);

  const endLocate = useCallback(() => {
    locatingCounterRef.current = Math.max(0, locatingCounterRef.current - 1);
    if (locatingCounterRef.current === 0) {
      setIsLocating(false);
    }
  }, []);

  const getIpLocation = useCallback(async (): Promise<LocationResult> => {
    debugLog('location', 'Requesting network location');
    try {
      return await api.autoLocate();
    } catch {
      return { ok: false, source: 'none', errorCode: 'network', message: 'IPC auto-locate request failed' };
    }
  }, [api]);

  const locateRandomCity = useCallback((requestId: number): void => {
    const city = pickRandomCity();
    setSettings((prev) => ({ ...prev, locationMode: 'random', home: city.point }));
    setLocateStatus({ tone: 'success', icon: '✓', text: `Random city: ${city.name}, ${city.country}` });
    debugLog('location', 'Locate success', {
      mode: 'random',
      source: 'random-city',
      requestId,
      city: city.name,
      country: city.country,
      coordinates: city.point
    });
  }, []);

  const locateIp = useCallback(
    async (requestId: number, reason: 'mode-select' | 'manual-refresh' = 'manual-refresh'): Promise<void> => {
      beginLocate();
      setLocateStatus({
        tone: 'neutral',
        icon: '◎',
        text: 'Locating using network position...'
      });
      debugLog('location', 'Starting IP locate', { requestId, reason });

      try {
        const result = await getIpLocation();

        if (requestId !== locateRequestIdRef.current) {
          debugLog('location', 'Discarded stale locate result', { mode: 'ip', requestId, reason });
          return;
        }

        const point = result.point;
        if (result.ok && point) {
          setSettings((prev) => ({ ...prev, locationMode: 'ip', home: { lat: point.lat, lon: point.lon } }));
          setLocateStatus({
            tone: 'success',
            icon: '✓',
            text: 'IP location acquired.'
          });
          debugLog('location', 'Locate success', {
            mode: 'ip',
            source: result.source,
            requestId,
            reason,
            coordinates: { lat: point.lat, lon: point.lon }
          });
          return;
        }

        const failLabel = humanReadableLocateFailure(result);
        setSettings((prev) => ({ ...prev, locationMode: 'ip' }));
        setLocateStatus({ tone: 'error', icon: '✕', text: `${failLabel}. Keeping saved location.` });
        debugLog('location', 'Locate failed', { mode: 'ip', result, requestId, reason });
      } finally {
        endLocate();
      }
    },
    [beginLocate, endLocate, getIpLocation]
  );

  const setLocationMode = useCallback(
    (mode: AppSettings['locationMode']) => {
      // Cancel in-flight locate result from older mode context.
      const requestId = locateRequestIdRef.current + 1;
      locateRequestIdRef.current = requestId;

      if (mode === 'manual') {
        setSettings((prev) => ({ ...prev, locationMode: 'manual' }));
        setLocateStatus(modeReadyStatus('manual'));
        debugLog('location', 'Location mode changed', { mode, requestId });
        return;
      }

      if (mode === 'random') {
        locateRandomCity(requestId);
        return;
      }

      setSettings((prev) => ({ ...prev, locationMode: 'ip' }));
      void locateIp(requestId, 'mode-select');
    },
    [locateIp, locateRandomCity]
  );

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
      locateRandomCity(requestId);
      return;
    }

    await locateIp(requestId, 'manual-refresh');
  }, [locateIp, locateRandomCity, settings.locationMode]);

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
    isLocating,
    runAutoLocate,
    toggleFullscreen
  };
};
