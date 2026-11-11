/**
 * Observed-day aggregation.
 *
 * Implements the canonical rule in `docs/verification-rules.md`: local calendar
 * days, per-variable `qualityControl === 'V'` filtering, distinct-hour coverage,
 * and high/low/mean-wind/precip aggregation. No interpolation or gap filling.
 */

import type { ObservedDayRecord } from '@/lib/forecast-workspace/db';
import type { NormalizedObservation } from '@/lib/schemas/normalized';
import { localDayBounds, localHourKey } from '@/lib/time';

export interface AggregateObservedDayInput {
  stationId: string;
  /** YYYY-MM-DD in the target time zone. */
  date: string;
  timeZone: string;
  timeZoneSource: 'provider' | 'fallback';
  observations: readonly NormalizedObservation[];
  observationsRetrievedAt: string;
  fetchedAt?: Date;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function timestampOf(observation: NormalizedObservation): number | null {
  if (!observation.timestamp) return null;
  const timestamp = Date.parse(observation.timestamp);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function uniqueByTimestamp(
  observations: readonly NormalizedObservation[],
): NormalizedObservation[] {
  const seen = new Set<number>();
  const unique: NormalizedObservation[] = [];
  for (const observation of observations) {
    const timestamp = timestampOf(observation);
    if (timestamp === null || seen.has(timestamp)) continue;
    seen.add(timestamp);
    unique.push(observation);
  }
  return unique;
}

function countLocalHours(observations: readonly NormalizedObservation[], timeZone: string): number {
  const hours = new Set<string>();
  for (const observation of observations) {
    const timestamp = timestampOf(observation);
    if (timestamp === null) continue;
    hours.add(localHourKey(timestamp, timeZone));
  }
  return hours.size;
}

function precipitationMm(observation: NormalizedObservation): number | null {
  for (const value of [
    observation.precipitationLastHourMm,
    observation.precipitationLast3HoursMm,
    observation.precipitationLast6HoursMm,
  ]) {
    if (isFiniteNumber(value)) return value;
  }
  return null;
}

function hasValidPrecipitation(observation: NormalizedObservation): boolean {
  return observation.precipitationQualityControl === 'V' && precipitationMm(observation) !== null;
}

/**
 * Aggregate a single station-day into the canonical observed record.
 *
 * @returns A record with per-variable values present only when that variable met
 *   its coverage threshold.
 */
export function aggregateObservedDay(input: AggregateObservedDayInput): ObservedDayRecord {
  const { stationId, date, timeZone, timeZoneSource, observations } = input;
  const { startMs, endMs, hours } = localDayBounds(date, timeZone);
  const requiredHours = Math.ceil(0.75 * hours);

  const inDay = uniqueByTimestamp(
    observations.filter((observation) => {
      const timestamp = timestampOf(observation);
      return timestamp !== null && timestamp >= startMs && timestamp < endMs;
    }),
  );

  const temperatures = inDay.filter(
    (observation) =>
      isFiniteNumber(observation.temperatureC) && observation.temperatureQualityControl === 'V',
  );
  const winds = inDay.filter(
    (observation) =>
      isFiniteNumber(observation.windSpeedMps) && observation.windSpeedQualityControl === 'V',
  );
  const precipitation = inDay.filter(hasValidPrecipitation);

  const temperatureHours = countLocalHours(temperatures, timeZone);
  const windHours = countLocalHours(winds, timeZone);
  const precipitationHours = countLocalHours(precipitation, timeZone);

  const temperatureCovered = temperatureHours >= requiredHours;
  const windCovered = windHours >= requiredHours;
  const precipitationCovered = precipitationHours >= requiredHours;

  let status: ObservedDayRecord['status'];
  if (inDay.length === 0) {
    status = 'missing';
  } else if (temperatureCovered || windCovered || precipitationCovered) {
    status = 'verified';
  } else {
    status = 'insufficient';
  }

  return {
    stationId,
    date,
    timeZone,
    timeZoneSource,
    status,
    highC: temperatureCovered
      ? Math.max(...temperatures.map((observation) => observation.temperatureC as number))
      : undefined,
    lowC: temperatureCovered
      ? Math.min(...temperatures.map((observation) => observation.temperatureC as number))
      : undefined,
    meanWindMps: windCovered
      ? winds.reduce((sum, observation) => sum + (observation.windSpeedMps as number), 0) /
        winds.length
      : undefined,
    precipOccurred: precipitationCovered
      ? precipitation.some((observation) => (precipitationMm(observation) ?? 0) > 0)
      : undefined,
    coverage: {
      temperatureHours,
      windHours,
      precipitationHours,
      requiredHours,
    },
    observationsRetrievedAt: input.observationsRetrievedAt,
    fetchedAt: input.fetchedAt ?? new Date(),
  };
}
