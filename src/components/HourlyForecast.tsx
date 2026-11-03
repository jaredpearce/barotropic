'use client';

import { useId } from 'react';
import {
  formatTemperatureDegrees,
  formatWindSpeed,
} from '@/lib/conditions/format';
import { useHourlyForecast } from '@/lib/hooks/use-hourly-forecast';
import HourlyRow, { type HourlyCondition } from './HourlyRow';

interface HourlyForecastProps {
  latitude: number;
  longitude: number;
}

function getCondition(weatherCode: number | null | undefined): HourlyCondition {
  if (weatherCode === 0) return 'clear';
  if (weatherCode === 1 || weatherCode === 2) return 'partly-cloudy';
  if (weatherCode === 3) return 'cloudy';
  if (weatherCode === 45 || weatherCode === 48) return 'fog';
  if (weatherCode !== null && weatherCode !== undefined) {
    if ([95, 96, 99].includes(weatherCode)) return 'storm';
    if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snow';
    if (
      [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(
        weatherCode
      )
    ) {
      return 'rain';
    }
  }
  return 'cloudy';
}

function formatLocalTime(timestamp: string): string {
  const hour = getHourOfDay(timestamp);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return timestamp;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12}:00 ${period}`;
}

function getHourOfDay(timestamp: string): number {
  return Number(timestamp.match(/T(\d{2}):/)?.[1]);
}

export function HourlyForecast({ latitude, longitude }: HourlyForecastProps) {
  const headingId = useId();
  const { hours, status, error, refresh } = useHourlyForecast({
    latitude,
    longitude,
  });
  const isLoading = status === 'idle' || status === 'loading';
  const visibleHours = hours.slice(0, 24);

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
          <button
            className="current-conditions-retry"
            onClick={refresh}
            type="button"
          >
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
              const hourOfDay = getHourOfDay(hour.timestamp);
              return (
                <HourlyRow
                  condition={getCondition(hour.weatherCode)}
                  isNight={hourOfDay < 6 || hourOfDay >= 18}
                  key={hour.timestamp}
                  precipitation={
                    hour.precipitationProbabilityPercent == null
                      ? '—'
                      : `${Math.round(hour.precipitationProbabilityPercent)}%`
                  }
                  temperature={formatTemperatureDegrees(hour.temperatureC)}
                  timeLabel={formatLocalTime(hour.timestamp)}
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
