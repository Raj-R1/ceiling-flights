import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAdsbSnapshot } from '../main/services/adsbService';

const makeJsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

describe('fetchAdsbSnapshot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to alternate endpoint and normalizes aircraft fields', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({}, 404))
      .mockResolvedValueOnce(
        makeJsonResponse({
          now: 1700000000,
          ac: [
            {
              hex: 'abc123',
              flight: 'TEST123 ',
              lat: 25.2,
              lon: 55.27,
              alt_baro: '32000',
              gs: 450,
              track: 87
            }
          ]
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAdsbSnapshot({ lat: 25.2048, lon: 55.2708 }, 80);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'abc123',
      callsign: 'TEST123',
      lat: 25.2,
      lon: 55.27,
      altitudeFt: 32000,
      groundSpeedKt: 450,
      headingDeg: 87
    });
    expect(result[0]?.timestampMs).toBe(1700000000 * 1000);
  });

  it('throws when all endpoint variants fail', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse({}, 500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAdsbSnapshot({ lat: 25.2048, lon: 55.2708 }, 80)).rejects.toThrow(
      'adsb.lol request failed'
    );
  });
});
