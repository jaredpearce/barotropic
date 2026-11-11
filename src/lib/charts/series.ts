/**
 * Chart data shapes and normalized-record conversion.
 *
 * Timestamps are reduced to epoch milliseconds so the chart scales can consume
 * them directly. NWS records carry an explicit UTC offset; Open-Meteo
 * comparison requests use `timezone=UTC`, which returns bare local strings, so
 * a `Z` is appended before parsing.
 */

import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';

export interface ChartPoint {
  /** Epoch milliseconds. */
  timestamp: number;
  value: number | null;
}

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
  /** Compare screen: provider initialization/issue time. */
  runTime?: string | null;
  /** Compare screen: when this app fetched the series. */
  retrievedAt?: string;
  /** Error chart: e.g. "12 samples" or "latest revision only". */
  description?: string;
  note?: string;
}

export type SeriesAccessor = (record: NormalizedWeatherRecord) => number | null | undefined;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * Parse a normalized record timestamp into epoch milliseconds.
 *
 * Returns `null` for empty or unparseable timestamps so callers can drop them.
 */
export function parseRecordTimestamp(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;

  let candidate = timestamp;
  if (DATE_ONLY.test(candidate)) {
    candidate = `${candidate}T00:00:00Z`;
  } else if (!HAS_ZONE.test(candidate)) {
    candidate = `${candidate}Z`;
  }

  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Convert normalized records into sorted chart points, preserving null gaps. */
export function seriesFromRecords(
  records: readonly NormalizedWeatherRecord[],
  accessor: SeriesAccessor,
): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const record of records) {
    const timestamp = parseRecordTimestamp(record.timestamp);
    if (timestamp === null) continue;
    points.push({ timestamp, value: finiteOrNull(accessor(record)) });
  }
  return points.sort((left, right) => left.timestamp - right.timestamp);
}

export interface BuildSeriesOptions {
  id: string;
  label: string;
  color: string;
  records: readonly NormalizedWeatherRecord[];
  accessor: SeriesAccessor;
  runTime?: string | null;
  retrievedAt?: string;
  description?: string;
  note?: string;
}

/** Build a `ChartSeries` from normalized records and an accessor. */
export function buildSeries({ records, accessor, ...rest }: BuildSeriesOptions): ChartSeries {
  return { ...rest, points: seriesFromRecords(records, accessor) };
}

/** Whether any series has at least one non-null point. */
export function hasChartData(series: readonly ChartSeries[]): boolean {
  return series.some((item) => item.points.some((point) => point.value !== null));
}

/**
 * Split points into contiguous runs of non-null values.
 *
 * A null value ends the current run so lines break at gaps instead of bridging
 * missing data.
 */
export function splitSegments(points: readonly ChartPoint[]): ChartPoint[][] {
  const segments: ChartPoint[][] = [];
  let current: ChartPoint[] = [];

  for (const point of points) {
    if (point.value === null) {
      if (current.length > 0) segments.push(current);
      current = [];
    } else {
      current.push(point);
    }
  }
  if (current.length > 0) segments.push(current);

  return segments;
}

/** Apply a value transform (e.g. unit conversion) to every non-null point. */
export function mapSeriesValues(
  series: readonly ChartSeries[],
  map: (value: number) => number,
): ChartSeries[] {
  return series.map((item) => ({
    ...item,
    points: item.points.map((point) => ({
      ...point,
      value: point.value === null ? null : map(point.value),
    })),
  }));
}
