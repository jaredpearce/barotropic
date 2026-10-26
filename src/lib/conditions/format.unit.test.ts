import { describe, expect, it } from 'vitest';
import {
  MISSING_VALUE,
  celsiusToFahrenheit,
  compassPoint,
  directionArrow,
  fahrenheitToCelsius,
  formatHumidity,
  formatPressure,
  formatPressureTrend,
  formatTemperature,
  formatTemperatureDegrees,
  formatWind,
  formatWindSpeed,
  metersPerSecondToKnots,
} from './format';

describe('celsiusToFahrenheit', () => {
  it('Use Case: converts the freezing point to 32 degrees Fahrenheit', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
  });

  it('Use Case: converts the boiling point to 212 degrees Fahrenheit', () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
  });
});

describe('fahrenheitToCelsius', () => {
  it('Use Case: converts 32 degrees Fahrenheit to zero Celsius', () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
  });
});

describe('metersPerSecondToKnots', () => {
  it('Use Case: converts one meter per second to roughly 1.94 knots', () => {
    expect(metersPerSecondToKnots(1)).toBeCloseTo(1.9438, 4);
  });
});

describe('formatTemperature', () => {
  it('Use Case: renders an imperial temperature with the Fahrenheit unit', () => {
    expect(formatTemperature(28.9)).toBe('84°F');
  });

  it('Use Case: renders a metric temperature with the Celsius unit', () => {
    expect(formatTemperature(28.9, 'metric')).toBe('29°C');
  });

  it('Use Case: renders a placeholder when the reading is unavailable', () => {
    expect(formatTemperature(null)).toBe(MISSING_VALUE);
    expect(formatTemperature(undefined)).toBe(MISSING_VALUE);
    expect(formatTemperature(Number.NaN)).toBe(MISSING_VALUE);
  });
});

describe('formatTemperatureDegrees', () => {
  it('Use Case: renders a temperature without the unit letter', () => {
    expect(formatTemperatureDegrees(28.9)).toBe('84°');
  });

  it('Use Case: renders a placeholder when the reading is unavailable', () => {
    expect(formatTemperatureDegrees(null)).toBe(MISSING_VALUE);
  });
});

describe('compassPoint', () => {
  it('Use Case: resolves cardinal and intercardinal directions', () => {
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(135)).toBe('SE');
    expect(compassPoint(22.5)).toBe('NNE');
  });

  it('Use Case: wraps the north direction when the reading is 360 degrees', () => {
    expect(compassPoint(360)).toBe('N');
  });

  it('Use Case: returns null when the direction is unavailable', () => {
    expect(compassPoint(null)).toBeNull();
  });
});

describe('directionArrow', () => {
  it('Use Case: resolves the arrow glyph for the eight compass points', () => {
    expect(directionArrow(0)).toBe('↑');
    expect(directionArrow(135)).toBe('↘');
    expect(directionArrow(270)).toBe('←');
  });

  it('Use Case: returns null when the direction is unavailable', () => {
    expect(directionArrow(undefined)).toBeNull();
  });
});

describe('formatWindSpeed', () => {
  it('Use Case: renders an imperial wind speed in knots', () => {
    expect(formatWindSpeed(4.63)).toBe('9 kt');
  });

  it('Use Case: renders a metric wind speed in meters per second', () => {
    expect(formatWindSpeed(4.63, 'metric')).toBe('5 m/s');
  });

  it('Use Case: renders a placeholder when the reading is unavailable', () => {
    expect(formatWindSpeed(null)).toBe(MISSING_VALUE);
  });
});

describe('formatWind', () => {
  it('Use Case: renders the arrow, compass point, and speed together', () => {
    expect(formatWind(4.63, 135)).toBe('↘ SE 9 kt');
  });

  it('Use Case: renders the speed alone when the direction is unavailable', () => {
    expect(formatWind(4.63, null)).toBe('9 kt');
  });

  it('Use Case: renders a placeholder when the speed is unavailable', () => {
    expect(formatWind(null, 135)).toBe(MISSING_VALUE);
  });
});

describe('formatPressure', () => {
  it('Use Case: renders an imperial pressure in millibars', () => {
    expect(formatPressure(1012.4)).toBe('1012.4 mb');
  });

  it('Use Case: renders a metric pressure in hectopascals', () => {
    expect(formatPressure(1012.4, 'metric')).toBe('1012.4 hPa');
  });

  it('Use Case: renders a placeholder when the reading is unavailable', () => {
    expect(formatPressure(null)).toBe(MISSING_VALUE);
  });
});

describe('formatPressureTrend', () => {
  it('Use Case: renders a falling pressure with a negative sign and a down arrow', () => {
    expect(formatPressureTrend(-0.8)).toBe('-0.8/3h ↓');
  });

  it('Use Case: renders a rising pressure with a positive sign and an up arrow', () => {
    expect(formatPressureTrend(0.4)).toBe('+0.4/3h ↑');
  });

  it('Use Case: renders a steady pressure with a level arrow', () => {
    expect(formatPressureTrend(0)).toBe('0.0/3h →');
  });

  it('Use Case: renders a placeholder when the trend is unavailable', () => {
    expect(formatPressureTrend(null)).toBe(MISSING_VALUE);
  });
});

describe('formatHumidity', () => {
  it('Use Case: renders relative humidity with the RH prefix', () => {
    expect(formatHumidity(64)).toBe('RH 64%');
  });

  it('Use Case: renders a placeholder when the reading is unavailable', () => {
    expect(formatHumidity(undefined)).toBe(MISSING_VALUE);
  });
});
