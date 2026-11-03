import { describe, expect, it } from 'vitest';
import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';
import { formatHourLabel, parseWallClock, selectUpcomingHours } from './hourly';

function record(timestamp: string): NormalizedWeatherRecord {
  return {
    source: 'Open-Meteo',
    timestamp,
    retrievedAt: '2026-11-03T09:37:00Z',
    runTime: null,
  };
}

describe('parseWallClock', () => {
  it('Use Case: parses an offset-less hourly timestamp as a wall-clock value', () => {
    expect(parseWallClock('2026-11-03T09:00')).toBe(Date.UTC(2026, 10, 3, 9, 0));
    expect(parseWallClock('2026-11-03T09:00:30')).toBe(Date.UTC(2026, 10, 3, 9, 0, 30));
  });

  it('Use Case: rejects timestamps it cannot interpret', () => {
    expect(parseWallClock('2026-11-03T09:00Z')).toBeNull();
    expect(parseWallClock('2026-11-03')).toBeNull();
    expect(parseWallClock('not-a-timestamp')).toBeNull();
  });
});

describe('selectUpcomingHours', () => {
  const now = new Date('2026-11-03T09:37:00Z');

  it('Use Case: starts with the hour that contains the current time', () => {
    const records = [
      record('2026-11-03T08:00'),
      record('2026-11-03T09:00'),
      record('2026-11-03T10:00'),
    ];

    expect(selectUpcomingHours(records, now).map((hour) => hour.timestamp)).toEqual([
      '2026-11-03T09:00',
      '2026-11-03T10:00',
    ]);
  });

  it('Use Case: applies the location offset before choosing the current hour', () => {
    const localNow = new Date('2026-11-03T02:37:00Z');
    const records = [
      record('2026-11-02T20:00'),
      record('2026-11-02T21:00'),
      record('2026-11-02T22:00'),
    ];

    expect(
      selectUpcomingHours(records, localNow, -5 * 60 * 60).map((hour) => hour.timestamp),
    ).toEqual(['2026-11-02T21:00', '2026-11-02T22:00']);
  });

  it('Use Case: caps the window at the requested number of hours', () => {
    const records = [
      record('2026-11-03T09:00'),
      record('2026-11-03T10:00'),
      record('2026-11-03T11:00'),
    ];

    expect(selectUpcomingHours(records, now, 0, 2).map((hour) => hour.timestamp)).toEqual([
      '2026-11-03T09:00',
      '2026-11-03T10:00',
    ]);
  });

  it('Use Case: returns no hours when the forecast is entirely stale', () => {
    const records = [record('2026-11-03T07:00'), record('2026-11-03T08:00')];

    expect(selectUpcomingHours(records, now)).toEqual([]);
  });

  it('Use Case: ignores records with unparseable timestamps', () => {
    const records = [record('2026-11-03T08:00'), record('unknown'), record('2026-11-03T10:00')];

    expect(selectUpcomingHours(records, now).map((hour) => hour.timestamp)).toEqual([
      '2026-11-03T10:00',
    ]);
  });

  it('Use Case: returns an empty window when the limit is not positive', () => {
    expect(selectUpcomingHours([record('2026-11-03T10:00')], now, 0, 0)).toEqual([]);
  });
});

describe('formatHourLabel', () => {
  it('Use Case: formats hours on a 12-hour clock', () => {
    expect(formatHourLabel('2026-11-03T00:00')).toBe('12:00 AM');
    expect(formatHourLabel('2026-11-03T09:00')).toBe('9:00 AM');
    expect(formatHourLabel('2026-11-03T12:00')).toBe('12:00 PM');
    expect(formatHourLabel('2026-11-03T21:00')).toBe('9:00 PM');
  });

  it('Use Case: preserves an unrecognized timestamp as the label', () => {
    expect(formatHourLabel('unknown')).toBe('unknown');
  });
});
