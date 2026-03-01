import type { RendererApi } from '../../../shared/ipc';
import type { DebugEntry } from '../services/debugLog';

declare global {
  interface Window {
    ceilingFlights: RendererApi;
    __ceilingDebugLog?: DebugEntry[];
  }
}

export {};
