/**
 * Hourly condition mapping.
 *
 * Open-Meteo publishes WMO weather codes as integers. The UI only needs a small
 * set of icon categories, so this module is the single translation point and
 * stays independent of React.
 */

export type HourlyCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'fog';

const STORM_CODES = new Set([95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const FOG_CODES = new Set([45, 48]);

/**
 * Translate a WMO weather code into an hourly icon category.
 *
 * Unknown, missing, or unmapped codes fall back to `cloudy` so a row always has
 * a stable icon instead of a blank cell.
 */
export function conditionFromWeatherCode(weatherCode: number | null | undefined): HourlyCondition {
  if (weatherCode === 0) return 'clear';
  if (weatherCode === 1 || weatherCode === 2) return 'partly-cloudy';
  if (weatherCode === 3) return 'cloudy';
  if (weatherCode == null) return 'cloudy';
  if (STORM_CODES.has(weatherCode)) return 'storm';
  if (SNOW_CODES.has(weatherCode)) return 'snow';
  if (RAIN_CODES.has(weatherCode)) return 'rain';
  if (FOG_CODES.has(weatherCode)) return 'fog';
  return 'cloudy';
}
