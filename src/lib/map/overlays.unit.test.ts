import { describe, expect, it } from 'vitest';
import type { AlertCardData } from '@/lib/alerts';
import type { GeoJsonPolygon } from '@/lib/schemas/geojson';
import {
  ALERT_SEVERITY_COLORS,
  buildAlertFeatureCollection,
  buildStationFeatureCollection,
} from './overlays';

const POLYGON: GeoJsonPolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-79, 35],
      [-78, 35],
      [-78, 36],
      [-79, 36],
      [-79, 35],
    ],
  ],
};

function makeAlert(overrides: Partial<AlertCardData> = {}): AlertCardData {
  return {
    id: 'alert-1',
    event: 'Heat Advisory',
    severity: 'moderate',
    severityLabel: 'Moderate',
    match: 'polygon',
    geometry: { kind: 'polygon', polygonCount: 1, paths: [] },
    polygon: POLYGON,
    retrievedAt: '2026-11-03T12:00:00Z',
    ...overrides,
  };
}

describe('buildAlertFeatureCollection', () => {
  it('Use Case: maps published alert polygons with their severity color', () => {
    const collection = buildAlertFeatureCollection([makeAlert({ severity: 'extreme' })]);

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]).toMatchObject({
      id: 'alert-1',
      geometry: POLYGON,
      properties: {
        id: 'alert-1',
        event: 'Heat Advisory',
        severity: 'extreme',
        match: 'polygon',
        color: ALERT_SEVERITY_COLORS.extreme,
      },
    });
  });

  it('Use Case: omits area-based alerts that have no polygon', () => {
    const collection = buildAlertFeatureCollection([
      makeAlert({ id: 'area', polygon: null, match: 'area' }),
      makeAlert({ id: 'polygon' }),
    ]);

    expect(collection.features.map((feature) => feature.id)).toEqual(['polygon']);
  });
});

describe('buildStationFeatureCollection', () => {
  it('Use Case: maps stations into longitude-first point features', () => {
    const collection = buildStationFeatureCollection([
      {
        id: 'KRDU',
        name: 'Raleigh-Durham International Airport',
        latitude: 35.89,
        longitude: -78.79,
      },
    ]);

    expect(collection.features[0]).toMatchObject({
      id: 'KRDU',
      geometry: { type: 'Point', coordinates: [-78.79, 35.89] },
      properties: { id: 'KRDU', name: 'Raleigh-Durham International Airport' },
    });
  });

  it('Use Case: omits an absent station name', () => {
    const collection = buildStationFeatureCollection([
      { id: 'KRDU', latitude: 35.89, longitude: -78.79 },
    ]);

    expect(collection.features[0].properties).toEqual({ id: 'KRDU' });
  });
});
