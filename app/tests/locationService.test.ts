import { afterEach, describe, expect, it, vi } from 'vitest';
import { autoLocateByIp, searchLocationByQuery } from '../main/services/locationService';

const noopDebug = vi.fn();

const makeJsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

describe('autoLocateByIp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    noopDebug.mockClear();
  });

  it('returns primary provider coordinates when available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeJsonResponse({
          success: true,
          latitude: 25.2,
          longitude: 55.27
        })
      )
    );

    const result = await autoLocateByIp(noopDebug);
    expect(result).toEqual({
      ok: true,
      source: 'ip-primary',
      point: { lat: 25.2, lon: 55.27 }
    });
  });

  it('falls back when primary provider fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({}, 500))
      .mockResolvedValueOnce(makeJsonResponse({ latitude: 51.5, longitude: -0.1 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await autoLocateByIp(noopDebug);
    expect(result).toEqual({
      ok: true,
      source: 'ip-fallback',
      point: { lat: 51.5, lon: -0.1 }
    });
  });

  it('returns a failure payload when all providers fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeJsonResponse({}, 500)));

    const result = await autoLocateByIp(noopDebug);
    expect(result.ok).toBe(false);
    expect(result.source).toBe('ip-fallback');
    expect(result.errorCode).toBeDefined();
  });
});

describe('searchLocationByQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    noopDebug.mockClear();
  });

  it('returns first valid geocode result with coordinates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeJsonResponse([
          { display_name: 'Invalid row', lat: 'bad', lon: 'bad' },
          { display_name: 'Brooklyn, New York, USA', lat: '40.6501', lon: '-73.9496' }
        ])
      )
    );

    const result = await searchLocationByQuery(noopDebug, 'brooklyn');
    expect(result).toEqual({
      ok: true,
      source: 'nominatim',
      displayName: 'Brooklyn, New York, USA',
      point: { lat: 40.6501, lon: -73.9496 }
    });
  });

  it('returns validation error for empty/too-short queries', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchLocationByQuery(noopDebug, ' ');
    expect(result).toEqual({
      ok: false,
      source: 'none',
      errorCode: 'invalid-query',
      message: 'Enter at least 2 characters.'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns not-found when provider returns no usable result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeJsonResponse([])));

    const result = await searchLocationByQuery(noopDebug, 'zzzzzz');
    expect(result.ok).toBe(false);
    expect(result.source).toBe('nominatim');
    expect(result.errorCode).toBe('not-found');
  });
});
