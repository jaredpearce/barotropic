'use client';

import { useId } from 'react';
import { ALERT_SEVERITY_META } from '@/lib/alerts';
import { useActiveAlerts } from '@/lib/hooks/use-active-alerts';
import AlertCard from './AlertCard';

interface ActiveAlertsProps {
  /** Latitude used to fetch and classify alerts. */
  latitude: number;
  /** Longitude used to fetch and classify alerts. */
  longitude: number;
  /** Additional classes for the section wrapper. */
  className?: string;
}

/**
 * Sidebar section that loads active NWS alerts for the selected coordinate.
 *
 * The component owns request state (loading, empty, error, retry) while
 * `AlertCard` stays presentational. Alerts are already sorted by relevance and
 * severity when they arrive here.
 */
export function ActiveAlerts({
  latitude,
  longitude,
  className,
}: ActiveAlertsProps) {
  const headingId = useId();
  const { alerts, highestSeverity, status, error, refresh } = useActiveAlerts({
    latitude,
    longitude,
  });

  const classes = ['app-section', 'active-alerts'];
  if (className) classes.push(className);

  const isLoading = status === 'idle' || status === 'loading';
  const hasAlerts = status === 'success' && alerts.length > 0;
  const heading = hasAlerts
    ? `Active alerts (${alerts.length})`
    : 'Active alerts';

  return (
    <section aria-labelledby={headingId} className={classes.join(' ')}>
      <div className="active-alerts-heading">
        <h2 className="app-section-title" id={headingId}>
          {heading}
        </h2>
        {hasAlerts ? (
          <span
            className="active-alerts-highest"
            data-severity={highestSeverity}
          >
            Highest: {ALERT_SEVERITY_META[highestSeverity].label}
          </span>
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
          <button
            className="active-alerts-retry"
            onClick={refresh}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}

      {status === 'success' && alerts.length === 0 ? (
        <p className="active-alerts-message">
          No active alerts for this location.
        </p>
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
