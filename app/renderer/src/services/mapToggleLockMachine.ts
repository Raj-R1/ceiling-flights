export type MapToggleLockState = {
  pending: boolean;
  targetShowMap: boolean | null;
  acked: boolean;
  minLockElapsed: boolean;
};

export const idleMapToggleLockState = (): MapToggleLockState => ({
  pending: false,
  targetShowMap: null,
  acked: false,
  minLockElapsed: false
});

export const startMapToggleLockState = (currentShowMap: boolean): MapToggleLockState => ({
  pending: true,
  targetShowMap: !currentShowMap,
  acked: false,
  minLockElapsed: false
});

export const acknowledgeMapVisibility = (
  state: MapToggleLockState,
  appliedShowMap: boolean
): MapToggleLockState => {
  if (!state.pending || state.targetShowMap === null || appliedShowMap !== state.targetShowMap) {
    return state;
  }

  return {
    ...state,
    acked: true
  };
};

export const markMapToggleMinLockElapsed = (state: MapToggleLockState): MapToggleLockState => ({
  ...state,
  minLockElapsed: true
});

export const shouldReleaseMapToggleLock = (state: MapToggleLockState): boolean =>
  state.pending && state.acked && state.minLockElapsed;
