import { describe, expect, it } from 'vitest';
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatTemperature,
  formatTemperatureDelta,
  formatWindSpeed,
  inchesToMm,
  kmhToMps,
  knotsToMps,
  mmToInches,
  mphToMps,
  mpsToMph,
  parsePercentText,
  parseTemperatureText,
  parseWindSpeedText,
} from './units';

describe('unit conversions', () => {
  it('round-trips Celsius and Fahrenheit', () => {
    for (const celsius of [-40, 0, 20, 37]) {
      expect(fahrenheitToCelsius(celsiusToFahrenheit(celsius))).toBeCloseTo(celsius, 10);
    }
  });

  it('converts temperature deltas without the +32 offset', () => {
    // A 10°C difference is an 18°F difference, not 50°F.
    expect(formatTemperatureDelta(10, 'imperial')).toBe('18°F');
    expect(formatTemperatureDelta(10, 'metric')).toBe('10°C');
    expect(formatTemperatureDelta(-5, 'imperial')).toBe('-9°F');
  });

  it('round-trips wind speeds', () => {
    expect(mphToMps(mpsToMph(7))).toBeCloseTo(7, 10);
    expect(knotsToMps(10)).toBeCloseTo(5.14444, 4);
    expect(kmhToMps(36)).toBeCloseTo(10, 10);
  });

  it('round-trips precipitation', () => {
    expect(mmToInches(inchesToMm(1))).toBeCloseTo(1, 10);
    expect(mmToInches(25.4)).toBeCloseTo(1, 10);
  });

  it('formats temperatures, wind, and deltas', () => {
    expect(formatTemperature(0, 'metric')).toBe('0°C');
    expect(formatTemperature(0, 'imperial')).toBe('32°F');
    expect(formatWindSpeed(10, 'metric')).toBe('10 m/s');
    expect(formatWindSpeed(10, 'imperial')).toBe('22.4 mph');
  });
});

describe('parseTemperatureText', () => {
  it('defaults unitless values to Celsius', () => {
    expect(parseTemperatureText('25')).toBe(25);
    expect(parseTemperatureText('25°C')).toBe(25);
    expect(parseTemperatureText('77°F')).toBeCloseTo(25, 10);
  });

  it('returns undefined for invalid input', () => {
    expect(parseTemperatureText('')).toBeUndefined();
    expect(parseTemperatureText(null)).toBeUndefined();
    expect(parseTemperatureText('warm')).toBeUndefined();
  });
});

describe('parsePercentText', () => {
  it('accepts a bare number or a percent sign', () => {
    expect(parsePercentText('40')).toBe(40);
    expect(parsePercentText('40%')).toBe(40);
  });

  it('rejects values outside 0-100 and non-numbers', () => {
    expect(parsePercentText('140')).toBeUndefined();
    expect(parsePercentText('-5')).toBeUndefined();
    expect(parsePercentText('lots')).toBeUndefined();
  });
});

describe('parseWindSpeedText', () => {
  it('parses direction, explicit units, and unitless values', () => {
    expect(parseWindSpeedText('SW 8 m/s')).toBe(8);
    expect(parseWindSpeedText('15 mph')).toBeCloseTo(6.7056, 4);
    expect(parseWindSpeedText('20 km/h')).toBeCloseTo(5.5556, 4);
    expect(parseWindSpeedText('10 kt')).toBeCloseTo(5.14444, 4);
    expect(parseWindSpeedText('8')).toBe(8);
  });

  it('returns undefined for invalid input', () => {
    expect(parseWindSpeedText('')).toBeUndefined();
    expect(parseWindSpeedText('calm')).toBeUndefined();
  });
});
