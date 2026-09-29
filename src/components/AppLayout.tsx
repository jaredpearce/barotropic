'use client';

import React, { ReactNode } from 'react';

interface AppLayoutProps {
  children?: ReactNode;
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
          <button className="app-button">⌖ Cary, NC⌄</button>
          <button aria-label="Toggle theme" className="app-button">☼</button>
        </div>
      </nav>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_300px]">
        <main className="app-main">
          {children ?? <div className="app-map-placeholder">Map Area</div>}
        </main>

        <aside className="app-sidebar">
          <section className="app-section">
            <h2 className="app-section-title">Active alerts (1)</h2>
            <div className="app-alert">
              <p className="app-alert-title">Heat advisory</p>
              <p className="app-alert-subtitle">Wake / Chatham / Durham counties</p>
              <p className="app-alert-meta">Until 8:00 PM EDT · NWS Raleigh</p>
            </div>
          </section>

          <section className="app-section">
            <div className="flex justify-between text-[10px] tracking-[0.14em]">
              <h2 className="app-section-title" style={{ marginBottom: 0 }}>Current conditions · KRDU</h2>
              <span>⌄</span>
            </div>
            <div className="app-conditions-section">
              <span className="app-conditions-temp">84°</span>
              <span className="app-conditions-meta">Feels 91°F</span>
            </div>
            <p className="app-conditions-description">SCT045 · Partly Cloudy</p>
            <div className="app-conditions-grid">
              <div>
                <p className="app-conditions-item-label">Wind</p>
                <p className="app-conditions-item-value">↘ SE 9 kt</p>
                <p className="app-conditions-item-meta">G 15 kt</p>
              </div>
              <div>
                <p className="app-conditions-item-label">PoP</p>
                <p className="app-conditions-item-value">60%</p>
                <p className="app-conditions-item-meta">TSRA possible</p>
              </div>
              <div>
                <p className="app-conditions-item-label">Pressure</p>
                <p className="app-conditions-item-value">1012.4 mb</p>
                <p className="app-conditions-item-meta negative">-0.8/3h ↓</p>
              </div>
              <div>
                <p className="app-conditions-item-label">Dewpoint</p>
                <p className="app-conditions-item-value">70°F</p>
                <p className="app-conditions-item-meta">RH 64%</p>
              </div>
            </div>
          </section>

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
