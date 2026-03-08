import { useMemo } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon
} from '@mantine/core';
import { IconArrowRight, IconRocket, IconX } from '@tabler/icons-react';
import type { UpdateInfo } from '../../../../shared/types';
import { GLASS_SURFACE_TOKENS } from '../../theme/glassTokens';
import { LiquidGlass } from '../LiquidGlass';

type UpdateModalProps = {
  opened: boolean;
  update: UpdateInfo | null;
  onUpdate: () => void;
  onSkipVersion: (version: string) => void;
  onLater: () => void;
};

const versionCardStyles = {
  flex: 1,
  minWidth: 0,
  padding: '16px 18px',
  borderRadius: 16,
  border: `1px solid ${GLASS_SURFACE_TOKENS.borderStrong}`,
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%), rgba(12, 15, 20, 0.46)',
  boxShadow: [
    'inset 1px 1px 0 rgba(255,255,255,0.20)',
    'inset -1px -1px 0 rgba(255,255,255,0.05)',
    '0 10px 28px rgba(0, 0, 0, 0.26)'
  ].join(', '),
  backdropFilter: 'blur(20px) saturate(165%)',
  WebkitBackdropFilter: 'blur(20px) saturate(165%)'
} as const;

export function UpdateModal({ opened, update, onUpdate, onSkipVersion, onLater }: UpdateModalProps) {
  const publishedLabel = useMemo(() => {
    if (!update?.publishedAt) return null;

    const parsed = new Date(update.publishedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [update?.publishedAt]);

  if (!update) return null;

  return (
    <Modal
      opened={opened}
      onClose={onLater}
      centered
      size={640}
      withCloseButton={false}
      padding={0}
      styles={{
        content: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          overflow: 'visible'
        },
        body: {
          padding: 0,
          background: 'transparent'
        },
        header: {
          display: 'none'
        }
      }}
    >
      <LiquidGlass radius={22} blur={9}>
        <Box
          p="lg"
          style={{
            position: 'relative',
            background:
              'radial-gradient(ellipse at top left, rgba(160, 210, 255, 0.22), transparent 44%), radial-gradient(ellipse at bottom right, rgba(100, 140, 255, 0.10), transparent 50%), rgba(14, 17, 24, 0.26)'
          }}
        >
          {/* Top frost bar — light catching the upper rim */}
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.38) 30%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.38) 70%, transparent)',
              borderRadius: '22px 22px 0 0',
              pointerEvents: 'none'
            }}
          />

          <Stack gap="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
              <Group gap={10} wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                <ThemeIcon
                  size={34}
                  radius="xl"
                  variant="filled"
                  color="gray"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 100%)',
                    boxShadow: [
                      'inset 1px 1px 0 rgba(255,255,255,0.24)',
                      '0 6px 20px rgba(120, 180, 255, 0.28)',
                      '0 2px 8px rgba(0,0,0,0.24)'
                    ].join(', ')
                  }}
                >
                  <IconRocket size={18} />
                </ThemeIcon>

                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={700} size="lg" lh={1.05}>
                    Update Available
                  </Text>
                  <Text size="sm" c="dimmed" lh={1.45}>
                    A newer build is available on GitHub. This app does not self-update.
                  </Text>
                  <Text size="sm" fw={600} lh={1.35}>
                    {update.releaseName}
                  </Text>
                </Stack>
              </Group>

              <Group gap={8} justify="flex-end" wrap="nowrap">
                <Group gap={5}>
                  {update.isBeta ? (
                    <Badge color="yellow" variant="light" size="sm">
                      Beta
                    </Badge>
                  ) : null}
                  {update.isPrerelease ? (
                    <Badge color="red" variant="light" size="sm">
                      Pre-release
                    </Badge>
                  ) : null}
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={onLater}
                  aria-label="Close update prompt"
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            </Group>

            <Box
              style={{
                padding: 10,
                borderRadius: 20,
                border: `1px solid ${GLASS_SURFACE_TOKENS.borderStrong}`,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
                boxShadow: [
                  'inset 1px 1px 0 rgba(255,255,255,0.14)',
                  'inset -1px -1px 0 rgba(255,255,255,0.04)',
                  'inset 0 0 0 1px rgba(255,255,255,0.03)'
                ].join(', ')
              }}
            >
              <Group gap="sm" align="stretch" wrap="nowrap">
                <Box style={versionCardStyles}>
                  <Text size="xs" tt="uppercase" c="dimmed" fw={700} lh={1}>
                    Current
                  </Text>
                  <Text mt={8} ff="monospace" fw={700} size="xl" lh={1.1}>
                    {update.currentVersion}
                  </Text>
                </Box>

                <Group justify="center" align="center" w={56} style={{ flexShrink: 0 }}>
                  <ThemeIcon
                    size={40}
                    radius="xl"
                    variant="filled"
                    color="gray"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 100%)',
                      boxShadow: [
                        'inset 1px 1px 0 rgba(255,255,255,0.22)',
                        '0 8px 22px rgba(120, 180, 255, 0.22)',
                        '0 2px 10px rgba(0,0,0,0.20)'
                      ].join(', ')
                    }}
                  >
                    <IconArrowRight size={20} />
                  </ThemeIcon>
                </Group>

                <Box
                  style={{
                    ...versionCardStyles,
                    border: '1px solid rgba(130, 195, 255, 0.32)',
                    background:
                      'linear-gradient(180deg, rgba(176, 230, 255, 0.30) 0%, rgba(84, 171, 255, 0.14) 100%), rgba(10, 14, 22, 0.50)',
                    boxShadow: [
                      'inset 1px 1px 0 rgba(200, 235, 255, 0.26)',
                      'inset -1px -1px 0 rgba(100, 180, 255, 0.08)',
                      '0 10px 28px rgba(80, 150, 255, 0.14)'
                    ].join(', ')
                  }}
                >
                  <Text size="xs" tt="uppercase" c="dimmed" fw={700} lh={1}>
                    New
                  </Text>
                  <Text mt={8} ff="monospace" fw={800} size="xl" lh={1.1} c="blue.2">
                    {update.latestVersion}
                  </Text>
                  {publishedLabel ? (
                    <Text mt={8} size="xs" c="dimmed" lh={1}>
                      Released {publishedLabel}
                    </Text>
                  ) : null}
                </Box>
              </Group>
            </Box>

            <Box
              px="sm"
              py={10}
              style={{
                borderRadius: 14,
                border: `1px solid rgba(255, 205, 88, 0.28)`,
                background: [
                  'linear-gradient(135deg, rgba(255, 205, 88, 0.14), rgba(255, 170, 50, 0.06))',
                  'rgba(12, 10, 4, 0.18)'
                ].join(', '),
                boxShadow: 'inset 1px 1px 0 rgba(255, 220, 120, 0.10)'
              }}
            >
              <Text size="sm" lh={1.5} c="dimmed">
                (p.s I cannot afford code signing, so you will have to manually update the app and delete the old one :3)
              </Text>
            </Box>

            <Divider label="Changelog" labelPosition="center" />

            <Box
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                border: `1px solid ${GLASS_SURFACE_TOKENS.borderStrong}`,
                background: [
                  'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 100%)',
                  'rgba(8, 11, 16, 0.46)'
                ].join(', '),
                boxShadow: [
                  'inset 1px 1px 0 rgba(255,255,255,0.12)',
                  'inset -1px -1px 0 rgba(255,255,255,0.04)',
                  'inset 0 2px 12px rgba(0,0,0,0.12)'
                ].join(', '),
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)'
              }}
            >
              <ScrollArea.Autosize mah={260} scrollbarSize={8} offsetScrollbars>
                <Box p="md">
                  <Text
                    size="sm"
                    ff="monospace"
                    lh={1.6}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {update.body}
                  </Text>
                </Box>
              </ScrollArea.Autosize>
            </Box>

            <Group justify="space-between" gap="sm">
              <Button variant="subtle" color="gray" onClick={onLater}>
                Later
              </Button>
              <Group gap="xs">
                <Button variant="default" onClick={() => onSkipVersion(update.latestVersion)}>
                  Skip This Version
                </Button>
                <Button onClick={onUpdate}>Open Release Page</Button>
              </Group>
            </Group>
          </Stack>
        </Box>
      </LiquidGlass>
    </Modal>
  );
}
