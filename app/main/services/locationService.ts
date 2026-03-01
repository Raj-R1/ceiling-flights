import type { GeoPoint, LocationResult } from '../../shared/types';
import type { MainDebugLogger } from './diagnostics';

// A short timeout keeps startup responsive on slow/blocked networks.
const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Retry once after a short pause for providers that rate-limit aggressively.
const fetchWithTimeoutAnd429Retry = async (url: string, timeoutMs: number): Promise<Response> => {
  let last: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchWithTimeout(url, timeoutMs);
    last = response;
    if (response.status !== 429) {
      return response;
    }
    if (attempt === 0) {
      await sleep(1200);
    }
  }
  return last!;
};

type FallbackProvider = {
  url: string;
  parse: (payload: unknown) => GeoPoint | null;
};

const FALLBACK_IP_PROVIDERS: FallbackProvider[] = [
  {
    url: 'https://ipapi.co/json/',
    parse: (payload: unknown): GeoPoint | null => {
      const data = payload as { latitude?: number; longitude?: number };
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lon: data.longitude };
      }
      return null;
    }
  },
  {
    url: 'http://ip-api.com/json/?fields=status,message,lat,lon',
    parse: (payload: unknown): GeoPoint | null => {
      const data = payload as { status?: string; lat?: number; lon?: number };
      if (data.status === 'success' && typeof data.lat === 'number' && typeof data.lon === 'number') {
        return { lat: data.lat, lon: data.lon };
      }
      return null;
    }
  }
];

export const autoLocateByIp = async (debugMain: MainDebugLogger): Promise<LocationResult> => {
  debugMain('location', 'IP auto-locate started');
  try {
    const primary = await fetchWithTimeoutAnd429Retry('https://ipwho.is/', 6000);
    if (!primary.ok) {
      throw new Error(`Primary IP provider request failed (${primary.status})`);
    }
    const data = (await primary.json()) as {
      success?: boolean;
      latitude?: number;
      longitude?: number;
      message?: string;
    };
    if (data.success === false) {
      throw new Error(data.message ?? 'Primary IP provider reported failure');
    }
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      debugMain('location', 'IP auto-locate resolved via primary provider', {
        coordinates: { lat: data.latitude, lon: data.longitude }
      });
      return {
        ok: true,
        source: 'ip-primary',
        point: { lat: data.latitude, lon: data.longitude }
      };
    }
    throw new Error('Primary IP provider returned invalid coordinates');
  } catch (primaryError) {
    const primaryReason = primaryError instanceof Error ? primaryError.message : 'Primary IP provider failed';
    debugMain('location', 'Primary IP provider failed, trying fallbacks', { primaryReason });

    let lastErrorMessage = '';

    try {
      for (const candidate of FALLBACK_IP_PROVIDERS) {
        try {
          const response = await fetchWithTimeoutAnd429Retry(candidate.url, 6000);
          if (!response.ok) {
            lastErrorMessage = `IP fallback request failed (${response.status})`;
            continue;
          }

          const payload = (await response.json()) as unknown;
          const point = candidate.parse(payload);
          if (point) {
            debugMain('location', 'IP auto-locate resolved via fallback provider', {
              url: candidate.url,
              coordinates: point
            });
            return {
              ok: true,
              source: 'ip-fallback',
              point
            };
          }

          lastErrorMessage = 'IP fallback provider returned invalid coordinates';
        } catch (fallbackError) {
          lastErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Fallback request failed';
        }
      }

      return {
        ok: false,
        source: 'ip-fallback',
        errorCode: 'invalid-response',
        message: lastErrorMessage || 'All IP fallback providers returned invalid responses'
      };
    } catch {
      debugMain('location', 'IP auto-locate failed', { reason: primaryReason });
      return {
        ok: false,
        source: 'ip-fallback',
        errorCode: 'network',
        message: `${primaryReason}. All IP geolocation providers failed`
      };
    }
  }
};
