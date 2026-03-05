import { describe, expect, it } from 'vitest';
import {
  acknowledgeMapVisibility,
  idleMapToggleLockState,
  markMapToggleMinLockElapsed,
  shouldReleaseMapToggleLock,
  startMapToggleLockState
} from '../renderer/src/services/mapToggleLockMachine';

describe('mapToggleLockMachine', () => {
  it('computes target visibility on start', () => {
    const fromVisible = startMapToggleLockState(true);
    const fromHidden = startMapToggleLockState(false);

    expect(fromVisible.targetShowMap).toBe(false);
    expect(fromHidden.targetShowMap).toBe(true);
    expect(fromVisible.pending).toBe(true);
    expect(fromHidden.pending).toBe(true);
  });

  it('rejects stale/unrelated visibility acknowledgements', () => {
    const started = startMapToggleLockState(true); // target should be false
    const staleAck = acknowledgeMapVisibility(started, true);

    expect(staleAck.acked).toBe(false);
    expect(shouldReleaseMapToggleLock(staleAck)).toBe(false);
  });

  it('releases only when both ack and minimum lock elapsed are true', () => {
    const started = startMapToggleLockState(false); // target should be true
    const acked = acknowledgeMapVisibility(started, true);
    expect(acked.acked).toBe(true);
    expect(shouldReleaseMapToggleLock(acked)).toBe(false);

    const elapsed = markMapToggleMinLockElapsed(acked);
    expect(shouldReleaseMapToggleLock(elapsed)).toBe(true);
  });

  it('resets to idle on clear/timeout state', () => {
    const idle = idleMapToggleLockState();
    expect(idle.pending).toBe(false);
    expect(idle.targetShowMap).toBeNull();
    expect(shouldReleaseMapToggleLock(idle)).toBe(false);
  });
});
