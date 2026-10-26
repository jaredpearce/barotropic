/**
 * NWS Current Conditions
 *
 * Resolves a coordinate to the nearest observation station and normalizes the
 * latest observation into the domain {@link CurrentConditions} entity used by
 * the condition tiles.
 */

import 'server-only';

import type { CurrentConditions } from '@/types/domain';
import type { NormalizedObservation } from '@/lib/schemas/normalized';
import {
  LatestObservationSchema,
  ObservationStationsSchema,
  PointSchema,
} from '@/lib/schemas';
import { fetchFromNws } from './client';
import { normalizeNwsObservation } from './normalize-observation';
import { toCurrentConditions } from './observation-to-conditions';
import { extractStationId, toNwsPath } from './utils';

/**
 * Fetch the latest observation for the nearest station to a coordinate.
 *
 * @param latitude - Latitude in decimal degrees.
 * @param longitude - Longitude in decimal degrees.
 * @returns The normalized observation, or null when no station is available.
 */
export async function fetchLatestObservation(
  latitude: number,
  longitude: number
): Promise<NormalizedObservation | null> {
  const point = await fetchFromNws(
    `/points/${latitude},${longitude}`,
    PointSchema
  );

  const stationsUrl = point.properties.observationStations;
  if (!stationsUrl) return null;

  const stations = await fetchFromNws(
    toNwsPath(stationsUrl),
    ObservationStationsSchema
  );

  const stationUrl = stations.features[0]?.id;
  const stationId = stationUrl ? extractStationId(stationUrl) : null;
  if (!stationId) return null;

  const observation = await fetchFromNws(
    `/stations/${stationId}/observations/latest`,
    LatestObservationSchema
  );

  return normalizeNwsObservation(stationId, observation);
}

/**
 * Fetch the current conditions for a coordinate.
 *
 * @param latitude - Latitude in decimal degrees.
 * @param longitude - Longitude in decimal degrees.
 * @returns The current conditions, empty when no observation is available.
 */
export async function fetchCurrentConditions(
  latitude: number,
  longitude: number
): Promise<CurrentConditions> {
  const observation = await fetchLatestObservation(latitude, longitude);
  return toCurrentConditions(observation) ?? {};
}
