import { describe, expect, it } from 'vitest';
import { WeatherDataSchema, ForecastAnalysisSchema, validateWeatherData, validateForecastAnalysis } from './schemas';

describe('weather validation schemas', () => {
  it('accepts a valid weather observation', () => {
    const payload = {
      timestamp: '2026-10-07T12:00:00Z',
      temperature: 21,
      humidity: 64,
      pressure: 1013,
      windSpeed: 5.2,
      windDirection: 120,
      windGust: 8.7,
      precipitation: 0,
      condition: 'partly-cloudy',
      visibility: 10,
    };

    expect(() => WeatherDataSchema.parse(payload)).not.toThrow();
    expect(validateWeatherData(payload)).toMatchObject(payload);
  });

  it('accepts a valid forecast analysis payload', () => {
    const payload = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: '2026-10-07T08:00:00Z',
      updatedAt: '2026-10-07T09:00:00Z',
      location: 'Raleigh, NC',
      validStart: '2026-10-07T12:00:00Z',
      validEnd: '2026-10-08T12:00:00Z',
      hypothesis: 'A dry, stable afternoon will transition to a moderate evening shower risk.',
      evidence: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          createdAt: '2026-10-07T07:45:00Z',
          description: 'Surface observations show a warm and dry boundary layer.',
          type: 'surface',
          confidence: 'medium',
          source: 'NWS ASOS',
        },
      ],
      patterns: [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Upper-level ridge',
          description: 'An amplifying ridge is suppressing convective development through the afternoon.',
          scale: 'regional',
          systems: ['high pressure'],
          expectedDuration: 18,
          confidence: 72,
        },
      ],
      scenarios: [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Most likely',
          description: 'Dry conditions hold through the day with a small chance of late-day showers.',
          probability: 68,
          reasoning: 'The persistent ridge limits moisture lift.',
          weatherOutcome: [
            {
              timestamp: '2026-10-07T18:00:00Z',
              temperature: 24,
              humidity: 52,
              pressure: 1018,
              windSpeed: 4,
              windDirection: 160,
              windGust: 7,
              precipitation: 0.1,
              condition: 'partly-cloudy',
              visibility: 12,
            },
          ],
        },
      ],
      overallConfidence: 72,
      narrative: 'A mostly dry day is expected with modest instability late in the period.',
      accuracy: 76,
    };

    expect(() => ForecastAnalysisSchema.parse(payload)).not.toThrow();
    expect(validateForecastAnalysis(payload)).toMatchObject(payload);
  });

  it('rejects invalid payloads with missing required fields', () => {
    const invalidPayload = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: '2026-10-07T08:00:00Z',
      updatedAt: '2026-10-07T09:00:00Z',
      location: 'Raleigh, NC',
      validStart: '2026-10-07T12:00:00Z',
      validEnd: '2026-10-08T12:00:00Z',
      evidence: [],
      patterns: [],
      scenarios: [],
      overallConfidence: 80,
      narrative: 'Missing hypothesis',
    };

    expect(() => ForecastAnalysisSchema.parse(invalidPayload)).toThrow();
  });
});
