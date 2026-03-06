import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Kbd,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
  Transition
} from '@mantine/core';
import type { AppSettings, ConnectionState, GeoPoint } from '../../../shared/types';
import type { LocateStatus } from '../hooks/useStartupSettings';
import { LocationEditorModal } from './overlay';

const ZOOM_MIN = 3;
const ZOOM_MAX = 12;
const ZOOM_MARKS = Array.from({ length: ZOOM_MAX - ZOOM_MIN + 1 }, (_, i) => ({
  value: ZOOM_MIN + i
}));

const SHORTCUTS = [
  { key: 'S', label: 'Panel' },
  { key: 'M', label: 'Map' },
  { key: 'F', label: 'Fullscreen' }
] as const;

type Props = {
  visible: boolean;
  settings: AppSettings;
  locateStatus: LocateStatus;
  isMapTogglePending: boolean;
  isFullscreen: boolean;
  connectionState: ConnectionState;
  onHide: () => void;
  onToggleMap: (nextShowMap?: boolean) => void;
  onToggleFullscreen: () => void;
  onLocationModeChange: (mode: AppSettings['locationMode']) => void;
  onZoomChange: (zoom: number) => void;
  onManualLocationApply: (next: GeoPoint) => void;
};

type Status = 'live' | 'offline' | 'refreshing';
const STATUS_BADGE: Record<Status, { text: string; color: string }> = {
  live: { text: 'Live', color: 'green' },
  offline: { text: 'Offline', color: 'red' },
  refreshing: { text: 'Refreshing', color: 'yellow' }
};

const TONE_COLOR: Record<LocateStatus['tone'], string | undefined> = {
  neutral: undefined,
  success: 'green.4',
  warning: 'yellow.4',
  error: 'red.4'
};

function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <Group justify="space-between" align="baseline" wrap="nowrap" gap={8}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase" lh={1}>
        {children}
      </Text>
      {right}
    </Group>
  );
}

function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap={6}>
      <Text size="xs" c="dimmed" lh={1.15}>
        {label}
      </Text>
      {children}
    </Group>
  );
}

const panelTransition = {
  in: { opacity: 1, transform: 'translateX(0) scale(1)' },
  out: { opacity: 0, transform: 'translateX(-8px) scale(0.99)' },
  common: { transformOrigin: 'top left' },
  transitionProperty: 'opacity, transform'
} as const;

export function ControlPanel({
  visible,
  settings,
  locateStatus,
  isMapTogglePending,
  isFullscreen,
  connectionState,
  onHide,
  onToggleMap,
  onToggleFullscreen,
  onLocationModeChange,
  onZoomChange,
  onManualLocationApply
}: Props) {
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);

  const status: Status = connectionState.offline
    ? 'offline'
    : connectionState.refreshing
      ? 'refreshing'
      : 'live';

  const badge = STATUS_BADGE[status];
  const locateColor = TONE_COLOR[locateStatus.tone];

  return (
    <>
      <Transition mounted={visible} transition={panelTransition} duration={180} timingFunction="ease">
        {(styles) => (
          <Box
            pos="fixed"
            top={14}
            left={14}
            w="min(332px, calc(100vw - 28px))"
            mah="calc(100vh - 28px)"
            style={{ zIndex: 200, overflowY: 'auto', ...styles }}
          >
            <Paper p="md" radius="lg">
              <Stack gap="md">

                {/* ── Header ── */}
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Text fw={700} size="sm">
                    Ceiling Flights
                  </Text>
                  <Group gap={6} align="center" wrap="nowrap">
                    <Badge color={badge.color} variant="light" size="xs">
                      {badge.text}
                    </Badge>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="xs"
                      onClick={onHide}
                      aria-label="Hide panel"
                    >
                      ✕
                    </ActionIcon>
                  </Group>
                </Group>

                <Divider />

                {/* ── Location ── */}
                <Stack gap={10}>
                  <SectionLabel
                    right={
                      <Text size="xs" c="dimmed" ff="monospace" lh={1} opacity={0.55}>
                        {settings.home.lat.toFixed(4)}°, {settings.home.lon.toFixed(4)}°
                      </Text>
                    }
                  >
                    Location
                  </SectionLabel>

                  <SegmentedControl
                    value={settings.locationMode}
                    onChange={(v) => onLocationModeChange(v as AppSettings['locationMode'])}
                    data={[
                      { value: 'random', label: 'Random' },
                      { value: 'ip', label: 'IP' },
                      { value: 'manual', label: 'Manual' }
                    ]}
                    fullWidth
                    size="xs"
                    aria-label="Location mode"
                  />

                  <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                    {locateStatus.tone === 'neutral' ? (
                      <Text size="xs" c="dimmed" lh={1.25}>
                        {locateStatus.text}
                      </Text>
                    ) : (
                      <Text size="xs" c={locateColor} lh={1.2}>
                        {locateStatus.icon} {locateStatus.text}
                      </Text>
                    )}
                    {settings.locationMode === 'manual' ? (
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="xs"
                        aria-label="Edit manual coordinates"
                        onClick={() => setLocationEditorOpen(true)}
                      >
                        ✎
                      </ActionIcon>
                    ) : settings.locationMode === 'random' ? (
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="xs"
                        aria-label="Pick another random city"
                        onClick={() => onLocationModeChange('random')}
                      >
                        ↻
                      </ActionIcon>
                    ) : null}
                  </Group>
                </Stack>

                <Divider />

                {/* ── View ── */}
                <Stack gap={10}>
                  <SectionLabel>View</SectionLabel>

                  <ControlRow label="Map tiles">
                    <Switch
                      checked={settings.showMap}
                      onChange={(event) => onToggleMap(event.currentTarget.checked)}
                      disabled={isMapTogglePending}
                      color="green"
                      withThumbIndicator={false}
                      size="md"
                      aria-label="Toggle map tile visibility"
                    />
                  </ControlRow>

                  <ControlRow label="Zoom">
                    <Text size="xs" c="dimmed" fw={500} lh={1}>
                      {settings.zoom}
                    </Text>
                  </ControlRow>
                  <Slider
                    value={settings.zoom}
                    onChange={onZoomChange}
                    min={ZOOM_MIN}
                    max={ZOOM_MAX}
                    step={1}
                    marks={ZOOM_MARKS}
                    color="white"
                    size="sm"
                    thumbSize={18}
                    radius="xl"
                    label={null}
                    thumbChildren={
                      <Box
                        w={6}
                        h={6}
                        style={{
                          borderRadius: '50%',
                          background: '#ffffff',
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.18)'
                        }}
                      />
                    }
                    styles={{
                      bar: { background: '#ffffff' },
                      thumb: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
                    }}
                    aria-label="Zoom"
                  />
                </Stack>

                <Divider />

                {/* ── Display ── */}
                <Stack gap={10}>
                  <SectionLabel>Display</SectionLabel>
                  <Button fullWidth variant="default" size="xs" onClick={onToggleFullscreen}>
                    {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  </Button>
                </Stack>

                <Divider />

                {/* ── Shortcuts ── */}
                <Group grow gap="xs">
                  {SHORTCUTS.map(({ key, label }) => (
                    <Group key={key} gap={6} wrap="nowrap" align="center" justify="center">
                      <Kbd size="xs">{key}</Kbd>
                      <Text size="xs" c="dimmed" lh={1}>
                        {label}
                      </Text>
                    </Group>
                  ))}
                </Group>

              </Stack>
            </Paper>
          </Box>
        )}
      </Transition>

      <LocationEditorModal
        opened={locationEditorOpen}
        home={settings.home}
        onApply={onManualLocationApply}
        onClose={() => setLocationEditorOpen(false)}
      />
    </>
  );
}
