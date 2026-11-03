'use client';

import dynamic from 'next/dynamic';
import type { DeskMapProps } from './DeskMap';

const DeskMap = dynamic<DeskMapProps>(() => import('./DeskMap').then((module) => module.DeskMap), {
  ssr: false,
  loading: () => (
    <div className="desk-map-overlay" role="status">
      <p>Loading map…</p>
    </div>
  ),
});

/**
 * Client-only entry point for the map.
 *
 * Keeping `next/dynamic({ ssr: false })` in its own module lets the shell stay
 * server-renderable while MapLibre (and its WebGL requirement) load on demand.
 */
export function MapPanel(props: DeskMapProps) {
  return <DeskMap {...props} />;
}

export default MapPanel;
