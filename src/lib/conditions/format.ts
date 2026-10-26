/**
 * Display formatting for current-conditions tiles.
 *
 * Observations are stored in canonical domain units (Celsius, meters per
 * second, hectopascals, degrees, percent). These helpers convert those values
 * into the unit system the UI renders and are the single place where display
 * formatting decisions live.
 */

export type ConditionUnits = 'imperial' | 'metric';

/** Rendered in place of a reading when the observation is unavailable. */
export const MISSING_VALUE = '—';

const FAHRENHEIT_OFFSET = 32;
/** Fahrenheit to Celsius scale (5/9). */
const FAHRENHEIT_SCALE = 5 / 9;
/** Celsius to Fahrenheit scale (9/5). */
const CELSIUS_SCALE = 9 / 5;
const KNOTS_PER_METER_PER_SECOND = 1.943844;

const COMPASS_POINTS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

/** Arrow glyphs for the eight primary compass points. */
const COMPASS_ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'] as const;

function isReading(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Convert Celsius to Fahrenheit.
 */
export function celsiusToFahrenheit(celsius: number): number {
  return celsius * CELSIUS_SCALE + FAHRENHEIT_OFFSET;
}

/**
 * Convert Fahrenheit to Celsius.
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - FAHRENHEIT_OFFSET) * FAHRENHEIT_SCALE;
}

/**
 * Convert meters per second to knots.
 */
export function metersPerSecondToKnots(metersPerSecond: number): number {
  return metersPerSecond * KNOTS_PER_METER_PER_SECOND;
}

/**
 * Format a temperature with its unit, e.g. `84°F` or `29°C`.
 */
export function formatTemperature(
  celsius: number | null | undefined,
  units: ConditionUnits = 'imperial'
): string {
  if (!isReading(celsius)) return MISSING_VALUE;
  if (units === 'metric') return `${Math.round(celsius)}°C`;
  return `${Math.round(celsiusToFahrenheit(celsius))}°F`;
}

/**
 * Format a temperature without its unit letter, e.g. `84°` for hero displays.
 */
export function formatTemperatureDegrees(
  celsius: number | null | undefined,
  units: ConditionUnits = 'imperial'
): string {
  if (!isReading(celsius)) return MISSING_VALUE;
  if (units === 'metric') return `${Math.round(celsius)}°`;
  return `${Math.round(celsiusToFahrenheit(celsius))}°`;
}

/**
 * Resolve a wind direction in degrees to its 16-point compass label.
 */
export function compassPoint(degrees: number | null | undefined): string | null {
  if (!isReading(degrees)) return null;
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % COMPASS_POINTS.length;
  return COMPASS_POINTS[index];
}

/**
 * Resolve a wind direction in degrees to the arrow glyph used by the app shell.
 */
export function directionArrow(degrees: number | null | undefined): string | null {
  const point = compassPoint(degrees);
  if (!point) return null;
  const index = COMPASS_POINTS.indexOf(point as (typeof COMPASS_POINTS)[number]);
  return COMPASS_ARROWS[Math.round(index / 2) % COMPASS_ARROWS.length];
}

/**
 * Format a wind speed with its unit, e.g. `9 kt` or `5 m/s`.
 */
export function formatWindSpeed(
  metersPerSecond: number | null | undefined,
  units: ConditionUnits = 'imperial'
): string {
  if (!isReading(metersPerSecond)) return MISSING_VALUE;
  if (units === 'metric') return `${Math.round(metersPerSecond)} m/s`;
  return `${Math.round(metersPerSecondToKnots(metersPerSecond))} kt`;
}

/**
 * Format wind as direction, arrow, and speed, e.g. `↘ SE 9 kt`.
 */
export function formatWind(
  metersPerSecond: number | null | undefined,
  directionDegrees: number | null | undefined,
  units: ConditionUnits = 'imperial'
): string {
  const speed = formatWindSpeed(metersPerSecond, units);
  if (speed === MISSING_VALUE) return MISSING_VALUE;

  const point = compassPoint(directionDegrees);
  if (!point) return speed;

  const arrow = directionArrow(directionDegrees);
  return arrow ? `${arrow} ${point} ${speed}` : `${point} ${speed}`;
}

/**
 * Format surface pressure. 1 hPa and 1 mb are equivalent.
 */
export function formatPressure(
  hectopascals: number | null | undefined,
  units: ConditionUnits = 'imperial'
): string {
  if (!isReading(hectopascals)) return MISSING_VALUE;
  if (units === 'metric') return `${hectopascals.toFixed(1)} hPa`;
  return `${hectopascals.toFixed(1)} mb`;
}

/**
 * Format the pressure tendency over the last three hours, e.g. `-0.8/3h ↓`.
 */
export function formatPressureTrend(hectopascals: number | null | undefined): string {
  if (!isReading(hectopascals)) return MISSING_VALUE;
  const sign = hectopascals > 0 ? '+' : '';
  const arrow = hectopascals > 0 ? '↑' : hectopascals < 0 ? '↓' : '→';
  return `${sign}${hectopascals.toFixed(1)}/3h ${arrow}`;
}

/**
 * Format relative humidity, e.g. `RH 64%`.
 */
export function formatHumidity(percent: number | null | undefined): string {
  if (!isReading(percent)) return MISSING_VALUE;
  return `RH ${Math.round(percent)}%`;
}
