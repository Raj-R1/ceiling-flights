import { useEffect, useMemo, useState } from 'react';
import { Box, Transition } from '@mantine/core';
import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { RendererApi } from '../../shared/ipc';
import { FlightMap } from './components/FlightMap';
import { StatusPill } from './components/StatusPill';
import { ControlPanel } from './components/ControlPanel';
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
  fetchSnapshot: async () => [],
  toggleFullscreen: async () => false,
  getFullscreen: async () => false
};

export default function App() {
  const [showPanel, setShowPanel] = useState(true);
  const [introVisible, setIntroVisible] = useState(false);
  const [isLocationSnapshotPending, setLocationSnapshotPending] = useState(true);

  const api = window.ceilingFlights ?? fallbackApi;

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
    </Box>
  );
}
