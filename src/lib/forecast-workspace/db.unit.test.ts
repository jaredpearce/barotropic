import { beforeEach, describe, expect, it } from 'vitest';
import {
  emptyForecastValues,
  forecastDatabase,
  getForecastRevisionHistory,
  getForecastSnapshot,
  saveForecastRevision,
  type ForecastValues,
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
    async () => {
      await forecastDatabase.revisions.clear();
      await forecastDatabase.forecasts.clear();
      await forecastDatabase.locations.clear();
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
});
