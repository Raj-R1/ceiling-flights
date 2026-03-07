import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
  UnstyledButton
} from '@mantine/core';
import { IconMapPin, IconSearch } from '@tabler/icons-react';
import type { GeoPoint } from '../../../../shared/types';
import { GLASS_SURFACE_TOKENS } from '../../theme/glassTokens';

type LocationEditorModalProps = {
  opened: boolean;
  home: GeoPoint;
  onApply: (next: GeoPoint) => void;
  onClose: () => void;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
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
  const [latitudeInput, setLatitudeInput]   = useState<number | string>(home.lat);
  const [longitudeInput, setLongitudeInput] = useState<number | string>(home.lon);
  const [errorText, setErrorText]           = useState<string | null>(null);

  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching,     setSearching]     = useState(false);
  const [searchFailed,  setSearchFailed]  = useState(false);

  // Reset all state when modal reopens.
  useEffect(() => {
    if (!opened) return;
    setLatitudeInput(home.lat);
    setLongitudeInput(home.lon);
    setErrorText(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchFailed(false);
  }, [home.lat, home.lon, opened]);

  // Debounced geocoding via Nominatim.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchFailed(false);
      return;
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    timer = setTimeout(async () => {
      setSearching(true);
      setSearchFailed(false);
      try {
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=0`;
        const res  = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' }
        });
        const data = await res.json() as NominatimResult[];
        setSearchResults(data);
        if (data.length === 0) setSearchFailed(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSearchResults([]);
          setSearchFailed(true);
        }
      } finally {
        setSearching(false);
      }
    }, 380);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setSearching(false);
    };
  }, [searchQuery]);

  const parsedLatitude  = useMemo(() => asFiniteNumber(latitudeInput),  [latitudeInput]);
  const parsedLongitude = useMemo(() => asFiniteNumber(longitudeInput), [longitudeInput]);
  const canApply = parsedLatitude !== null && parsedLongitude !== null;

  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setLatitudeInput(lat);
    setLongitudeInput(lon);
    setSearchQuery('');
    setSearchResults([]);
    setSearchFailed(false);
    setErrorText(null);
  };

  const handleApply = () => {
    if (!canApply) {
      setErrorText('Latitude and longitude must be valid numbers.');
      return;
    }
    onApply({
      lat: clamp(parsedLatitude, -90,  90),
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

  const hasResults   = searchResults.length > 0;
  const showNoMatch  = !searching && searchFailed && searchQuery.trim().length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Set Location"
      centered
      size={400}
      padding="md"
    >
      <Stack gap={10}>

        {/* ── Geocoding search ── */}
        <TextInput
          placeholder="Search for a city or place…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={14} />}
          rightSection={searching ? <Loader size="xs" /> : null}
          size="xs"
          aria-label="Search for a location"
          autoFocus
        />

        {/* Search results */}
        {hasResults && (
          <Box
            style={{
              background: 'rgba(14, 17, 22, 0.82)',
              border: `1px solid ${GLASS_SURFACE_TOKENS.border}`,
              borderRadius: 10,
              overflow: 'hidden'
            }}
          >
            {searchResults.map((result, i) => (
              <UnstyledButton
                key={result.place_id}
                w="100%"
                onClick={() => handleSelectResult(result)}
                style={{
                  display: 'block',
                  padding: '8px 10px',
                  borderBottom:
                    i < searchResults.length - 1
                      ? `1px solid rgba(255, 255, 255, 0.06)`
                      : 'none'
                }}
              >
                <Group gap={8} wrap="nowrap" align="flex-start">
                  <IconMapPin
                    size={13}
                    style={{ flexShrink: 0, marginTop: 1, color: 'rgba(255,255,255,0.35)' }}
                  />
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text size="xs" lh={1.3} truncate>
                      {result.display_name}
                    </Text>
                    <Text size="xs" c="dimmed" ff="monospace" lh={1}>
                      {parseFloat(result.lat).toFixed(4)}°,&nbsp;
                      {parseFloat(result.lon).toFixed(4)}°
                    </Text>
                  </Stack>
                </Group>
              </UnstyledButton>
            ))}
          </Box>
        )}

        {showNoMatch && (
          <Text size="xs" c="dimmed">
            No places found for &ldquo;{searchQuery}&rdquo;
          </Text>
        )}

        <Divider label="or enter coordinates" labelPosition="center" />

        {/* ── Manual coordinate inputs ── */}
        <Group grow gap={8}>
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
        </Group>

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
