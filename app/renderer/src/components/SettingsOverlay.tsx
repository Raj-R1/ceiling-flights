import type { AppSettings } from '../../../shared/types';

type Props = {
  settings: AppSettings;
  visible: boolean;
  isFullscreen: boolean;
  isMapTogglePending: boolean;
  startupPhase: 'hidden' | 'visible' | 'done';
  locateStatus: { tone: 'neutral' | 'success' | 'warning' | 'error'; icon: string; text: string };
  onSettingsChange: (next: AppSettings) => void;
  onLocationModeChange: (mode: AppSettings['locationMode']) => void;
  onToggleSettings: () => void;
  onToggleMap: () => void;
  onLocate: () => void;
  onToggleFullscreen: () => void;
};

export function SettingsOverlay({
  settings,
  visible,
  isFullscreen,
  isMapTogglePending,
  startupPhase,
  locateStatus,
  onSettingsChange,
  onLocationModeChange,
  onToggleSettings,
  onToggleMap,
  onLocate,
  onToggleFullscreen
}: Props) {
  // Numeric inputs stay resilient when users temporarily clear the field.
  const parseOr = (value: string, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const latLonLocked = settings.locationMode !== 'manual';

  return (
    <section className={`settings-overlay ${visible ? 'visible' : 'hidden'} startup-${startupPhase}`} role="region" aria-label="settings">
      <div className="settings-header">
        <h2>Flight Controls</h2>
        <span>Shortcuts mirror buttons</span>
      </div>

      <div className={`locate-status ${locateStatus.tone}`} role="status" aria-live="polite">
        <span className="locate-icon" aria-hidden="true">
          {locateStatus.icon}
        </span>
        <span className="locate-text">{locateStatus.text}</span>
      </div>

      <div className="mode-row" role="group" aria-label="location mode">
        <button
          type="button"
          className={`mode-button ${settings.locationMode === 'random' ? 'active' : ''}`}
          aria-pressed={settings.locationMode === 'random'}
          onClick={() => onLocationModeChange('random')}
        >
          Random
        </button>
        <button
          type="button"
          className={`mode-button ${settings.locationMode === 'ip' ? 'active' : ''}`}
          aria-pressed={settings.locationMode === 'ip'}
          onClick={() => onLocationModeChange('ip')}
        >
          IP
        </button>
        <button
          type="button"
          className={`mode-button ${settings.locationMode === 'manual' ? 'active' : ''}`}
          aria-pressed={settings.locationMode === 'manual'}
          onClick={() => onLocationModeChange('manual')}
        >
          Manual
        </button>
      </div>

      <div className="settings-grid">
        <label>
          Latitude
          <input
            className={latLonLocked ? 'locked-input' : undefined}
            type="number"
            step="0.0001"
            value={settings.home.lat}
            disabled={latLonLocked}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                home: { ...settings.home, lat: parseOr(e.target.value, settings.home.lat) }
              })
            }
          />
        </label>
        <label>
          Longitude
          <input
            className={latLonLocked ? 'locked-input' : undefined}
            type="number"
            step="0.0001"
            value={settings.home.lon}
            disabled={latLonLocked}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                home: { ...settings.home, lon: parseOr(e.target.value, settings.home.lon) }
              })
            }
          />
        </label>
        <label>
          Zoom
          <input
            type="number"
            min={3}
            max={12}
            step={1}
            value={settings.zoom}
            onChange={(e) => onSettingsChange({ ...settings, zoom: Math.max(3, Math.min(12, Math.round(parseOr(e.target.value, settings.zoom)))) })}
          />
        </label>
      </div>

      <button type="button" className="locate-action" onClick={onLocate}>
        Locate ({settings.locationMode.toUpperCase()})
      </button>

      <div className="actions-row">
        <button type="button" aria-pressed={visible} onClick={onToggleSettings}>
          {visible ? 'Hide Panel (S)' : 'Show Panel (S)'}
        </button>
        <button
          type="button"
          onClick={onToggleMap}
          disabled={isMapTogglePending}
          aria-pressed={settings.showMap}
          className={isMapTogglePending ? 'map-toggle-pending' : undefined}
        >
          {isMapTogglePending ? 'Applying map change…' : settings.showMap ? 'Hide Map (M)' : 'Show Map (M)'}
        </button>
        <button type="button" aria-pressed={isFullscreen} onClick={onToggleFullscreen}>
          {isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
        </button>
      </div>
    </section>
  );
}
