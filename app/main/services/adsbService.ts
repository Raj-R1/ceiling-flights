import type { AircraftSnapshot, GeoPoint } from '../../shared/types';

type AdsbResponse = {
  ac?: Array<{
    hex?: string;
    flight?: string;
    lat?: number;
    lon?: number;
    alt_baro?: number | string;
    gs?: number;
    track?: number;
  }>;
  now?: number;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
  } finally {
    clearTimeout(timer);
  }
};

export const fetchAdsbSnapshot = async (center: GeoPoint, radiusKm: number): Promise<AircraftSnapshot[]> => {
  // adsb.lol has multiple URL patterns in the wild; try both before failing.
  const candidates = [
    `https://api.adsb.lol/v2/point/${center.lat}/${center.lon}/${radiusKm}`,
    `https://api.adsb.lol/v2/lat/${center.lat}/lon/${center.lon}/dist/${radiusKm}`
  ];

  let response: Response | undefined;
  for (const endpoint of candidates) {
    try {
      const next = await fetchWithTimeout(endpoint, 7000);
      if (next.ok) {
        response = next;
        break;
      }
    } catch {
      // Continue to endpoint fallback when a specific variant/network path fails.
    }
  }

  if (!response) {
    throw new Error('adsb.lol request failed for all known endpoint variants');
  }

  const payload = (await response.json()) as AdsbResponse;
  const nowMs = payload.now ? payload.now * 1000 : Date.now();

  return (payload.ac ?? [])
    .map((item): AircraftSnapshot | undefined => {
      if (!item.hex || typeof item.lat !== 'number' || typeof item.lon !== 'number') return undefined;
      return {
        id: item.hex,
        callsign: item.flight?.trim() || undefined,
        lat: item.lat,
        lon: item.lon,
        altitudeFt: toNumber(item.alt_baro),
        headingDeg: toNumber(item.track),
        groundSpeedKt: toNumber(item.gs),
        timestampMs: nowMs
      };
    })
    .filter((item): item is AircraftSnapshot => item !== undefined);
};
