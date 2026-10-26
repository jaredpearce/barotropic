import { describe, expect, it } from 'vitest';
import {
  normalizeNwsPressure,
  normalizeNwsQuantityValue,
  normalizeNwsTemperature,
  normalizeNwsWindDirection,
  normalizeNwsWindSpeed,
  normalizeNwsWindSpeedText,
} from './weather-normalizers';

describe('NWS measurement normalization', () => {
  it('Use Case: converts Fahrenheit and Celsius observations to Celsius', () => {
    expect(normalizeNwsTemperature({ value: 32, unitCode: 'wmoUnit:degF' })).toBe(0);
    expect(normalizeNwsTemperature({ value: 20, unitCode: 'wmoUnit:degC' })).toBe(20);
    expect(normalizeNwsTemperature()).toBeNull();
  });

  it('Use Case: converts measured wind speed units to meters per second', () => {
    expect(normalizeNwsWindSpeed({ value: 36, unitCode: 'wmoUnit:km_h-1' })).toBe(10);
    expect(normalizeNwsWindSpeed({ value: 10, unitCode: 'wmoUnit:mi_h-1' })).toBeCloseTo(4.4704);
    expect(normalizeNwsWindSpeed({ value: 4, unitCode: 'wmoUnit:m_s-1' })).toBe(4);
  });

  it('Use Case: converts NWS text wind ranges and compass points', () => {
    expect(normalizeNwsWindSpeedText('5 to 10 mph')).toBeCloseTo(3.3528);
    expect(normalizeNwsWindSpeedText('Variable')).toBeNull();
    expect(normalizeNwsWindDirection('NNE')).toBe(22.5);
    expect(normalizeNwsWindDirection('Variable')).toBeNull();
  });

  it('Use Case: preserves nullable percentage measurements', () => {
    expect(normalizeNwsQuantityValue({ value: 72, unitCode: 'wmoUnit:percent' })).toBe(72);
    expect(normalizeNwsQuantityValue({ value: null })).toBeNull();
  });

  it('Use Case: converts barometric pressure from pascals to hectopascals', () => {
    expect(normalizeNwsPressure({ value: 101998.03, unitCode: 'wmoUnit:Pa' })).toBeCloseTo(1019.9803, 4);
    expect(normalizeNwsPressure({ value: 1012.4, unitCode: 'wmoUnit:hPa' })).toBe(1012.4);
    expect(normalizeNwsPressure({ value: null, unitCode: 'wmoUnit:Pa' })).toBeNull();
    expect(normalizeNwsPressure()).toBeNull();
  });
});