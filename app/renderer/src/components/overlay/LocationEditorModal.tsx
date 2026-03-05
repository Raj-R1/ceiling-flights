import { useEffect, useMemo, useState } from 'react';
import { Button, Group, Modal, NumberInput, Stack, Text } from '@mantine/core';
import type { GeoPoint } from '../../../../shared/types';

type LocationEditorModalProps = {
  opened: boolean;
  home: GeoPoint;
  onApply: (next: GeoPoint) => void;
  onClose: () => void;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const asFiniteNumber = (raw: number | string): number | null => {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export function LocationEditorModal({ opened, home, onApply, onClose }: LocationEditorModalProps) {
  const [latitudeInput, setLatitudeInput] = useState<number | string>(home.lat);
  const [longitudeInput, setLongitudeInput] = useState<number | string>(home.lon);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setLatitudeInput(home.lat);
    setLongitudeInput(home.lon);
    setErrorText(null);
  }, [home.lat, home.lon, opened]);

  const parsedLatitude = useMemo(() => asFiniteNumber(latitudeInput), [latitudeInput]);
  const parsedLongitude = useMemo(() => asFiniteNumber(longitudeInput), [longitudeInput]);
  const canApply = parsedLatitude !== null && parsedLongitude !== null;

  const handleApply = () => {
    if (!canApply) {
      setErrorText('Latitude and longitude must be valid numbers.');
      return;
    }

    onApply({
      lat: clamp(parsedLatitude, -90, 90),
      lon: clamp(parsedLongitude, -180, 180)
    });
    onClose();
  };

  const handleCancel = () => {
    setLatitudeInput(home.lat);
    setLongitudeInput(home.lon);
    setErrorText(null);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Manual Location" centered size={320} padding="md">
      <Stack gap={8}>
        <NumberInput
          label="Latitude"
          size="xs"
          value={latitudeInput}
          onChange={setLatitudeInput}
          placeholder="-90 to 90"
          min={-90}
          max={90}
          step={0.0001}
          decimalScale={6}
          hideControls
          aria-label="Latitude"
        />
        <NumberInput
          label="Longitude"
          size="xs"
          value={longitudeInput}
          onChange={setLongitudeInput}
          placeholder="-180 to 180"
          min={-180}
          max={180}
          step={0.0001}
          decimalScale={6}
          hideControls
          aria-label="Longitude"
        />
        {errorText ? (
          <Text size="xs" c="red.3">
            {errorText}
          </Text>
        ) : null}
        <Group justify="flex-end" gap={8}>
          <Button variant="default" size="xs" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="xs" onClick={handleApply} disabled={!canApply}>
            Apply
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
