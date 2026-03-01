import { afterEach, describe, expect, it, vi } from 'vitest';
import { autoLocateByIp } from '../main/services/locationService';

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
