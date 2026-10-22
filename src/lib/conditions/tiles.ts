/**
 * Condition tile view models.
 *
 * Translates a {@link CurrentConditions} observation into the display-ready
 * payloads rendered by the ConditionTile component. Keeping this mapping out of
 * the component means the tiles stay purely presentational and the formatting
 * rules remain unit testable.
 */

import type { CurrentConditions } from '@/types/domain';
import { FEELS_LIKE_BASIS_LABELS, computeFeelsLike } from './feels-like';
import type { ConditionUnits } from './format';
import {
  formatHumidity,
  formatPressure,
  formatPressureTrend,
  formatTemperature,
  formatWind,
  formatWindSpeed,
} from './format';

/** Metrics a condition tile can represent. */
export type ConditionTileKind =
  | 'temperature'
  | 'feels-like'
  | 'wind'
  | 'pressure'
  | 'dewpoint';

/** Semantic emphasis applied to the detail line of a tile. */
export type ConditionTileTone = 'default' | 'negative' | 'positive' | 'warning';

/** Default visible label for each metric. */
export const CONDITION_TILE_LABELS: Record<ConditionTileKind, string> = {
  temperature: 'Temperature',
  'feels-like': 'Feels like',
  wind: 'Wind',
  pressure: 'Pressure',
  dewpoint: 'Dewpoint',
};

/** Display payload for a single condition tile. */
export interface ConditionTileData {
  kind: ConditionTileKind;
  label: string;
  value: string;
  meta?: string;
  tone?: ConditionTileTone;
}

export interface ConditionTileOptions {
  /** Unit system used for display. Defaults to `imperial`. */
  units?: ConditionUnits;
}

/** Apparent temperature at or above this offset from the air temperature is flagged. */
const FEELS_LIKE_WARNING_DELTA_CELSIUS = 2;

function isReading(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Build the display payload for every condition tile.
 *
 * Tiles are returned in reading order: temperature, feels-like, wind,
 * pressure, dewpoint.
 *
 * @param conditions - The observation to render.
 * @param options - Display options such as the unit system.
 * @returns One display payload per condition tile.
 */
export function buildConditionTiles(
  conditions: CurrentConditions,
  options: ConditionTileOptions = {}
): ConditionTileData[] {
  const units = options.units ?? 'imperial';
  const tiles: ConditionTileData[] = [];

  const temperature = conditions.temperature;
  const derivedFeelsLike = isReading(temperature)
    ? computeFeelsLike(temperature, conditions.humidity, conditions.windSpeed)
    : null;
  const feelsLike = conditions.feelsLike ?? derivedFeelsLike?.celsius;

  tiles.push({
    kind: 'temperature',
    label: CONDITION_TILE_LABELS.temperature,
    value: formatTemperature(temperature, units),
    meta: conditions.condition,
  });

  // The basis label only applies when the apparent temperature was derived here.
  const feelsLikeBasis =
    conditions.feelsLike === undefined ? derivedFeelsLike?.basis : undefined;
  const feelsLikeWarning =
    isReading(feelsLike) && isReading(temperature)
      ? Math.abs(feelsLike - temperature) >= FEELS_LIKE_WARNING_DELTA_CELSIUS
      : false;

  tiles.push({
    kind: 'feels-like',
    label: CONDITION_TILE_LABELS['feels-like'],
    value: formatTemperature(feelsLike, units),
    meta: feelsLikeBasis ? FEELS_LIKE_BASIS_LABELS[feelsLikeBasis] : undefined,
    tone: feelsLikeWarning ? 'warning' : 'default',
  });

  tiles.push({
    kind: 'wind',
    label: CONDITION_TILE_LABELS.wind,
    value: formatWind(conditions.windSpeed, conditions.windDirection, units),
    meta: isReading(conditions.windGust)
      ? `G ${formatWindSpeed(conditions.windGust, units)}`
      : undefined,
  });

  const trend = conditions.pressureTrend;
  tiles.push({
    kind: 'pressure',
    label: CONDITION_TILE_LABELS.pressure,
    value: formatPressure(conditions.pressure, units),
    meta: isReading(trend) ? formatPressureTrend(trend) : undefined,
    tone: !isReading(trend)
      ? 'default'
      : trend < 0
        ? 'negative'
        : trend > 0
          ? 'positive'
          : 'default',
  });

  tiles.push({
    kind: 'dewpoint',
    label: CONDITION_TILE_LABELS.dewpoint,
    value: formatTemperature(conditions.dewpoint, units),
    meta: isReading(conditions.humidity) ? formatHumidity(conditions.humidity) : undefined,
  });

  return tiles;
}
