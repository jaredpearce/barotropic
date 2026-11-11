import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearObservedDays,
  emptyForecastValues,
  forecastDatabase,
  getForecastRevisionHistory,
  getForecastSnapshot,
  getObservedDay,
  listAllForecastRevisions,
  putObservedDay,
  saveForecastRevision,
  type ForecastValues,
  type ObservedDayRecord,
} from './db';

function values(overrides: Partial<ForecastValues> = {}): ForecastValues {
  return { ...emptyForecastValues(), ...overrides };
}

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

describe('forecast workspace database', () => {
  beforeEach(clearDatabase);

  it('creates a location, forecast, and first revision', async () => {
    const snapshot = await saveForecastRevision({
      locationName: '  Boston  ',
      latitude: 42.3601,
      longitude: -71.0589,
      validStart: '2026-11-03T12:00',
      values: values({ high: '25', pop: '40' }),
      reasoning: 'Warm air arrives.',
      officialValues: { high: '24°C' },
      modelValues: { high: '26°C' },
    });

    expect(snapshot.forecast.locationName).toBe('Boston');
    expect(snapshot.location?.latitude).toBe(42.3601);
    expect(snapshot.revision.revisionNumber).toBe(1);
    expect(snapshot.revision.values.high).toBe('25');
    expect(snapshot.revision.officialValues).toEqual({ high: '24°C' });

    const stored = await getForecastSnapshot(snapshot.forecast.id);
    expect(stored?.revision.reasoning).toBe('Warm air arrives.');
  });

  it('appends an immutable revision when the draft changes', async () => {
    const first = await saveForecastRevision({
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '25' }),
      reasoning: 'First reasoning.',
    });

    const second = await saveForecastRevision({
      forecastId: first.forecast.id,
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '28' }),
      reasoning: 'Second reasoning.',
    });

    expect(second.revision.revisionNumber).toBe(2);
    expect(second.forecast.currentRevisionId).toBe(second.revision.id);

    const history = await getForecastRevisionHistory(first.forecast.id);
    expect(history.map((revision) => revision.revisionNumber)).toEqual([1, 2]);
    expect(history[0].values.high).toBe('25');
    expect(history[0].reasoning).toBe('First reasoning.');
    expect(history[1].values.high).toBe('28');
  });

  it('does not append a revision for an identical save', async () => {
    const input = {
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '25' }),
      reasoning: 'Unchanged.',
    };
    const first = await saveForecastRevision(input);

    const second = await saveForecastRevision({
      ...input,
      forecastId: first.forecast.id,
    });

    expect(second.revision.id).toBe(first.revision.id);
    expect(await getForecastRevisionHistory(first.forecast.id)).toHaveLength(1);
  });

  it('snapshots guidance instead of carrying the previous revision forward', async () => {
    const first = await saveForecastRevision({
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '25' }),
      reasoning: 'First.',
      officialValues: { high: '24°C' },
      modelValues: { high: '26°C' },
    });

    const second = await saveForecastRevision({
      forecastId: first.forecast.id,
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '27' }),
      reasoning: 'Second.',
    });

    expect(second.revision.officialValues).toEqual({});
    expect(second.revision.modelValues).toEqual({});
    const history = await getForecastRevisionHistory(first.forecast.id);
    expect(history[0].officialValues).toEqual({ high: '24°C' });
  });

  it('keeps revision numbers increasing after history is read', async () => {
    const first = await saveForecastRevision({
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '20' }),
      reasoning: 'One.',
    });
    const second = await saveForecastRevision({
      forecastId: first.forecast.id,
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '21' }),
      reasoning: 'Two.',
    });
    const third = await saveForecastRevision({
      forecastId: first.forecast.id,
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '22' }),
      reasoning: 'Three.',
    });

    expect(second.revision.revisionNumber).toBe(2);
    expect(third.revision.revisionNumber).toBe(3);
    expect(
      (await getForecastRevisionHistory(first.forecast.id)).map((r) => r.revisionNumber),
    ).toEqual([1, 2, 3]);
  });

  it('persists and clones numeric guidance snapshots and the target', async () => {
    const guidance = [
      {
        source: 'NWS' as const,
        runTime: '2026-11-01T09:00:00Z',
        retrievedAt: '2026-11-01T10:00:00Z',
        values: { highC: 20, lowC: 5, popPercent: 10 },
      },
      {
        source: 'GFS' as const,
        modelId: 'ncep_gfs_seamless',
        runTime: null,
        retrievedAt: '2026-11-01T10:00:00Z',
        utcOffsetSeconds: -18000,
        values: { highC: 21, lowC: 6 },
      },
    ];
    const target = {
      latitude: 39.7392,
      longitude: -104.9903,
      stationId: 'KDEN',
      timeZone: 'America/Denver',
    };

    const snapshot = await saveForecastRevision({
      locationName: 'Denver',
      validStart: '2026-11-03T12:00',
      values: values({ high: '20' }),
      reasoning: 'Cold front.',
      guidance,
      target,
    });

    expect(snapshot.revision.guidance).toHaveLength(2);
    expect(snapshot.revision.guidance?.[0]).not.toBe(guidance[0]);
    expect(snapshot.revision.target).toEqual(target);
    expect(snapshot.location?.stationId).toBe('KDEN');
    expect(snapshot.location?.timeZone).toBe('America/Denver');

    guidance[0].values.highC = 99;
    const stored = await getForecastSnapshot(snapshot.forecast.id);
    expect(stored?.revision.guidance?.[0].values.highC).toBe(20);
  });

  it('loads revisions that predate the guidance/target fields', async () => {
    const snapshot = await saveForecastRevision({
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '25' }),
      reasoning: 'Legacy.',
    });

    const stored = await getForecastSnapshot(snapshot.forecast.id);
    expect(stored?.revision.guidance).toBeUndefined();
    expect(stored?.revision.target).toBeUndefined();
  });

  it('treats a guidance-only change as a no-op', async () => {
    const first = await saveForecastRevision({
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '25' }),
      reasoning: 'Same draft.',
      guidance: [
        {
          source: 'GFS',
          modelId: 'ncep_gfs_seamless',
          runTime: null,
          retrievedAt: '2026-11-01T10:00:00Z',
          values: { highC: 21 },
        },
      ],
    });

    const second = await saveForecastRevision({
      forecastId: first.forecast.id,
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '25' }),
      reasoning: 'Same draft.',
      guidance: [
        {
          source: 'GFS',
          modelId: 'ncep_gfs_seamless',
          runTime: null,
          retrievedAt: '2026-11-01T12:00:00Z',
          values: { highC: 30 },
        },
      ],
    });

    expect(second.revision.id).toBe(first.revision.id);
    expect(second.revision.guidance?.[0].values.highC).toBe(21);
    expect(await getForecastRevisionHistory(first.forecast.id)).toHaveLength(1);
  });

  it('lists every revision across forecasts', async () => {
    const a = await saveForecastRevision({
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '25' }),
      reasoning: 'One.',
    });
    await saveForecastRevision({
      forecastId: a.forecast.id,
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: values({ high: '26' }),
      reasoning: 'Two.',
    });
    await saveForecastRevision({
      locationName: 'Denver',
      validStart: '2026-11-04T12:00',
      values: values({ high: '10' }),
      reasoning: 'Three.',
    });

    expect(await listAllForecastRevisions()).toHaveLength(3);
  });

  it('reads, writes, and clears observed-day records', async () => {
    const record: ObservedDayRecord = {
      stationId: 'KDEN',
      date: '2026-11-01',
      timeZone: 'America/Denver',
      timeZoneSource: 'provider',
      status: 'verified',
      highC: 20,
      lowC: 3,
      meanWindMps: 4,
      precipOccurred: false,
      coverage: {
        temperatureHours: 24,
        windHours: 24,
        precipitationHours: 24,
        requiredHours: 18,
      },
      observationsRetrievedAt: '2026-11-02T12:00:00Z',
      fetchedAt: new Date('2026-11-02T12:00:00Z'),
    };

    await putObservedDay(record);
    expect(await getObservedDay('KDEN', '2026-11-01')).toMatchObject({ status: 'verified' });

    await clearObservedDays();
    expect(await getObservedDay('KDEN', '2026-11-01')).toBeUndefined();
  });
});
