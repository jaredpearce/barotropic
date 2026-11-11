/**
 * Chart variable definitions.
 *
 * Values are stored canonically (Celsius, meters per second, percent); the
 * `toDisplay` / `unitLabel` / `format` trio converts and formats for the active
 * unit system so the plotted values and the axis always agree.
 */

import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';
import { celsiusToFahrenheit, mpsToMph, type UnitSystem } from '@/lib/units';

export type ChartVariableId = 'temperature' | 'precipitation' | 'wind';

export interface ChartVariable {
  id: ChartVariableId;
  label: string;
  /** Accessor for the canonical stored value. */
  accessor: (record: NormalizedWeatherRecord) => number | null | undefined;
  /** Convert a canonical value into the display unit system. */
  toDisplay: (value: number, system: UnitSystem) => number;
  /** Short axis label for the display unit system. */
  unitLabel: (system: UnitSystem) => string;
  /** Format a display value for axis ticks and tooltips. */
  format: (displayValue: number, system: UnitSystem) => string;
  /** Fixed y-domain, when the variable has a natural range. */
  yDomain?: [number, number];
}

function formatNumber(value: number, digits = 1): string {
  return Number(value.toFixed(digits)).toString();
}

export const chartVariables: Record<ChartVariableId, ChartVariable> = {
  temperature: {
    id: 'temperature',
    label: 'Temperature',
    accessor: (record) => record.temperatureC,
    toDisplay: (value, system) => (system === 'imperial' ? celsiusToFahrenheit(value) : value),
    unitLabel: (system) => (system === 'imperial' ? '°F' : '°C'),
    format: (value) => `${formatNumber(value)}°`,
  },
  precipitation: {
    id: 'precipitation',
    label: 'Precipitation probability',
    accessor: (record) => record.precipitationProbabilityPercent,
    toDisplay: (value) => value,
    unitLabel: () => '%',
    format: (value) => `${formatNumber(value, 0)}%`,
    yDomain: [0, 100],
  },
  wind: {
    id: 'wind',
    label: 'Wind',
    accessor: (record) => record.windSpeedMps,
    toDisplay: (value, system) => (system === 'imperial' ? mpsToMph(value) : value),
    unitLabel: (system) => (system === 'imperial' ? 'mph' : 'm/s'),
    format: (value) => formatNumber(value),
  },
};

export const chartVariableList: ChartVariable[] = [
  chartVariables.temperature,
  chartVariables.precipitation,
  chartVariables.wind,
];
