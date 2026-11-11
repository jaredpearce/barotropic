'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_LOCATION,
  isSelectedLocation,
  LOCATION_CHANGED_EVENT,
  LOCATION_STORAGE_KEY,
  type SelectedLocation,
} from '@/lib/location';

function readStoredLocation(): SelectedLocation {
  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return DEFAULT_LOCATION;
    const parsed: unknown = JSON.parse(raw);
    return isSelectedLocation(parsed) ? parsed : DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}

/**
 * Shared selected-location state.
 *
 * Persists to localStorage, dispatches a `barotropic.location-changed` event so
 * other consumers in the same tab stay in sync, and listens for cross-tab
 * `storage` events. Falls back to `DEFAULT_LOCATION` when nothing valid is
 * stored.
 */
export function useSelectedLocation(): {
  location: SelectedLocation;
  setLocation: (location: SelectedLocation) => void;
} {
  const [location, setLocationState] = useState<SelectedLocation>(DEFAULT_LOCATION);

  useEffect(() => {
    setLocationState(readStoredLocation());

    const handleChange = (event: Event) => {
      if (event instanceof CustomEvent && isSelectedLocation(event.detail)) {
        setLocationState(event.detail);
      } else {
        setLocationState(readStoredLocation());
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCATION_STORAGE_KEY) setLocationState(readStoredLocation());
    };

    window.addEventListener(LOCATION_CHANGED_EVENT, handleChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(LOCATION_CHANGED_EVENT, handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setLocation = useCallback((next: SelectedLocation) => {
    setLocationState(next);
    try {
      window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures (private mode, quota).
    }
    window.dispatchEvent(new CustomEvent(LOCATION_CHANGED_EVENT, { detail: next }));
  }, []);

  return { location, setLocation };
}
