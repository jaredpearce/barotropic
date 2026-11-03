/**
 * Data freshness semantics.
 *
 * Freshness is derived from the transport timestamp (`retrievedAt`) rather than
 * the observation time, so every panel uses the same rule for LIVE/STALE. The
 * threshold is a single product constant and can be overridden per call.
 */

/** Age at which previously retrieved data is considered stale. */
export const FRESHNESS_THRESHOLD_MS = 15 * 60 * 1000;

export type FreshnessState = 'live' | 'stale';

export interface Freshness {
  state: FreshnessState;
  /** Age of the data in milliseconds, or `null` when it cannot be determined. */
  ageMs: number | null;
  label: 'LIVE' | 'STALE';
  /** Human-readable age, used as the pill's tooltip. */
  title: string;
}

function toTimestamp(value: string | Date | null | undefined): number | null {
  if (value == null) return null;

  const milliseconds = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function formatAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'Updated less than a minute ago';
  if (minutes === 1) return 'Updated 1 minute ago';
  if (minutes < 60) return `Updated ${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'Updated 1 hour ago';
  if (hours < 24) return `Updated ${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'Updated 1 day ago' : `Updated ${days} days ago`;
}

/**
 * Derive the freshness state for a retrieved timestamp.
 *
 * Missing or invalid timestamps are treated as stale, because the UI cannot
 * claim data is live without evidence. Future timestamps are clamped to an age
 * of zero so small clock skew does not produce a negative age.
 */
export function deriveFreshness(
  retrievedAt: string | Date | null | undefined,
  now: Date = new Date(),
  thresholdMs = FRESHNESS_THRESHOLD_MS,
): Freshness {
  const retrievedMs = toTimestamp(retrievedAt);
  const nowMs = now.getTime();

  if (retrievedMs === null || !Number.isFinite(nowMs)) {
    return {
      state: 'stale',
      ageMs: null,
      label: 'STALE',
      title: 'Update time unavailable',
    };
  }

  const ageMs = Math.max(0, nowMs - retrievedMs);
  const state: FreshnessState = ageMs <= thresholdMs ? 'live' : 'stale';

  return {
    state,
    ageMs,
    label: state === 'live' ? 'LIVE' : 'STALE',
    title: formatAge(ageMs),
  };
}

/**
 * Return the oldest valid timestamp from a set of sources.
 *
 * The header pill uses this to summarize several panels conservatively: if any
 * panel is stale, the header is stale. Invalid or missing values are ignored.
 */
export function getOldestTimestamp(
  values: ReadonlyArray<string | Date | null | undefined>,
): Date | null {
  let oldest: number | null = null;

  for (const value of values) {
    const timestamp = toTimestamp(value);
    if (timestamp === null) continue;

    oldest = oldest === null ? timestamp : Math.min(oldest, timestamp);
  }

  return oldest === null ? null : new Date(oldest);
}
