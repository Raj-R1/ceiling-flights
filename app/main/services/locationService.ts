import type { GeoPoint, LocationResult, LocationSearchResult } from '../../shared/types';
import type { MainDebugLogger } from './diagnostics';

// A short timeout keeps startup responsive on slow/blocked networks.
const fetchWithTimeout = async (url: string, timeoutMs: number, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Retry once after a short pause for providers that rate-limit aggressively.
const fetchWithTimeoutAnd429Retry = async (
  url: string,
  timeoutMs: number,
  init?: RequestInit
): Promise<Response> => {
  let last: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchWithTimeout(url, timeoutMs, init);
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

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Accept-Language': 'en',
  // Nominatim usage policy requires an identifying User-Agent.
  'User-Agent': 'CeilingFlights/0.1 (https://github.com/Raj-R1)'
};

type NominatimItem = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

const asFiniteCoordinate = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

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

export const searchLocationByQuery = async (
  debugMain: MainDebugLogger,
  rawQuery: string
): Promise<LocationSearchResult> => {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return {
      ok: false,
      source: 'none',
      errorCode: 'invalid-query',
      message: 'Enter at least 2 characters.'
    };
  }

  const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=6&q=${encodeURIComponent(query)}`;
  debugMain('location', 'Location search started', { query });

  try {
    const response = await fetchWithTimeoutAnd429Retry(url, 7000, { headers: NOMINATIM_HEADERS });
    if (!response.ok) {
      debugMain('location', 'Location search request failed', { query, status: response.status });
      return {
        ok: false,
        source: 'nominatim',
        errorCode: response.status === 429 ? 'timeout' : 'network',
        message: `Search request failed (${response.status}).`
      };
    }

    const payload = (await response.json()) as unknown;
    const results = Array.isArray(payload) ? (payload as NominatimItem[]) : [];
    for (const item of results) {
      const lat = asFiniteCoordinate(item.lat);
      const lon = asFiniteCoordinate(item.lon);
      if (lat === null || lon === null) continue;

      const displayName = item.display_name ?? query;
      debugMain('location', 'Location search resolved', { query, displayName, point: { lat, lon } });
      return {
        ok: true,
        source: 'nominatim',
        point: { lat, lon },
        displayName
      };
    }

    debugMain('location', 'Location search returned no valid matches', { query, count: results.length });
    return {
      ok: false,
      source: 'nominatim',
      errorCode: 'not-found',
      message: 'No matching location was found.'
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    const message = error instanceof Error ? error.message : 'Search request failed';
    debugMain('location', 'Location search failed', { query, message, isAbort });
    return {
      ok: false,
      source: 'nominatim',
      errorCode: isAbort ? 'timeout' : 'network',
      message: isAbort ? 'Search timed out.' : 'Location search failed. Check your connection.'
    };
  }
};
