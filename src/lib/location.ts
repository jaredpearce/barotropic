/**
 * Selected-location helpers shared by the application shell and server pages.
 *
 * The selected location is currently client state, persisted in localStorage.
 * Keeping the default, storage key, and label rules here prevents the shell and
 * individual pages from drifting apart.
 */

export interface LocationResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

export interface SelectedLocation extends LocationResult {
  label: string;
}

/** localStorage key for the selected location. */
export const LOCATION_STORAGE_KEY = 'barotropic.location';

/** Window event fired when the selected location changes in this tab. */
export const LOCATION_CHANGED_EVENT = 'barotropic.location-changed';

/** Type guard for a persisted/selected location. */
export function isSelectedLocation(value: unknown): value is SelectedLocation {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude) &&
    typeof candidate.label === 'string'
  );
}

/** Default location used before the user selects one. */
export const DEFAULT_LOCATION: SelectedLocation = {
  id: 0,
  name: 'Cary',
  admin1: 'North Carolina',
  country: 'United States',
  latitude: 35.7915,
  longitude: -78.7811,
  label: 'Cary, NC',
};

/**
 * Build the display label for a geocoding result.
 *
 * State/region is preferred over country so US results read "Cary, North
 * Carolina"; country is the fallback for results without an admin1 field.
 */
export function locationLabel(location: LocationResult): string {
  const region = location.admin1 || location.country;
  return region ? `${location.name}, ${region}` : location.name;
}
