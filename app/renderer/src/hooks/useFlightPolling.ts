import { useEffect, useState } from 'react';
import type { AircraftSnapshot, ConnectionState, GeoPoint } from '../../../shared/types';
import { AdsbLolProvider } from '../services/adsbProvider';
import { FlightPoller } from '../services/poller';

const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const q =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
};

const limitFlights = (
  all: AircraftSnapshot[],
  home: { lat: number; lon: number },
  maxVisibleFlights: number
): AircraftSnapshot[] => {
  if (maxVisibleFlights <= 0) return [];
  return all
    .slice()
    .sort((a, b) => haversineKm(home, a) - haversineKm(home, b))
    .slice(0, maxVisibleFlights);
};

export const useFlightPolling = ({
  home,
  pollMs,
  fetchRadiusKm,
  maxVisibleFlights
}: {
  home: GeoPoint;
  pollMs: number;
  fetchRadiusKm: number;
  maxVisibleFlights: number;
}) => {
  const [snapshot, setSnapshot] = useState<AircraftSnapshot[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>({ offline: false, refreshing: true });

  useEffect(() => {
    // Poll from a fixed center for each hook lifecycle; restarting effect changes the center.
    const homeAtStart = { lat: home.lat, lon: home.lon };
    setConnectionState((prev) => ({
      offline: false,
      refreshing: true,
      lastSuccessMs: prev.lastSuccessMs
    }));

    const provider = new AdsbLolProvider();
    const poller = new FlightPoller(provider, {
      onData: (nextSnapshot) => {
        setSnapshot(limitFlights(nextSnapshot, homeAtStart, maxVisibleFlights));
      },
      onSuccess: () => {
        setConnectionState({ offline: false, refreshing: false, lastSuccessMs: Date.now() });
      },
      onError: (error) => {
        setConnectionState((prev) => ({
          offline: true,
          refreshing: false,
          lastError: error.message,
          lastSuccessMs: prev.lastSuccessMs
        }));
      }
    });

    poller.start(homeAtStart, fetchRadiusKm, pollMs);
    return () => poller.stop();
  }, [fetchRadiusKm, home.lat, home.lon, maxVisibleFlights, pollMs]);

  return { snapshot, connectionState };
};
