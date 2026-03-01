import type { AircraftSnapshot } from '../../../shared/types';

type Track = {
  id: string;
  name: string;
  prevLat: number;
  prevLon: number;
  targetLat: number;
  targetLon: number;
  updatedAtMs: number;
};

export type FlightTrackMap = Map<string, Track>;

type FlightFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { id: string; name: string };
};

type FlightFeatureCollection = {
  type: 'FeatureCollection';
  features: FlightFeature[];
};

const normalizeIdLabel = (id: string): string => `HEX ${id.replace(/^~/, '').toUpperCase()}`;

const resolveDisplayName = (aircraft: AircraftSnapshot): string => {
  const callsign = aircraft.callsign?.trim();
  return callsign && callsign.length > 0 ? callsign : normalizeIdLabel(aircraft.id);
};

export const applySnapshot = (tracks: FlightTrackMap, snapshot: AircraftSnapshot[], nowMs: number): void => {
  const nextIds = new Set<string>();

  for (const aircraft of snapshot) {
    nextIds.add(aircraft.id);
    const existing = tracks.get(aircraft.id);
    if (!existing) {
      tracks.set(aircraft.id, {
        id: aircraft.id,
        name: resolveDisplayName(aircraft),
        prevLat: aircraft.lat,
        prevLon: aircraft.lon,
        targetLat: aircraft.lat,
        targetLon: aircraft.lon,
        updatedAtMs: nowMs
      });
      continue;
    }

    existing.prevLat = existing.targetLat;
    existing.prevLon = existing.targetLon;
    existing.targetLat = aircraft.lat;
    existing.targetLon = aircraft.lon;
    existing.name = resolveDisplayName(aircraft);
    existing.updatedAtMs = nowMs;
  }

  for (const id of tracks.keys()) {
    if (!nextIds.has(id)) {
      tracks.delete(id);
    }
  }
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const buildFeatureCollection = (
  tracks: FlightTrackMap,
  nowMs: number,
  pollMs: number
): FlightFeatureCollection => {
  const features: FlightFeature[] = [];

  for (const track of tracks.values()) {
    const t = Math.max(0, Math.min(1, (nowMs - track.updatedAtMs) / pollMs));
    const lat = lerp(track.prevLat, track.targetLat, t);
    const lon = lerp(track.prevLon, track.targetLon, t);

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { id: track.id, name: track.name }
    });
  }

  return {
    type: 'FeatureCollection',
    features
  };
};
