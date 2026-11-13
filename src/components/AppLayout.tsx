'use client';

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { useActiveAlerts } from '@/lib/hooks/use-active-alerts';
import { useCurrentConditions } from '@/lib/hooks/use-current-conditions';
import { useSelectedLocation } from '@/lib/hooks/use-selected-location';
import ActiveAlerts from './ActiveAlerts';
import CurrentConditions from './CurrentConditions';
import HourlyForecast from './HourlyForecast';
import MapPanel from './MapPanel';

interface AppLayoutProps {
  children?: ReactNode;
}

/**
 * Main dark-mode application content shell for Barotropic.
 *
 * The persistent top navigation lives in the root layout so every route shares
 * it; this component owns the map/sidebar split and the weather panels.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { location } = useSelectedLocation();
  const [isWeatherSidebarOpen, setIsWeatherSidebarOpen] = useState(false);
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDesktop = window.matchMedia?.('(min-width: 768px)').matches ?? window.innerWidth >= 768;
    setIsWeatherSidebarOpen(isDesktop);
  }, []);

  // Apply `inert` imperatively: React 19 expects a boolean prop, while the
  // React build used for SSR in Next 14 only understands the empty-string form.
  useEffect(() => {
    const content = sidebarContentRef.current;
    if (!content) return;
    if (isWeatherSidebarOpen) content.removeAttribute('inert');
    else content.setAttribute('inert', '');
  }, [isWeatherSidebarOpen]);

  const alerts = useActiveAlerts({
    latitude: location.latitude,
    longitude: location.longitude,
  });
  const currentConditions = useCurrentConditions({
    latitude: location.latitude,
    longitude: location.longitude,
  });

  return (
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
        <div id="weather-sidebar-content" hidden={!isWeatherSidebarOpen} ref={sidebarContentRef}>
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
  );
};

export default AppLayout;
