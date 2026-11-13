'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type ComponentType,
  type FormEvent,
  type SVGProps,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  BeakerIcon,
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  MapPinIcon,
  MoonIcon,
  Squares2X2Icon,
  SunIcon,
  UserIcon,
} from '@heroicons/react/16/solid';
import { locationLabel, type LocationResult, type SelectedLocation } from '@/lib/location';
import { useSelectedLocation } from '@/lib/hooks/use-selected-location';
import { useTheme } from '@/lib/hooks/use-theme';
import BarotropicLogo from './BarotropicLogo';

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  href: string;
  label: string;
  Icon: NavIcon;
}

/** Primary destinations shown inline on wide screens and in the compact menu below 1024px. */
const NAV_ITEMS: NavItem[] = [
  { href: '/forecasts', label: 'Forecast', Icon: GlobeAltIcon },
  { href: '/compare', label: 'Compare', Icon: BeakerIcon },
  { href: '/track-record', label: 'Track record', Icon: ChartBarIcon },
  { href: '/settings', label: 'Settings', Icon: Cog6ToothIcon },
];

function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatClock(now: Date | null): { utc: string; local: string } {
  if (!now) return { utc: '—:—Z', local: '—:—' };

  const utc = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  const local = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(now);

  return { utc: `${utc}Z`, local };
}

/**
 * Persistent application top navigation.
 *
 * Left: brand, live indicator, and UTC/local clock. Right: primary destinations
 * with heroicons, Ask Barotropic, location picker, theme toggle, and profile.
 * Below 1024px the primary destinations collapse into the squares-2x2 menu so
 * mobile widths keep only the icon actions.
 */
export const TopNavigation: React.FC = () => {
  const pathname = usePathname();
  const { location, setLocation } = useSelectedLocation();
  const { theme, toggleTheme } = useTheme();

  const [now, setNow] = useState<Date | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle');
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

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

  async function searchLocations(event: FormEvent<HTMLFormElement>) {
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

  const clock = formatClock(now);

  return (
    <>
      <nav aria-label="Primary" className="app-topnav">
        <div className="app-topnav-left">
          <Link aria-label="Barotropic map" className="app-topnav-brand-link" href="/">
            <BarotropicLogo />
          </Link>
          <span aria-hidden="true" className="app-topnav-divider" />
          <span className="app-topnav-live" title="Live data">
            <span aria-hidden="true" className="app-topnav-live-dot" />
            <span className="app-topnav-live-label">Live</span>
          </span>
          <span aria-hidden="true" className="app-topnav-divider app-topnav-divider-clock" />
          <time
            aria-label={`Current time: ${clock.utc}, ${clock.local}`}
            className="app-topnav-clock"
            dateTime={now?.toISOString()}
          >
            <span className="app-topnav-clock-utc">{clock.utc}</span>
            <span className="app-topnav-clock-local">{clock.local}</span>
          </time>
        </div>

        <div className="app-topnav-right">
          <div className="app-topnav-menu" ref={menuRef}>
            <button
              aria-controls="app-primary-menu"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              aria-label="Navigation menu"
              className="app-topnav-icon-button"
              onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
              type="button"
            >
              <Squares2X2Icon aria-hidden="true" className="app-topnav-icon" />
            </button>
            {isMenuOpen && (
              <div className="app-topnav-menu-panel" id="app-primary-menu" role="menu">
                {NAV_ITEMS.map(({ href, label, Icon }) => {
                  const active = isActivePath(pathname, href);
                  return (
                    <Link
                      aria-current={active ? 'page' : undefined}
                      className="app-topnav-menu-item"
                      data-active={active}
                      href={href}
                      key={href}
                      onClick={() => setIsMenuOpen(false)}
                      role="menuitem"
                    >
                      <Icon aria-hidden="true" className="app-topnav-icon" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="app-topnav-links">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className="app-topnav-link"
                  data-active={active}
                  href={href}
                  key={href}
                >
                  <Icon aria-hidden="true" className="app-topnav-icon" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <button
            aria-label="Ask Barotropic"
            className="app-topnav-link app-topnav-button"
            title="Ask Barotropic"
            type="button"
          >
            <ChatBubbleBottomCenterTextIcon aria-hidden="true" className="app-topnav-icon" />
            <span className="app-topnav-label">Ask Barotropic</span>
          </button>

          <button
            aria-expanded={isLocationPickerOpen}
            aria-haspopup="dialog"
            aria-label={`Change location, currently ${location.label}`}
            className="app-topnav-link app-topnav-button"
            onClick={() => setIsLocationPickerOpen(true)}
            title={`Change location (${location.label})`}
            type="button"
          >
            <MapPinIcon aria-hidden="true" className="app-topnav-icon" />
            <span className="app-topnav-label app-topnav-location-label">{location.label}</span>
          </button>

          <button
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} navigation`}
            className="app-topnav-icon-button"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} navigation`}
            type="button"
          >
            {theme === 'dark' ? (
              <SunIcon aria-hidden="true" className="app-topnav-icon" />
            ) : (
              <MoonIcon aria-hidden="true" className="app-topnav-icon" />
            )}
          </button>

          <Link
            aria-label="Profile settings"
            className="app-topnav-icon-button"
            href="/settings#profile"
            title="Profile settings"
          >
            <UserIcon aria-hidden="true" className="app-topnav-icon" />
          </Link>
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
    </>
  );
};

export default TopNavigation;
