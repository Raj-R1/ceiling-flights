import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Affix,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text
} from '@mantine/core';
import type { AppSettings, GeoPoint } from '../../../../shared/types';
import { LocationEditorModal } from './LocationEditorModal';

const ZOOM_MIN = 3;
const ZOOM_MAX = 12;

type Status = 'live' | 'offline' | 'refreshing';

const statusBadge: Record<Status, { text: string; color: string }> = {
  live: { text: 'Live', color: 'green' },
  offline: { text: 'Offline', color: 'red' },
  refreshing: { text: 'Refreshing', color: 'yellow' }
};

type OverlayPanelProps = {
  visible: boolean;
  locationMode: AppSettings['locationMode'];
  locationLine: string;
  home: GeoPoint;
  showMap: boolean;
  isMapTogglePending: boolean;
  isFullscreen: boolean;
  zoom: number;
  status: Status;
  onHide: () => void;
  onToggleMap: () => void;
  onToggleFullscreen: () => void;
  onLocationModeChange: (mode: AppSettings['locationMode']) => void;
  onZoomChange: (zoom: number) => void;
  onManualLocationApply: (next: GeoPoint) => void;
};

export function OverlayPanel({
  visible,
  locationMode,
  locationLine,
  home,
  showMap,
  isMapTogglePending,
  isFullscreen,
  zoom,
  status,
  onHide,
  onToggleMap,
  onToggleFullscreen,
  onLocationModeChange,
  onZoomChange,
  onManualLocationApply
}: OverlayPanelProps) {
  const [isLocationEditorOpen, setLocationEditorOpen] = useState(false);
  const [isZoomDragging, setZoomDragging] = useState(false);

  const zoomMarks = useMemo(
    () =>
      Array.from({ length: ZOOM_MAX - ZOOM_MIN + 1 }, (_, idx) => ({
        value: ZOOM_MIN + idx,
        label: ''
      })),
    []
  );

  if (!visible) {
    return null;
  }

  return (
    <>
      <Affix position={{ top: 16, left: 16 }}>
        <Paper
          radius="xl"
          p="md"
          w="min(380px, calc(100vw - 32px))"
          role="region"
          aria-label="overlay panel"
        >
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text fw={700} size="lg">
                Flight Controls
              </Text>
              <Group gap={8} align="center">
                <Badge color={statusBadge[status].color} variant="light">
                  {statusBadge[status].text}
                </Badge>
                <ActionIcon variant="subtle" onClick={onHide} aria-label="Hide panel">
                  ×
                </ActionIcon>
              </Group>
            </Group>

            <Group justify="space-between" align="center" wrap="nowrap">
              <Text size="sm" truncate>
                {locationLine}
              </Text>
              {locationMode === 'manual' ? (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  aria-label="Edit manual coordinates"
                  onClick={() => setLocationEditorOpen(true)}
                >
                  ✎
                </ActionIcon>
              ) : null}
            </Group>

            <Group grow align="start">
              <Box>
                <Text size="sm" fw={600} mb={6}>
                  Map
                </Text>
                <Switch
                  checked={showMap}
                  disabled={isMapTogglePending}
                  onChange={() => onToggleMap()}
                  size="lg"
                  radius="xl"
                  aria-label="Toggle map visibility"
                />
                {isMapTogglePending ? (
                  <Text size="xs" c="dimmed" mt={6}>
                    Applying map change...
                  </Text>
                ) : null}
              </Box>
              <Box>
                <Text size="sm" fw={600} mb={6}>
                  Display
                </Text>
                <Button fullWidth variant="default" type="button" onClick={onToggleFullscreen}>
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </Button>
              </Box>
            </Group>

            <Group align="flex-end" wrap="nowrap" gap="xs">
              <SegmentedControl
                value={locationMode}
                onChange={(value) => onLocationModeChange(value as AppSettings['locationMode'])}
                data={[
                  { value: 'random', label: 'Random' },
                  { value: 'ip', label: 'IP' },
                  { value: 'manual', label: 'Manual' }
                ]}
                fullWidth
                aria-label="Location mode"
              />
              {locationMode === 'random' ? (
                <ActionIcon
                  variant="default"
                  aria-label="Pick another random city"
                  onClick={() => onLocationModeChange('random')}
                >
                  ↻
                </ActionIcon>
              ) : null}
            </Group>

            <Divider />

            <Stack gap={6}>
              <Text size="sm" fw={600}>
                Zoom
              </Text>
              <Slider
                value={zoom}
                onChange={onZoomChange}
                onMouseDown={() => setZoomDragging(true)}
                onTouchStart={() => setZoomDragging(true)}
                onBlur={() => setZoomDragging(false)}
                onChangeEnd={() => setZoomDragging(false)}
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={1}
                marks={zoomMarks}
                showLabelOnHover={false}
                labelAlwaysOn={isZoomDragging}
                label={isZoomDragging ? (value) => `Zoom ${value}` : null}
                aria-label="Zoom"
              />
            </Stack>
          </Stack>
        </Paper>
      </Affix>
      <LocationEditorModal
        opened={isLocationEditorOpen}
        home={home}
        onApply={onManualLocationApply}
        onClose={() => setLocationEditorOpen(false)}
      />
    </>
  );
}
