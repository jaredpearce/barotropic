'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import ActiveAlerts from './ActiveAlerts';
import CurrentConditions from './CurrentConditions';

interface AppLayoutProps {
  children?: ReactNode;
}

interface LocationResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface SelectedLocation extends LocationResult {
  label: string;
}

const defaultLocation: SelectedLocation = {
  id: 0,
  name: 'Cary',
  admin1: 'North Carolina',
  country: 'United States',
  latitude: 35.7915,
  longitude: -78.7811,
  label: 'Cary, NC',
};

function locationLabel(location: LocationResult) {
  const region = location.admin1 || location.country;
  return region ? `${location.name}, ${region}` : location.name;
}

const hourlyForecast = Array.from({ length: 24 }, (_, hour) => {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 || 12;
  const temperature = Math.round(72 - Math.max(0, hour - 5) * 0.25 + Math.max(0, hour - 14) * 0.8);

  return {
    time: `${displayHour}:00 ${period}`,
    temperature: `${temperature}°`,
    precipitation: hour >= 13 && hour <= 18 ? '20%' : '5%',
    wind: hour < 6 ? 'NW 5 kt' : hour < 12 ? 'N 4 kt' : 'SE 9 kt',
  };
});

/** Main dark-mode application shell for Barotropic. */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [location, setLocation] = useState(defaultLocation);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle');
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('');

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
      window.localStorage.setItem('barotropic.location', JSON.stringify(selectedLocation));
      setLocationState('idle');
      setIsLocationPickerOpen(false);
    } catch (error) {
      setLocationState('error');
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 1) {
        setLocationMessage('Location permission was denied. Allow access in your browser settings to use this option.');
      } else if (typeof error === 'object' && error !== null && 'code' in error) {
        setLocationMessage('Your location could not be determined. Check your device settings and try again.');
      } else {
        setLocationMessage('Could not look up your location. Please try again.');
      }
    }
  }

  useEffect(() => {
    let hasSavedLocation = false;
    try {
      const savedLocation = window.localStorage.getItem('barotropic.location');
      if (savedLocation) {
        const parsed = JSON.parse(savedLocation) as SelectedLocation;
        if (
          typeof parsed.name === 'string' &&
          typeof parsed.latitude === 'number' &&
          typeof parsed.longitude === 'number' &&
          typeof parsed.label === 'string'
        ) {
          setLocation(parsed);
          hasSavedLocation = true;
        }
      }
    } catch {
      window.localStorage.removeItem('barotropic.location');
    }

    if (!hasSavedLocation && navigator.geolocation && navigator.permissions) {
      void navigator.permissions
        .query({ name: 'geolocation' })
        .then((permission) => {
          if (permission.state === 'granted') void useCurrentLocation();
        })
        .catch(() => undefined);
    }
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
    window.localStorage.setItem('barotropic.location', JSON.stringify(selectedLocation));
    setIsLocationPickerOpen(false);
    setSearchText('');
    setResults([]);
    setSearchState('idle');
  }

  return (
    <div className="app-shell">
      <nav className="app-header">
        <div className="flex items-center gap-4">
          <span className="app-header-title">◉ Barotropic</span>
          <span className="app-header-status">
            <span className="app-header-status-indicator" /> Live · 4 min ago
          </span>
        </div>
        <div className="app-header-actions">
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
          <button aria-label="Toggle theme" className="app-button">☼</button>
        </div>
      </nav>

      {isLocationPickerOpen && (
        <div className="location-picker-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsLocationPickerOpen(false);
        }}>
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
              {locationMessage && <p aria-live="polite" className="location-permission-message">{locationMessage}</p>}
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
                <button className="location-search-submit" disabled={searchState === 'loading'} type="submit">
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

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_300px]">
        <main className="app-main">
          {children ?? <div className="app-map-placeholder">Map Area</div>}
        </main>

        <aside className="app-sidebar">
          <ActiveAlerts
            latitude={location.latitude}
            longitude={location.longitude}
          />

          <CurrentConditions
            latitude={location.latitude}
            longitude={location.longitude}
          />

          <section className="app-section">
            <h2 className="app-section-title">Hourly forecast · 24h local</h2>
            <div className="app-forecast-grid">
              <div className="app-forecast-header">
                <span>Time</span>
                <span />
                <span>°F</span>
                <span>PoP</span>
                <span>Wind</span>
              </div>
            </div>
            <div>
              {hourlyForecast.map((hour) => (
                <div key={hour.time} className="app-forecast-row">
                  <span className="app-forecast-time">{hour.time}</span>
                  <span className="app-forecast-icon">☀</span>
                  <span>{hour.temperature}</span>
                  <span className="app-forecast-precip">{hour.precipitation}</span>
                  <span className="app-forecast-wind">{hour.wind}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AppLayout;
