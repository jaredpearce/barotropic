/**
 * GeoJSON builders for the desk map overlays.
 *
 * Alert polygons and observation stations are converted here so MapLibre's
 * sources stay declarative and the mapping rules remain unit testable.
 */

import type { FeatureCollection, MultiPolygon, Point as GeoJsonPoint, Polygon } from 'geojson';
import type { AlertCardData, AlertSeverity } from '@/lib/alerts';
import type { GeoJsonPolygonalGeometry } from '@/lib/schemas/geojson';
import type { MapStation } from './config';

export const MAP_ALERT_SOURCE_ID = 'active-alerts';
export const MAP_ALERT_FILL_LAYER_ID = 'active-alerts-fill';
export const MAP_ALERT_LINE_LAYER_ID = 'active-alerts-outline';
export const MAP_STATION_SOURCE_ID = 'observation-stations';
export const MAP_STATION_LAYER_ID = 'observation-stations';
export const MAP_RADAR_SOURCE_ID = 'base-reflectivity';
export const MAP_RADAR_LAYER_ID = 'base-reflectivity';

/** Map colors mirror the CAP severity tokens used by alert cards. */
export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  extreme: '#f43f5e',
  severe: '#fb923c',
  moderate: '#fbbf24',
  minor: '#34d399',
  unknown: '#94a3b8',
};

/** Station dots use a cool tone so they stay distinct from alert colors. */
export const MAP_STATION_COLOR = '#38bdf8';

export interface AlertFeatureProperties {
  id: string;
  event: string;
  severity: AlertSeverity;
  match: AlertCardData['match'];
  color: string;
}

export type AlertFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  AlertFeatureProperties
>;

/**
 * Convert the schema geometry into a GeoJSON geometry.
 *
 * The schema accepts a loosely typed bbox array, while GeoJSON requires a
 * fixed-length bbox. Map overlays do not use bbox, so it is intentionally
 * dropped rather than coerced.
 */
function toGeoJsonGeometry(geometry: GeoJsonPolygonalGeometry): Polygon | MultiPolygon {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates as Polygon['coordinates'],
    };
  }

  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates as MultiPolygon['coordinates'],
  };
}

/**
 * Build a feature collection containing only alerts with published polygons.
 *
 * Area-based alerts (null geometry) remain in the sidebar but have no map
 * footprint, so the map never implies a boundary NWS did not publish.
 */
export function buildAlertFeatureCollection(
  alerts: ReadonlyArray<AlertCardData>,
): AlertFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: alerts.flatMap((alert) => {
      if (!alert.polygon) return [];

      return [
        {
          type: 'Feature' as const,
          id: alert.id,
          geometry: toGeoJsonGeometry(alert.polygon),
          properties: {
            id: alert.id,
            event: alert.event,
            severity: alert.severity,
            match: alert.match,
            color: ALERT_SEVERITY_COLORS[alert.severity],
          },
        },
      ];
    }),
  };
}

export interface StationFeatureProperties {
  id: string;
  name?: string;
}

export type StationFeatureCollection = FeatureCollection<GeoJsonPoint, StationFeatureProperties>;

/** Build a point feature for every observation station in map coordinates. */
export function buildStationFeatureCollection(
  stations: ReadonlyArray<MapStation>,
): StationFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stations.map((station) => ({
      type: 'Feature' as const,
      id: station.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [station.longitude, station.latitude],
      },
      properties: {
        id: station.id,
        ...(station.name ? { name: station.name } : {}),
      },
    })),
  };
}
