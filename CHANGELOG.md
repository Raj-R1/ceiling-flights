# Changelog

## v0.2 Beta (0.2.0-beta.1) — March 2026

### New Features

- **Glassmorphism UI redesign** — introduced the `LiquidGlass` component with real frosted-glass blur, inner-glow rim lighting, and layered depth shadows. Used throughout the control panel, status pill, and update modal.
- **Glass control panel** — the old overlay drawer is replaced by a new panel that slides in from the top-left. Organised into collapsible sections: Location, View, Display, and Shortcuts. Keyboard-accessible and smooth.
- **Status pill** — always-visible glass pill anchored to the bottom-left. Shows a live/offline/refreshing dot, aircraft count, current location, and a hint to toggle the panel. Includes a CSS pulse animation when live.
- **Auto-update checks** — on startup the app checks GitHub Releases for a newer version. If one is found, a polished modal shows the version diff, release date, changelog, and options to open the release page or skip the version permanently.
- **Location search** — search for any city or address by name (powered by Nominatim). Previously only IP-based and random-city modes were available.

### Improvements

- Map toggle is now debounced with a pure state machine (`mapToggleLockMachine`) to prevent flicker when toggling rapidly.
- Zoom slider has improved marks density and a larger, easier-to-grab thumb.
- Startup fade-in transition is smoother (`cubic-bezier(0.2, 0.7, 0, 1)`, 620 ms).
- Dark background fix at map edges — no more light bleed on projector setups.
- Status indicator in the control panel now reflects the `refreshing` state during location changes.
- Mantine v8 overhaul: unified glass theme tokens (`glassTokens.ts`), consistent `Paper`, `Modal`, `Button`, `Switch`, and `Slider` overrides.

### Internals

- Structured debug logger (`debugLog.ts`) with typed categories for renderer-side events.
- Robust semver parser and version comparator in `updateService.ts` with full test coverage.
- `locateRequestIdRef` pattern prevents stale async results from IP-locate races.
- `desiredShowMapRef` + `syncFnRef` pattern stabilises map-layer visibility sync across effects.

---

## v0.1 — Initial Release

- Real-time aircraft positions from adsb.lol within a configurable radius.
- MapLibre GL dark map with smooth lerp animation and heading-based aircraft icons.
- IP-based and random-city auto-location.
- Basic settings panel with zoom, map toggle, and fullscreen.
- Manual location entry via coordinate editor.
- Electron app with IPC bridge for settings persistence.
