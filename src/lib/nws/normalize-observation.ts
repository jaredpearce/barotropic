/**
 * NWS Observation Normalization
 *
 * Pure transform from a raw NWS observation payload into the canonical
 * observation shape. Kept free of `server-only` so it can be shared by the
 * route handlers and the server data modules alike.
 */

import type { LatestObservation } from '@/lib/schemas/nws';
import type { NormalizedObservation } from '@/lib/schemas/normalized';
import { NormalizedObservationSchema } from '@/lib/schemas';
import {
  normalizeNwsPressure,
  normalizeNwsQuantityValue,
  normalizeNwsTemperature,
  normalizeNwsWindSpeed,
} from '@/lib/weather-normalizers';

/**
 * Normalize a raw NWS observation into the canonical observation shape.
 *
 * @param stationId - Station that produced the observation.
 * @param observation - Raw NWS observation payload.
 * @param retrievedAt - ISO timestamp of when the observation was fetched.
 * @returns The normalized observation.
 */
export function normalizeNwsObservation(
  stationId: string,
  observation: LatestObservation,
  retrievedAt: string = new Date().toISOString()
): NormalizedObservation {
  const { properties } = observation;

  return NormalizedObservationSchema.parse({
    source: 'NWS',
    id: `${stationId}:${properties.timestamp ?? retrievedAt}`,
    stationId,
    timestamp: properties.timestamp ?? null,
    retrievedAt,
    issuedAt: properties.timestamp ?? retrievedAt,
    description: properties.textDescription ?? null,
    temperatureC: normalizeNwsTemperature(properties.temperature),
    dewpointC: normalizeNwsTemperature(properties.dewpoint),
    humidityPercent: normalizeNwsQuantityValue(properties.relativeHumidity),
    windSpeedMps: normalizeNwsWindSpeed(properties.windSpeed),
    windGustMps: normalizeNwsWindSpeed(properties.windGust),
    windDirectionDegrees: normalizeNwsQuantityValue(properties.windDirection),
    pressureHpa: normalizeNwsPressure(properties.barometricPressure),
  });
}
