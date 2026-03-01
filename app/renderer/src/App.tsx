import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { RendererApi } from '../../shared/ipc';
import { SettingsOverlay } from './components/SettingsOverlay';
import { FlightMap } from './components/FlightMap';
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
  const [showSettings, setShowSettings] = useState(true);
  const [introVisible, setIntroVisible] = useState(false);
  const [panelStartupActive, setPanelStartupActive] = useState(true);

  const api = window.ceilingFlights ?? fallbackApi;

  const {
    settings,
    setSettings,
    setLocationMode,
    isFullscreen,
    hasBootstrapped,
    locateStatus,
    runAutoLocate,
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

  useEffect(() => {
    // Run one-time startup animation phases independently from manual panel toggles.
    const revealId = window.setTimeout(() => {
      setIntroVisible(true);
    }, 240);
    const doneId = window.setTimeout(() => {
      setPanelStartupActive(false);
    }, 1800);
    return () => {
      window.clearTimeout(revealId);
      window.clearTimeout(doneId);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 's') {
        setShowSettings((prev) => !prev);
      }
      if (event.key.toLowerCase() === 'm') {
        startMapTogglePending();
      }
      if (event.key.toLowerCase() === 'f') {
        void toggleFullscreen();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startMapTogglePending, toggleFullscreen]);

  useEffect(() => {
    debugLog('ui', 'Panel visibility changed', { visible: showSettings, panelStartupActive });
  }, [panelStartupActive, showSettings]);

  return (
    <main className="app-shell">
      {/* Render map only after settings load so initial center/zoom are consistent. */}
      {hasBootstrapped ? (
        <FlightMap
          home={settings.home}
          zoom={settings.zoom}
          snapshot={snapshot}
          pollMs={POLL_MS}
          showMap={settings.showMap}
          introVisible={introVisible}
          onMapVisibilityApplied={onMapVisibilityApplied}
        />
      ) : (
        <div className={`map-placeholder ${introVisible ? 'intro-visible' : 'intro-hidden'}`} />
      )}
      <SettingsOverlay
        settings={settings}
        visible={showSettings}
        isFullscreen={isFullscreen}
        isMapTogglePending={isMapTogglePending}
        startupPhase={panelStartupActive ? (introVisible ? 'visible' : 'hidden') : 'done'}
        onSettingsChange={setSettings}
        onLocationModeChange={setLocationMode}
        onToggleSettings={() => setShowSettings((prev) => !prev)}
        onToggleMap={startMapTogglePending}
        locateStatus={locateStatus}
        onLocate={() => {
          void runAutoLocate();
        }}
        onToggleFullscreen={() => {
          void toggleFullscreen();
        }}
      />
      {connectionState.offline ? <div className="status">Offline: using last snapshot</div> : null}
      {/* Shortcuts hint is intentionally hidden when panel is hidden for ambient mode. */}
      {showSettings ? <div className="hint">Shortcuts: S panel • M map • F fullscreen</div> : null}
    </main>
  );
}
