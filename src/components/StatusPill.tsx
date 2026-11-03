'use client';

import { deriveFreshness, FRESHNESS_THRESHOLD_MS } from '@/lib/freshness';

interface StatusPillProps {
  /** Transport timestamp of the data the pill describes. */
  retrievedAt?: string | Date | null;
  /** Reference time. Defaults to render time. */
  now?: Date;
  /** Age at which the data is considered stale. */
  thresholdMs?: number;
  /** Additional classes for the pill wrapper. */
  className?: string;
}

/**
 * Compact LIVE/STALE indicator driven by `retrievedAt`.
 *
 * The component is presentational and deliberately does not poll. A caller
 * re-renders it when data is refreshed or when a visibility-aware clock ticks;
 * the sidebar already re-renders after each refresh.
 */
export function StatusPill({
  retrievedAt,
  now,
  thresholdMs = FRESHNESS_THRESHOLD_MS,
  className,
}: StatusPillProps) {
  const freshness = deriveFreshness(retrievedAt, now ?? new Date(), thresholdMs);
  const classes = ['status-pill'];
  if (className) classes.push(className);

  return (
    <span
      aria-live="polite"
      className={classes.join(' ')}
      data-state={freshness.state}
      role="status"
      title={freshness.title}
    >
      <span aria-hidden="true" className="status-pill-indicator" />
      {freshness.label}
    </span>
  );
}

export default StatusPill;
