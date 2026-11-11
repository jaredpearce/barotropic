import { describe, expect, it } from 'vitest';
import { emptySummary, summarizeSamples } from './summary';
import type { VerificationSample } from './verify';

function sample(overrides: Partial<VerificationSample> = {}): VerificationSample {
  return {
    forecastId: 'f1',
    revisionId: 'r1',
    revisionNumber: 1,
    validDate: '2026-06-15',
    timeZone: 'America/Denver',
    source: 'user',
    variable: 'high',
    forecastValue: 30,
    observedValue: 28,
    error: 2,
    absError: 2,
    leadHours: 18,
    ...overrides,
  };
}

describe('summarizeSamples', () => {
  it('groups by source and variable', () => {
    const summaries = summarizeSamples([
      sample({ absError: 2, error: 2 }),
      sample({ absError: 4, error: -4 }),
      sample({ source: 'GFS', variable: 'high', absError: 3, error: 3 }),
      sample({ variable: 'wind', absError: 1, error: 1 }),
    ]);

    const userHigh = summaries.find((s) => s.source === 'user' && s.variable === 'high');
    expect(userHigh?.sampleCount).toBe(2);

    const gfsHigh = summaries.find((s) => s.source === 'GFS' && s.variable === 'high');
    expect(gfsHigh?.sampleCount).toBe(1);

    const userWind = summaries.find((s) => s.source === 'user' && s.variable === 'wind');
    expect(userWind?.sampleCount).toBe(1);

    expect(summaries).toHaveLength(3);
  });

  it('computes MAE and bias for high/low/wind', () => {
    const summaries = summarizeSamples([
      sample({ absError: 2, error: 2 }),
      sample({ absError: 4, error: -4 }),
      sample({ absError: 3, error: 3 }),
    ]);

    const userHigh = summaries[0];
    expect(userHigh.mae).toBeCloseTo(3, 10);
    expect(userHigh.bias).toBeCloseTo(1 / 3, 10);
    expect(userHigh.brier).toBeUndefined();
  });

  it('computes the Brier score and percentage-point MAE for PoP', () => {
    const summaries = summarizeSamples([
      sample({
        variable: 'pop',
        forecastValue: 40,
        observedValue: 100,
        error: -60,
        absError: 60,
        brierComponent: 0.36,
      }),
      sample({
        variable: 'pop',
        forecastValue: 20,
        observedValue: 0,
        error: 20,
        absError: 20,
        brierComponent: 0.04,
      }),
    ]);

    const pop = summaries[0];
    expect(pop.sampleCount).toBe(2);
    expect(pop.mae).toBeCloseTo(40, 10);
    expect(pop.brier).toBeCloseTo(0.2, 10);
  });

  it('returns no groups for no samples', () => {
    expect(summarizeSamples([])).toEqual([]);
  });

  it('describes an empty group without NaN', () => {
    const summary = emptySummary('ECMWF', 'wind');

    expect(summary).toEqual({
      source: 'ECMWF',
      variable: 'wind',
      sampleCount: 0,
      mae: undefined,
      bias: undefined,
      brier: undefined,
    });
    expect(summary.mae).toBeUndefined();
    expect(Number.isNaN(summary.mae as number)).toBe(false);
  });
});
