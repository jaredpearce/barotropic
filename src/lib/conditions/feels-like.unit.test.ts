import { describe, expect, it } from 'vitest';
import { computeFeelsLike } from './feels-like';

describe('computeFeelsLike', () => {
  it('Use Case: returns the heat index for hot and humid conditions', () => {
    const result = computeFeelsLike(28.9, 64, 4.63);

    expect(result.basis).toBe('heat-index');
    expect(result.celsius).toBeCloseTo(31.5, 1);
  });

  it('Use Case: returns the wind chill for cold and windy conditions', () => {
    const result = computeFeelsLike(0, 50, 10);

    expect(result.basis).toBe('wind-chill');
    expect(result.celsius).toBeCloseTo(-7, 0);
  });

  it('Use Case: returns the apparent temperature for mild conditions', () => {
    const result = computeFeelsLike(15, 60, 2);

    expect(result.basis).toBe('apparent-temperature');
    expect(result.celsius).toBeCloseTo(12.97, 1);
  });

  it('Use Case: returns the air temperature when humidity is unavailable', () => {
    const result = computeFeelsLike(20, null, null);

    expect(result.basis).toBe('temperature');
    expect(result.celsius).toBe(20);
  });

  it('Use Case: keeps the air temperature when conditions are neither hot nor cold', () => {
    const result = computeFeelsLike(12, 45, 1);

    expect(result.basis).toBe('apparent-temperature');
    expect(result.celsius).toBeLessThan(12);
  });
});
