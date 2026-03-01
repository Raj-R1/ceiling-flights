import { describe, expect, it, vi } from 'vitest';
import { AdsbLolProvider } from '../renderer/src/services/adsbProvider';

describe('AdsbLolProvider', () => {
  it('uses IPC bridge to fetch snapshots', async () => {
    (globalThis as any).window = {
      ceilingFlights: {
        fetchSnapshot: vi.fn(async () => [
          {
            id: 'abc123',
            lat: 37,
            lon: -122,
            timestampMs: Date.now()
          }
        ])
      }
    };
    const provider = new AdsbLolProvider();
    const result = await provider.fetchSnapshot({ lat: 37, lon: -122 }, 80);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('abc123');
  });
});
