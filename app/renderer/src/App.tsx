import { useEffect, useMemo, useState } from 'react';
import { Box, Transition } from '@mantine/core';
import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { RendererApi } from '../../shared/ipc';
import type { AppSettings, GeoPoint, UpdateInfo } from '../../shared/types';
import { FlightMap } from './components/FlightMap';
import { StatusPill } from './components/StatusPill';
import { ControlPanel } from './components/ControlPanel';
import { UpdateModal } from './components/overlay';
import { useStartupSettings } from './hooks/useStartupSettings';
import { useMapToggleLock } from './hooks/useMapToggleLock';
import { useFlightPolling } from './hooks/useFlightPolling';
import { debugLog } from './services/debugLog';

const POLL_MS = 2000;
const FETCH_RADIUS_KM = 280;
const MAX_VISIBLE_FLIGHTS = 20;
const MIN_MAP_TOGGLE_LOCK_MS = 1000;
const MAP_TOGGLE_MAX_WAIT_MS = 4000;

// Safe fallback keeps renderer usable even if preload bridge fails during development.
const fallbackApi: RendererApi = {
  getSettings: async () => DEFAULT_SETTINGS,
  setSettings: async (settings) => settings,
  autoLocate: async () => ({ ok: false, source: 'none', errorCode: 'unknown', message: 'Bridge unavailable' }),
  searchLocation: async () => ({
    ok: false,
    source: 'none',
    errorCode: 'network',
    message: 'Bridge unavailable'
  }),
  fetchSnapshot: async () => [],
  toggleFullscreen: async () => false,
  getFullscreen: async () => false,
  checkForUpdate: async () => ({ currentVersion: '0.0.0', update: null }),
  skipUpdate: async () => {},
  openUpdateUrl: async () => {}
};

const isFn = <TArgs extends unknown[], TReturn>(
  value: unknown
): value is (...args: TArgs) => Promise<TReturn> => typeof value === 'function';

const resolveApi = (): RendererApi => {
  const bridge = window.ceilingFlights as Partial<RendererApi> | undefined;
  if (!bridge) return fallbackApi;

  return {
    getSettings: isFn<[], AppSettings>(bridge.getSettings) ? bridge.getSettings : fallbackApi.getSettings,
    setSettings: isFn<[AppSettings], AppSettings>(bridge.setSettings) ? bridge.setSettings : fallbackApi.setSettings,
    autoLocate: isFn<[], Awaited<ReturnType<RendererApi['autoLocate']>>>(bridge.autoLocate)
      ? bridge.autoLocate
      : fallbackApi.autoLocate,
    searchLocation: isFn<[string], Awaited<ReturnType<RendererApi['searchLocation']>>>(bridge.searchLocation)
      ? bridge.searchLocation
      : fallbackApi.searchLocation,
    fetchSnapshot: isFn<[GeoPoint, number], Awaited<ReturnType<RendererApi['fetchSnapshot']>>>(bridge.fetchSnapshot)
      ? bridge.fetchSnapshot
      : fallbackApi.fetchSnapshot,
    toggleFullscreen: isFn<[], boolean>(bridge.toggleFullscreen)
      ? bridge.toggleFullscreen
      : fallbackApi.toggleFullscreen,
    getFullscreen: isFn<[], boolean>(bridge.getFullscreen) ? bridge.getFullscreen : fallbackApi.getFullscreen,
    checkForUpdate: isFn<[], Awaited<ReturnType<RendererApi['checkForUpdate']>>>(bridge.checkForUpdate)
      ? bridge.checkForUpdate
      : fallbackApi.checkForUpdate,
    skipUpdate: isFn<[string], Awaited<ReturnType<RendererApi['skipUpdate']>>>(bridge.skipUpdate)
      ? bridge.skipUpdate
      : fallbackApi.skipUpdate,
    openUpdateUrl: isFn<[string], Awaited<ReturnType<RendererApi['openUpdateUrl']>>>(bridge.openUpdateUrl)
      ? bridge.openUpdateUrl
      : fallbackApi.openUpdateUrl
  };
};

export default function App() {
  const [showPanel, setShowPanel] = useState(true);
  const [introVisible, setIntroVisible] = useState(false);
  const [isLocationSnapshotPending, setLocationSnapshotPending] = useState(true);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);

  const api = useMemo(resolveApi, []);

  const {
    settings,
    setSettings,
    setLocationMode,
    isFullscreen,
    hasBootstrapped,
    locateStatus,
    toggleFullscreen
  } = useStartupSettings(api);

  const { isMapTogglePending, startMapTogglePending, onMapVisibilityApplied } = useMapToggleLock({
    showMap: settings.showMap,
    setSettings,
    minLockMs: MIN_MAP_TOGGLE_LOCK_MS,
    maxWaitMs: MAP_TOGGLE_MAX_WAIT_MS
  });

  const { snapshot, connectionState } = useFlightPolling({
    home: settings.home,
    pollMs: POLL_MS,
    fetchRadiusKm: FETCH_RADIUS_KM,
    maxVisibleFlights: MAX_VISIBLE_FLIGHTS
  });

  // Keep status in "refreshing" while a new location is awaiting first rendered snapshot.
  useEffect(() => {
    setLocationSnapshotPending(true);
  }, [settings.home.lat, settings.home.lon]);

  const effectiveConnectionState = useMemo(
    () => ({
      ...connectionState,
      refreshing: connectionState.refreshing || isLocationSnapshotPending
    }),
    [connectionState, isLocationSnapshotPending]
  );

  // One-time intro fade-in after bootstrap.
  useEffect(() => {
    const id = window.setTimeout(() => setIntroVisible(true), 240);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!hasBootstrapped) return;

    let disposed = false;

    const loadUpdate = async () => {
      try {
        const result = await api.checkForUpdate();
        if (disposed || !result.update) return;

        debugLog('startup', 'Update available', {
          currentVersion: result.currentVersion,
          latestVersion: result.update.latestVersion
        });
        setAvailableUpdate(result.update);
        setUpdateModalOpen(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown update-check error';
        debugLog('startup', 'Update check failed', { message });
      }
    };

    void loadUpdate();
    return () => {
      disposed = true;
    };
  }, [api, hasBootstrapped]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key !== 'm' && key !== 'f' && key !== 's') return;

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (activeElement instanceof HTMLElement && activeElement !== document.body) {
        activeElement.blur();
      }

      if (key === 'm') {
        debugLog('ui', 'Shortcut M pressed', { showMap: settings.showMap, pending: isMapTogglePending });
        startMapTogglePending();
      } else if (key === 'f') {
        debugLog('ui', 'Shortcut F pressed', { isFullscreen });
        void toggleFullscreen();
      } else if (key === 's') {
        debugLog('ui', 'Shortcut S pressed', { showPanel });
        setShowPanel((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, isMapTogglePending, settings.showMap, showPanel, startMapTogglePending, toggleFullscreen]);

  // Derive a human-readable location label for the status pill.
  const locationLabel = useMemo(() => {
    if (settings.locationMode === 'random' && locateStatus.text.startsWith('Random city:')) {
      return locateStatus.text.replace('Random city: ', '');
    }
    return `${settings.home.lat.toFixed(3)}°, ${settings.home.lon.toFixed(3)}°`;
  }, [locateStatus.text, settings.home.lat, settings.home.lon, settings.locationMode]);

  return (
    <Box component="main" w="100%" h="100%" pos="relative" bg="#0a0b0d">
      {/* Map layer — rendered only after settings load so center/zoom are consistent. */}
      <Box w="100%" h="100%">
        {hasBootstrapped ? (
          <>
            <Transition
              mounted={introVisible}
              transition="fade"
              duration={620}
              timingFunction="cubic-bezier(0.2, 0.7, 0, 1)"
            >
              {(styles) => (
                <Box w="100%" h="100%" style={styles}>
                  <FlightMap
                    home={settings.home}
                    zoom={settings.zoom}
                    snapshot={snapshot}
                    pollMs={POLL_MS}
                    showMap={settings.showMap}
                    onMapVisibilityApplied={onMapVisibilityApplied}
                    onSnapshotRendered={() => setLocationSnapshotPending(false)}
                  />
                </Box>
              )}
            </Transition>
            {!introVisible ? <Box w="100%" h="100%" bg="#0a0b0d" /> : null}
          </>
        ) : (
          <Box w="100%" h="100%" bg="#0a0b0d" />
        )}
      </Box>

      {/* Settings panel — slides in from top-left. */}
      <ControlPanel
        visible={showPanel}
        settings={settings}
        locateStatus={locateStatus}
        isMapTogglePending={isMapTogglePending}
        isFullscreen={isFullscreen}
        connectionState={effectiveConnectionState}
        onHide={() => setShowPanel(false)}
        onToggleMap={startMapTogglePending}
        onToggleFullscreen={() => void toggleFullscreen()}
        onLocationModeChange={setLocationMode}
        onZoomChange={(zoom) => setSettings((prev) => ({ ...prev, zoom }))}
        onManualLocationApply={(nextHome) =>
          setSettings((prev) => ({ ...prev, locationMode: 'manual', home: nextHome }))
        }
      />

      {showPanel ? (
        <StatusPill
          connectionState={effectiveConnectionState}
          aircraftCount={snapshot.length}
          locationLabel={locationLabel}
          panelVisible={showPanel}
          onTogglePanel={() => setShowPanel((prev) => !prev)}
        />
      ) : null}

      <UpdateModal
        opened={isUpdateModalOpen && availableUpdate !== null}
        update={availableUpdate}
        onLater={() => setUpdateModalOpen(false)}
        onSkipVersion={(version) => {
          void api.skipUpdate(version);
          setUpdateModalOpen(false);
        }}
        onUpdate={() => {
          if (!availableUpdate) return;
          void api.openUpdateUrl(availableUpdate.releaseUrl);
          setUpdateModalOpen(false);
        }}
      />
    </Box>
  );
}
