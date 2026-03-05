import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppSettings } from '../../../shared/types';
import { debugLog } from '../services/debugLog';
import {
  acknowledgeMapVisibility,
  idleMapToggleLockState,
  markMapToggleMinLockElapsed,
  shouldReleaseMapToggleLock,
  type MapToggleLockState
} from '../services/mapToggleLockMachine';

const DEFAULT_MIN_LOCK_MS = 1000;
const DEFAULT_MAX_WAIT_MS = 4000;

type Params = {
  showMap: boolean;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  minLockMs?: number;
  maxWaitMs?: number;
};

export const useMapToggleLock = ({
  showMap,
  setSettings,
  minLockMs = DEFAULT_MIN_LOCK_MS,
  maxWaitMs = DEFAULT_MAX_WAIT_MS
}: Params) => {
  const [isMapTogglePending, setIsMapTogglePending] = useState(false);
  const showMapRef = useRef(showMap);
  const minLockTimerRef = useRef<number | null>(null);
  const maxWaitTimerRef = useRef<number | null>(null);
  const lockStateRef = useRef<MapToggleLockState>(idleMapToggleLockState());

  useEffect(() => {
    showMapRef.current = showMap;
  }, [showMap]);

  const clearPending = useCallback(() => {
    if (minLockTimerRef.current !== null) {
      window.clearTimeout(minLockTimerRef.current);
      minLockTimerRef.current = null;
    }
    if (maxWaitTimerRef.current !== null) {
      window.clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
    lockStateRef.current = idleMapToggleLockState();
    setIsMapTogglePending(false);
  }, []);

  useEffect(() => {
    return () => {
      clearPending();
    };
  }, [clearPending]);

  const startMapTogglePending = useCallback((nextShowMap?: boolean) => {
    if (lockStateRef.current.pending) return;
    const currentShowMap = showMapRef.current;
    const targetShowMap = typeof nextShowMap === 'boolean' ? nextShowMap : !currentShowMap;
    if (targetShowMap === currentShowMap) return;

    setIsMapTogglePending(true);
    lockStateRef.current = {
      pending: true,
      targetShowMap,
      acked: false,
      minLockElapsed: false
    };

    if (minLockTimerRef.current !== null) {
      window.clearTimeout(minLockTimerRef.current);
    }
    if (maxWaitTimerRef.current !== null) {
      window.clearTimeout(maxWaitTimerRef.current);
    }

    minLockTimerRef.current = window.setTimeout(() => {
      lockStateRef.current = markMapToggleMinLockElapsed(lockStateRef.current);
      minLockTimerRef.current = null;
      if (shouldReleaseMapToggleLock(lockStateRef.current)) {
        clearPending();
      }
    }, minLockMs);

    maxWaitTimerRef.current = window.setTimeout(() => {
      debugLog('ui', 'Map toggle lock timed out before map visibility ack', {
        showMap: showMapRef.current,
        targetShowMap: lockStateRef.current.targetShowMap,
        lockState: lockStateRef.current
      });
      clearPending();
    }, maxWaitMs);

    setSettings((prev) => ({ ...prev, showMap: targetShowMap }));
  }, [clearPending, maxWaitMs, minLockMs, setSettings]);

  const onMapVisibilityApplied = useCallback(
    (appliedShowMap: boolean) => {
      lockStateRef.current = acknowledgeMapVisibility(lockStateRef.current, appliedShowMap);
      if (shouldReleaseMapToggleLock(lockStateRef.current)) {
        clearPending();
      }
    },
    [clearPending]
  );

  return {
    isMapTogglePending,
    startMapTogglePending,
    onMapVisibilityApplied
  };
};
