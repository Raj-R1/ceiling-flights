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

export type LocationSearchSource = 'nominatim' | 'none';

export type LocationSearchErrorCode = LocationErrorCode | 'invalid-query' | 'not-found';

export type LocationSearchResult = {
  ok: boolean;
  source: LocationSearchSource;
  point?: GeoPoint;
  displayName?: string;
  errorCode?: LocationSearchErrorCode;
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

export type UpdateInfo = {
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseUrl: string;
  publishedAt?: string;
  body: string;
  isPrerelease: boolean;
  isBeta: boolean;
};

export type UpdateCheckResult = {
  currentVersion: string;
  update: UpdateInfo | null;
};

export type UpdaterState = {
  skippedVersion?: string;
};
