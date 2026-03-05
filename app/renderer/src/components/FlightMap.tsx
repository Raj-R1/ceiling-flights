import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-dist/maplibre-gl-csp-worker.js?url';
import type { AircraftSnapshot, GeoPoint } from '../../../shared/types';
import { applySnapshot, buildFeatureCollection, type FlightTrackMap } from '../services/flightState';
import { basemapVisibilityMatches, getBasemapLayerIds } from '../services/mapVisibilitySync';

type Props = {
  home: GeoPoint;
  zoom: number;
  snapshot: AircraftSnapshot[];
  pollMs: number;
  showMap: boolean;
  onMapVisibilityApplied?: (appliedShowMap: boolean) => void;
  onSnapshotRendered?: () => void;
};

const SOURCE_ID = 'flights';
const CIRCLE_LAYER_ID = 'flights-circle';
const LABEL_LAYER_ID = 'flights-label';
const VISIBILITY_SYNC_RAF_WINDOW_MS = 500;
const VISIBILITY_SYNC_RETRY_MS = 100;
const VISIBILITY_SYNC_MAX_WAIT_MS = 4000;
let workerConfigured = false;

type GeoJSONSourceLike = {
  setData: (data: unknown) => void;
};

const applyBasemapVisibility = (map: MapLibreMap, showMap: boolean): void => {
  const layers = map.getStyle?.()?.layers ?? [];
  for (const layerId of getBasemapLayerIds(layers)) {
    map.setLayoutProperty?.(layerId, 'visibility', showMap ? 'visible' : 'none');
  }
};

const isBasemapVisibilityApplied = (map: MapLibreMap, showMap: boolean): boolean => {
  const layers = map.getStyle?.()?.layers ?? [];
  return basemapVisibilityMatches(
    layers,
    showMap,
    (layerId) => map.getLayoutProperty?.(layerId, 'visibility') as string | null | undefined
  );
};

export function FlightMap({
  home,
  zoom,
  snapshot,
  pollMs,
  showMap,
  onMapVisibilityApplied,
  onSnapshotRendered
}: Props) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const tracksRef = useRef<FlightTrackMap>(new Map());
  const rafRef = useRef<number | null>(null);
  const visibilitySyncRafRef = useRef<number | null>(null);
  const visibilitySyncTimerRef = useRef<number | null>(null);
  const visibilitySyncTokenRef = useRef(0);
  const desiredShowMapRef = useRef(showMap);
  const homeRef = useRef(home);
  const zoomRef = useRef(zoom);
  const onMapVisibilityAppliedRef = useRef(onMapVisibilityApplied);
  const onSnapshotRenderedRef = useRef(onSnapshotRendered);
  // Stable ref to the sync function created inside the map-init closure.
  // Allows the showMap effect to trigger the same sync without duplicating logic.
  const syncFnRef = useRef<((reason: string) => void) | null>(null);

  useEffect(() => {
    desiredShowMapRef.current = showMap;
  }, [showMap]);

  useEffect(() => {
    homeRef.current = home;
  }, [home]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    onMapVisibilityAppliedRef.current = onMapVisibilityApplied;
  }, [onMapVisibilityApplied]);

  useEffect(() => {
    onSnapshotRenderedRef.current = onSnapshotRendered;
  }, [onSnapshotRendered]);

  // Map init — runs once. Creates the map, wires events, and stores syncFnRef.
  useEffect(() => {
    const node = mapNodeRef.current;
    if (!node) return;
    let map: MapLibreMap | null = null;
    let disposed = false;

    const clearVisibilitySyncHandles = () => {
      if (visibilitySyncRafRef.current !== null) {
        cancelAnimationFrame(visibilitySyncRafRef.current);
        visibilitySyncRafRef.current = null;
      }
      if (visibilitySyncTimerRef.current !== null) {
        window.clearTimeout(visibilitySyncTimerRef.current);
        visibilitySyncTimerRef.current = null;
      }
    };

    const syncBasemapVisibility = (reason: string) => {
      const syncToken = ++visibilitySyncTokenRef.current;
      clearVisibilitySyncHandles();
      const startedAtMs = Date.now();

      const attempt = () => {
        if (disposed || syncToken !== visibilitySyncTokenRef.current) return;
        const currentMap = mapRef.current;
        if (!currentMap) return;

        const elapsedMs = Date.now() - startedAtMs;
        const desiredShowMap = desiredShowMapRef.current;
        const styleLoaded = currentMap.isStyleLoaded();

        if (styleLoaded) {
          applyBasemapVisibility(currentMap, desiredShowMap);
        }

        if (styleLoaded && isBasemapVisibilityApplied(currentMap, desiredShowMap)) {
          onMapVisibilityAppliedRef.current?.(desiredShowMap);
          clearVisibilitySyncHandles();
          return;
        }

        if (elapsedMs >= VISIBILITY_SYNC_MAX_WAIT_MS) {
          console.warn('Map visibility sync timed out', { reason, desiredShowMap, elapsedMs });
          clearVisibilitySyncHandles();
          return;
        }

        if (elapsedMs <= VISIBILITY_SYNC_RAF_WINDOW_MS) {
          visibilitySyncRafRef.current = requestAnimationFrame(attempt);
          return;
        }

        visibilitySyncTimerRef.current = window.setTimeout(attempt, VISIBILITY_SYNC_RETRY_MS);
      };

      attempt();
    };

    syncFnRef.current = syncBasemapVisibility;

    const setup = () => {
      if (disposed) return;
      if (!workerConfigured) {
        setWorkerUrl(maplibreWorkerUrl);
        workerConfigured = true;
      }

      map = new MapLibreMap({
        container: node,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [homeRef.current.lon, homeRef.current.lat],
        zoom: zoomRef.current,
        bearing: 0,
        pitch: 0,
        attributionControl: false,
        interactive: false,
        fadeDuration: 100
      });

      mapRef.current = map;

      map.on('load', () => {
        if (!map) return;
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: CIRCLE_LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          paint: {
            'circle-radius': 4,
            'circle-color': '#f2f4f8',
            'circle-stroke-color': '#0f1115',
            'circle-stroke-width': 1.4
          }
        });

        map.addLayer({
          id: LABEL_LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 13,
            'text-offset': [0, -1.2],
            'text-font': ['Open Sans Bold']
          },
          paint: {
            'text-color': '#f6f8fb',
            'text-halo-color': 'rgba(12, 14, 18, 0.96)',
            'text-halo-width': 0.7
          }
        });

        syncBasemapVisibility('load');
      });

      map.on('styledata', () => {
        if (!map) return;
        syncBasemapVisibility('styledata');
      });

      map.on('idle', () => {
        if (!map) return;
        syncBasemapVisibility('idle');
      });

      map.on('error', (event) => {
        const anyEvent = event as unknown as { error?: { message?: string }; sourceId?: string };
        const message = anyEvent.error?.message || 'Unknown map error';
        console.error(`MapLibre error: ${message}`, anyEvent.sourceId ? { sourceId: anyEvent.sourceId } : {});
      });

      const onViewportChanged = () => {
        if (!mapRef.current) return;
        mapRef.current.resize();
        syncBasemapVisibility('viewport-change');
      };

      window.addEventListener('resize', onViewportChanged);
      document.addEventListener('fullscreenchange', onViewportChanged);
      map.on('resize', () => syncBasemapVisibility('map-resize'));

      map.once('remove', () => {
        window.removeEventListener('resize', onViewportChanged);
        document.removeEventListener('fullscreenchange', onViewportChanged);
      });
    };

    void setup();
    const tracks = tracksRef.current;

    return () => {
      disposed = true;
      syncFnRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      clearVisibilitySyncHandles();
      map?.remove();
      mapRef.current = null;
      tracks.clear();
    };
  }, []);

  // Trigger visibility sync whenever showMap prop changes.
  // desiredShowMapRef is updated in its own effect (declared above) which runs first.
  useEffect(() => {
    syncFnRef.current?.('showMap-prop-change');
  }, [showMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      center: [home.lon, home.lat],
      zoom,
      duration: 450,
      essential: true
    });
  }, [home.lat, home.lon, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    let didNotifySnapshotRendered = false;

    applySnapshot(tracksRef.current, snapshot, Date.now());

    const render = () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;

      const source = currentMap.getSource(SOURCE_ID) as GeoJSONSourceLike | undefined;
      if (!source) return;

      const nowMs = Date.now();
      source.setData(buildFeatureCollection(tracksRef.current, nowMs, pollMs));
      if (!didNotifySnapshotRendered) {
        didNotifySnapshotRendered = true;
        onSnapshotRenderedRef.current?.();
      }

      const animating = [...tracksRef.current.values()].some((track) => nowMs - track.updatedAtMs < pollMs);
      if (animating) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        rafRef.current = null;
      }
    };

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(render);
  }, [snapshot, pollMs]);

  return <Box ref={mapNodeRef} w="100%" h="100%" />;
}
