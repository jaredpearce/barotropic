/**
 * Geometry helpers for NWS alert polygons.
 *
 * GeoJSON positions are [longitude, latitude]. The preview projection is a
 * small equirectangular canvas; it is intentionally not a map replacement. The
 * same point-in-polygon rules are used to decide whether an alert polygon
 * actually covers the selected location.
 */

import type { GeoJsonPolygonalGeometry } from '@/lib/schemas/geojson';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type AlertGeometryMatch = 'polygon' | 'area' | 'outside';
export type AlertGeometryKind = 'polygon' | 'multi-polygon' | 'area';

export interface GeometryBounds {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
}

export interface AlertGeometryPath {
  d: string;
  containsPoint: boolean;
}

export interface AlertGeometryPreview {
  kind: AlertGeometryKind;
  polygonCount: number;
  paths: AlertGeometryPath[];
}

export interface PolygonPreviewOptions {
  width?: number;
  height?: number;
  padding?: number;
}

type Ring = ReadonlyArray<readonly number[]>;
type Polygon = ReadonlyArray<Ring>;

const DEFAULT_PREVIEW_WIDTH = 120;
const DEFAULT_PREVIEW_HEIGHT = 72;
const DEFAULT_PREVIEW_PADDING = 4;
const BOUNDARY_EPSILON = 1e-10;

function isFinitePosition(position: readonly number[]): boolean {
  return (
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1])
  );
}

function getRings(geometry: GeoJsonPolygonalGeometry): Polygon[] {
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates;

  return polygons.map((polygon) => polygon as Polygon);
}

/**
 * Count the polygon parts in an alert geometry. A plain Polygon counts as one.
 */
export function getPolygonCount(
  geometry: GeoJsonPolygonalGeometry | null
): number {
  if (!geometry) return 0;
  return geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
}

/**
 * Compute the longitude/latitude bounds of an alert geometry.
 */
export function getGeometryBounds(
  geometry: GeoJsonPolygonalGeometry | null
): GeometryBounds | null {
  if (!geometry) return null;

  let minLongitude = Number.POSITIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;
  let hasPosition = false;

  for (const polygon of getRings(geometry)) {
    for (const ring of polygon) {
      for (const position of ring) {
        if (!isFinitePosition(position)) continue;

        const longitude = position[0];
        const latitude = position[1];
        minLongitude = Math.min(minLongitude, longitude);
        minLatitude = Math.min(minLatitude, latitude);
        maxLongitude = Math.max(maxLongitude, longitude);
        maxLatitude = Math.max(maxLatitude, latitude);
        hasPosition = true;
      }
    }
  }

  if (!hasPosition) return null;

  return { minLongitude, minLatitude, maxLongitude, maxLatitude };
}

function pointOnSegment(
  point: GeoPoint,
  start: readonly number[],
  end: readonly number[]
): boolean {
  const startLongitude = start[0];
  const startLatitude = start[1];
  const endLongitude = end[0];
  const endLatitude = end[1];

  const crossProduct =
    (point.longitude - startLongitude) * (endLatitude - startLatitude) -
    (point.latitude - startLatitude) * (endLongitude - startLongitude);

  if (Math.abs(crossProduct) > BOUNDARY_EPSILON) return false;

  const dotProduct =
    (point.longitude - startLongitude) *
      (point.longitude - endLongitude) +
    (point.latitude - startLatitude) * (point.latitude - endLatitude);

  return dotProduct <= BOUNDARY_EPSILON;
}

/**
 * Test a point against a single linear ring.
 *
 * Boundary points are treated as inside so a polygon edge never produces a
 * false "outside your area" classification.
 */
export function pointInRing(point: GeoPoint, ring: Ring): boolean {
  if (ring.length < 3) return false;

  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const start = ring[previous];
    const end = ring[index];

    if (!start || !end) continue;
    if (!isFinitePosition(start) || !isFinitePosition(end)) continue;

    if (pointOnSegment(point, start, end)) return true;

    const startLatitude = start[1];
    const endLatitude = end[1];

    if (
      (startLatitude > point.latitude) ===
      (endLatitude > point.latitude)
    ) {
      continue;
    }

    const intersectionLongitude =
      ((end[0] - start[0]) * (point.latitude - startLatitude)) /
        (endLatitude - startLatitude) +
      start[0];

    if (point.longitude < intersectionLongitude) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Test a point against a polygon's exterior ring and its holes.
 */
export function pointInPolygon(point: GeoPoint, polygon: Polygon): boolean {
  const exterior = polygon[0];
  if (!exterior || !pointInRing(point, exterior)) return false;

  for (let index = 1; index < polygon.length; index += 1) {
    const hole = polygon[index];
    if (hole && pointInRing(point, hole)) return false;
  }

  return true;
}

/**
 * Test a point against every polygon part in a MultiPolygon.
 */
export function pointInMultiPolygon(
  point: GeoPoint,
  polygons: ReadonlyArray<Polygon>
): boolean {
  return polygons.some((polygon) => pointInPolygon(point, polygon));
}

/**
 * Test a point against any polygonal alert geometry.
 */
export function pointInPolygonalGeometry(
  point: GeoPoint,
  geometry: GeoJsonPolygonalGeometry
): boolean {
  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, geometry.coordinates as Polygon);
  }

  return pointInMultiPolygon(point, geometry.coordinates as ReadonlyArray<Polygon>);
}

/**
 * Classify the relationship between an alert geometry and the selected point.
 *
 * A null geometry is a real NWS state, not an error: the alert is area-based
 * (typically zone or county based) rather than polygon-based.
 */
export function classifyAlertGeometry(
  geometry: GeoJsonPolygonalGeometry | null,
  point: GeoPoint | null | undefined
): AlertGeometryMatch {
  if (!geometry) return 'area';
  if (!point) return 'polygon';

  return pointInPolygonalGeometry(point, geometry) ? 'polygon' : 'outside';
}

function unwrapLongitude(longitude: number, reference: number): number {
  let value = longitude;

  while (value - reference > 180) value -= 360;
  while (reference - value > 180) value += 360;

  return value;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Build a small SVG preview for an alert geometry.
 *
 * Each polygon part becomes one path so holes can use `fill-rule="evenodd"`
 * and the part that contains the selected point can be highlighted.
 */
export function buildGeometryPreview(
  geometry: GeoJsonPolygonalGeometry | null,
  point?: GeoPoint | null,
  options: PolygonPreviewOptions = {}
): AlertGeometryPreview {
  if (!geometry) {
    return { kind: 'area', polygonCount: 0, paths: [] };
  }

  const width = options.width ?? DEFAULT_PREVIEW_WIDTH;
  const height = options.height ?? DEFAULT_PREVIEW_HEIGHT;
  const padding = options.padding ?? DEFAULT_PREVIEW_PADDING;
  const polygons = getRings(geometry);

  const referenceLongitude = polygons
    .flatMap((polygon) => polygon)
    .flatMap((ring) => ring)
    .find((position) => isFinitePosition(position))?.[0];

  if (referenceLongitude === undefined) {
    return {
      kind: geometry.type === 'Polygon' ? 'polygon' : 'multi-polygon',
      polygonCount: polygons.length,
      paths: [],
    };
  }

  const projectedPolygons = polygons.map((polygon) =>
    polygon.map((ring) =>
      ring
        .filter((position) => isFinitePosition(position))
        .map((position) => ({
          longitude: unwrapLongitude(position[0], referenceLongitude),
          latitude: position[1],
        }))
    )
  );

  const allPositions = projectedPolygons.flatMap((polygon) =>
    polygon.flatMap((ring) => ring)
  );

  if (allPositions.length === 0) {
    return {
      kind: geometry.type === 'Polygon' ? 'polygon' : 'multi-polygon',
      polygonCount: polygons.length,
      paths: [],
    };
  }

  const meanLatitude =
    allPositions.reduce((sum, position) => sum + position.latitude, 0) /
    allPositions.length;
  const longitudeScale = Math.max(
    Math.cos((meanLatitude * Math.PI) / 180),
    0.01
  );

  const projectedPoints = allPositions.map((position) => ({
    x: position.longitude * longitudeScale,
    y: position.latitude,
  }));

  const minX = Math.min(...projectedPoints.map((position) => position.x));
  const maxX = Math.max(...projectedPoints.map((position) => position.x));
  const minY = Math.min(...projectedPoints.map((position) => position.y));
  const maxY = Math.max(...projectedPoints.map((position) => position.y));

  const rangeX = Math.max(maxX - minX, 1e-6);
  const rangeY = Math.max(maxY - minY, 1e-6);
  const innerWidth = Math.max(width - padding * 2, 1);
  const innerHeight = Math.max(height - padding * 2, 1);
  const scale = Math.min(innerWidth / rangeX, innerHeight / rangeY);
  const offsetX = padding + (innerWidth - rangeX * scale) / 2;
  const offsetY = padding + (innerHeight - rangeY * scale) / 2;

  const paths = polygons.flatMap((polygon, polygonIndex) => {
    const projectedRings = projectedPolygons[polygonIndex] ?? [];
    const commands = projectedRings
      .filter((ring) => ring.length >= 3)
      .map((ring) => {
        const ringCommands = ring.map((position, index) => {
          const x = roundCoordinate(
            offsetX + (position.longitude * longitudeScale - minX) * scale
          );
          const y = roundCoordinate(
            offsetY + (maxY - position.latitude) * scale
          );
          return `${index === 0 ? 'M' : 'L'}${x},${y}`;
        });

        return `${ringCommands.join(' ')} Z`;
      })
      .filter(Boolean);

    if (commands.length === 0) return [];

    return [
      {
        d: commands.join(' '),
        containsPoint: point ? pointInPolygon(point, polygon) : false,
      },
    ];
  });

  return {
    kind: geometry.type === 'Polygon' ? 'polygon' : 'multi-polygon',
    polygonCount: polygons.length,
    paths,
  };
}
