# Packaging

Build production assets:

```bash
pnpm build
```

Create installers:

```bash
pnpm package:mac
pnpm package:win
pnpm package:linux
```

Notes:

- Code signing/notarization is not configured in this scaffold.
- Raspberry Pi kiosk startup is phase 2.
- Location modes in this build:
  - `Random`: picks from a built-in list of major cities.
  - `IP`: uses HTTP IP geolocation providers directly.
  - `Manual`: user-entered coordinates.
- `IP` location is network-based and can be approximate depending on ISP/VPN/proxy routing.
- CI (`.github/workflows/ci.yml`) runs lint, tests, and build on macOS/Windows/Linux.
