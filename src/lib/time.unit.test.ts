import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  isValidTimeZone,
  localDateOf,
  localDayBounds,
  localHourKey,
  zonedDateTimeToUtc,
} from './time';

describe('time helpers', () => {
  it('validates IANA time zones', () => {
    expect(isValidTimeZone('America/Denver')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });

  it('computes local day bounds in a normal day', () => {
    const bounds = localDayBounds('2026-06-15', 'America/Denver');
    // June: Mountain Daylight Time (UTC-6).
    expect(new Date(bounds.startMs).toISOString()).toBe('2026-06-15T06:00:00.000Z');
    expect(new Date(bounds.endMs).toISOString()).toBe('2026-06-16T06:00:00.000Z');
    expect(bounds.hours).toBe(24);
  });

  it('handles a 23-hour spring-forward day', () => {
    const bounds = localDayBounds('2026-03-08', 'America/Denver');
    expect(bounds.hours).toBe(23);
    expect(new Date(bounds.startMs).toISOString()).toBe('2026-03-08T07:00:00.000Z');
    expect(new Date(bounds.endMs).toISOString()).toBe('2026-03-09T06:00:00.000Z');
  });

  it('handles a 25-hour fall-back day', () => {
    const bounds = localDayBounds('2026-11-01', 'America/Denver');
    expect(bounds.hours).toBe(25);
    expect(new Date(bounds.startMs).toISOString()).toBe('2026-11-01T06:00:00.000Z');
    expect(new Date(bounds.endMs).toISOString()).toBe('2026-11-02T07:00:00.000Z');
  });

  it('computes bounds in UTC', () => {
    const bounds = localDayBounds('2026-06-15', 'UTC');
    expect(new Date(bounds.startMs).toISOString()).toBe('2026-06-15T00:00:00.000Z');
    expect(bounds.hours).toBe(24);
  });

  it('converts a zoned wall clock to UTC across DST', () => {
    expect(new Date(zonedDateTimeToUtc('2026-06-15T12:00', 'America/Denver')).toISOString()).toBe(
      '2026-06-15T18:00:00.000Z',
    );
    expect(new Date(zonedDateTimeToUtc('2026-03-08T12:00', 'America/Denver')).toISOString()).toBe(
      '2026-03-08T18:00:00.000Z',
    );
    expect(new Date(zonedDateTimeToUtc('2026-11-01T12:00', 'America/Denver')).toISOString()).toBe(
      '2026-11-01T19:00:00.000Z',
    );
  });

  it('returns NaN for an unparseable local datetime', () => {
    expect(Number.isNaN(zonedDateTimeToUtc('not-a-date', 'UTC'))).toBe(true);
  });

  it('derives the local date from an instant', () => {
    expect(localDateOf('2026-03-08T06:30:00Z', 'America/Denver')).toBe('2026-03-07');
    expect(localDateOf('2026-06-15T06:30:00Z', 'America/Denver')).toBe('2026-06-15');
    expect(localDateOf('2026-06-15T00:30:00Z', 'America/New_York')).toBe('2026-06-14');
  });

  it('builds distinct local hour keys', () => {
    expect(localHourKey('2026-06-15T18:00:00Z', 'America/Denver')).toBe('2026-06-15T12');
    expect(localHourKey('2026-06-15T18:59:00Z', 'America/Denver')).toBe('2026-06-15T12');
  });

  it('formats a timestamp in the target zone', () => {
    const formatted = formatDateTime('2026-06-15T18:00:00Z', 'America/Denver', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(formatted).toContain('12');
  });
});
