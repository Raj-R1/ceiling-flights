import { useEffect, useRef } from 'react';
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-dist/maplibre-gl-csp-worker.js?url';
import type { AircraftSnapshot, GeoPoint } from '../../../shared/types';
import { applySnapshot, buildFeatureCollection, type FlightTrackMap } from '../services/flightState';

type Props = {
  home: GeoPoint;
  zoom: number;
  snapshot: AircraftSnapshot[];
  pollMs: number;
  showMap: boolean;
  introVisible: boolean;
  onMapVisibilityApplied?: (appliedShowMap: boolean) => void;
};

const SOURCE_ID = 'flights';
const CIRCLE_LAYER_ID = 'flights-circle';
const LABEL_LAYER_ID = 'flights-label';
let workerConfigured = false;

type GeoJSONSourceLike = {
  setData: (data: unknown) => void;
};

const isFlightLayer = (id: string): boolean => id === CIRCLE_LAYER_ID || id === LABEL_LAYER_ID;

const applyBasemapVisibility = (map: MapLibreMap, showMap: boolean): void => {
  const layers = map.getStyle?.()?.layers ?? [];
  for (const layer of layers) {
    if (!layer?.id || isFlightLayer(layer.id)) continue;
    map.setLayoutProperty?.(layer.id, 'visibility', showMap ? 'visible' : 'none');
  }
};

export function FlightMap({ home, zoom, snapshot, pollMs, showMap, introVisible, onMapVisibilityApplied }: Props) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const tracksRef = useRef<FlightTrackMap>(new Map());
  const rafRef = useRef<number | null>(null);
  const showMapRef = useRef(showMap);
  const homeRef = useRef(home);
  const zoomRef = useRef(zoom);
  const onMapVisibilityAppliedRef = useRef(onMapVisibilityApplied);

  useEffect(() => {
    showMapRef.current = showMap;
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
    const node = mapNodeRef.current;
    if (!node) return;
    let map: MapLibreMap | null = null;
    let disposed = false;

    const setup = () => {
      if (disposed) return;
      if (!workerConfigured) {
        // MapLibre CSP worker path must be configured once per runtime.
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
        // Flights are rendered as a dedicated GeoJSON source+layers so map toggling can hide basemap only.
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

        applyBasemapVisibility(map, showMapRef.current);
        onMapVisibilityAppliedRef.current?.(showMapRef.current);
      });

      map.on('styledata', () => {
        if (!map) return;
        applyBasemapVisibility(map, showMapRef.current);
        onMapVisibilityAppliedRef.current?.(showMapRef.current);
      });

      map.on('error', (event) => {
        const anyEvent = event as unknown as { error?: { message?: string }; sourceId?: string };
        const message = anyEvent.error?.message || 'Unknown map error';
        console.error(`MapLibre error: ${message}`, anyEvent.sourceId ? { sourceId: anyEvent.sourceId } : {});
      });
    };

    void setup();
    const tracks = tracksRef.current;

    return () => {
      disposed = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      map?.remove();
      mapRef.current = null;
      tracks.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      applyBasemapVisibility(map, showMap);
      onMapVisibilityApplied?.(showMap);
      return;
    }

    const id = requestAnimationFrame(() => {
      const next = mapRef.current;
      if (!next || !next.isStyleLoaded()) return;
      applyBasemapVisibility(next, showMap);
      onMapVisibilityApplied?.(showMap);
    });
    return () => cancelAnimationFrame(id);
  }, [showMap, onMapVisibilityApplied]);

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

    applySnapshot(tracksRef.current, snapshot, Date.now());

    const render = () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;

      const source = currentMap.getSource(SOURCE_ID) as GeoJSONSourceLike | undefined;
      if (!source) return;

      const nowMs = Date.now();
      source.setData(buildFeatureCollection(tracksRef.current, nowMs, pollMs));

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

  return <div ref={mapNodeRef} className={`map-canvas ${introVisible ? 'intro-visible' : 'intro-hidden'}`} />;
}
