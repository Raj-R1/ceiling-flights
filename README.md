# Ceiling Flights

Ambient flight tracker for ceiling projectors — real-time ADS-B aircraft rendered on a dark vector map.

## Features

- Electron + React + MapLibre GL with smooth lerp animation
- Live ADS-B data via [adsb.lol](https://adsb.lol) (fetched in main process, no CORS)
- Location modes: `Random`, `IP`, and `Manual` with persisted settings
- Glass-panel control overlay with keyboard shortcuts (`S` / `M` / `F`)
- Fullscreen toggle, configurable zoom, map tile on/off
- Cross-platform: macOS, Windows, Linux

## Quick start

```bash
pnpm install
pnpm dev
```

## Commands

```bash
pnpm lint       # ESLint
pnpm test       # Vitest
pnpm build      # Production build
```

## Packaging

```bash
pnpm package:mac
pnpm package:win
pnpm package:linux
```

## DevTools

DevTools are opt-in in development:

```bash
CEILING_FLIGHTS_OPEN_DEVTOOLS=1 pnpm dev
```

## Architecture

- **main**: settings persistence, IP geolocation, ADS-B fetches
- **preload**: narrow typed bridge (`window.ceilingFlights`)
- **renderer**: map rendering, flight interpolation, UI (Mantine + MapLibre)

## Notes

- `IP` mode accuracy depends on ISP, VPN, and proxy routing.

## About

Built by [Raj](https://github.com/Raj-R1) — vibe coded with ChatGPT Codex and Claude.
