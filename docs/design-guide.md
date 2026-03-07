# Ceiling Flights — Design Guide

## Purpose

This is the persistent visual and interaction source-of-truth for this project.
Use it for all future UI, color, animation, and Mantine decisions so the app keeps one coherent identity.
Token values here are extracted directly from source — treat them as canonical.

---

## Design Philosophy

- **Ambient-first**: designed for passive viewing (ceiling/projector), not dense interaction.
- **Low-light comfort**: keep luminance controlled, avoid harsh contrast spikes.
- **Motion with intent**: animate state changes only when they explain context change.
- **Quiet control layer**: UI should feel like glass sitting above the map, not competing with it.
- **Deterministic behavior**: controls should not flicker, double-trigger, or feel race-prone.

---

## Global Setup

### MantineProvider (main.tsx)

```tsx
<MantineProvider
  theme={mantineTheme}
  forceColorScheme="dark"
  withCssVariables
  cssVariablesSelector=":root"
>
```

Always force dark mode. Never allow system theme switching.

### Global CSS (injected via `<style>` in main.tsx)

```css
html, body, #root {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a0b0d;
}

.maplibregl-map {
  width: 100%;
  height: 100%;
  background: #0a0b0d;
  filter: saturate(1.08) contrast(1.1) brightness(1.05);
}

/* Hide all MapLibre native controls */
.maplibregl-ctrl-bottom-right,
.maplibregl-ctrl-bottom-left,
.maplibregl-ctrl-top-right,
.maplibregl-ctrl-top-left {
  display: none !important;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.28; }
}
```

The map gets a post-process filter: `saturate(1.08) contrast(1.1) brightness(1.05)` — subtle enhancement, not aggressive.

---

## Mantine Theme (`mantineTheme.ts`)

```ts
createTheme({
  primaryColor: 'gray',
  defaultRadius: 'md',
  shadows: {
    md: '0 14px 32px rgba(0, 0, 0, 0.3)'   // GLASS_SURFACE_TOKENS.shadow
  },
  components: {
    Paper: {
      defaultProps: { shadow: 'md', radius: 18 },
      styles: {
        root: {
          background: 'rgba(20, 23, 29, 0.56)',
          border: '1px solid rgba(255, 255, 255, 0.17)',
          backdropFilter: 'blur(11px) saturate(162%) contrast(1.1)',
          WebkitBackdropFilter: 'blur(11px) saturate(162%) contrast(1.1)'
        }
      }
    },
    Modal: {
      styles: {
        content: {
          background: 'rgba(16, 19, 24, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.17)',
          backdropFilter: 'blur(11px) saturate(150%)',
          WebkitBackdropFilter: 'blur(11px) saturate(150%)'
        },
        header: { background: 'transparent' },
        overlay: {
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(2px)'
        }
      }
    }
  }
})
```

**Rule**: `Paper` and `Modal` glass styles are defined in the theme, not in components. This is the ONLY place manual CSS is acceptable — no Mantine native equivalent exists for glassmorphism.

---

## Glass Design Tokens (`glassTokens.ts`)

```ts
RADIUS_TOKENS = {
  card: 18            // Paper default radius
}

GLASS_SURFACE_TOKENS = {
  blurPanel:    '11px',
  background:   'rgba(20, 23, 29, 0.56)',
  border:       'rgba(255, 255, 255, 0.17)',
  borderStrong: 'rgba(255, 255, 255, 0.2)',
  shadow:       '0 14px 32px rgba(0, 0, 0, 0.3)'
}
```

`borderStrong` is used for the StatusPill (pill needs slightly more presence than a panel).

---

## Color Palette

### Backgrounds

| Token        | Value         | Usage                        |
|--------------|---------------|------------------------------|
| base bg      | `#0a0b0d`     | html/body/root, map fallback |
| panel bg     | `rgba(20, 23, 29, 0.56)` | Paper (ControlPanel) |
| modal bg     | `rgba(16, 19, 24, 0.82)` | Modal content               |
| pill bg      | `rgba(14, 17, 22, 0.76)` | StatusPill                  |
| overlay bg   | `rgba(0, 0, 0, 0.55)` | Modal overlay               |

### Borders

| Token          | Value                         | Usage               |
|----------------|-------------------------------|---------------------|
| border         | `rgba(255, 255, 255, 0.17)`   | Paper, Modal        |
| borderStrong   | `rgba(255, 255, 255, 0.2)`    | StatusPill          |

### Text

Mantine color shorthands used throughout:

| Shorthand   | Usage                              |
|-------------|------------------------------------|
| `c="dimmed"` | Secondary/label text              |
| `c="gray.3"` | Primary pill text (aircraft count)|
| `c="gray.4"` | Tertiary pill text (location)     |
| `c="green.4"` | Success locate status            |
| `c="yellow.4"` | Warning locate status           |
| `c="red.4"` | Error locate status               |
| `c="red.3"` | Inline validation error text      |

### Status / Connection Colors

Raw hex values used for the dot in StatusPill and badge color prop:

| State       | Dot color  | Badge color prop |
|-------------|------------|------------------|
| live        | `#4ade80`  | `"green"`        |
| refreshing  | `#fbbf24`  | `"yellow"`       |
| offline     | `#f87171`  | `"red"`          |

### Map Layer Colors

Aircraft circle layer:
- `circle-color`: `#f2f4f8` (near-white dots)
- `circle-stroke-color`: `#0f1115`
- `circle-stroke-width`: `1.4`
- `circle-radius`: `4`

Aircraft label layer:
- `text-color`: `#f6f8fb`
- `text-halo-color`: `rgba(12, 14, 18, 0.96)`
- `text-halo-width`: `0.7`
- `text-size`: `13`
- `text-offset`: `[0, -1.2]`
- `text-font`: `['Open Sans Bold']`

### Zoom Slider

- Track/bar: `#ffffff`
- Thumb inner dot: `#ffffff` with `boxShadow: '0 0 0 1px rgba(0,0,0,0.18)'`
- `color="white"` on the Slider component

---

## Layout & Positioning

### Root Layer Stack (z-index)

| Layer         | z-index | Position                    |
|---------------|---------|-----------------------------|
| FlightMap     | auto    | full-bleed, fills parent    |
| ControlPanel  | 200     | fixed, top: 14, left: 14   |
| StatusPill    | 100     | fixed, bottom: 12, left: 12 |

### ControlPanel

- `pos="fixed"` top: `14`, left: `14`
- Width: `min(332px, calc(100vw - 28px))` — responsive, never clips
- `mah="calc(100vh - 28px)"` with `overflowY: 'auto'` for tall viewports
- Internal padding: `p="md"` on Paper
- Internal spacing: `gap="md"` on root Stack
- Section spacing: `gap={10}` on section Stacks
- Dividers between every section

### StatusPill

- `pos="fixed"` bottom: `12`, left: `12`
- Pill shape: `borderRadius: 9999`
- Padding: `px={14} py={9}`
- Internal gap: `12` between items
- Vertical dividers: `<Divider orientation="vertical" h={16} />`

### Modal (LocationEditorModal)

- `size={320}`, `centered`, `padding="md"`
- Internal gap: `8` on Stack

---

## Typography

- No custom font set — uses Mantine/system default sans
- Monospace used only for coordinate display: `ff="monospace"`
- Size scale in use: `size="xs"`, `size="sm"`, `size="md"` (no lg/xl in UI)
- Weight usage: `fw={700}` for panel title, `fw={600}` for section labels, `fw={500}` for inline value labels
- Line height: `lh={1}` for single-line labels, `lh={1.15}` or `lh={1.2}` for status/locate text
- Section labels: `size="xs" fw={600} c="dimmed" tt="uppercase" lh={1}`

---

## Components

### ControlPanel (`components/ControlPanel.tsx`)

Glass panel, slides in from top-left. Contains four sections separated by Dividers.

**Transition:**
```ts
const panelTransition = {
  in:  { opacity: 1, transform: 'translateX(0) scale(1)' },
  out: { opacity: 0, transform: 'translateX(-8px) scale(0.99)' },
  common: { transformOrigin: 'top left' },
  transitionProperty: 'opacity, transform'
}
// duration: 180ms, timingFunction: 'ease'
```

**Internal sub-components:**

```tsx
// Section label — uppercase small heading with optional right slot
function SectionLabel({ children, right }) {
  return (
    <Group justify="space-between" align="baseline" wrap="nowrap" gap={8}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase" lh={1}>{children}</Text>
      {right}
    </Group>
  );
}

// Control row — label left, control right
function ControlRow({ label, children }) {
  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap={6}>
      <Text size="xs" c="dimmed" lh={1.15}>{label}</Text>
      {children}
    </Group>
  );
}
```

**Header:**
- `Text fw={700} size="sm"` for title
- `Badge color={badge.color} variant="light" size="xs"` for connection status
- `ActionIcon variant="subtle" color="gray" size="xs"` for close (✕)

**Location section:**
- `SegmentedControl` with `fullWidth size="xs"` for mode selection (random/ip/manual)
- Coordinate display in SectionLabel right slot: `Text size="xs" c="dimmed" ff="monospace" lh={1} opacity={0.55}`
- `ActionIcon variant="subtle" color="gray" size="xs"` for edit (✎) and re-randomize (↻)
- Status text uses `c={locateColor}` from `TONE_COLOR` map (undefined = dimmed default)

**View section:**
- Map tile toggle: `Switch color="green" withThumbIndicator={false} size="md"`
- Zoom slider: `Slider color="white" size="sm" thumbSize={18} radius="xl" label={null}`
  - `marks` at every integer step (no labels), custom `thumbChildren` (6x6 white dot)
  - `styles={{ bar: { background: '#ffffff' }, thumb: { display: 'flex', alignItems: 'center', justifyContent: 'center' } }}`
  - Range: min `3`, max `12`, step `1`

**Display section:**
- `Button fullWidth variant="default" size="xs"` for fullscreen toggle
- Label toggles: "Enter Fullscreen" / "Exit Fullscreen"

**Shortcuts section:**
- `Group grow gap="xs"` containing three `<Kbd size="xs">` + `Text size="xs" c="dimmed"` pairs
- Keys: `S` Panel, `M` Map, `F` Fullscreen

### StatusPill (`components/StatusPill.tsx`)

Always-visible bottom-left pill. Clickable — toggles the control panel.

```tsx
<UnstyledButton pos="fixed" bottom={12} left={12} style={{ zIndex: 100 }}>
  <Group gap={12} wrap="nowrap" align="center" px={14} py={9}
    style={{
      background: 'rgba(14, 17, 22, 0.76)',
      border: `1px solid rgba(255, 255, 255, 0.2)`,  // borderStrong
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(150%)',
      userSelect: 'none'
    }}
  >
    {/* 9x9 dot, borderRadius 50%, pulse-dot animation when refreshing */}
    <Box w={9} h={9} style={{ borderRadius: '50%', background: dotColor }} />
    <Text size="sm" c="dimmed">{stateLabel}</Text>
    <Divider orientation="vertical" h={16} />
    <Text size="sm" c="gray.3">{aircraftCount} aircraft</Text>
    <Divider orientation="vertical" h={16} />
    <Text size="sm" c="gray.4" maw={220} truncate>{locationLabel}</Text>
    <Divider orientation="vertical" h={16} />
    <Text size="sm" c="dimmed">{panelVisible ? '← Hide' : 'S · Settings'}</Text>
  </Group>
</UnstyledButton>
```

The dot animates `pulse-dot` (opacity 1 → 0.28 → 1, 1.4s ease-in-out infinite) only when `refreshing`.

### LocationEditorModal (`components/overlay/LocationEditorModal.tsx`)

```tsx
<Modal opened={opened} onClose={onClose} title="Manual Location" centered size={320} padding="md">
  <Stack gap={8}>
    <NumberInput label="Latitude"  size="xs" hideControls step={0.0001} decimalScale={6} />
    <NumberInput label="Longitude" size="xs" hideControls step={0.0001} decimalScale={6} />
    {errorText && <Text size="xs" c="red.3">{errorText}</Text>}
    <Group justify="flex-end" gap={8}>
      <Button variant="default" size="xs">Cancel</Button>
      <Button size="xs" disabled={!canApply}>Apply</Button>
    </Group>
  </Stack>
</Modal>
```

Coordinate ranges: lat `-90`…`90`, lon `-180`…`180`. Clamped on apply.

### FlightMap (`components/FlightMap.tsx`)

Pure rendering component — no UI chrome, just `<Box ref={mapNodeRef} w="100%" h="100%" />`.

MapLibre config:
- Style: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
- `interactive: false` — no pan/zoom from user input
- `fadeDuration: 100`
- `attributionControl: false`
- Camera easing on home/zoom change: `easeTo({ duration: 450, essential: true })`

Aircraft rendering uses two layers on top of the basemap:
1. `flights-circle` — circle layer (dots)
2. `flights-label` — symbol layer (callsign text above dot, offset `[0, -1.2]`)

Basemap layers hidden/shown by toggling `visibility` layout property. All native controls hidden via CSS.

### App (`App.tsx`)

Root layout: `<Box component="main" w="100%" h="100%" pos="relative" bg="#0a0b0d">`

Startup intro: `<Transition mounted={introVisible} transition="fade" duration={620} timingFunction="cubic-bezier(0.2, 0.7, 0, 1)">` — fires 240ms after mount.

StatusPill is only rendered when `showPanel` is true (pill acts as panel toggle hint; when panel is hidden, user uses `S` key to restore).

---

## Motion System

### Timing Tokens

| Transition           | Duration | Easing                           |
|----------------------|----------|----------------------------------|
| Map/app intro fade   | 620ms    | `cubic-bezier(0.2, 0.7, 0, 1)`  |
| Panel show/hide      | 180ms    | `ease`                           |
| Camera easeTo        | 450ms    | MapLibre default                 |
| `pulse-dot` keyframe | 1400ms   | `ease-in-out infinite`           |

### Panel Transition Detail

The panel uses a custom Mantine `transition` object (not a named preset):

```ts
{
  in:  { opacity: 1, transform: 'translateX(0) scale(1)' },
  out: { opacity: 0, transform: 'translateX(-8px) scale(0.99)' },
  common: { transformOrigin: 'top left' },
  transitionProperty: 'opacity, transform'
}
```

Slides 8px from the left and scales from 0.99 — subtle, not dramatic.

### Principles

- Startup reveal and user-triggered show/hide are separate systems.
- Use opacity + transform as primary channels. Blur only for scene/panel reveal accents.
- Don't couple startup timers to runtime show/hide toggles.

---

## Keyboard Shortcuts

| Key | Action           |
|-----|------------------|
| `S` | Toggle panel     |
| `M` | Toggle map tiles |
| `F` | Toggle fullscreen|

Shortcuts are suppressed when focus is in an input/textarea/select/contenteditable.
All shortcuts are shown in the panel's Shortcuts section via `<Kbd>` + `<Text>`.

---

## Mantine Component Usage Rules

### The Hard Rule

**Use native Mantine props only.** Never write manual CSS or `styles` blocks for things Mantine handles. The only exception is glassmorphism on Paper/Modal (no Mantine equivalent).

### Props to Prefer

| Need               | Use                                               |
|--------------------|---------------------------------------------------|
| Color              | `c="dimmed"`, `c="gray.3"`, `c="green.4"` etc.  |
| Font weight        | `fw={600}`                                        |
| Font size          | `size="xs"`, `size="sm"`                         |
| Line height        | `lh={1}`, `lh={1.15}`                            |
| Truncation         | `truncate` prop on Text                           |
| Max width          | `maw={220}` on Text                              |
| Text transform     | `tt="uppercase"`                                  |
| Font family        | `ff="monospace"`                                  |
| Layout gap         | `gap={8}` on Group/Stack                         |
| Alignment          | `justify="space-between"`, `align="center"`      |
| No wrap            | `wrap="nowrap"` on Group                         |

### Sizes in Use

- Buttons: `size="xs"` uniformly
- Inputs: `size="xs"` uniformly
- ActionIcons: `size="xs"`
- Switch: `size="md"` (slightly larger for legibility)
- Badge: `size="xs" variant="light"`
- Slider: `size="sm"`
- Kbd: `size="xs"`

### Variants in Use

- Button: `variant="default"` for secondary actions, primary (no variant) for confirm
- ActionIcon: `variant="subtle" color="gray"`
- Badge: `variant="light"`
- Switch: no variant, `color="green"`, `withThumbIndicator={false}`

---

## Interaction Contract

### Button Philosophy

- One button = one clear verb.
- Toggle labels describe the resulting action, not current state (e.g., "Enter Fullscreen").
- Keyboard parity is mandatory: every shortcut action has a visible control.
- Disabled state must remain readable — do not fade to near-invisible.

### Pending State (Map Toggle Lock)

While a map toggle is in-flight (`isMapTogglePending`), the Switch is `disabled`. The lock machine enforces a minimum 1000ms hold and a 4000ms max wait before releasing.

---

## Content Tone

- Keep status copy short, operational, and calm.
- Avoid alarmist language for transient network issues.
- Prefer deterministic phrasing:
  - "Applying map change…"
  - "Using network location"
  - "Keeping saved location."
- Location coordinates displayed as `lat.toFixed(4)°, lon.toFixed(3)°` in status (3 decimal) vs `toFixed(4)` in panel header.

---

## Accessibility Baseline

- All interactive elements have `aria-label`.
- All inputs have `aria-label` (even with visible label).
- Maintain text contrast on translucent glass backgrounds.
- Preserve keyboard-only access to all controls.

---

## Do / Don't

**Do:**
- Keep animations smooth but brief after startup.
- Keep color accents muted and meaning-driven.
- Keep panel behavior predictable under rapid clicks.
- Always import glass tokens from `glassTokens.ts`, not inline.
- Always use `wrap="nowrap"` on Groups that must stay single-line.

**Don't:**
- Introduce bright, saturated UI accents that overpower map content.
- Couple startup animation timers to normal show/hide toggles.
- Add floating UI clusters that break the top-left / bottom-left anchor pattern.
- Write `styles` blocks for typography, spacing, color — use Mantine props.
- Add custom CSS classes or CSS modules for anything Mantine can express natively.

---

## Future Change Checklist

Before shipping UI changes, confirm:

1. Colors map to the tokens above (check exact rgba values).
2. Show/hide animation behavior is unchanged in feel and speed (180ms ease, translateX -8px, scale 0.99).
3. Button and control states include: default, hover, active/pressed, disabled, pending.
4. Shortcut parity still holds between keyboard and buttons.
5. Ambient mode remains clean when panel is hidden.
6. No new `styles` blocks added outside the theme file.
7. All interactive elements have `aria-label`.
