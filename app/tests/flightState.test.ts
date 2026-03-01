import { describe, expect, it } from 'vitest';
import { applySnapshot, buildFeatureCollection } from '../renderer/src/services/flightState';

describe('flightState', () => {
  it('applies snapshots and emits feature collection', () => {
    const tracks = new Map();
    const now = Date.now();

    applySnapshot(
      tracks,
      [
        {
          id: 'abc123',
          callsign: 'TEST123',
          lat: 37,
          lon: -122,
          timestampMs: now
        }
      ],
      now
    );

    const data = buildFeatureCollection(tracks, now + 1000, 2000);
    expect(data.features).toHaveLength(1);
    expect(data.features[0]?.properties?.name).toBe('TEST123');
  });

  it('uses normalized HEX labels when callsign is missing', () => {
    const tracks = new Map();
    const now = Date.now();

    applySnapshot(
      tracks,
      [
        {
          id: '~2be32',
          lat: 25.2,
          lon: 55.27,
          timestampMs: now
        }
      ],
      now
    );

    const data = buildFeatureCollection(tracks, now + 250, 2000);
    expect(data.features[0]?.properties?.name).toBe('HEX 2BE32');
  });

  it('removes tracks that are absent in next snapshot', () => {
    const tracks = new Map();
    const now = Date.now();

    applySnapshot(
      tracks,
      [
        {
          id: 'abc123',
          callsign: 'TEST123',
          lat: 37,
          lon: -122,
          timestampMs: now
        }
      ],
      now
    );

    applySnapshot(tracks, [], now + 2000);
    const data = buildFeatureCollection(tracks, now + 2100, 2000);
    expect(data.features).toHaveLength(0);
  });
});
