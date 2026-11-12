'use client';

import { useMemo, useState } from 'react';
import type { ChartSeries } from '@/lib/charts/series';
import { chartColors } from '@/lib/charts/theme';
import { useTrackRecord } from '@/lib/hooks/use-track-record';
import { useUnitSystem } from '@/lib/hooks/use-unit-system';
import {
  formatBrier,
  formatPrecipProbability,
  formatTemperatureDelta,
  formatWindSpeed,
  mpsToMph,
  type UnitSystem,
} from '@/lib/units';
import type { PastForecast, VerificationOutcome } from '@/lib/verification/job';
import type { VariableSummary } from '@/lib/verification/summary';
import {
  verificationVariables,
  type VerificationSample,
  type VerificationSource,
  type VerificationVariable,
} from '@/lib/verification/verify';
import SeriesChart from './SeriesChart';
import TrackRecordTable from './TrackRecordTable';

export interface TrackRecordProps {
  /** Fixed chart width for tests; production measures the container. */
  width?: number;
}

const SOURCE_ORDER: VerificationSource[] = ['user', 'NWS', 'GFS', 'HRRR', 'ECMWF'];

const SOURCE_LABELS: Record<VerificationSource, string> = {
  user: 'You',
  NWS: 'NWS',
  GFS: 'GFS',
  HRRR: 'HRRR',
  ECMWF: 'ECMWF',
};

const STATUS_LABELS: Record<VerificationOutcome, string> = {
  verified: 'Verified',
  pending: 'Pending',
  'not-ex-ante': 'Not ex-ante',
  'insufficient-coverage': 'Insufficient coverage',
  missing: 'Missing observations',
  unverifiable: 'Unverifiable',
};

const STATUS_NOTES: Record<VerificationOutcome, string> = {
  verified: 'Verified against NWS observations.',
  pending: 'Waiting for the verification lag to elapse before scoring.',
  'not-ex-ante': 'Revision was created after the local day began, so it is not scored.',
  'insufficient-coverage': 'Fewer than 75% of station hours passed quality control.',
  missing: 'The station returned no usable observations for this day.',
  unverifiable: 'No station or time zone was captured with this revision.',
};

interface ErrorVariable {
  id: VerificationVariable;
  label: string;
  toDisplay: (value: number, system: UnitSystem) => number;
  unitLabel: (system: UnitSystem) => string;
  format: (value: number, system: UnitSystem) => string;
}

function formatTemperatureDeltaDisplay(value: number, system: UnitSystem): string {
  return `${Number(value.toFixed(1))}°${system === 'imperial' ? 'F' : 'C'}`;
}

function formatWindDisplay(value: number, system: UnitSystem): string {
  return `${Number(value.toFixed(1))} ${system === 'imperial' ? 'mph' : 'm/s'}`;
}

function formatPopDisplay(value: number): string {
  return `${Number(value.toFixed(0))}%`;
}

const errorVariables: Record<VerificationVariable, ErrorVariable> = {
  high: {
    id: 'high',
    label: 'High',
    toDisplay: (value, system) => (system === 'imperial' ? (value * 9) / 5 : value),
    unitLabel: (system) => (system === 'imperial' ? '°F' : '°C'),
    format: formatTemperatureDeltaDisplay,
  },
  low: {
    id: 'low',
    label: 'Low',
    toDisplay: (value, system) => (system === 'imperial' ? (value * 9) / 5 : value),
    unitLabel: (system) => (system === 'imperial' ? '°F' : '°C'),
    format: formatTemperatureDeltaDisplay,
  },
  wind: {
    id: 'wind',
    label: 'Wind',
    toDisplay: (value, system) => (system === 'imperial' ? mpsToMph(value) : value),
    unitLabel: (system) => (system === 'imperial' ? 'mph' : 'm/s'),
    format: formatWindDisplay,
  },
  pop: {
    id: 'pop',
    label: 'PoP',
    toDisplay: (value) => value,
    unitLabel: () => 'pp',
    format: formatPopDisplay,
  },
};

function formatLead(hours: number): string {
  return `${Number(hours.toFixed(1))} h`;
}

/** One point per valid date: the mean signed error across eligible revisions. */
function buildErrorSeries(
  samples: VerificationSample[],
  variable: VerificationVariable,
  unitSystem: UnitSystem,
): ChartSeries[] {
  const config = errorVariables[variable];
  const bySource = new Map<
    VerificationSource,
    Map<string, { total: number; count: number; revisions: Set<string> }>
  >();

  for (const sample of samples) {
    if (sample.variable !== variable) continue;
    const byDate = bySource.get(sample.source) ?? new Map();
    const entry = byDate.get(sample.validDate) ?? {
      total: 0,
      count: 0,
      revisions: new Set<string>(),
    };
    entry.total += sample.error;
    entry.count += 1;
    entry.revisions.add(sample.revisionId);
    byDate.set(sample.validDate, entry);
    bySource.set(sample.source, byDate);
  }

  const series: ChartSeries[] = [];
  for (const source of SOURCE_ORDER) {
    const byDate = bySource.get(source);
    if (!byDate) continue;

    const revisions = new Set<string>();
    const points = [...byDate.entries()]
      .map(([date, entry]) => {
        entry.revisions.forEach((id) => revisions.add(id));
        return { timestamp: Date.parse(`${date}T00:00:00Z`), value: entry.total / entry.count };
      })
      .sort((left, right) => left.timestamp - right.timestamp)
      .map((point) => ({
        timestamp: point.timestamp,
        value: config.toDisplay(point.value, unitSystem),
      }));

    series.push({
      id: source,
      label: SOURCE_LABELS[source],
      color: chartColors[source],
      points,
      description: `${revisions.size} revision${revisions.size === 1 ? '' : 's'}`,
    });
  }

  return series;
}

function formatMae(
  variable: VerificationVariable,
  summary: VariableSummary | undefined,
  system: UnitSystem,
): string {
  if (!summary || summary.mae === undefined) return '—';
  if (variable === 'high' || variable === 'low') return formatTemperatureDelta(summary.mae, system);
  if (variable === 'wind') return formatWindSpeed(summary.mae, system);
  return formatPrecipProbability(summary.mae);
}

const SUMMARY_ROWS: Array<{
  key: string;
  label: string;
  variable: VerificationVariable;
  metric: 'mae' | 'brier';
}> = [
  { key: 'high', label: 'High', variable: 'high', metric: 'mae' },
  { key: 'low', label: 'Low', variable: 'low', metric: 'mae' },
  { key: 'wind', label: 'Wind', variable: 'wind', metric: 'mae' },
  { key: 'pop-mae', label: 'PoP MAE (percentage points)', variable: 'pop', metric: 'mae' },
  { key: 'pop-brier', label: 'PoP Brier', variable: 'pop', metric: 'brier' },
];

function SummaryTable({
  summaries,
  unitSystem,
}: {
  summaries: VariableSummary[];
  unitSystem: UnitSystem;
}) {
  const find = (source: VerificationSource, variable: VerificationVariable) =>
    summaries.find((summary) => summary.source === source && summary.variable === variable);

  return (
    <table className="track-record-summary">
      <caption>Mean error by source and variable</caption>
      <thead>
        <tr>
          <th scope="col">Metric</th>
          {SOURCE_ORDER.map((source) => (
            <th key={source} scope="col">
              {SOURCE_LABELS[source]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SUMMARY_ROWS.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            {SOURCE_ORDER.map((source) => {
              const summary = find(source, row.variable);
              const count = summary?.sampleCount ?? 0;
              const value =
                row.metric === 'brier'
                  ? summary?.brier !== undefined
                    ? formatBrier(summary.brier)
                    : '—'
                  : formatMae(row.variable, summary, unitSystem);
              return (
                <td key={source}>
                  <span className="track-record-metric">{value}</span>
                  {count > 0 && <span className="track-record-sample-count">n={count}</span>}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PastForecastRow({ past, unitSystem }: { past: PastForecast; unitSystem: UnitSystem }) {
  return (
    <details className="track-record-forecast">
      <summary>
        <span className="track-record-forecast-date">
          <time dateTime={past.validDate}>{past.validDate}</time>
        </span>
        <span className="track-record-forecast-location">{past.locationName}</span>
        <span className="track-record-forecast-revision">Revision {past.revisionNumber}</span>
        <span className="track-record-forecast-lead">Lead {formatLead(past.leadHours)}</span>
        <span className="track-record-forecast-status">{STATUS_LABELS[past.status]}</span>
      </summary>
      {past.samples.length > 0 ? (
        <TrackRecordTable samples={past.samples} unitSystem={unitSystem} />
      ) : (
        <p className="track-record-forecast-note">{STATUS_NOTES[past.status]}</p>
      )}
    </details>
  );
}

/** Read-only verification view over stored revisions and the observed-day cache. */
export default function TrackRecord({ width }: TrackRecordProps) {
  const { status, progress, result, error, reload } = useTrackRecord();
  const { unitSystem, toggleUnitSystem } = useUnitSystem();
  const [errorVariableId, setErrorVariableId] = useState<VerificationVariable>('high');

  const errorVariable = errorVariables[errorVariableId];
  const errorSeries = useMemo(
    () => buildErrorSeries(result?.samples ?? [], errorVariableId, unitSystem),
    [result, errorVariableId, unitSystem],
  );

  const counts = result?.counts;
  const hasForecasts = Boolean(result && result.pastForecasts.length > 0);

  return (
    <section aria-labelledby="track-record-title" className="track-record-screen">
      <header className="track-record-header">
        <div>
          <h1 className="track-record-title" id="track-record-title">
            Track record
          </h1>
          <p className="track-record-subtitle">
            Past forecasts verified against NWS station observations.
          </p>
        </div>
        <div className="track-record-controls">
          <button className="app-button" onClick={toggleUnitSystem} type="button">
            Units: {unitSystem === 'imperial' ? '°F · mph' : '°C · m/s'}
          </button>
          <button className="app-button" onClick={reload} type="button">
            Re-run verification
          </button>
        </div>
      </header>

      {status === 'running' && (
        <p className="track-record-status" role="status">
          Verifying forecasts… {progress.completed}/{progress.total}
        </p>
      )}

      {status === 'error' && (
        <div className="track-record-error" role="alert">
          <p>Verification failed: {error}</p>
          <button className="app-button" onClick={reload} type="button">
            Try again
          </button>
        </div>
      )}

      {status === 'success' && !hasForecasts && (
        <p className="track-record-empty">No past forecasts to verify yet.</p>
      )}

      {status === 'success' && result && hasForecasts && (
        <>
          {counts && (
            <ul aria-label="Verification counts" className="track-record-counts">
              <li>Verified: {counts.verified}</li>
              <li>Pending: {counts.pending}</li>
              <li>Not ex-ante: {counts.notExAnte}</li>
              <li>Insufficient: {counts.insufficient}</li>
              <li>Missing: {counts.missing}</li>
              <li>Unverifiable: {counts.unverifiable}</li>
            </ul>
          )}

          <SummaryTable summaries={result.summaries} unitSystem={unitSystem} />

          <section aria-labelledby="error-chart-title" className="track-record-chart">
            <h2 id="error-chart-title">Signed error by date</h2>
            <div aria-label="Error variable" className="track-record-tabs" role="tablist">
              {verificationVariables.map((variable) => (
                <button
                  aria-selected={variable === errorVariableId}
                  className="track-record-tab"
                  key={variable}
                  onClick={() => setErrorVariableId(variable)}
                  role="tab"
                  type="button"
                >
                  {errorVariables[variable].label}
                </button>
              ))}
            </div>
            <SeriesChart
              ariaLabel={`${errorVariable.label} signed error`}
              emptyMessage="No verified samples for this variable."
              formatValue={(value) => errorVariable.format(value, unitSystem)}
              series={errorSeries}
              showZeroLine
              unitLabel={errorVariable.unitLabel(unitSystem)}
              width={width}
            />
          </section>

          <section aria-labelledby="past-forecasts-title" className="track-record-list">
            <h2 id="past-forecasts-title">Past forecasts</h2>
            <div className="track-record-forecasts">
              {result.pastForecasts.map((past) => (
                <PastForecastRow
                  key={`${past.revisionId}-${past.validDate}`}
                  past={past}
                  unitSystem={unitSystem}
                />
              ))}
            </div>
          </section>

          {result.warnings.length > 0 && (
            <ul aria-label="Verification warnings" className="track-record-warnings">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
