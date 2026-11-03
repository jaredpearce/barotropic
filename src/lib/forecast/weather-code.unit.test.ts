import { describe, expect, it } from 'vitest';
import { conditionFromWeatherCode } from './weather-code';

describe('conditionFromWeatherCode', () => {
  it('Use Case: maps clear, cloudy, fog, and precipitation codes', () => {
    expect(conditionFromWeatherCode(0)).toBe('clear');
    expect(conditionFromWeatherCode(1)).toBe('partly-cloudy');
    expect(conditionFromWeatherCode(2)).toBe('partly-cloudy');
    expect(conditionFromWeatherCode(3)).toBe('cloudy');
    expect(conditionFromWeatherCode(45)).toBe('fog');
    expect(conditionFromWeatherCode(48)).toBe('fog');
    expect(conditionFromWeatherCode(51)).toBe('rain');
    expect(conditionFromWeatherCode(61)).toBe('rain');
    expect(conditionFromWeatherCode(80)).toBe('rain');
  });

  it('Use Case: maps snow and thunderstorm codes', () => {
    expect(conditionFromWeatherCode(71)).toBe('snow');
    expect(conditionFromWeatherCode(85)).toBe('snow');
    expect(conditionFromWeatherCode(95)).toBe('storm');
    expect(conditionFromWeatherCode(99)).toBe('storm');
  });

  it('Use Case: falls back to cloudy for missing or unmapped codes', () => {
    expect(conditionFromWeatherCode(null)).toBe('cloudy');
    expect(conditionFromWeatherCode(undefined)).toBe('cloudy');
    expect(conditionFromWeatherCode(42)).toBe('cloudy');
  });
});
