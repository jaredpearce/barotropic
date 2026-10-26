'use client';

import { useId } from 'react';
import { buildConditionTiles } from '@/lib/conditions';
import { formatTemperatureDegrees } from '@/lib/conditions/format';
import { useCurrentConditions } from '@/lib/hooks/use-current-conditions';
import ConditionTile from './ConditionTile';

interface CurrentConditionsProps {
  /** Latitude used to fetch the nearest observation. */
  latitude: number;
  /** Longitude used to fetch the nearest observation. */
  longitude: number;
  /** Additional classes for the section wrapper. */
  className?: string;
}

/**
 * Sidebar section that loads the latest NWS observation for the selected
 * coordinate.
 *
 * The component owns request state (loading, empty, error, retry) while the
 * existing condition builders and tiles stay presentational.
 */
export function CurrentConditions({
  latitude,
  longitude,
  className,
}: CurrentConditionsProps) {
  const headingId = useId();
  const { conditions, status, error, refresh } = useCurrentConditions({
    latitude,
    longitude,
  });

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
      </div>

      {isLoading ? (
        <p className="current-conditions-message" role="status">
          Loading current conditions…
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="current-conditions-error" role="alert">
          <p>{error ?? 'Unable to load current conditions for this location.'}</p>
          <button
            className="current-conditions-retry"
            onClick={refresh}
            type="button"
          >
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
