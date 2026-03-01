import type { FlightProvider } from '../../../shared/provider';
import type { AircraftSnapshot, GeoPoint } from '../../../shared/types';

export class AdsbLolProvider implements FlightProvider {
  async fetchSnapshot(center: GeoPoint, radiusKm: number): Promise<AircraftSnapshot[]> {
    return window.ceilingFlights.fetchSnapshot(center, radiusKm);
  }
}
