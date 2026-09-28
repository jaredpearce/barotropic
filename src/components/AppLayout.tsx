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
    <div className="grid h-screen w-screen grid-rows-[auto_1fr] overflow-hidden bg-slate-950 text-white">
      <nav className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tracking-[0.18em]">◉ BAROTROPIC</span>
          <span className="flex items-center gap-2 text-[10px] tracking-[0.14em] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> LIVE · 4 MIN AGO
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button className="rounded border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">ⓘ Ask Barotropic</button>
          <button className="rounded border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">⌖ Cary, NC⌄</button>
          <button aria-label="Toggle theme" className="rounded border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800">☼</button>
        </div>
      </nav>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_300px]">
        <main className="relative min-h-0 overflow-hidden bg-[#0d1a2c]">
          {children ?? <div className="flex h-full items-center justify-center text-sm text-slate-500">Map Area</div>}
        </main>

        <aside className="min-h-0 overflow-y-auto border-l border-slate-700 bg-slate-800/90">
          <section className="border-b border-slate-700 p-4">
            <h2 className="mb-3 text-[10px] tracking-[0.16em] text-slate-400">ACTIVE ALERTS (1)</h2>
            <div className="rounded border border-amber-500/70 bg-slate-700/60 p-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-amber-400">HEAT ADVISORY</p>
              <p className="mt-1 text-xs text-slate-300">Wake / Chatham / Durham counties</p>
              <p className="mt-1 text-[10px] text-slate-400">Until 8:00 PM EDT · NWS Raleigh</p>
            </div>
          </section>

          <section className="border-b border-slate-700 p-4">
            <div className="flex justify-between text-[10px] tracking-[0.14em] text-slate-400">
              <h2>CURRENT CONDITIONS · KRDU</h2><span>⌄</span>
            </div>
            <div className="mt-3 flex items-end gap-3"><span className="text-4xl font-light">84°</span><span className="pb-1 text-xs text-slate-400">Feels 91°F</span></div>
            <p className="mt-2 text-xs text-slate-400">SCT045 · Partly Cloudy</p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
              <div><p className="text-[10px] text-slate-500">Wind</p><p className="mt-1">↘ SE 9 kt</p><p className="text-slate-400">G 15 kt</p></div>
              <div><p className="text-[10px] text-slate-500">PoP</p><p className="mt-1">60%</p><p className="text-slate-400">TSRA possible</p></div>
              <div><p className="text-[10px] text-slate-500">Pressure</p><p className="mt-1">1012.4 mb</p><p className="text-rose-400">-0.8/3h ↓</p></div>
              <div><p className="text-[10px] text-slate-500">Dewpoint</p><p className="mt-1">70°F</p><p className="text-slate-400">RH 64%</p></div>
            </div>
          </section>

          <section className="p-4">
            <h2 className="mb-3 text-[10px] tracking-[0.16em] text-slate-400">HOURLY FORECAST · 24H LOCAL</h2>
            <div className="grid grid-cols-[54px_24px_42px_32px_1fr] gap-x-2 border-b border-slate-700 pb-2 text-[9px] text-slate-500"><span>Time</span><span /><span>°F</span><span>PoP</span><span>Wind</span></div>
            <div className="divide-y divide-slate-700/70">
              {hourlyForecast.map((hour) => (
                <div key={hour.time} className="grid grid-cols-[54px_24px_42px_32px_1fr] items-center gap-x-2 py-2 text-xs">
                  <span className="text-slate-300">{hour.time}</span><span className="text-base">☀</span><span>{hour.temperature}</span><span className="text-slate-400">{hour.precipitation}</span><span className="text-slate-500">{hour.wind}</span>
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
