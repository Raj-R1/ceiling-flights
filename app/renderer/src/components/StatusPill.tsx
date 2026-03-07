import { Box, Divider, Group, Text, UnstyledButton } from '@mantine/core';
import type { ConnectionState } from '../../../shared/types';
import { LiquidGlass } from './LiquidGlass';

type Props = {
  connectionState: ConnectionState;
  aircraftCount: number;
  locationLabel: string;
  panelVisible: boolean;
  onTogglePanel: () => void;
};

type DotState = 'live' | 'refreshing' | 'offline';

const DOT_COLOR: Record<DotState, string> = {
  live: '#4ade80',
  refreshing: '#fbbf24',
  offline: '#f87171'
};

const STATE_LABEL: Record<DotState, string> = {
  live: 'Live',
  refreshing: 'Refreshing',
  offline: 'Offline'
};

export function StatusPill({ connectionState, aircraftCount, locationLabel, panelVisible, onTogglePanel }: Props) {
  const dotState: DotState = connectionState.offline
    ? 'offline'
    : connectionState.refreshing
      ? 'refreshing'
      : 'live';

  const dotColor = DOT_COLOR[dotState];
  const stateLabel = STATE_LABEL[dotState];

  return (
    <UnstyledButton
      onClick={onTogglePanel}
      aria-label={panelVisible ? 'Hide settings panel' : 'Show settings panel'}
      pos="fixed"
      bottom={12}
      left={12}
      style={{ zIndex: 100 }}
    >
      <LiquidGlass radius={9999} px={14} py={9} blur={3} style={{ userSelect: 'none' }}>
        <Group gap={12} wrap="nowrap" align="center">
          <Box
            w={9}
            h={9}
            style={{
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
              animation: dotState === 'refreshing' ? 'pulse-dot 1.4s ease-in-out infinite' : 'none'
            }}
          />

          <Text size="sm" c="dimmed" lh={1}>
            {stateLabel}
          </Text>

          <Divider orientation="vertical" h={16} />

          <Text size="sm" c="gray.3" lh={1}>
            {aircraftCount} aircraft
          </Text>

          {locationLabel ? (
            <>
              <Divider orientation="vertical" h={16} />
              <Text size="sm" c="gray.4" lh={1} maw={220} truncate>
                {locationLabel}
              </Text>
            </>
          ) : null}

          <Divider orientation="vertical" h={16} />

          <Text size="sm" c="dimmed" lh={1}>
            {panelVisible ? '← Hide' : 'S · Settings'}
          </Text>
        </Group>
      </LiquidGlass>
    </UnstyledButton>
  );
}
