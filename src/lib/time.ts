/**
 * Time-zone helpers for local-calendar-day math.
 *
 * Implemented on top of `Intl.DateTimeFormat` so the app avoids a date library.
 * A "local calendar day" is the half-open interval `[00:00, 24:00)` in the
 * supplied IANA time zone; DST days are therefore 23 or 25 hours long.
 */

type Instant = string | number | Date;

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', ...options });
}

function toDate(instant: Instant): Date {
  return instant instanceof Date ? instant : new Date(instant);
}

function numericParts(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, number> {
  const parts = formatter(timeZone, options).formatToParts(date);
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return values;
}

/** Whether `timeZone` is a time zone the runtime understands. */
export function isValidTimeZone(timeZone: string | null | undefined): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Offset of `timeZone` from UTC, in milliseconds, at the given UTC instant.
 * Positive east of Greenwich, negative west (e.g. America/Denver is negative).
 */
function timeZoneOffsetMs(timeZone: string, utcMs: number): number {
  const values = numericParts(new Date(utcMs), timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return asUtc - utcMs;
}

/**
 * Convert a local wall-clock date/time (e.g. `2026-03-10T00:00`) in `timeZone`
 * to an epoch-millisecond instant. Returns `NaN` for an unparseable input.
 */
export function zonedDateTimeToUtc(localDateTime: string, timeZone: string): number {
  const match = localDateTime.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) return NaN;

  const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
  const naive = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const firstOffset = timeZoneOffsetMs(timeZone, naive);
  const candidate = naive - firstOffset;
  const secondOffset = timeZoneOffsetMs(timeZone, candidate);
  return secondOffset === firstOffset ? candidate : naive - secondOffset;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Bounds of the local calendar day `YYYY-MM-DD` in `timeZone`. */
export function localDayBounds(
  date: string,
  timeZone: string,
): { startMs: number; endMs: number; hours: number } {
  const startMs = zonedDateTimeToUtc(`${date}T00:00:00`, timeZone);
  const endMs = zonedDateTimeToUtc(`${addDays(date, 1)}T00:00:00`, timeZone);
  return { startMs, endMs, hours: (endMs - startMs) / 3_600_000 };
}

/** `YYYY-MM-DD` for `instant` in `timeZone`. */
export function localDateOf(instant: Instant, timeZone: string): string {
  const values = numericParts(toDate(instant), timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `${values.year}-${String(values.month).padStart(2, '0')}-${String(values.day).padStart(2, '0')}`;
}

/**
 * Stable key for the local clock hour containing `instant`, e.g.
 * `2026-03-10T14`. Used to count distinct-hour coverage.
 */
export function localHourKey(instant: Instant, timeZone: string): string {
  const values = numericParts(toDate(instant), timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  });
  return `${values.year}-${String(values.month).padStart(2, '0')}-${String(values.day).padStart(2, '0')}T${String(values.hour).padStart(2, '0')}`;
}

/** Human-readable timestamp for display. */
export function formatDateTime(
  instant: Instant,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(toDate(instant));
}
