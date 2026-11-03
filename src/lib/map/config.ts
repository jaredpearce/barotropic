/**
 * Map configuration shared by the desk map.
 *
 * The basemap is OpenFreeMap's dark style: no API key, no per-request token,
 * and attribution is required. Deployments can point at another MapLibre style
 * with `NEXT_PUBLIC_MAP_STYLE_URL` without touching component code.
 */

/** OpenFreeMap dark style used by default. */
export const OPENFREEMAP_DARK_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

/**
 * Base-reflectivity radar tiles from the Iowa Environmental Mesonet.
 *
 * The composite is keyless, serves CORS headers, and refreshes every few
 * minutes. It covers the same NWS domain used by the rest of the desk.
 */
export const IEM_RADAR_TILE_URL =
  'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';

/** Attribution for the radar raster, shown by MapLibre's attribution control. */
export const RADAR_ATTRIBUTION =
  '<a href="https://mesonet.agron.iastate.edu/ogc/" target="_blank" rel="noopener noreferrer">Iowa Environmental Mesonet</a>';

/** Attribution shown in the compact attribution control. */
export const MAP_ATTRIBUTION =
  '© <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · Data from OpenStreetMap';

/** Zoom used on first render and when the selected location changes. */
export const MAP_DEFAULT_ZOOM = 9;

/** Lower bound that still keeps the map recognizable. */
export const MAP_MIN_ZOOM = 3;

/** Upper bound that avoids over-zooming beyond useful basemap detail. */
export const MAP_MAX_ZOOM = 16;

/** Duration of the location-change camera flight. */
export const MAP_FLY_DURATION_MS = 1200;

/** Coordinate tolerance for deciding whether the camera actually moved. */
export const MAP_CENTER_EPSILON = 0.0001;

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

/** Observation station rendered on the desk map. */
export interface MapStation extends MapCoordinates {
  id: string;
  name?: string;
}

/** MapLibre orders coordinates as `[longitude, latitude]`. */
export type MapCenter = [longitude: number, latitude: number];

/**
 * Resolve the style URL, preferring an explicit override when it is non-empty.
 *
 * Pure so the fallback rules can be tested without mutating the environment.
 */
export function resolveMapStyleUrl(override?: string | null): string {
  const trimmed = override?.trim();
  return trimmed ? trimmed : OPENFREEMAP_DARK_STYLE_URL;
}

/** Resolve the radar tile template, preferring an explicit override when set. */
export function resolveRadarTileUrl(override?: string | null): string {
  const trimmed = override?.trim();
  return trimmed ? trimmed : IEM_RADAR_TILE_URL;
}

/** Style URL used by the map, with an optional deployment override. */
export const MAP_STYLE_URL = resolveMapStyleUrl(process.env.NEXT_PUBLIC_MAP_STYLE_URL);

/** Radar tile template used by the map, with an optional deployment override. */
export const MAP_RADAR_TILE_URL = resolveRadarTileUrl(process.env.NEXT_PUBLIC_RADAR_TILE_URL);

/** Convert domain coordinates into MapLibre's longitude-first order. */
export function toMapCenter({ latitude, longitude }: MapCoordinates): MapCenter {
  return [longitude, latitude];
}
