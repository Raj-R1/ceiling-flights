export type GeoPoint = { lat: number; lon: number };

export type LocationSource = 'ip-primary' | 'ip-fallback' | 'random-city' | 'none';

export type LocationErrorCode =
  | 'timeout'
  | 'network'
  | 'unsupported'
  | 'invalid-response'
  | 'unknown';

export type LocationResult = {
  ok: boolean;
  source: LocationSource;
  point?: GeoPoint;
  errorCode?: LocationErrorCode;
  message?: string;
};

export type AircraftSnapshot = {
  id: string;
  callsign?: string;
  lat: number;
  lon: number;
  altitudeFt?: number;
  headingDeg?: number;
  groundSpeedKt?: number;
  timestampMs: number;
};

export type TrackPoint = {
  x: number;
  y: number;
  timestampMs: number;
};

export type AppSettings = {
  home: GeoPoint;
  zoom: number;
  showMap: boolean;
  locationMode: 'ip' | 'manual' | 'random';
};

export type ConnectionState = {
  offline: boolean;
  refreshing: boolean;
  lastSuccessMs?: number;
  lastError?: string;
};
