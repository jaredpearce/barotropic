import { describe, expect, it } from 'vitest';
import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';
import { sourceValuesFromModel, sourceValuesFromNws } from './guidance';

function record(overrides: Partial<NormalizedWeatherRecord>): NormalizedWeatherRecord {
  return {
    source: 'NWS',
    timestamp: '2026-11-03T12:00:00Z',
    retrievedAt: '2026-11-03T12:00:00Z',
    issuedAt: '2026-11-03T11:00:00Z',
    ...overrides,
  };
}

describe('forecast guidance mapping', () => {
  it('maps the nearest NWS day and night periods', () => {
    const periods = [
      record({
        timestamp: '2026-11-03T00:00:00Z',
        isDaytime: false,
        temperatureC: 14,
        precipitationProbabilityPercent: 20,
        windSpeedMps: 3,
        windDirectionDegrees: 180,
        condition: 'Mostly Clear',
      }),
      record({
        timestamp: '2026-11-03T12:00:00Z',
        isDaytime: true,
        temperatureC: 25,
        precipitationProbabilityPercent: 40,
        windSpeedMps: 5,
        windDirectionDegrees: 225,
        condition: 'Partly Cloudy',
      }),
    ];

    expect(sourceValuesFromNws(periods, '2026-11-03T13:00:00Z')).toEqual({
      high: '25°C',
      low: '14°C',
      pop: '40%',
      wind: 'SW 5 m/s',
      sky: 'Partly Cloudy',
    });
  });

  it('maps model daily and hourly records', () => {
    const daily = [
      record({
        source: 'Open-Meteo',
        timestamp: '2026-11-03',
        runTime: null,
        maximumTemperatureC: 26,
        minimumTemperatureC: 15,
        weatherCode: 3,
      }),
      record({
        source: 'Open-Meteo',
        timestamp: '2026-11-04',
        runTime: null,
        maximumTemperatureC: 20,
        minimumTemperatureC: 10,
        weatherCode: 0,
      }),
    ];
    const hourly = [
      record({
        source: 'Open-Meteo',
        timestamp: '2026-11-03T12:00',
        runTime: null,
        precipitationProbabilityPercent: 30,
        windSpeedMps: 6,
        windDirectionDegrees: 90,
        weatherCode: 61,
      }),
    ];

    expect(sourceValuesFromModel(daily, hourly, '2026-11-03T12:00')).toMatchObject({
      high: '26°C',
      low: '15°C',
      pop: '30%',
      wind: 'E 6 m/s',
      sky: 'Cloudy',
    });
  });

  it('falls back to the hourly weather code when daily sky is missing', () => {
    const daily = [
      record({
        source: 'Open-Meteo',
        timestamp: '2026-11-03',
        runTime: null,
        maximumTemperatureC: 26,
        minimumTemperatureC: 15,
      }),
    ];
    const hourly = [
      record({
        source: 'Open-Meteo',
        timestamp: '2026-11-03T12:00',
        runTime: null,
        weatherCode: 61,
      }),
    ];

    expect(sourceValuesFromModel(daily, hourly, '2026-11-03T12:00').sky).toBe('Rain');
  });

  it('omits unavailable values rather than inventing guidance', () => {
    expect(sourceValuesFromNws([], '2026-11-03T12:00')).toEqual({});
    expect(sourceValuesFromModel([], [], '2026-11-03T12:00')).toEqual({});
  });
});
