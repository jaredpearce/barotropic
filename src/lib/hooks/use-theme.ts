'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'barotropic.theme';
export const THEME_CHANGED_EVENT = 'barotropic.theme-changed';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function readStoredTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

/**
 * Persisted light/dark preference for the application chrome.
 *
 * The navigation is rendered with the same structure in both variants; only the
 * `data-theme` attribute and the `--nav-*` custom properties change. The value is
 * shared across tabs via `storage` and within a tab via a custom event, matching
 * the selected-location and unit-system hooks.
 */
export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const next = readStoredTheme();
    setThemeState(next);
    applyTheme(next);

    const handleChange = (event: Event) => {
      const nextTheme =
        event instanceof CustomEvent && isTheme(event.detail) ? event.detail : readStoredTheme();
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const nextTheme = readStoredTheme();
        setThemeState(nextTheme);
        applyTheme(nextTheme);
      }
    };

    window.addEventListener(THEME_CHANGED_EVENT, handleChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(THEME_CHANGED_EVENT, handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures (private mode, quota).
    }
    window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: next }));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return { theme, setTheme, toggleTheme };
}
