import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppSettings } from '../../../shared/types';

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
  // acked=true means map layer update callback confirmed visibility change.
  const ackedRef = useRef(false);
  const minLockElapsedRef = useRef(false);

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
    ackedRef.current = false;
    minLockElapsedRef.current = false;
    setIsMapTogglePending(false);
  }, []);

  useEffect(() => {
    return () => {
      clearPending();
    };
  }, [clearPending]);

  const startMapTogglePending = useCallback(() => {
    if (isMapTogglePending) return;
    setIsMapTogglePending(true);
    ackedRef.current = false;
    minLockElapsedRef.current = false;

    if (minLockTimerRef.current !== null) {
      window.clearTimeout(minLockTimerRef.current);
    }
    if (maxWaitTimerRef.current !== null) {
      window.clearTimeout(maxWaitTimerRef.current);
    }

    minLockTimerRef.current = window.setTimeout(() => {
      minLockElapsedRef.current = true;
      minLockTimerRef.current = null;
      if (ackedRef.current) {
        clearPending();
      }
    }, minLockMs);

    maxWaitTimerRef.current = window.setTimeout(() => {
      clearPending();
    }, maxWaitMs);

    setSettings((prev) => ({ ...prev, showMap: !prev.showMap }));
  }, [clearPending, isMapTogglePending, maxWaitMs, minLockMs, setSettings]);

  const onMapVisibilityApplied = useCallback(
    (appliedShowMap: boolean) => {
      // Ignore unrelated map events while lock is tracking a specific target state.
      if (appliedShowMap !== showMapRef.current) return;
      ackedRef.current = true;
      if (minLockElapsedRef.current) {
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
