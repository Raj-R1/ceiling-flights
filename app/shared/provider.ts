import type { AircraftSnapshot, GeoPoint } from './types';

export interface FlightProvider {
  fetchSnapshot(center: GeoPoint, radiusKm: number): Promise<AircraftSnapshot[]>;
}
