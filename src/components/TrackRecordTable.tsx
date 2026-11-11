'use client';

import {
  formatPrecipProbability,
  formatTemperature,
  formatTemperatureDelta,
  formatWindSpeed,
  type UnitSystem,
} from '@/lib/units';
import {
  verificationVariables,
  type VerificationSample,
  type VerificationSource,
  type VerificationVariable,
} from '@/lib/verification/verify';

export interface TrackRecordTableProps {
  samples: VerificationSample[];
  unitSystem: UnitSystem;
}

const SOURCE_ORDER: VerificationSource[] = ['user', 'NWS', 'GFS', 'HRRR', 'ECMWF'];

const SOURCE_LABELS: Record<VerificationSource, string> = {
  user: 'You',
  NWS: 'NWS',
  GFS: 'GFS',
  HRRR: 'HRRR',
  ECMWF: 'ECMWF',
};

const VARIABLE_LABELS: Record<VerificationVariable, string> = {
  high: 'High',
  low: 'Low',
  wind: 'Wind',
  pop: 'PoP',
};

function formatValue(variable: VerificationVariable, value: number, system: UnitSystem): string {
  if (variable === 'high' || variable === 'low') return formatTemperature(value, system);
  if (variable === 'wind') return formatWindSpeed(value, system);
  return formatPrecipProbability(value);
}

function formatError(variable: VerificationVariable, value: number, system: UnitSystem): string {
  if (variable === 'high' || variable === 'low') return formatTemperatureDelta(value, system);
  if (variable === 'wind') return formatWindSpeed(value, system);
  return `${value > 0 ? '+' : ''}${formatPrecipProbability(value)}`;
}

/** Source-by-source forecast, observed, and error for one revision. */
export default function TrackRecordTable({ samples, unitSystem }: TrackRecordTableProps) {
  const sources = SOURCE_ORDER.filter((source) =>
    samples.some((sample) => sample.source === source),
  );

  return (
    <table className="track-record-table">
      <caption>Forecast, observed, and error by source</caption>
      <thead>
        <tr>
          <th scope="col">Variable</th>
          {sources.map((source) => (
            <th key={source} scope="col">
              {SOURCE_LABELS[source]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {verificationVariables.map((variable) => (
          <tr key={variable}>
            <th scope="row">{VARIABLE_LABELS[variable]}</th>
            {sources.map((source) => {
              const sample = samples.find(
                (candidate) => candidate.variable === variable && candidate.source === source,
              );
              return (
                <td key={source}>
                  {sample ? (
                    <div className="track-record-cell">
                      <span>
                        Forecast {formatValue(variable, sample.forecastValue, unitSystem)}
                      </span>
                      <span>
                        Observed {formatValue(variable, sample.observedValue, unitSystem)}
                      </span>
                      <span>Error {formatError(variable, sample.error, unitSystem)}</span>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
