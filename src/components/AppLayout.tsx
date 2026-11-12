'use client';

import Link from 'next/link';
import React, { ReactNode, useEffect, useState } from 'react';
import {
  LOCATION_STORAGE_KEY,
  locationLabel,
  type LocationResult,
  type SelectedLocation,
} from '@/lib/location';
import { getOldestTimestamp } from '@/lib/freshness';
import { useActiveAlerts } from '@/lib/hooks/use-active-alerts';
import { useCurrentConditions } from '@/lib/hooks/use-current-conditions';
import { useSelectedLocation } from '@/lib/hooks/use-selected-location';
import ActiveAlerts from './ActiveAlerts';
import BarotropicLogo from './BarotropicLogo';
import CurrentConditions from './CurrentConditions';
import HourlyForecast from './HourlyForecast';
import MapPanel from './MapPanel';
import StatusPill from './StatusPill';

interface AppLayoutProps {
  children?: ReactNode;
}

/** Main dark-mode application shell for Barotropic. */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { location, setLocation } = useSelectedLocation();
  const [isWeatherSidebarOpen, setIsWeatherSidebarOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle');
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('');

  useEffect(() => {
    const isDesktop = window.matchMedia?.('(min-width: 768px)').matches ?? window.innerWidth >= 768;
    setIsWeatherSidebarOpen(isDesktop);
  }, []);

  const alerts = useActiveAlerts({
    latitude: location.latitude,
    longitude: location.longitude,
  });
  const currentConditions = useCurrentConditions({
    latitude: location.latitude,
    longitude: location.longitude,
  });
  const headerRetrievedAt = getOldestTimestamp([
    currentConditions.conditions?.retrievedAt,
    alerts.alerts[0]?.retrievedAt,
  ]);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationState('error');
      setLocationMessage('Location services are unavailable in this browser.');
      return;
    }

    setLocationState('loading');
    setLocationMessage('');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          maximumAge: 300_000,
          timeout: 10_000,
        });
      });
      const lookupUrl = new URL('/api/nws/point/location', window.location.origin);
      lookupUrl.searchParams.set('lat', String(position.coords.latitude));
      lookupUrl.searchParams.set('lon', String(position.coords.longitude));
      const response = await fetch(lookupUrl);
      if (!response.ok) throw new Error('Location lookup failed');

      const payload = (await response.json()) as {
        location: { city?: string | null; state?: string | null };
      };
      const city = payload.location.city?.trim() || 'Current location';
      const state = payload.location.state?.trim();
      const selectedLocation: SelectedLocation = {
        id: 0,
        name: city,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        country: 'United States',
        ...(state ? { admin1: state } : {}),
        label: state ? `${city}, ${state}` : city,
      };
      setLocation(selectedLocation);
      setLocationState('idle');
      setIsLocationPickerOpen(false);
    } catch (error) {
      setLocationState('error');
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 1) {
        setLocationMessage(
          'Location permission was denied. Allow access in your browser settings to use this option.',
        );
      } else if (typeof error === 'object' && error !== null && 'code' in error) {
        setLocationMessage(
          'Your location could not be determined. Check your device settings and try again.',
        );
      } else {
        setLocationMessage('Could not look up your location. Please try again.');
      }
    }
  }

  useEffect(() => {
    let hasSavedLocation = false;
    try {
      hasSavedLocation = Boolean(window.localStorage.getItem(LOCATION_STORAGE_KEY));
    } catch {
      hasSavedLocation = false;
    }

    if (!hasSavedLocation && navigator.geolocation && navigator.permissions) {
      void navigator.permissions
        .query({ name: 'geolocation' })
        .then((permission) => {
          if (permission.state === 'granted') void useCurrentLocation();
        })
        .catch(() => undefined);
    }
    // useCurrentLocation is intentionally read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchLocations(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchText.trim();
    if (query.length < 2) {
      setResults([]);
      setSearchState('empty');
      return;
    }

    setSearchState('loading');
    try {
      const searchUrl = new URL('/api/geocode', window.location.origin);
      searchUrl.searchParams.set('q', query);
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error('Location search failed');
      const payload = (await response.json()) as { results?: LocationResult[] };
      const matches = payload.results ?? [];
      setResults(matches);
      setSearchState(matches.length ? 'idle' : 'empty');
    } catch {
      setResults([]);
      setSearchState('error');
    }
  }

  function selectLocation(result: LocationResult) {
    const selectedLocation = { ...result, label: locationLabel(result) };
    setLocation(selectedLocation);
    setIsLocationPickerOpen(false);
    setSearchText('');
    setResults([]);
    setSearchState('idle');
  }

  return (
    <div className="app-shell">
      <nav className="app-header">
        <div className="flex items-center gap-4">
          <BarotropicLogo />
          <ul className="app-nav">
            <li>
              <Link className="app-nav-link" href="/forecasts">
                Forecasts
              </Link>
            </li>
            <li>
              <Link className="app-nav-link" href="/compare">
                Compare
              </Link>
            </li>
            <li>
              <Link className="app-nav-link" href="/track-record">
                Track record
              </Link>
            </li>
          </ul>
        </div>
        <div className="app-header-actions">
          {headerRetrievedAt ? <StatusPill retrievedAt={headerRetrievedAt} /> : null}
          <button className="app-button">ⓘ Ask Barotropic</button>
          <button
            aria-expanded={isLocationPickerOpen}
            aria-haspopup="dialog"
            className="app-button"
            onClick={() => setIsLocationPickerOpen(true)}
            type="button"
          >
            ⌖ {location.label}⌄
          </button>
          <button aria-label="Toggle theme" className="app-button">
            ☼
          </button>
        </div>
      </nav>

      {isLocationPickerOpen && (
        <div
          className="location-picker-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsLocationPickerOpen(false);
          }}
        >
          <section
            aria-labelledby="location-picker-title"
            aria-modal="true"
            className="location-picker"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setIsLocationPickerOpen(false);
            }}
            role="dialog"
          >
            <div className="location-picker-heading">
              <h2 id="location-picker-title">Choose a location</h2>
              <button
                aria-label="Close location search"
                className="location-picker-close"
                onClick={() => setIsLocationPickerOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form className="location-search-form" onSubmit={searchLocations}>
              <button
                className="location-current-button"
                disabled={locationState === 'loading'}
                onClick={() => void useCurrentLocation()}
                type="button"
              >
                {locationState === 'loading' ? 'Finding your location…' : 'Use my current location'}
              </button>
              {locationMessage && (
                <p aria-live="polite" className="location-permission-message">
                  {locationMessage}
                </p>
              )}
              <label className="location-search-label" htmlFor="location-search">
                City, state, or postal code
              </label>
              <div className="location-search-row">
                <input
                  autoFocus
                  autoComplete="off"
                  id="location-search"
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search places"
                  type="search"
                  value={searchText}
                />
                <button
                  className="location-search-submit"
                  disabled={searchState === 'loading'}
                  type="submit"
                >
                  {searchState === 'loading' ? 'Searching' : 'Search'}
                </button>
              </div>
            </form>
            <div aria-live="polite" className="location-search-results">
              {searchState === 'loading' && <p>Searching locations…</p>}
              {searchState === 'empty' && <p>No locations found. Try a nearby city or ZIP code.</p>}
              {searchState === 'error' && <p>Location search is unavailable. Please try again.</p>}
              {results.map((result) => (
                <button
                  className="location-result"
                  key={`${result.id}-${result.latitude}-${result.longitude}`}
                  onClick={() => selectLocation(result)}
                  type="button"
                >
                  <span>{locationLabel(result)}</span>
                  <span className="location-result-country">{result.country}</span>
                </button>
              ))}
            </div>
            <p className="location-picker-current">Current location: {location.label}</p>
          </section>
        </div>
      )}

      <div className="app-content" data-sidebar-open={isWeatherSidebarOpen}>
        <main className="app-main">
          {children ?? (
            <MapPanel
              alerts={alerts.alerts}
              label={location.label}
              latitude={location.latitude}
              longitude={location.longitude}
              stations={currentConditions.stations}
            />
          )}
        </main>

        <aside
          aria-labelledby="weather-sidebar-title"
          className="app-sidebar"
          data-sidebar-open={isWeatherSidebarOpen}
        >
          <header className="app-sidebar-header">
            <h2 className="app-sidebar-title" id="weather-sidebar-title">
              Weather details
            </h2>
            <button
              aria-controls="weather-sidebar-content"
              aria-expanded={isWeatherSidebarOpen}
              aria-label={isWeatherSidebarOpen ? 'Hide weather details' : 'Show weather details'}
              className="app-sidebar-toggle"
              onClick={() => setIsWeatherSidebarOpen((isOpen) => !isOpen)}
              type="button"
            >
              <span aria-hidden="true">{isWeatherSidebarOpen ? '›' : '‹'}</span>
            </button>
          </header>
          <div
            id="weather-sidebar-content"
            hidden={!isWeatherSidebarOpen}
            inert={!isWeatherSidebarOpen}
          >
            <ActiveAlerts
              alerts={alerts.alerts}
              error={alerts.error}
              highestSeverity={alerts.highestSeverity}
              refresh={alerts.refresh}
              status={alerts.status}
            />

            <CurrentConditions
              conditions={currentConditions.conditions}
              error={currentConditions.error}
              refresh={currentConditions.refresh}
              status={currentConditions.status}
            />

            <HourlyForecast latitude={location.latitude} longitude={location.longitude} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AppLayout;
