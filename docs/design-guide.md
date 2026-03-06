# Ceiling Flights Design Guide

## Purpose

This guide is the persistent visual and interaction source-of-truth for this project.
Use it for all future UI, color, and animation decisions so the app keeps one coherent identity.

## Design Philosophy

- Ambient-first: the app is designed for passive viewing (ceiling/projector), not dense interaction.
- Low-light comfort: keep luminance controlled and avoid harsh contrast spikes.
- Motion with intent: animate state changes only when they explain context change.
- Quiet control layer: UI should feel like glass sitting above the map, not competing with it.
- Deterministic behavior: controls should not flicker, double-trigger, or feel race-prone.

## Visual Language

- Theme: dark neutral with subtle cool tint.
- Surface model:
  - Base world layer is near-black.
  - Controls are translucent charcoal glass with soft border.
  - Status colors are muted (not neon) and used only for meaning.
- Typography:
  - Monospace/system-coded feel (`Menlo, Monaco, Consolas, monospace`) for technical clarity.
  - Small, dense labels for unobtrusive overlays.

## Core Color Tokens

Use these as canonical values unless there is an explicit redesign.

### Foundation

- `bg/base`: `#0a0b0d`
- `text/primary`: `#f4f5f7`
- `text/high`: `#f7f8fb`
- `text/subtle`: `rgba(237, 240, 246, 0.7)`

### Glass Surfaces

- `panel/bg`: `rgba(18, 19, 24, 0.64)`
- `panel/border`: `rgba(183, 186, 194, 0.16)`
- `panel/shadow`: `0 18px 40px rgba(0, 0, 0, 0.3)`
- `panel/blur`: `blur(14px) saturate(120%)`

### Input + Button Base

- `control/bg`: `rgba(16, 17, 20, 0.82)`
- `control/border`: `rgba(213, 216, 222, 0.18)`
- `control/hover-bg`: `rgba(31, 34, 40, 0.92)`
- `control/hover-border`: `rgba(221, 224, 232, 0.3)`

### Mode Button States

- `mode/inactive/bg`: `rgba(22, 23, 28, 0.9)`
- `mode/inactive/border`: `rgba(165, 171, 184, 0.28)`
- `mode/active/bg`: `rgba(54, 139, 98, 0.84)`
- `mode/active/border`: `rgba(133, 232, 182, 0.52)`
- `mode/active/text`: `#f8fbff`

### Status Tones

- Neutral:
  - bg `rgba(102, 108, 120, 0.14)`
  - border `rgba(177, 185, 200, 0.22)`
- Success:
  - bg `rgba(55, 122, 93, 0.16)`
  - border `rgba(118, 208, 164, 0.35)`
  - icon `#9ce7c2`
- Warning:
  - bg `rgba(128, 106, 56, 0.16)`
  - border `rgba(222, 188, 110, 0.34)`
  - icon `#ebca7f`
- Error:
  - bg `rgba(125, 68, 73, 0.16)`
  - border `rgba(221, 132, 141, 0.34)`
  - icon `#f1a4ad`

### Pending/Locked Action State

- `pending/bg`: `rgba(103, 109, 122, 0.56)`
- `pending/border`: `rgba(177, 184, 197, 0.46)`
- `pending/text`: `#f6f8fc`
- `pending/blur`: `blur(6px) saturate(112%)`

## Motion System

## Principles

- Startup reveal and user-triggered show/hide are separate systems.
- Use opacity + transform as primary animation channels.
- Use blur only for scene/panel reveal accents, not continuous movement.

## Current Timing Tokens

- Map intro reveal:
  - opacity `620ms cubic-bezier(0.2, 0.7, 0, 1)`
  - transform `760ms cubic-bezier(0.2, 0.7, 0, 1)`
  - blur `700ms ease`
- Panel startup intro:
  - keyframe duration `520ms`
  - easing `cubic-bezier(0.22, 0.72, 0.03, 1)`
  - delay `140ms`
- Panel live show/hide:
  - opacity `190ms ease`
  - transform/filter `220ms ease`
- Button hover/press:
  - `140ms ease`
- Mode state transition:
  - `180ms ease`

## Interaction Contract

### Button Philosophy

- One button = one clear verb.
- Labels should reflect final state (for toggles, text describes resulting action).
- Keyboard parity is mandatory: shortcut actions must exist as visible controls.
- Feedback requirements:
  - Disabled state must remain readable (do not fade to near-invisible).
  - Pending state communicates via disabled + opacity.

### Spacing + Layout

- Outer panel inset: `16px` from top/left.
- Panel radius: `16px`.
- Internal gap system: `10px` grid rhythm.
- Control radius: `10px`.
- Minimum control height: `36px`.
- Consistent 3-column grids for mode row and action row.

## Map + Overlay Composition

- Map is always full-bleed in the background.
- Control panel slides in from top-left; hidden when panel toggled off.
- Status pill sits bottom-left — always visible, doubles as panel toggle.
- Shortcuts (`S` / `M` / `F`) live inside the control panel; disappear with it in ambient mode.
- MapLibre native controls remain hidden.

## Content Tone

- Keep status copy short, operational, and calm.
- Avoid alarmist language for transient network issues.
- Prefer deterministic phrasing:
  - "Applying map change…"
  - "Using network location"
  - "Keeping saved location."

## Accessibility Baseline

- Maintain visible text contrast on translucent backgrounds.
- Preserve keyboard-only access to all controls.
- Keep toggle semantics exposed with `aria-pressed`.
- Keep status updates in a live region (`aria-live="polite"`).

## Do / Don’t

- Do keep animations smooth but brief after startup.
- Do keep color accents muted and meaning-driven.
- Do keep panel behavior predictable under rapid clicks.
- Don’t introduce bright saturated UI accents that overpower map content.
- Don’t couple startup animation timers to normal show/hide toggles.
- Don’t add extra floating UI clusters that break top-left / bottom-right balance.

## Future Change Checklist

Before shipping UI changes, confirm:

1. Colors map to the tokens above.
2. Show/hide animation behavior is unchanged in feel and speed.
3. Button states include default, hover, active/pressed, disabled, and pending.
4. Shortcut parity still holds between keyboard and buttons.
5. Ambient mode remains clean when panel is hidden.
