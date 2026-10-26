import { describe, expect, it } from 'vitest';
import type { NormalizedObservation } from '@/lib/schemas/normalized';
import { toCurrentConditions } from './observation-to-conditions';

const OBSERVATION: NormalizedObservation = {
  source: 'NWS',
  id: 'KRDU:2026-10-26T16:53:00Z',
  stationId: 'KRDU',
  timestamp: '2026-10-26T16:53:00Z',
  retrievedAt: '2026-10-26T17:00:00Z',
  issuedAt: '2026-10-26T16:53:00Z',
  description: 'Partly Cloudy',
  temperatureC: 28.9,
  dewpointC: 21.1,
  humidityPercent: 64,
  windSpeedMps: 4.63,
  windGustMps: 7.72,
  windDirectionDegrees: 135,
  pressureHpa: 1012.4,
};

describe('toCurrentConditions', () => {
  it('Use Case: maps the normalized observation onto the domain entity', () => {
    expect(toCurrentConditions(OBSERVATION)).toEqual({
      temperature: 28.9,
      humidity: 64,
      dewpoint: 21.1,
      windSpeed: 4.63,
      windGust: 7.72,
      windDirection: 135,
      pressure: 1012.4,
      condition: 'Partly Cloudy',
      stationId: 'KRDU',
      observedAt: new Date('2026-10-26T16:53:00Z'),
    });
  });

  it('Use Case: returns null when no observation is available', () => {
    expect(toCurrentConditions(null)).toBeNull();
    expect(toCurrentConditions(undefined)).toBeNull();
  });

  it('Use Case: omits readings the station did not report', () => {
    const conditions = toCurrentConditions({
      ...OBSERVATION,
      description: null,
      temperatureC: null,
      humidityPercent: null,
      dewpointC: null,
      windSpeedMps: null,
      windGustMps: null,
      windDirectionDegrees: null,
      pressureHpa: null,
      timestamp: null,
    });

    expect(conditions).toMatchObject({ stationId: 'KRDU' });
    expect(conditions?.temperature).toBeUndefined();
    expect(conditions?.condition).toBeUndefined();
    expect(conditions?.observedAt).toBeUndefined();
  });
});
