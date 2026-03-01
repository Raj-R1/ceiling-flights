# Setup

## Scripted setup (recommended for fresh macOS)

```bash
bash ./scripts/setup-mac.sh
pnpm dev
```

## Manual fallback

```bash
brew install node
corepack enable
corepack prepare pnpm@10.6.4 --activate
pnpm install --ignore-scripts=false
pnpm rebuild esbuild electron
pnpm dev
```

## Controls

- `S`: show/hide settings overlay
- `M`: show/hide map
- `F`: toggle fullscreen

## Location Modes

- `Random`: picks one major city from a built-in global list (70+ cities) and moves the map there.
- `IP`: uses direct HTTP IP geolocation providers.
- `Manual`: unlocks latitude/longitude inputs.

## Optional DevTools

```bash
CEILING_FLIGHTS_OPEN_DEVTOOLS=1 pnpm dev
```

## Recommended local validation

```bash
pnpm lint
pnpm test
pnpm build
```
