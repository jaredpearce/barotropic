import { describe, expect, it } from 'vitest';
import type {
  GeoJsonMultiPolygon,
  GeoJsonPolygon,
  GeoJsonPolygonalGeometry,
} from '@/lib/schemas/geojson';
import {
  buildGeometryPreview,
  classifyAlertGeometry,
  getGeometryBounds,
  getPolygonCount,
  pointInMultiPolygon,
  pointInPolygon,
  pointInRing,
} from './geometry';

type Position = [number, number];
type Ring = Position[];

const SQUARE_RING: Ring = [
  [-79, 35],
  [-78, 35],
  [-78, 36],
  [-79, 36],
  [-79, 35],
];

const OUTER_RING: Ring = [
  [-79, 35],
  [-78, 35],
  [-78, 36],
  [-79, 36],
  [-79, 35],
];

const HOLE_RING: Ring = [
  [-78.7, 35.3],
  [-78.3, 35.3],
  [-78.3, 35.7],
  [-78.7, 35.7],
  [-78.7, 35.3],
];

const SECOND_RING: Ring = [
  [-77, 35],
  [-76, 35],
  [-76, 36],
  [-77, 36],
  [-77, 35],
];

const INSIDE = { latitude: 35.5, longitude: -78.5 };
const OUTSIDE = { latitude: 34.5, longitude: -78.5 };

function polygon(rings: Ring[]): GeoJsonPolygon {
  return { type: 'Polygon', coordinates: rings };
}

function multiPolygon(polygons: Ring[][]): GeoJsonMultiPolygon {
  return { type: 'MultiPolygon', coordinates: polygons };
}

describe('alert geometry', () => {
  it('Use Case: detects a point inside a linear ring', () => {
    expect(pointInRing(INSIDE, SQUARE_RING)).toBe(true);
    expect(pointInRing(OUTSIDE, SQUARE_RING)).toBe(false);
  });

  it('Use Case: treats a point on the polygon boundary as inside', () => {
    expect(pointInRing({ latitude: 35, longitude: -78.5 }, SQUARE_RING)).toBe(
      true
    );
  });

  it('Use Case: excludes holes from a polygon', () => {
    const withHole = polygon([OUTER_RING, HOLE_RING]);

    expect(pointInPolygon(INSIDE, [OUTER_RING])).toBe(true);
    expect(
      pointInPolygon({ latitude: 35.5, longitude: -78.5 }, withHole.coordinates)
    ).toBe(false);
  });

  it('Use Case: matches a point against any MultiPolygon part', () => {
    const parts = [[OUTER_RING], [SECOND_RING]];

    expect(
      pointInMultiPolygon({ latitude: 35.5, longitude: -76.5 }, parts)
    ).toBe(true);
    expect(pointInMultiPolygon({ latitude: 34.5, longitude: -76.5 }, parts)).toBe(
      false
    );
  });

  it('Use Case: distinguishes polygon, outside, and area-based alerts', () => {
    const geometry: GeoJsonPolygonalGeometry = polygon([SQUARE_RING]);

    expect(classifyAlertGeometry(geometry, INSIDE)).toBe('polygon');
    expect(classifyAlertGeometry(geometry, OUTSIDE)).toBe('outside');
    expect(classifyAlertGeometry(null, INSIDE)).toBe('area');
  });

  it('Use Case: reports the polygon count and coordinate bounds', () => {
    const geometry = multiPolygon([
      [OUTER_RING],
      [SECOND_RING],
    ]);

    expect(getPolygonCount(geometry)).toBe(2);
    expect(getPolygonCount(polygon([SQUARE_RING]))).toBe(1);
    expect(getPolygonCount(null)).toBe(0);
    expect(getGeometryBounds(geometry)).toEqual({
      minLongitude: -79,
      minLatitude: 35,
      maxLongitude: -76,
      maxLatitude: 36,
    });
  });

  it('Use Case: builds an SVG path for a polygon preview', () => {
    const preview = buildGeometryPreview(polygon([SQUARE_RING]), INSIDE);

    expect(preview.kind).toBe('polygon');
    expect(preview.polygonCount).toBe(1);
    expect(preview.paths).toHaveLength(1);
    expect(preview.paths[0].d).toMatch(/^M\d+(\.\d+)?,\d+(\.\d+)? L/);
    expect(preview.paths[0].containsPoint).toBe(true);
  });

  it('Use Case: highlights the MultiPolygon part containing the point', () => {
    const preview = buildGeometryPreview(
      multiPolygon([[OUTER_RING], [SECOND_RING]]),
      { latitude: 35.5, longitude: -76.5 }
    );

    expect(preview.kind).toBe('multi-polygon');
    expect(preview.polygonCount).toBe(2);
    expect(preview.paths).toHaveLength(2);
    expect(preview.paths[0].containsPoint).toBe(false);
    expect(preview.paths[1].containsPoint).toBe(true);
  });

  it('Use Case: represents area-based alerts without a fake polygon', () => {
    const preview = buildGeometryPreview(null, INSIDE);

    expect(preview).toEqual({ kind: 'area', polygonCount: 0, paths: [] });
  });
});
