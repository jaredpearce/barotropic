'use client';

import { useId } from 'react';
import { buildConditionTiles } from '@/lib/conditions';
import { formatTemperatureDegrees } from '@/lib/conditions/format';
import type { CurrentConditionsStatus } from '@/lib/hooks/use-current-conditions';
import type { CurrentConditions as CurrentConditionsData } from '@/types/domain';
import ConditionTile from './ConditionTile';
import StatusPill from './StatusPill';

interface CurrentConditionsProps {
  /** Latest observation, or null when the station has no observation. */
  conditions: CurrentConditionsData | null;
  /** Request state owned by the application shell. */
  status: CurrentConditionsStatus;
  /** Request error message, when the last request failed. */
  error: string | null;
  /** Retry the observation request. */
  refresh: () => void;
  /** Additional classes for the section wrapper. */
  className?: string;
}

/**
 * Sidebar section that renders the latest NWS observation for the selected
 * coordinate.
 *
 * Request state is owned by `AppLayout` so the header freshness pill and the
 * map station overlay share one fetch. This component stays presentational.
 */
export function CurrentConditions({
  conditions,
  status,
  error,
  refresh,
  className,
}: CurrentConditionsProps) {
  const headingId = useId();

  const classes = ['app-section', 'current-conditions'];
  if (className) classes.push(className);

  const isLoading = status === 'idle' || status === 'loading';
  const hasObservation = status === 'success' && conditions !== null;
  const tiles = hasObservation
    ? buildConditionTiles(conditions).filter((tile) => tile.kind !== 'temperature')
    : [];
  const heading = conditions?.stationId
    ? `Current conditions · ${conditions.stationId}`
    : 'Current conditions';

  return (
    <section aria-labelledby={headingId} className={classes.join(' ')}>
      <div className="current-conditions-heading">
        <h2 className="app-section-title" id={headingId}>
          {heading}
        </h2>
        {hasObservation ? <StatusPill retrievedAt={conditions?.retrievedAt} /> : null}
      </div>

      {isLoading ? (
        <p className="current-conditions-message" role="status">
          Loading current conditions…
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="current-conditions-error" role="alert">
          <p>{error ?? 'Unable to load current conditions for this location.'}</p>
          <button className="current-conditions-retry" onClick={refresh} type="button">
            Try again
          </button>
        </div>
      ) : null}

      {status === 'success' && conditions === null ? (
        <p className="current-conditions-message">
          No current conditions available for this location.
        </p>
      ) : null}

      {hasObservation ? (
        <>
          <div className="app-conditions-section">
            <span className="app-conditions-temp">
              {formatTemperatureDegrees(conditions.temperature)}
            </span>
          </div>
          {conditions.condition ? (
            <p className="app-conditions-description">{conditions.condition}</p>
          ) : null}
          <div className="app-conditions-grid">
            {tiles.map((tile) => (
              <ConditionTile key={tile.kind} {...tile} variant="bare" />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default CurrentConditions;
