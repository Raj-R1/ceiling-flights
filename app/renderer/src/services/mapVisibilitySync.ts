type LayerLike = { id?: string };

export const FLIGHT_LAYER_IDS = new Set(['flights-circle', 'flights-label']);

export const isFlightLayer = (id: string): boolean => FLIGHT_LAYER_IDS.has(id);

const isShown = (visibility: string | null | undefined): boolean => visibility !== 'none';

export const getBasemapLayerIds = (layers: LayerLike[]): string[] =>
  layers
    .map((layer) => layer.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0 && !isFlightLayer(id));

export const basemapVisibilityMatches = (
  layers: LayerLike[],
  showMap: boolean,
  getLayerVisibility: (layerId: string) => string | null | undefined
): boolean => {
  const basemapLayerIds = getBasemapLayerIds(layers);
  return basemapLayerIds.every((layerId) => isShown(getLayerVisibility(layerId)) === showMap);
};
