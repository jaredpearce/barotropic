'use client';

import type { ChartSeries } from '@/lib/charts/series';

export interface SeriesLegendProps {
  series: ChartSeries[];
  /** Formats a run time; defaults to the raw ISO string. */
  formatRunTime?: (value: string) => string;
  /** Formats a retrieval time; defaults to the raw ISO string. */
  formatRetrievedAt?: (value: string) => string;
}

/**
 * Accessible HTML legend for a chart.
 *
 * Rendered as HTML rather than SVG so run/retrieved metadata is selectable and
 * testable. `runTime === null` renders "unavailable"; `undefined` renders
 * nothing.
 */
export default function SeriesLegend({
  series,
  formatRunTime,
  formatRetrievedAt,
}: SeriesLegendProps) {
  return (
    <ul className="series-legend">
      {series.map((item) => (
        <li className="series-legend-item" key={item.id}>
          <span
            aria-hidden="true"
            className="series-legend-swatch"
            style={{ backgroundColor: item.color }}
          />
          <span className="series-legend-label">{item.label}</span>
          {item.runTime !== undefined && (
            <span className="series-legend-meta">
              Run: {item.runTime ? (formatRunTime?.(item.runTime) ?? item.runTime) : 'unavailable'}
            </span>
          )}
          {item.retrievedAt && (
            <span className="series-legend-meta">
              Retrieved: {formatRetrievedAt?.(item.retrievedAt) ?? item.retrievedAt}
            </span>
          )}
          {item.description && <span className="series-legend-meta">{item.description}</span>}
          {item.note && <span className="series-legend-note">{item.note}</span>}
        </li>
      ))}
    </ul>
  );
}
