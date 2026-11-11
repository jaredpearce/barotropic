import { describe, expect, it } from 'vitest';
import type { NormalizedObservation } from '@/lib/schemas/normalized';
import { localDayBounds } from '@/lib/time';
import { aggregateObservedDay } from './observed';

const RETRIEVED_AT = '2026-06-16T06:30:00Z';

function obs(
  timestamp: string,
  overrides: Partial<NormalizedObservation> = {},
): NormalizedObservation {
  return {
    source: 'NWS',
    id: `KDEN:${timestamp}`,
    stationId: 'KDEN',
    timestamp,
    retrievedAt: RETRIEVED_AT,
    issuedAt: timestamp,
    description: null,
    temperatureC: null,
    dewpointC: null,
    humidityPercent: null,
    windSpeedMps: null,
    windGustMps: null,
    windDirectionDegrees: null,
    ...overrides,
  };
}

/** One observation per UTC hour starting at the local day boundary. */
function dayTimestamps(date: string, timeZone: string, count: number): string[] {
  const { startMs } = localDayBounds(date, timeZone);
  return Array.from({ length: count }, (_, index) =>
    new Date(startMs + index * 3_600_000).toISOString(),
  );
}

function aggregate(
  observations: NormalizedObservation[],
  options: { date?: string; timeZone?: string; timeZoneSource?: 'provider' | 'fallback' } = {},
) {
  const date = options.date ?? '2026-06-15';
  const timeZone = options.timeZone ?? 'America/Denver';
  return aggregateObservedDay({
    stationId: 'KDEN',
    date,
    timeZone,
    timeZoneSource: options.timeZoneSource ?? 'provider',
    observations,
    observationsRetrievedAt: RETRIEVED_AT,
    fetchedAt: new Date(RETRIEVED_AT),
  });
}

describe('aggregateObservedDay', () => {
  it('aggregates a complete day into high/low/mean wind/precip', () => {
    const observations = dayTimestamps('2026-06-15', 'America/Denver', 24).map((timestamp, index) =>
      obs(timestamp, {
        temperatureC: 10 + index,
        temperatureQualityControl: 'V',
        windSpeedMps: 2 + index,
        windSpeedQualityControl: 'V',
        precipitationLastHourMm: index % 2 === 0 ? 0.5 : 0,
        precipitationQualityControl: 'V',
      }),
    );

    const record = aggregate(observations);

    expect(record.status).toBe('verified');
    expect(record.highC).toBe(33);
    expect(record.lowC).toBe(10);
    expect(record.meanWindMps).toBeCloseTo(13.5, 10);
    expect(record.precipOccurred).toBe(true);
    expect(record.coverage).toEqual({
      temperatureHours: 24,
      windHours: 24,
      precipitationHours: 24,
      requiredHours: 18,
    });
  });

  it('excludes every non-V quality-control flag', () => {
    const flags: Array<string | null | undefined> = ['C', 'S', 'Z', null, undefined, 'X'];

    for (const flag of flags) {
      const observations = dayTimestamps('2026-06-15', 'America/Denver', 24).map(
        (timestamp, index) =>
          obs(timestamp, {
            temperatureC: index === 5 ? 99 : 10,
            temperatureQualityControl: index === 5 ? flag : 'V',
          }),
      );

      const record = aggregate(observations);

      expect(record.status).toBe('verified');
      expect(record.highC).toBe(10);
      expect(record.lowC).toBe(10);
      expect(record.coverage.temperatureHours).toBe(23);
    }
  });

  it('excludes readings with no numeric value', () => {
    const observations = dayTimestamps('2026-06-15', 'America/Denver', 24).map((timestamp, index) =>
      obs(timestamp, {
        temperatureC: index === 5 ? null : 10,
        temperatureQualityControl: 'V',
      }),
    );

    const record = aggregate(observations);
    expect(record.coverage.temperatureHours).toBe(23);
    expect(record.highC).toBe(10);
  });

  it('marks a day insufficient when coverage is below 75%', () => {
    const observations = dayTimestamps('2026-06-15', 'America/Denver', 12).map((timestamp) =>
      obs(timestamp, { temperatureC: 20, temperatureQualityControl: 'V' }),
    );

    const record = aggregate(observations);

    expect(record.status).toBe('insufficient');
    expect(record.highC).toBeUndefined();
    expect(record.lowC).toBeUndefined();
    expect(record.coverage.temperatureHours).toBe(12);
    expect(record.coverage.requiredHours).toBe(18);
  });

  it('marks an empty day missing', () => {
    const record = aggregate([]);

    expect(record.status).toBe('missing');
    expect(record.coverage.temperatureHours).toBe(0);
    expect(record.highC).toBeUndefined();
  });

  it('dedupes duplicate timestamps, keeping the first reading', () => {
    const timestamps = dayTimestamps('2026-06-15', 'America/Denver', 24);
    const observations = timestamps.map((timestamp) =>
      obs(timestamp, { temperatureC: 10, temperatureQualityControl: 'V' }),
    );
    const duplicate = obs(timestamps[5], { temperatureC: 99, temperatureQualityControl: 'V' });

    const record = aggregate([...observations, duplicate]);

    expect(record.coverage.temperatureHours).toBe(24);
    expect(record.highC).toBe(10);
  });

  it('follows the real day length for DST coverage thresholds', () => {
    const readings = (date: string, count: number) =>
      dayTimestamps(date, 'America/Denver', count).map((timestamp) =>
        obs(timestamp, { temperatureC: 15, temperatureQualityControl: 'V' }),
      );

    const springFull = aggregate(readings('2026-03-08', 18), { date: '2026-03-08' });
    expect(springFull.coverage.requiredHours).toBe(18);
    expect(springFull.status).toBe('verified');

    const springShort = aggregate(readings('2026-03-08', 17), { date: '2026-03-08' });
    expect(springShort.status).toBe('insufficient');

    const fallFull = aggregate(readings('2026-11-01', 20), { date: '2026-11-01' });
    expect(fallFull.coverage.requiredHours).toBe(19);
    expect(fallFull.status).toBe('verified');

    const fallShort = aggregate(readings('2026-11-01', 19), { date: '2026-11-01' });
    expect(fallShort.status).toBe('insufficient');
  });

  it('prefers 1h precipitation, then 3h, then 6h', () => {
    const observations = dayTimestamps('2026-06-15', 'America/Denver', 24).map((timestamp, index) =>
      obs(timestamp, {
        temperatureC: 20,
        temperatureQualityControl: 'V',
        precipitationLastHourMm: index >= 16 ? 0 : null,
        precipitationLast3HoursMm: index < 8 ? 3 : null,
        precipitationLast6HoursMm: index >= 8 && index < 16 ? 4 : null,
        precipitationQualityControl: 'V',
      }),
    );

    const record = aggregate(observations);

    expect(record.coverage.precipitationHours).toBe(24);
    expect(record.precipOccurred).toBe(true);
  });

  it('reports no precipitation when every accumulation is zero', () => {
    const observations = dayTimestamps('2026-06-15', 'America/Denver', 24).map((timestamp) =>
      obs(timestamp, {
        temperatureC: 20,
        temperatureQualityControl: 'V',
        precipitationLastHourMm: 0,
        precipitationQualityControl: 'V',
      }),
    );

    const record = aggregate(observations);
    expect(record.precipOccurred).toBe(false);
  });

  it('excludes precipitation with a non-V quality-control flag', () => {
    const observations = dayTimestamps('2026-06-15', 'America/Denver', 24).map((timestamp) =>
      obs(timestamp, {
        temperatureC: 20,
        temperatureQualityControl: 'V',
        precipitationLastHourMm: 5,
        precipitationQualityControl: 'S',
      }),
    );

    const record = aggregate(observations);

    expect(record.coverage.precipitationHours).toBe(0);
    expect(record.precipOccurred).toBeUndefined();
    // Temperature coverage still verifies the day.
    expect(record.status).toBe('verified');
  });

  it('records the time-zone source', () => {
    const record = aggregate([], { timeZoneSource: 'fallback' });
    expect(record.timeZoneSource).toBe('fallback');
  });
});
