/**
 * Observation to current-conditions mapping.
 *
 * Shared by the server data module and the client hook so both sides translate
 * the normalized NWS observation into the same domain shape.
 */

import type { NormalizedObservation } from '@/lib/schemas/normalized';
import type { CurrentConditions } from '@/types/domain';

/**
 * Map a normalized observation into the current-conditions entity.
 *
 * @param observation - Normalized NWS observation, or null when unavailable.
 * @returns The current conditions, or null when there is no observation.
 */
export function toCurrentConditions(
  observation: NormalizedObservation | null | undefined
): CurrentConditions | null {
  if (!observation) return null;

  return {
    temperature: observation.temperatureC ?? undefined,
    humidity: observation.humidityPercent ?? undefined,
    dewpoint: observation.dewpointC ?? undefined,
    windSpeed: observation.windSpeedMps ?? undefined,
    windGust: observation.windGustMps ?? undefined,
    windDirection: observation.windDirectionDegrees ?? undefined,
    pressure: observation.pressureHpa ?? undefined,
    condition: observation.description ?? undefined,
    stationId: observation.stationId,
    observedAt: observation.timestamp ? new Date(observation.timestamp) : undefined,
  };
}
