import { describe, expect, it } from 'vitest';
import {
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  OPENFREEMAP_DARK_STYLE_URL,
  resolveMapStyleUrl,
  toMapCenter,
} from './config';

describe('resolveMapStyleUrl', () => {
  it('Use Case: falls back to the OpenFreeMap dark style when no override is set', () => {
    expect(resolveMapStyleUrl()).toBe(OPENFREEMAP_DARK_STYLE_URL);
    expect(resolveMapStyleUrl('')).toBe(OPENFREEMAP_DARK_STYLE_URL);
    expect(resolveMapStyleUrl('   ')).toBe(OPENFREEMAP_DARK_STYLE_URL);
    expect(resolveMapStyleUrl(null)).toBe(OPENFREEMAP_DARK_STYLE_URL);
  });

  it('Use Case: honors and trims an explicit style override', () => {
    expect(resolveMapStyleUrl('  https://example.com/style.json  ')).toBe(
      'https://example.com/style.json',
    );
  });
});

describe('toMapCenter', () => {
  it('Use Case: converts domain coordinates to longitude-first map center', () => {
    expect(toMapCenter({ latitude: 35.7915, longitude: -78.7811 })).toEqual([-78.7811, 35.7915]);
  });
});

describe('map zoom bounds', () => {
  it('Use Case: keeps the default zoom inside the configured bounds', () => {
    expect(MAP_MIN_ZOOM).toBeLessThan(MAP_DEFAULT_ZOOM);
    expect(MAP_MAX_ZOOM).toBeGreaterThan(MAP_DEFAULT_ZOOM);
  });
});
