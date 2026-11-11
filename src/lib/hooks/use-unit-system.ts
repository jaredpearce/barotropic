'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UnitSystem } from '@/lib/units';

export const UNIT_SYSTEM_STORAGE_KEY = 'barotropic.unit-system';
export const UNIT_SYSTEM_CHANGED_EVENT = 'barotropic.unit-system-changed';

function isUnitSystem(value: unknown): value is UnitSystem {
  return value === 'imperial' || value === 'metric';
}

function readStoredUnitSystem(): UnitSystem {
  try {
    const raw = window.localStorage.getItem(UNIT_SYSTEM_STORAGE_KEY);
    return isUnitSystem(raw) ? raw : 'imperial';
  } catch {
    return 'imperial';
  }
}

/**
 * Persisted metric/imperial preference, defaulting to imperial.
 *
 * Shared across tabs via the `storage` event and within a tab via a custom
 * event, matching the selected-location hook.
 */
export function useUnitSystem(): {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  toggleUnitSystem: () => void;
} {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('imperial');

  useEffect(() => {
    setUnitSystemState(readStoredUnitSystem());

    const handleChange = (event: Event) => {
      if (event instanceof CustomEvent && isUnitSystem(event.detail)) {
        setUnitSystemState(event.detail);
      } else {
        setUnitSystemState(readStoredUnitSystem());
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === UNIT_SYSTEM_STORAGE_KEY) setUnitSystemState(readStoredUnitSystem());
    };

    window.addEventListener(UNIT_SYSTEM_CHANGED_EVENT, handleChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(UNIT_SYSTEM_CHANGED_EVENT, handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setUnitSystem = useCallback((system: UnitSystem) => {
    setUnitSystemState(system);
    try {
      window.localStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, system);
    } catch {
      // Ignore storage failures (private mode, quota).
    }
    window.dispatchEvent(new CustomEvent(UNIT_SYSTEM_CHANGED_EVENT, { detail: system }));
  }, []);

  const toggleUnitSystem = useCallback(() => {
    setUnitSystemState((current) => {
      const next: UnitSystem = current === 'imperial' ? 'metric' : 'imperial';
      try {
        window.localStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, next);
      } catch {
        // Ignore storage failures.
      }
      window.dispatchEvent(new CustomEvent(UNIT_SYSTEM_CHANGED_EVENT, { detail: next }));
      return next;
    });
  }, []);

  return { unitSystem, setUnitSystem, toggleUnitSystem };
}
