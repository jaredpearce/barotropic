import { describe, expect, it } from 'vitest';
import { emptyForecastValues, type ForecastDraft } from './db';
import { forecastFieldByKey, forecastFields, validateForecastDraft } from './fields';

function draft(overrides: Partial<ForecastDraft> = {}): ForecastDraft {
  return {
    locationName: 'Boston',
    validStart: '2026-11-03T12:00',
    values: emptyForecastValues(),
    reasoning: '',
    ...overrides,
  };
}

describe('forecast field configuration', () => {
  it('defines every structured field once', () => {
    expect(forecastFields.map((field) => field.key)).toEqual([
      'high',
      'low',
      'pop',
      'wind',
      'sky',
      'hazards',
    ]);
    expect(forecastFieldByKey.pop.label).toBe('Probability of precipitation');
    expect(forecastFieldByKey.sky.kind).toBe('select');
  });

  it('requires a location and validates numeric fields', () => {
    expect(validateForecastDraft(draft({ locationName: '  ' }))).toBe(
      'Enter a location before saving.',
    );
    expect(validateForecastDraft(draft({ values: { ...emptyForecastValues(), pop: '101' } }))).toBe(
      'Probability of precipitation must be at most 100%.',
    );
    expect(
      validateForecastDraft(draft({ values: { ...emptyForecastValues(), high: 'warm' } })),
    ).toBe('High must be a number.');
  });

  it('accepts empty optional values and valid numbers', () => {
    expect(validateForecastDraft(draft())).toBeNull();
    expect(
      validateForecastDraft(draft({ values: { ...emptyForecastValues(), high: '25', pop: '0' } })),
    ).toBeNull();
  });
});
