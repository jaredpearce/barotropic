import { describe, expect, it } from 'vitest';
import {
  emptyForecastValues,
  type Forecast,
  type ForecastRevision,
  type ForecastValues,
  type ObservedDayRecord,
} from '@/lib/forecast-workspace/db';
import {
  forecastValuesForRevision,
  isExAnte,
  parseLegacyValues,
  parseUserValues,
  revisionSources,
  verifyRevision,
} from './verify';

function values(overrides: Partial<ForecastValues> = {}): ForecastValues {
  return { ...emptyForecastValues(), ...overrides };
}

function forecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    id: 'f1',
    locationId: 'l1',
    locationName: 'Denver',
    validStart: '2026-06-15T12:00',
    updatedAt: new Date('2026-06-14T12:00:00Z'),
    currentRevisionId: 'r1',
    ...overrides,
  };
}

function revision(overrides: Partial<ForecastRevision> = {}): ForecastRevision {
  return {
    id: 'r1',
    forecastId: 'f1',
    revisionNumber: 1,
    createdAt: new Date('2026-06-14T12:00:00Z'),
    values: values({ high: '30', low: '12', pop: '40', wind: '5' }),
    reasoning: '',
    officialValues: {},
    modelValues: {},
    ...overrides,
  };
}

function observedDay(overrides: Partial<ObservedDayRecord> = {}): ObservedDayRecord {
  return {
    stationId: 'KDEN',
    date: '2026-06-15',
    timeZone: 'America/Denver',
    timeZoneSource: 'provider',
    status: 'verified',
    highC: 28,
    lowC: 10,
    meanWindMps: 4,
    precipOccurred: true,
    coverage: { temperatureHours: 24, windHours: 24, precipitationHours: 24, requiredHours: 18 },
    observationsRetrievedAt: '2026-06-16T06:30:00Z',
    fetchedAt: new Date('2026-06-16T06:30:00Z'),
    ...overrides,
  };
}

function verify(rev = revision(), day = observedDay(), fc = forecast()) {
  return verifyRevision({ forecast: fc, revision: rev, observedDay: day });
}

describe('verifyRevision', () => {
  it('computes per-variable errors for the user forecast', () => {
    const samples = verify();
    const byVariable = Object.fromEntries(samples.map((sample) => [sample.variable, sample]));

    expect(samples.every((sample) => sample.source === 'user')).toBe(true);
    expect(byVariable.high.error).toBe(2);
    expect(byVariable.low.error).toBe(2);
    expect(byVariable.wind.error).toBe(1);
    expect(byVariable.pop.error).toBe(-60);
    expect(byVariable.pop.brierComponent).toBeCloseTo(0.36, 10);
    expect(byVariable.high.leadHours).toBeCloseTo(18, 5);
    expect(byVariable.high.validDate).toBe('2026-06-15');
  });

  it('skips missing forecast or observed values instead of scoring zero', () => {
    const missingForecast = verify(revision({ values: values({ high: '30', wind: '5' }) }));
    expect(missingForecast.map((sample) => sample.variable).sort()).toEqual(['high', 'wind']);

    const missingObserved = verify(
      revision(),
      observedDay({ highC: undefined, lowC: undefined, precipOccurred: undefined }),
    );
    expect(missingObserved.map((sample) => sample.variable)).toEqual(['wind']);
  });

  it('returns no samples when nothing is forecastable', () => {
    expect(verify(revision({ values: values() }))).toEqual([]);
  });

  it('is ex-ante only before the local day begins', () => {
    expect(isExAnte(revision(), '2026-06-15', 'America/Denver')).toBe(true);
    expect(
      isExAnte(
        revision({ createdAt: new Date('2026-06-15T05:59:59Z') }),
        '2026-06-15',
        'America/Denver',
      ),
    ).toBe(true);
    expect(
      isExAnte(
        revision({ createdAt: new Date('2026-06-15T06:00:00Z') }),
        '2026-06-15',
        'America/Denver',
      ),
    ).toBe(false);
  });

  it('returns no samples for a revision created after the local day began', () => {
    expect(verify(revision({ createdAt: new Date('2026-06-15T12:00:00Z') }))).toEqual([]);
  });

  it('scores structured guidance snapshots', () => {
    const rev = revision({
      guidance: [
        {
          source: 'NWS',
          runTime: '2026-06-14T09:00:00Z',
          retrievedAt: '2026-06-14T12:00:00Z',
          values: { highC: 29, lowC: 11 },
        },
        {
          source: 'GFS',
          modelId: 'ncep_gfs_seamless',
          runTime: null,
          retrievedAt: '2026-06-14T12:00:00Z',
          values: { highC: 31 },
        },
      ],
    });

    expect(revisionSources(rev)).toEqual(['user', 'NWS', 'GFS']);

    const samples = verify(rev);
    const gfsHigh = samples.find((sample) => sample.source === 'GFS' && sample.variable === 'high');
    expect(gfsHigh?.forecastValue).toBe(31);
    expect(gfsHigh?.error).toBe(3);

    const nwsLow = samples.find((sample) => sample.source === 'NWS' && sample.variable === 'low');
    expect(nwsLow?.error).toBe(1);
  });

  it('falls back to legacy display-string snapshots', () => {
    const rev = revision({
      officialValues: { high: '29°C', low: '9°C' },
      modelValues: { high: '27°C' },
    });

    expect(revisionSources(rev)).toEqual(['user', 'NWS', 'GFS']);

    const samples = verify(rev);
    expect(
      samples.find((sample) => sample.source === 'NWS' && sample.variable === 'high')
        ?.forecastValue,
    ).toBe(29);
    expect(
      samples.find((sample) => sample.source === 'GFS' && sample.variable === 'high')
        ?.forecastValue,
    ).toBe(27);
  });

  it('normalizes user input units before computing error', () => {
    const samples = verify(
      revision({ values: values({ high: '86°F', low: '50°F', wind: '10 mph' }) }),
    );
    const high = samples.find((sample) => sample.variable === 'high');

    expect(high?.forecastValue).toBeCloseTo(30, 5);
    expect(high?.error).toBeCloseTo(2, 5);
  });

  it('parses user and legacy values into canonical units', () => {
    expect(parseUserValues(values({ high: '30', pop: '40%' }))).toMatchObject({
      highC: 30,
      popPercent: 40,
    });
    expect(parseLegacyValues(undefined)).toEqual({});
    expect(parseLegacyValues({ wind: 'SW 8 m/s' }).windSpeedMps).toBe(8);
  });

  it('resolves numeric values per source with guidance taking precedence', () => {
    const rev = revision({
      guidance: [
        {
          source: 'GFS',
          runTime: null,
          retrievedAt: '2026-06-14T12:00:00Z',
          values: { highC: 31 },
        },
      ],
      modelValues: { high: '27°C' },
    });

    expect(forecastValuesForRevision(rev, 'user')?.highC).toBe(30);
    expect(forecastValuesForRevision(rev, 'GFS')?.highC).toBe(31);
    expect(forecastValuesForRevision(rev, 'HRRR')).toBeUndefined();
  });
});
