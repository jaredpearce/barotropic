import { describe, expect, it } from 'vitest';
import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';
import {
  buildSeries,
  hasChartData,
  mapSeriesValues,
  parseRecordTimestamp,
  seriesFromRecords,
  splitSegments,
  type ChartPoint,
} from './series';
import { chartColors } from './theme';
import { chartVariables } from './variables';

function record(
  overrides: Partial<NormalizedWeatherRecord> & { timestamp: string },
): NormalizedWeatherRecord {
  return {
    source: 'NWS',
    retrievedAt: '2026-11-03T12:00:00Z',
    issuedAt: '2026-11-03T11:00:00Z',
    ...overrides,
  };
}

describe('parseRecordTimestamp', () => {
  it('parses NWS timestamps with an explicit offset', () => {
    expect(parseRecordTimestamp('2026-11-03T12:00:00-05:00')).toBe(
      Date.parse('2026-11-03T17:00:00Z'),
    );
  });

  it('treats bare Open-Meteo timestamps as UTC', () => {
    expect(parseRecordTimestamp('2026-11-03T12:00')).toBe(Date.parse('2026-11-03T12:00:00Z'));
  });

  it('parses date-only and Z-suffixed timestamps', () => {
    expect(parseRecordTimestamp('2026-11-03')).toBe(Date.parse('2026-11-03T00:00:00Z'));
    expect(parseRecordTimestamp('2026-11-03T12:00:00Z')).toBe(Date.parse('2026-11-03T12:00:00Z'));
  });

  it('returns null for empty or unparseable timestamps', () => {
    expect(parseRecordTimestamp('')).toBeNull();
    expect(parseRecordTimestamp(null)).toBeNull();
    expect(parseRecordTimestamp('not-a-timestamp')).toBeNull();
    expect(parseRecordTimestamp('2026-13-40')).toBeNull();
  });
});

describe('seriesFromRecords', () => {
  it('maps records to sorted points and preserves nulls as gaps', () => {
    const points = seriesFromRecords(
      [
        record({ timestamp: '2026-11-03T12:00:00Z', temperatureC: 20 }),
        record({ timestamp: '2026-11-03T10:00:00Z', temperatureC: 18 }),
        record({ timestamp: '2026-11-03T11:00:00Z', temperatureC: null }),
        record({ timestamp: 'not-a-timestamp', temperatureC: 99 }),
      ],
      chartVariables.temperature.accessor,
    );

    expect(points.map((point) => point.value)).toEqual([18, null, 20]);
    expect(points[0].timestamp).toBeLessThan(points[2].timestamp);
  });

  it('treats non-finite values as gaps', () => {
    const points = seriesFromRecords(
      [record({ timestamp: '2026-11-03T12:00:00Z', windSpeedMps: Number.NaN })],
      chartVariables.wind.accessor,
    );
    expect(points).toEqual([{ timestamp: Date.parse('2026-11-03T12:00:00Z'), value: null }]);
  });
});

describe('splitSegments', () => {
  it('breaks lines at nulls', () => {
    const points: ChartPoint[] = [
      { timestamp: 1, value: 1 },
      { timestamp: 2, value: 2 },
      { timestamp: 3, value: null },
      { timestamp: 4, value: 3 },
    ];

    const segments = splitSegments(points);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toHaveLength(2);
    expect(segments[1]).toHaveLength(1);
  });

  it('drops leading and trailing nulls', () => {
    expect(
      splitSegments([
        { timestamp: 1, value: null },
        { timestamp: 2, value: 5 },
        { timestamp: 3, value: null },
      ]),
    ).toHaveLength(1);
  });
});

describe('hasChartData', () => {
  const base = buildSeries({
    id: 'x',
    label: 'X',
    color: '#000000',
    records: [],
    accessor: chartVariables.temperature.accessor,
  });

  it('is false with no series, no points, or only null points', () => {
    expect(hasChartData([])).toBe(false);
    expect(hasChartData([base])).toBe(false);
    expect(hasChartData([{ ...base, points: [{ timestamp: 1, value: null }] }])).toBe(false);
  });

  it('is true when any point has a value', () => {
    expect(hasChartData([{ ...base, points: [{ timestamp: 1, value: 5 }] }])).toBe(true);
  });
});

describe('mapSeriesValues', () => {
  it('converts values without touching nulls', () => {
    const converted = mapSeriesValues(
      [
        {
          id: 'a',
          label: 'A',
          color: '#000000',
          points: [
            { timestamp: 1, value: 0 },
            { timestamp: 2, value: null },
          ],
        },
      ],
      (value) => value + 32,
    );

    expect(converted[0].points).toEqual([
      { timestamp: 1, value: 32 },
      { timestamp: 2, value: null },
    ]);
  });
});

describe('chart variables', () => {
  it('converts and labels temperature', () => {
    expect(
      chartVariables.temperature.accessor(
        record({ timestamp: '2026-11-03T12:00:00Z', temperatureC: 20 }),
      ),
    ).toBe(20);
    expect(chartVariables.temperature.toDisplay(0, 'imperial')).toBe(32);
    expect(chartVariables.temperature.unitLabel('imperial')).toBe('°F');
    expect(chartVariables.temperature.unitLabel('metric')).toBe('°C');
    expect(chartVariables.temperature.format(20, 'metric')).toBe('20°');
  });

  it('converts and labels wind', () => {
    expect(chartVariables.wind.toDisplay(10, 'imperial')).toBeCloseTo(22.369, 3);
    expect(chartVariables.wind.toDisplay(10, 'metric')).toBe(10);
    expect(chartVariables.wind.unitLabel('imperial')).toBe('mph');
    expect(chartVariables.wind.unitLabel('metric')).toBe('m/s');
  });

  it('fixes the precipitation domain and labels percent', () => {
    expect(chartVariables.precipitation.yDomain).toEqual([0, 100]);
    expect(chartVariables.precipitation.unitLabel('imperial')).toBe('%');
    expect(chartVariables.precipitation.format(40, 'metric')).toBe('40%');
  });
});

describe('chart colors', () => {
  it('maps each source to a distinct color', () => {
    const colors = Object.values(chartColors);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
