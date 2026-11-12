import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forecastDatabase,
  type Forecast,
  type ForecastRevision,
} from '@/lib/forecast-workspace/db';
import type { NormalizedObservation } from '@/lib/schemas/normalized';
import { localDayBounds } from '@/lib/time';
import { runVerification } from './job';

const CREATED_AT = new Date('2026-06-01T00:00:00Z');

async function clearDatabase() {
  await forecastDatabase.transaction(
    'rw',
    forecastDatabase.locations,
    forecastDatabase.forecasts,
    forecastDatabase.revisions,
    forecastDatabase.observedDays,
    async () => {
      await forecastDatabase.revisions.clear();
      await forecastDatabase.forecasts.clear();
      await forecastDatabase.locations.clear();
      await forecastDatabase.observedDays.clear();
    },
  );
}

function forecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    id: 'f1',
    locationId: 'l1',
    locationName: 'Denver',
    validStart: '2026-06-15T12:00',
    updatedAt: CREATED_AT,
    currentRevisionId: 'r1',
    ...overrides,
  };
}

function revision(overrides: Partial<ForecastRevision> = {}): ForecastRevision {
  return {
    id: 'r1',
    forecastId: 'f1',
    revisionNumber: 1,
    createdAt: CREATED_AT,
    values: { high: '30', low: '12', pop: '40', wind: '5', sky: '', hazards: '' },
    reasoning: '',
    guidance: [
      {
        source: 'GFS',
        modelId: 'ncep_gfs_seamless',
        runTime: null,
        retrievedAt: '2026-06-01T00:00:00Z',
        values: { highC: 31, lowC: 13 },
      },
    ],
    target: {
      latitude: 39.7392,
      longitude: -104.9903,
      stationId: 'KDEN',
      timeZone: 'America/Denver',
    },
    officialValues: {},
    modelValues: {},
    ...overrides,
  };
}

async function seed(fc: Forecast, rev: ForecastRevision) {
  await forecastDatabase.forecasts.put(fc);
  await forecastDatabase.revisions.put(rev);
}

function dayObservations(date: string, timeZone: string, count = 24): NormalizedObservation[] {
  const { startMs } = localDayBounds(date, timeZone);
  return Array.from({ length: count }, (_, index) => {
    const timestamp = new Date(startMs + index * 3_600_000).toISOString();
    return {
      source: 'NWS' as const,
      id: `KDEN:${timestamp}`,
      stationId: 'KDEN',
      timestamp,
      retrievedAt: '2026-06-16T06:30:00Z',
      issuedAt: timestamp,
      description: null,
      temperatureC: 10 + index,
      dewpointC: null,
      humidityPercent: null,
      windSpeedMps: 4,
      windGustMps: null,
      windDirectionDegrees: null,
      temperatureQualityControl: 'V',
      windSpeedQualityControl: 'V',
      precipitationLastHourMm: index % 2,
      precipitationQualityControl: 'V',
    };
  });
}

describe('runVerification', () => {
  beforeEach(clearDatabase);

  it('verifies a fully-passed day, summarizes it, and caches the observed record', async () => {
    await seed(forecast(), revision());
    const loadObservations = vi.fn(async () => dayObservations('2026-06-15', 'America/Denver'));

    const result = await runVerification({
      now: new Date('2026-06-20T00:00:00Z'),
      loadObservations,
    });

    expect(result.counts.verified).toBe(1);
    expect(result.warnings).toEqual([]);
    expect(result.samples.length).toBeGreaterThan(0);
    expect(
      result.summaries.find((s) => s.source === 'user' && s.variable === 'high')?.sampleCount,
    ).toBe(1);
    expect(result.pastForecasts[0]).toMatchObject({
      status: 'verified',
      locationName: 'Denver',
      validDate: '2026-06-15',
    });
    expect(loadObservations).toHaveBeenCalledTimes(1);

    const cached = await forecastDatabase.observedDays.get(['KDEN', '2026-06-15']);
    expect(cached?.status).toBe('verified');
    expect(cached?.highC).toBe(33);
    expect(cached?.lowC).toBe(10);
  });

  it('reuses a verified day without re-fetching', async () => {
    await seed(forecast(), revision());
    const loadObservations = vi.fn(async () => dayObservations('2026-06-15', 'America/Denver'));

    await runVerification({ now: new Date('2026-06-20T00:00:00Z'), loadObservations });
    const second = await runVerification({
      now: new Date('2026-06-20T01:00:00Z'),
      loadObservations,
    });

    expect(loadObservations).toHaveBeenCalledTimes(1);
    expect(second.counts.verified).toBe(1);
  });

  it('fetches each station-day once for multiple revisions', async () => {
    await seed(forecast(), revision());
    await seed(
      forecast(),
      revision({ id: 'r2', revisionNumber: 2, createdAt: new Date('2026-06-02T00:00:00Z') }),
    );
    const loadObservations = vi.fn(async () => dayObservations('2026-06-15', 'America/Denver'));

    const result = await runVerification({
      now: new Date('2026-06-20T00:00:00Z'),
      loadObservations,
    });

    expect(loadObservations).toHaveBeenCalledTimes(1);
    expect(result.counts.verified).toBe(2);
    expect(result.pastForecasts).toHaveLength(2);
    expect(result.pastForecasts.map((past) => past.revisionNumber)).toEqual([2, 1]);
  });

  it('records a warning and marks the forecast unverifiable when observations fail', async () => {
    await seed(forecast(), revision());
    const loadObservations = vi.fn(async () => {
      throw new Error('upstream down');
    });

    const result = await runVerification({
      now: new Date('2026-06-20T00:00:00Z'),
      loadObservations,
    });

    expect(result.counts.unverifiable).toBe(1);
    expect(result.counts.verified).toBe(0);
    expect(result.warnings[0]).toContain('upstream down');
    expect(result.pastForecasts[0].status).toBe('unverifiable');
  });

  it('marks a day missing when the station returns no observations', async () => {
    await seed(forecast(), revision());

    const result = await runVerification({
      now: new Date('2026-06-20T00:00:00Z'),
      loadObservations: async () => [],
    });

    expect(result.counts.missing).toBe(1);
    expect(result.pastForecasts[0].status).toBe('missing');
  });

  it('marks insufficient coverage when fewer than 75% of hours are valid', async () => {
    await seed(forecast(), revision());

    const result = await runVerification({
      now: new Date('2026-06-20T00:00:00Z'),
      loadObservations: async () => dayObservations('2026-06-15', 'America/Denver', 5),
    });

    expect(result.counts.insufficient).toBe(1);
    expect(result.pastForecasts[0].status).toBe('insufficient-coverage');
  });

  it('marks a day pending until the verification lag elapses', async () => {
    await seed(
      forecast({ validStart: '2026-06-20T12:00' }),
      revision({ target: { stationId: 'KDEN', timeZone: 'America/Denver' } }),
    );
    const loadObservations = vi.fn(async () => []);

    const result = await runVerification({
      now: new Date('2026-06-20T20:00:00Z'),
      loadObservations,
    });

    expect(result.counts.pending).toBe(1);
    expect(result.pastForecasts[0].status).toBe('pending');
    expect(loadObservations).not.toHaveBeenCalled();
  });

  it('excludes revisions created after the local day began', async () => {
    await seed(forecast(), revision({ createdAt: new Date('2026-06-15T12:00:00Z') }));

    const result = await runVerification({
      now: new Date('2026-06-20T00:00:00Z'),
      loadObservations: async () => [],
    });

    expect(result.counts.notExAnte).toBe(1);
    expect(result.pastForecasts[0].status).toBe('not-ex-ante');
  });

  it('marks revisions without a usable target unverifiable', async () => {
    await seed(forecast(), revision({ target: undefined }));

    const result = await runVerification({
      now: new Date('2026-06-20T00:00:00Z'),
      loadObservations: async () => [],
    });

    expect(result.counts.unverifiable).toBe(1);
    expect(result.pastForecasts[0].status).toBe('unverifiable');
  });
});
