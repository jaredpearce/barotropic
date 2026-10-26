/**
 * Alert severity semantics.
 *
 * NWS publishes CAP severity as one of Extreme, Severe, Moderate, Minor, or
 * Unknown. This module is the single place that normalizes those values and
 * assigns their display rank, so cards and future map overlays cannot disagree.
 */

export type AlertSeverity =
  | 'extreme'
  | 'severe'
  | 'moderate'
  | 'minor'
  | 'unknown';

export interface AlertSeverityMeta {
  label: string;
  rank: number;
}

export const ALERT_SEVERITY_META: Record<AlertSeverity, AlertSeverityMeta> = {
  extreme: { label: 'Extreme', rank: 4 },
  severe: { label: 'Severe', rank: 3 },
  moderate: { label: 'Moderate', rank: 2 },
  minor: { label: 'Minor', rank: 1 },
  unknown: { label: 'Unknown', rank: 0 },
};

const SEVERITY_VALUES: readonly AlertSeverity[] = [
  'extreme',
  'severe',
  'moderate',
  'minor',
  'unknown',
];

function isAlertSeverity(value: string): value is AlertSeverity {
  return (SEVERITY_VALUES as readonly string[]).includes(value);
}

/**
 * Normalize a raw NWS severity string.
 *
 * Missing, blank, or unexpected values become `unknown` rather than being
 * inferred from the alert event name.
 */
export function normalizeAlertSeverity(
  value: string | null | undefined
): AlertSeverity {
  if (typeof value !== 'string') return 'unknown';

  const normalized = value.trim().toLowerCase();
  return isAlertSeverity(normalized) ? normalized : 'unknown';
}

/**
 * Compare two severities so the highest severity sorts first.
 */
export function compareAlertSeverity(
  left: AlertSeverity,
  right: AlertSeverity
): number {
  return ALERT_SEVERITY_META[right].rank - ALERT_SEVERITY_META[left].rank;
}

/**
 * Return the highest severity present in a collection.
 */
export function getHighestAlertSeverity(
  alerts: ReadonlyArray<{ severity: AlertSeverity }>
): AlertSeverity {
  return alerts.reduce<AlertSeverity>(
    (highest, alert) =>
      ALERT_SEVERITY_META[alert.severity].rank >
      ALERT_SEVERITY_META[highest].rank
        ? alert.severity
        : highest,
    'unknown'
  );
}
