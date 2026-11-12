'use client';

import { useMemo, useState } from 'react';
import { buildSeries, mapSeriesValues, type ChartSeries } from '@/lib/charts/series';
import { chartVariableList, chartVariables, type ChartVariableId } from '@/lib/charts/variables';
import { useModelComparison, type ComparisonSource } from '@/lib/hooks/use-model-comparison';
import { useSelectedLocation } from '@/lib/hooks/use-selected-location';
import { useUnitSystem } from '@/lib/hooks/use-unit-system';
import { formatDateTime } from '@/lib/time';
import type { UnitSystem } from '@/lib/units';
import SeriesChart from './SeriesChart';

export interface ModelCompareProps {
  /** Fixed chart width for tests; production measures the container. */
  width?: number;
}

function toChartSeries(
  sources: ComparisonSource[],
  variableId: ChartVariableId,
  unitSystem: UnitSystem,
): ChartSeries[] {
  const variable = chartVariables[variableId];
  const series = sources
    .filter((source) => source.status === 'success')
    .map((source) =>
      buildSeries({
        id: source.id,
        label: source.label,
        color: source.color,
        records: source.records,
        accessor: variable.accessor,
        runTime: source.runTime,
        retrievedAt: source.retrievedAt ?? undefined,
        note: source.note,
      }),
    );

  // Convert once so the plotted values and the axis labels agree.
  return mapSeriesValues(series, (value) => variable.toDisplay(value, unitSystem));
}

/** Compare screen: NWS plus the three Open-Meteo models on one timeline. */
export default function ModelCompare({ width }: ModelCompareProps) {
  const { location } = useSelectedLocation();
  const { unitSystem, toggleUnitSystem } = useUnitSystem();
  const { status, sources, timeZone, lastRetrievedAt, refresh } = useModelComparison({
    latitude: location.latitude,
    longitude: location.longitude,
  });
  const [variableId, setVariableId] = useState<ChartVariableId>('temperature');

  const variable = chartVariables[variableId];
  const series = useMemo(
    () => toChartSeries(sources, variableId, unitSystem),
    [sources, variableId, unitSystem],
  );
  const failed = sources.filter((source) => source.status === 'error');

  return (
    <section aria-labelledby="compare-title" className="compare-screen">
      <header className="compare-header">
        <div>
          <h1 className="compare-title" id="compare-title">
            Model comparison
          </h1>
          <p className="compare-subtitle">
            {location.label}
            {lastRetrievedAt
              ? ` · Retrieved ${formatDateTime(lastRetrievedAt, timeZone ?? 'UTC')}`
              : ''}
          </p>
        </div>
        <div className="compare-controls">
          <button className="app-button" onClick={toggleUnitSystem} type="button">
            Units: {unitSystem === 'imperial' ? '°F · mph' : '°C · m/s'}
          </button>
          <button className="app-button" onClick={refresh} type="button">
            Refresh
          </button>
        </div>
      </header>

      <div aria-label="Variable" className="compare-tabs" role="tablist">
        {chartVariableList.map((candidate) => (
          <button
            aria-selected={candidate.id === variableId}
            className="compare-tab"
            key={candidate.id}
            onClick={() => setVariableId(candidate.id)}
            role="tab"
            type="button"
          >
            {candidate.label}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <p className="compare-status" role="status">
          Loading model comparison…
        </p>
      )}

      {status !== 'loading' && (
        <div className="compare-chart" role="tabpanel">
          <SeriesChart
            ariaLabel={`${variable.label} comparison`}
            emptyMessage="No comparison data available for this location."
            formatValue={(value) => variable.format(value, unitSystem)}
            series={series}
            timeZone={timeZone}
            unitLabel={variable.unitLabel(unitSystem)}
            width={width}
            yDomain={variable.yDomain}
          />
        </div>
      )}

      {failed.length > 0 && (
        <ul aria-label="Unavailable sources" className="compare-unavailable">
          {failed.map((source) => (
            <li className="compare-unavailable-item" key={source.id} role="alert">
              <span
                aria-hidden="true"
                className="compare-unavailable-swatch"
                style={{ backgroundColor: source.color }}
              />
              <strong>{source.label}</strong>
              <span>{source.error}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
