import { describe, expect, it } from 'vitest';
import type { ConnectionState } from '../shared/types';

const onSuccess = (): ConnectionState => ({ offline: false, refreshing: false, lastSuccessMs: Date.now() });

const onError = (prev: ConnectionState, message: string): ConnectionState => ({
  offline: true,
  refreshing: false,
  lastError: message,
  lastSuccessMs: prev.lastSuccessMs
});

describe('connection state', () => {
  it('preserves last success on error and recovers on success', () => {
    const success = onSuccess();
    const fail = onError(success, 'network');
    expect(fail.offline).toBe(true);
    expect(fail.lastSuccessMs).toBe(success.lastSuccessMs);

    const recovered = onSuccess();
    expect(recovered.offline).toBe(false);
    expect(recovered.lastSuccessMs).toBeTypeOf('number');
  });
});
