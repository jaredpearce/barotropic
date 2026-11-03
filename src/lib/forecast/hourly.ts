/**
 * Hourly forecast time helpers.
 *
 * Open-Meteo is queried with `timezone=auto`, so hourly timestamps are local
 * wall-clock values without an offset (for example `2026-11-03T09:00`). These
 * helpers treat that wall clock as a stable reference frame so selection does
 * not depend on the browser's timezone.
 */

import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';

export const HOURLY_FORECAST_LIMIT = 24;

const HOUR_MS = 60 * 60 * 1000;
const WALL_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parse an offset-less Open-Meteo timestamp as a UTC-like wall-clock value.
 *
 * @returns Milliseconds since the epoch, or `null` for an unrecognized format.
 */
export function parseWallClock(timestamp: string): number | null {
  const match = WALL_CLOCK_PATTERN.exec(timestamp);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const milliseconds = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? 0),
  );

  return Number.isFinite(milliseconds) ? milliseconds : null;
}

/**
 * Select the forecast window that starts at the current local hour.
 *
 * Records are expected in ascending time order, as returned by the provider.
 * The hour containing `now` is included, so a 09:37 local time still starts at
 * 09:00 rather than dropping into the future.
 */
export function selectUpcomingHours(
  records: readonly NormalizedWeatherRecord[],
  now: Date,
  utcOffsetSeconds = 0,
  limit = HOURLY_FORECAST_LIMIT,
): NormalizedWeatherRecord[] {
  if (limit <= 0) return [];

  const localNowMs = now.getTime() + utcOffsetSeconds * 1000;
  const currentHourMs = Math.floor(localNowMs / HOUR_MS) * HOUR_MS;

  return records
    .filter((record) => {
      const timestampMs = parseWallClock(record.timestamp);
      return timestampMs !== null && timestampMs >= currentHourMs;
    })
    .slice(0, limit);
}

/**
 * Format a wall-clock timestamp as a compact hour label, e.g. `9:00 AM`.
 *
 * Unrecognized timestamps are returned unchanged so the row still has a label.
 */
export function formatHourLabel(timestamp: string): string {
  const timestampMs = parseWallClock(timestamp);
  if (timestampMs === null) return timestamp;

  const hour = new Date(timestampMs).getUTCHours();
  const period = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12}:00 ${period}`;
}
