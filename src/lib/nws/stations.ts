/**
 * Observation-station helpers for the NWS point endpoint.
 *
 * NWS returns nearby stations ordered by proximity. The first station is the
 * one used for the latest observation; the full list is retained so the desk
 * map can show station locations without issuing a second request.
 */

import type { ObservationStations } from '@/lib/schemas';
import { extractStationId } from './utils';

/** Maximum number of stations sent to the map to keep overlays readable. */
export const MAX_MAP_STATIONS = 8;

export interface StationCoordinates {
  id: string;
  name?: string;
  latitude: number;
  longitude: number;
}

/**
 * Map validated NWS station features into map-ready coordinates.
 *
 * Features without an id, geometry, or finite coordinates are skipped.
 * Duplicate station ids are collapsed while preserving proximity order.
 */
export function normalizeObservationStations(
  stations: ObservationStations | null | undefined,
  limit = MAX_MAP_STATIONS,
): StationCoordinates[] {
  const coordinates: StationCoordinates[] = [];
  const seen = new Set<string>();

  for (const feature of stations?.features ?? []) {
    const id = extractStationId(feature.id);
    const position = feature.geometry?.coordinates;
    if (!id || seen.has(id) || !position || position.length < 2) continue;

    const [longitude, latitude] = position;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    seen.add(id);
    coordinates.push({
      id,
      ...(feature.properties?.name ? { name: feature.properties.name } : {}),
      latitude,
      longitude,
    });

    if (coordinates.length >= limit) break;
  }

  return coordinates;
}
