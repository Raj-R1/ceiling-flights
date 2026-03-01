# Architecture

## Runtime layers

- `app/main/`
  - Owns Electron lifecycle, window creation, and IPC handlers.
  - Executes network calls for ADS-B snapshots and IP geolocation.
  - Persists user settings under Electron `userData`.
- `app/preload/`
  - Exposes a narrow, typed bridge via `contextBridge`.
  - Keeps renderer isolated from Node/Electron internals.
- `app/renderer/`
  - React app for UI state, settings overlay, and map display.
  - MapLibre renders basemap + aircraft markers.
  - Polling and interpolation stay in renderer for smooth visuals.
- `app/shared/`
  - Shared type contracts, defaults, and settings sanitization.

## Cross-platform strategy

- No OS-specific geolocation implementations.
- Location modes are:
  - `IP`: HTTP geolocation providers.
  - `Random`: built-in major city catalog.
  - `Manual`: user-entered coordinates.
- Window lifecycle keeps standard macOS close behavior, but core features are platform-neutral.

## Data flow

1. Renderer requests settings via IPC.
2. User chooses location mode and runs locate.
3. Main resolves location (IP/random/manual) and renderer stores updated settings.
4. Renderer poller requests ADS-B snapshots from main every interval.
5. Renderer interpolates snapshots and updates map GeoJSON source.
