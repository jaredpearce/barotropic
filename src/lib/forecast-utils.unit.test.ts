import { describe, expect, it } from 'vitest';
import { calculateForecastConfidence, formatForecast, validateForecast } from './forecast-utils';
import type { AtmosphericPattern, Evidence, ForecastAnalysis } from '../types/domain';

const validForecast: ForecastAnalysis = {
  id: 'forecast-1',
  createdAt: new Date('2026-10-07T12:00:00.000Z'),
  updatedAt: new Date('2026-10-07T12:00:00.000Z'),
  location: 'Seattle',
  validStart: new Date('2026-10-08T12:00:00.000Z'),
  validEnd: new Date('2026-10-09T12:00:00.000Z'),
  hypothesis: 'Rain is likely',
  evidence: [
    {
      id: 'evidence-1',
      createdAt: new Date('2026-10-07T12:00:00.000Z'),
      description: 'Surface observations',
      type: 'observation',
      confidence: 'high',
    },
  ],
  patterns: [],
  scenarios: [],
  overallConfidence: 50,
  narrative: 'Rain is likely in Seattle.',
};

function createEvidence(confidence: Evidence['confidence']): Evidence {
  return {
    id: `evidence-${confidence}`,
    createdAt: new Date('2026-10-07T12:00:00.000Z'),
    description: 'Forecast evidence',
    type: 'observation',
    confidence,
  };
}

function createPattern(confidence: number): AtmosphericPattern {
  return {
    id: `pattern-${confidence}`,
    name: 'Frontal system',
    description: 'A regional frontal system',
    scale: 'regional',
    systems: ['cold front'],
    expectedDuration: 24,
    confidence,
  };
}

describe('calculateForecastConfidence', () => {
  it('Use Case: returns zero when evidence and patterns are empty', () => {
    expect(calculateForecastConfidence([], [])).toBe(0);
  });

  it.each([
    ['high', 50],
    ['medium', 34],
    ['low', 17],
  ] as const)('Use Case: scores %s evidence with an empty pattern category', (confidence, expected) => {
    expect(calculateForecastConfidence([createEvidence(confidence)], [])).toBe(expected);
  });

  it('Use Case: averages pattern confidence and treats empty evidence as zero', () => {
    expect(calculateForecastConfidence([], [createPattern(60), createPattern(80)])).toBe(35);
  });

  it('Use Case: combines average evidence and pattern confidence', () => {
    expect(
      calculateForecastConfidence(
        [createEvidence('high'), createEvidence('low')],
        [createPattern(60), createPattern(80)]
      )
    ).toBe(68);
  });
});

describe('formatForecast', () => {
  it('Use Case: formats the location with the forecast start date', () => {
    expect(formatForecast(validForecast)).toBe(
      `Seattle - ${validForecast.validStart.toLocaleDateString()}`
    );
  });
});

describe('validateForecast', () => {
  it('Use Case: accepts a forecast with required data and an in-range confidence', () => {
    expect(validateForecast(validForecast)).toEqual({ valid: true, errors: [] });
  });

  it('Use Case: rejects whitespace-only required fields and missing evidence', () => {
    expect(
      validateForecast({
        ...validForecast,
        location: '  ',
        hypothesis: '\t ',
        evidence: [],
      })
    ).toEqual({
      valid: false,
      errors: [
        'Location is required',
        'Hypothesis is required',
        'At least one evidence item is required',
      ],
    });
  });

  it.each([0, 100])('Use Case: accepts confidence at the boundary value %s', (confidence) => {
    expect(validateForecast({ ...validForecast, overallConfidence: confidence })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it.each([-1, 101])('Use Case: rejects confidence outside the range at %s', (confidence) => {
    expect(validateForecast({ ...validForecast, overallConfidence: confidence })).toEqual({
      valid: false,
      errors: ['Confidence must be between 0 and 100'],
    });
  });
});