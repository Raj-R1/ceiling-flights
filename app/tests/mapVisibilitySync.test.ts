import { describe, expect, it } from 'vitest';
import {
  basemapVisibilityMatches,
  getBasemapLayerIds,
  isFlightLayer
} from '../renderer/src/services/mapVisibilitySync';

describe('mapVisibilitySync', () => {
  it('identifies only non-flight layers as basemap layers', () => {
    const layers = [
      { id: 'background' },
      { id: 'road-major' },
      { id: 'flights-circle' },
      { id: 'flights-label' },
      { id: 'water' }
    ];

    expect(isFlightLayer('flights-circle')).toBe(true);
    expect(isFlightLayer('flights-label')).toBe(true);
    expect(isFlightLayer('road-major')).toBe(false);
    expect(getBasemapLayerIds(layers)).toEqual(['background', 'road-major', 'water']);
  });

  it('returns false when any basemap layer does not match desired visibility', () => {
    const layers = [{ id: 'background' }, { id: 'road-major' }, { id: 'flights-circle' }];
    const visibilityMap = new Map<string, string | undefined>([
      ['background', 'none'],
      ['road-major', 'visible']
    ]);

    expect(
      basemapVisibilityMatches(
        layers,
        false,
        (layerId) => visibilityMap.get(layerId) ?? undefined
      )
    ).toBe(false);
  });

  it('treats undefined visibility as visible for showMap=true', () => {
    const layers = [{ id: 'background' }, { id: 'road-major' }, { id: 'flights-label' }];
    const visibilityMap = new Map<string, string | undefined>([['background', undefined]]);

    expect(
      basemapVisibilityMatches(
        layers,
        true,
        (layerId) => visibilityMap.get(layerId) ?? undefined
      )
    ).toBe(true);
  });
});
