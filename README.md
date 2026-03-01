# Ceiling Flights

Debug-first Electron app for map-aligned overhead flight plotting.

## Current Features

- Electron + React + MapLibre GL
- Smooth vector basemap (non-interactive debug mode)
- Flights fetched through Electron main process (no renderer CORS issues)
- Dot per aircraft with debug flight name above marker
- On-demand location modes: `Random`, `IP`, and `Manual`
- Lat/lon + zoom persisted on-device
- Fullscreen toggle + glass-style minimal settings overlay
- Cross-platform runtime path (no macOS/Windows/Linux-specific location code)

## Quick start

```bash
bash ./scripts/setup-mac.sh
pnpm dev
```

## Build and verify

```bash
pnpm lint
pnpm test
pnpm build
```

## Packaging targets

```bash
pnpm package:mac
pnpm package:win
pnpm package:linux
```

## Dev mode behavior

- DevTools are now opt-in in development.
- To open them automatically, run:

```bash
CEILING_FLIGHTS_OPEN_DEVTOOLS=1 pnpm dev
```

## Known Limitations

- `IP` mode is network-based and can vary by ISP, VPN, and proxy routing.
- Trails are intentionally deferred in this cleanup phase.

## Architecture

- Electron `main` process owns privileged operations:
  - Settings file persistence
  - IP geolocation provider calls
  - ADS-B API fetches
- `preload` exposes a narrow typed bridge (`window.ceilingFlights`).
- React renderer owns map rendering, state, and UI animations.
- Flight interpolation runs in renderer and caps visible aircraft for performance.
