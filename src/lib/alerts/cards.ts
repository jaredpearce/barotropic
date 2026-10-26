/**
 * Alert card view models.
 *
 * Normalized alerts are mapped here into display-ready data. Keeping this
 * mapping out of the component means severity, point-in-polygon, sorting, and
 * time formatting rules remain unit testable.
 */

import type { NormalizedAlert } from '@/lib/schemas/normalized';
import {
  buildGeometryPreview,
  classifyAlertGeometry,
  type AlertGeometryMatch,
  type AlertGeometryPreview,
  type GeoPoint,
} from './geometry';
import {
  ALERT_SEVERITY_META,
  getHighestAlertSeverity,
  normalizeAlertSeverity,
  type AlertSeverity,
} from './severity';

export interface ActiveAlertsResponse {
  point: GeoPoint;
  alerts: NormalizedAlert[];
}

export interface AlertCardData {
  id: string;
  event: string;
  severity: AlertSeverity;
  severityLabel: string;
  areaDescription?: string;
  headline?: string;
  instruction?: string;
  senderName?: string;
  effectiveIso?: string;
  expiresIso?: string;
  effectiveLabel?: string;
  expiresLabel?: string;
  match: AlertGeometryMatch;
  geometry: AlertGeometryPreview;
}

export interface BuildAlertCardsOptions {
  point?: GeoPoint;
  now?: Date;
  locale?: string;
  timeZone?: string;
}

export const ALERT_MATCH_LABELS: Record<AlertGeometryMatch, string> = {
  polygon: 'Affects this location',
  area: 'Area-based',
  outside: 'Nearby area',
};

const MATCH_SORT_ORDER: Record<AlertGeometryMatch, number> = {
  polygon: 0,
  area: 1,
  outside: 2,
};

interface FormattedAlertTime {
  iso: string;
  label: string;
}

function formatAlertTime(
  value: string | null | undefined,
  locale: string,
  timeZone?: string
): FormattedAlertTime | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(timeZone ? { timeZone } : {}),
  });

  return { iso: value, label: formatter.format(date) };
}

function isExpired(alert: NormalizedAlert, now: Date): boolean {
  if (!alert.expires) return false;

  const expiresAt = new Date(alert.expires);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime();
}

function getExpiryTimestamp(alert: AlertCardData): number {
  if (!alert.expiresIso) return Number.POSITIVE_INFINITY;

  const expiresAt = new Date(alert.expiresIso);
  return Number.isNaN(expiresAt.getTime())
    ? Number.POSITIVE_INFINITY
    : expiresAt.getTime();
}

function toCard(alert: NormalizedAlert, options: Required<Pick<BuildAlertCardsOptions, 'locale'>> & BuildAlertCardsOptions): AlertCardData {
  const severity = normalizeAlertSeverity(alert.severity);
  const effective = formatAlertTime(alert.effective, options.locale, options.timeZone);
  const expires = formatAlertTime(alert.expires, options.locale, options.timeZone);

  return {
    id: alert.id,
    event: alert.event ?? 'Weather alert',
    severity,
    severityLabel: ALERT_SEVERITY_META[severity].label,
    areaDescription: alert.areaDescription ?? undefined,
    headline: alert.headline ?? undefined,
    instruction: alert.instruction ?? undefined,
    senderName: alert.senderName ?? undefined,
    effectiveIso: effective?.iso,
    expiresIso: expires?.iso,
    effectiveLabel: effective?.label,
    expiresLabel: expires?.label,
    match: classifyAlertGeometry(alert.geometry, options.point),
    geometry: buildGeometryPreview(alert.geometry, options.point),
  };
}

/**
 * Build display cards for the alerts relevant to a location.
 *
 * Expired alerts are removed, duplicate IDs are collapsed, and cards are
 * ordered by geometry relevance, severity, then soonest expiry.
 */
export function buildAlertCards(
  alerts: ReadonlyArray<NormalizedAlert>,
  options: BuildAlertCardsOptions = {}
): AlertCardData[] {
  const now = options.now ?? new Date();
  const normalizedOptions = {
    ...options,
    locale: options.locale ?? 'en-US',
  };
  const cardsById = new Map<string, AlertCardData>();

  for (const alert of alerts) {
    if (isExpired(alert, now)) continue;

    const card = toCard(alert, normalizedOptions);
    if (!cardsById.has(card.id)) {
      cardsById.set(card.id, card);
    }
  }

  return [...cardsById.values()].sort((left, right) => {
    const matchDifference =
      MATCH_SORT_ORDER[left.match] - MATCH_SORT_ORDER[right.match];
    if (matchDifference !== 0) return matchDifference;

    const severityDifference =
      ALERT_SEVERITY_META[right.severity].rank -
      ALERT_SEVERITY_META[left.severity].rank;
    if (severityDifference !== 0) return severityDifference;

    const expiryDifference = getExpiryTimestamp(left) - getExpiryTimestamp(right);
    if (expiryDifference !== 0) return expiryDifference;

    return left.event.localeCompare(right.event);
  });
}

export { getHighestAlertSeverity };
