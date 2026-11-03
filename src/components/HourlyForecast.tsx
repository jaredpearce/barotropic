'use client';

import { useId } from 'react';
import { formatTemperatureDegrees, formatWindSpeed } from '@/lib/conditions/format';
import { formatHourLabel, selectUpcomingHours } from '@/lib/forecast/hourly';
import { conditionFromWeatherCode } from '@/lib/forecast/weather-code';
import { useHourlyForecast } from '@/lib/hooks/use-hourly-forecast';
import HourlyRow from './HourlyRow';

interface HourlyForecastProps {
  latitude: number;
  longitude: number;
  /** Reference time for the visible window. Defaults to render time. */
  now?: Date;
}

export function HourlyForecast({ latitude, longitude, now }: HourlyForecastProps) {
  const headingId = useId();
  const { hours, utcOffsetSeconds, status, error, refresh } = useHourlyForecast({
    latitude,
    longitude,
  });
  const isLoading = status === 'idle' || status === 'loading';
  const visibleHours = selectUpcomingHours(hours, now ?? new Date(), utcOffsetSeconds);

  return (
    <section aria-labelledby={headingId} className="app-section">
      <h2 className="app-section-title" id={headingId}>
        Hourly forecast · 24h local
      </h2>
      {isLoading ? (
        <p className="current-conditions-message" role="status">
          Loading hourly forecast…
        </p>
      ) : null}
      {status === 'error' ? (
        <div className="current-conditions-error" role="alert">
          <p>{error ?? 'Unable to load the hourly forecast for this location.'}</p>
          <button className="current-conditions-retry" onClick={refresh} type="button">
            Try again
          </button>
        </div>
      ) : null}
      {status === 'success' && visibleHours.length === 0 ? (
        <p className="current-conditions-message">
          No hourly forecast available for this location.
        </p>
      ) : null}
      {visibleHours.length > 0 ? (
        <>
          <div className="app-forecast-grid">
            <div className="app-forecast-header">
              <span>Time</span>
              <span />
              <span>°F</span>
              <span>PoP</span>
              <span>Wind</span>
            </div>
          </div>
          <div role="list">
            {visibleHours.map((hour) => {
              return (
                <HourlyRow
                  condition={conditionFromWeatherCode(hour.weatherCode)}
                  isNight={hour.isDaytime === false}
                  key={hour.timestamp}
                  precipitation={
                    hour.precipitationProbabilityPercent == null
                      ? '—'
                      : `${Math.round(hour.precipitationProbabilityPercent)}%`
                  }
                  temperature={formatTemperatureDegrees(hour.temperatureC)}
                  timeLabel={formatHourLabel(hour.timestamp)}
                  wind={formatWindSpeed(hour.windSpeedMps)}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default HourlyForecast;
