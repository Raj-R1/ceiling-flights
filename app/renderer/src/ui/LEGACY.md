# Legacy UI Note

Legacy `src/ui/*` primitives were removed during Mantine migration.

Guardrails:
- `app/renderer/src/components/overlay/**/*` is lint-restricted from importing `src/ui/*`.
- `app/renderer/src/**/*` is lint-restricted from importing `src/ui/*`.
- `app/renderer/src/**/*` is lint-restricted from importing legacy `SettingsOverlay`.

Migration rule:
- Use Mantine components + centralized Mantine theme overrides for control states.
- Keep plain CSS for map canvas and app-level layout only.
