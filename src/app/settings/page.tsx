'use client';

import { useSelectedLocation } from '@/lib/hooks/use-selected-location';
import { useTheme } from '@/lib/hooks/use-theme';
import { useUnitSystem } from '@/lib/hooks/use-unit-system';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { unitSystem, setUnitSystem } = useUnitSystem();
  const { location } = useSelectedLocation();

  return (
    <div className="settings-page">
      <header className="settings-header">
        <p className="settings-eyebrow">Preferences</p>
        <h1 className="settings-title">Settings</h1>
        <p className="settings-description">
          Choose how Barotropic displays measurements and chrome. Preferences are stored in this
          browser.
        </p>
      </header>

      <section aria-labelledby="settings-units-title" className="settings-section" id="units">
        <div className="settings-section-heading">
          <h2 className="settings-section-title" id="settings-units-title">
            Units
          </h2>
          <p className="settings-section-description">
            Applies to temperatures, wind speeds, pressure, and precipitation across the app.
          </p>
        </div>
        <div className="settings-choice-group" role="group" aria-labelledby="settings-units-title">
          <button
            aria-pressed={unitSystem === 'imperial'}
            className="settings-choice"
            onClick={() => setUnitSystem('imperial')}
            type="button"
          >
            <span className="settings-choice-title">Imperial</span>
            <span className="settings-choice-meta">°F · mph · inHg · in</span>
          </button>
          <button
            aria-pressed={unitSystem === 'metric'}
            className="settings-choice"
            onClick={() => setUnitSystem('metric')}
            type="button"
          >
            <span className="settings-choice-title">Metric</span>
            <span className="settings-choice-meta">°C · m/s · hPa · mm</span>
          </button>
        </div>
      </section>

      <section
        aria-labelledby="settings-appearance-title"
        className="settings-section"
        id="appearance"
      >
        <div className="settings-section-heading">
          <h2 className="settings-section-title" id="settings-appearance-title">
            Navigation appearance
          </h2>
          <p className="settings-section-description">
            Switch the top navigation between its light and dark variants.
          </p>
        </div>
        <div
          className="settings-choice-group"
          role="group"
          aria-labelledby="settings-appearance-title"
        >
          <button
            aria-pressed={theme === 'dark'}
            className="settings-choice"
            onClick={() => setTheme('dark')}
            type="button"
          >
            <span className="settings-choice-title">Dark</span>
            <span className="settings-choice-meta">Slate surfaces, light text</span>
          </button>
          <button
            aria-pressed={theme === 'light'}
            className="settings-choice"
            onClick={() => setTheme('light')}
            type="button"
          >
            <span className="settings-choice-title">Light</span>
            <span className="settings-choice-meta">Mist surface, dark text</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="settings-location-title" className="settings-section" id="location">
        <div className="settings-section-heading">
          <h2 className="settings-section-title" id="settings-location-title">
            Location
          </h2>
          <p className="settings-section-description">
            The current location drives the map, alerts, and forecast panels.
          </p>
        </div>
        <p className="settings-location">
          <span className="settings-location-label">Current location</span>
          <span className="settings-location-value">{location.label}</span>
          <span className="settings-location-hint">
            Use the map-pin control in the top navigation to search for another place or use your
            current location.
          </span>
        </p>
      </section>

      <section aria-labelledby="settings-profile-title" className="settings-section" id="profile">
        <div className="settings-section-heading">
          <h2 className="settings-section-title" id="settings-profile-title">
            Profile
          </h2>
          <p className="settings-section-description">
            Account management is not available yet. Forecasts and preferences stay on this device.
          </p>
        </div>
      </section>
    </div>
  );
}
