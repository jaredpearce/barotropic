import { describe, expect, it } from 'vitest';
import { normalizeNwsObservation } from './normalize-observation';

const rawObservation = {
  properties: {
    timestamp: '2026-10-21T18:55:00+00:00',
    textDescription: 'Clear',
    temperature: { value: 21, unitCode: 'wmoUnit:degC' },
    dewpoint: { value: 3, unitCode: 'wmoUnit:degC' },
    relativeHumidity: { value: 30.5, unitCode: 'wmoUnit:percent' },
    windSpeed: { value: 16.668, unitCode: 'wmoUnit:km_h-1' },
    windDirection: { value: 360, unitCode: 'wmoUnit:degree_(angle)' },
    barometricPressure: { value: 101998.03, unitCode: 'wmoUnit:Pa' },
  },
};

describe('normalizeNwsObservation', () => {
  it('Use Case: converts a raw observation into canonical units', () => {
    const observation = normalizeNwsObservation(
      'KRDU',
      rawObservation,
      '2026-10-21T19:00:00.000Z'
    );

    expect(observation.source).toBe('NWS');
    expect(observation.stationId).toBe('KRDU');
    expect(observation.temperatureC).toBe(21);
    expect(observation.dewpointC).toBe(3);
    expect(observation.humidityPercent).toBe(30.5);
    expect(observation.windSpeedMps).toBeCloseTo(4.63, 2);
    expect(observation.windDirectionDegrees).toBe(360);
    expect(observation.pressureHpa).toBeCloseTo(1019.98, 2);
    expect(observation.description).toBe('Clear');
  });

  it('Use Case: accepts observation timestamps that carry a UTC offset', () => {
    const observation = normalizeNwsObservation(
      'KRDU',
      rawObservation,
      '2026-10-21T19:00:00.000Z'
    );

    expect(observation.timestamp).toBe('2026-10-21T18:55:00+00:00');
    expect(observation.issuedAt).toBe('2026-10-21T18:55:00+00:00');
    expect(observation.id).toBe('KRDU:2026-10-21T18:55:00+00:00');
  });

  it('Use Case: records missing readings as null', () => {
    const observation = normalizeNwsObservation('KRDU', { properties: {} });

    expect(observation.temperatureC).toBeNull();
    expect(observation.dewpointC).toBeNull();
    expect(observation.windSpeedMps).toBeNull();
    expect(observation.windGustMps).toBeNull();
    expect(observation.pressureHpa).toBeNull();
    expect(observation.timestamp).toBeNull();
  });
});
