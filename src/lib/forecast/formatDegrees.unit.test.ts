import { describe, expect, it } from 'vitest';
import { formatDegrees } from './formatDegrees';

describe('formatDegrees', () => {
  it('Use Case: converts a numeric temperature into a readable format', () => {
    expect(formatDegrees(72)).toBe('72°F');
  });

  it('Use Case: handles negative values correctly', () => {
    expect(formatDegrees(-5)).toBe('-5°F');
  });

  it('Use Case: handles zero safely', () => {
    expect(formatDegrees(0)).toBe('0°F');
  });
});
