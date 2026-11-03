'use client';

import { useId } from 'react';
import { ALERT_SEVERITY_META, type AlertCardData, type AlertSeverity } from '@/lib/alerts';
import type { ActiveAlertsStatus } from '@/lib/hooks/use-active-alerts';
import AlertCard from './AlertCard';
import StatusPill from './StatusPill';

interface ActiveAlertsProps {
  /** Alerts already sorted by relevance and severity. */
  alerts: AlertCardData[];
  /** Highest severity across the current alerts. */
  highestSeverity: AlertSeverity;
  /** Request state owned by the application shell. */
  status: ActiveAlertsStatus;
  /** Request error message, when the last request failed. */
  error: string | null;
  /** Retry the alert request. */
  refresh: () => void;
  /** Additional classes for the section wrapper. */
  className?: string;
}

/**
 * Sidebar section that renders active NWS alerts for the selected coordinate.
 *
 * Request state is owned by `AppLayout` so the header freshness pill and the
 * map overlays share one fetch. This component stays presentational.
 */
export function ActiveAlerts({
  alerts,
  highestSeverity,
  status,
  error,
  refresh,
  className,
}: ActiveAlertsProps) {
  const headingId = useId();

  const classes = ['app-section', 'active-alerts'];
  if (className) classes.push(className);

  const isLoading = status === 'idle' || status === 'loading';
  const hasAlerts = status === 'success' && alerts.length > 0;
  const heading = hasAlerts ? `Active alerts (${alerts.length})` : 'Active alerts';
  const retrievedAt = alerts[0]?.retrievedAt;

  return (
    <section aria-labelledby={headingId} className={classes.join(' ')}>
      <div className="active-alerts-heading">
        <h2 className="app-section-title" id={headingId}>
          {heading}
        </h2>
        {hasAlerts ? (
          <div className="app-section-meta">
            <StatusPill retrievedAt={retrievedAt} />
            <span className="active-alerts-highest" data-severity={highestSeverity}>
              Highest: {ALERT_SEVERITY_META[highestSeverity].label}
            </span>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <p className="active-alerts-message" role="status">
          Loading active alerts…
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="active-alerts-error" role="alert">
          <p>{error ?? 'Unable to load alerts for this location.'}</p>
          <button className="active-alerts-retry" onClick={refresh} type="button">
            Try again
          </button>
        </div>
      ) : null}

      {status === 'success' && alerts.length === 0 ? (
        <p className="active-alerts-message">No active alerts for this location.</p>
      ) : null}

      {hasAlerts ? (
        <div className="active-alerts-list">
          {alerts.map((alert) => (
            <AlertCard alert={alert} key={alert.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default ActiveAlerts;
