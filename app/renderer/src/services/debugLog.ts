export type DebugEntry = {
  ts: string;
  scope: string;
  message: string;
  details?: unknown;
};

const MAX_DEBUG_ENTRIES = 250;

const getStore = (): DebugEntry[] => {
  // Keep a bounded in-memory log for quick debugging in DevTools.
  const target = window as Window & { __ceilingDebugLog?: DebugEntry[] };
  if (!target.__ceilingDebugLog) {
    target.__ceilingDebugLog = [];
  }
  return target.__ceilingDebugLog;
};

export const debugLog = (scope: string, message: string, details?: unknown): void => {
  const entry: DebugEntry = {
    ts: new Date().toISOString(),
    scope,
    message,
    details
  };
  const store = getStore();
  store.push(entry);
  if (store.length > MAX_DEBUG_ENTRIES) {
    store.splice(0, store.length - MAX_DEBUG_ENTRIES);
  }

  if (details === undefined) {
    console.info(`[${entry.ts}] [${scope}] ${message}`);
    return;
  }
  let serialized = '[unserializable]';
  try {
    serialized = JSON.stringify(details);
  } catch {
    // Keep fallback marker.
  }
  console.info(`[${entry.ts}] [${scope}] ${message} ${serialized}`);
};

export const getDebugLog = (): DebugEntry[] => getStore().slice();
