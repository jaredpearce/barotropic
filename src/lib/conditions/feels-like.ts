/**
 * Apparent ("feels like") temperature.
 *
 * The NWS observation feed does not publish an apparent temperature, so it is
 * derived from the air temperature, relative humidity, and wind speed using the
 * same formulas the National Weather Service publishes:
 *
 * - Heat index (Rothfusz regression) for hot, humid conditions.
 * - Wind chill for cold, windy conditions.
 * - Apparent temperature otherwise.
 */

import { celsiusToFahrenheit, fahrenheitToCelsius } from './format';

export type FeelsLikeBasis =
  | 'heat-index'
  | 'wind-chill'
  | 'apparent-temperature'
  | 'temperature';

/** Human readable name for the formula that produced an apparent temperature. */
export const FEELS_LIKE_BASIS_LABELS: Record<FeelsLikeBasis, string | undefined> = {
  'heat-index': 'Heat index',
  'wind-chill': 'Wind chill',
  'apparent-temperature': 'Apparent temp.',
  temperature: undefined,
};

export interface FeelsLikeResult {
  /** Apparent temperature in Celsius. */
  celsius: number;
  /** Formula used to derive the apparent temperature. */
  basis: FeelsLikeBasis;
}

const METERS_PER_SECOND_TO_MILES_PER_HOUR = 2.23694;

/** Heat index applies above 80 °F with at least 40 % relative humidity. */
const HEAT_INDEX_MIN_FAHRENHEIT = 80;
const HEAT_INDEX_MIN_HUMIDITY = 40;

/** Wind chill applies below 50 °F with at least 3 mph of wind. */
const WIND_CHILL_MAX_FAHRENHEIT = 50;
const WIND_CHILL_MIN_MILES_PER_HOUR = 3;

/**
 * NWS Rothfusz heat index regression with the published low humidity and
 * low temperature adjustments.
 */
function heatIndexFahrenheit(fahrenheit: number, humidityPercent: number): number {
  const t = fahrenheit;
  let index =
    -42.379 +
    2.04901523 * t +
    10.14333127 * humidityPercent -
    0.22475541 * t * humidityPercent -
    0.00683783 * t * t -
    0.05481717 * humidityPercent * humidityPercent +
    0.00122874 * t * t * humidityPercent +
    0.00085282 * t * humidityPercent * humidityPercent -
    0.00000199 * t * t * humidityPercent * humidityPercent;

  if (humidityPercent < 13 && t >= 80 && t <= 112) {
    index -=
      ((13 - humidityPercent) / 4) * Math.sqrt((17 - Math.abs(t - 85) / 5) / 5);
  } else if (humidityPercent > 85 && t >= 80 && t <= 87) {
    index += ((humidityPercent - 85) / 10) * ((87 - t) / 5);
  } else if (t >= 77 && t <= 80 && humidityPercent > 50) {
    index += ((t - 78) / 2) * ((humidityPercent - 50) / 10);
  }

  return index;
}

/**
 * NWS wind chill formula.
 */
function windChillFahrenheit(fahrenheit: number, milesPerHour: number): number {
  const velocity = Math.pow(milesPerHour, 0.16);
  return (
    35.74 +
    0.6215 * fahrenheit -
    35.75 * velocity +
    0.4275 * fahrenheit * velocity
  );
}

/**
 * Apparent temperature (Steadman) in Celsius.
 */
function apparentTemperatureCelsius(
  celsius: number,
  humidityPercent: number,
  metersPerSecond: number
): number {
  const vaporPressure =
    (humidityPercent / 100) * 6.105 * Math.exp((17.27 * celsius) / (237.7 + celsius));
  return celsius + 0.33 * vaporPressure - 0.7 * metersPerSecond - 4;
}

/**
 * Derive the apparent temperature for an observation.
 *
 * @param temperatureCelsius - Air temperature in Celsius.
 * @param humidityPercent - Relative humidity, 0-100.
 * @param windSpeedMetersPerSecond - Sustained wind speed in meters per second.
 * @returns The apparent temperature in Celsius and the formula that produced it.
 */
export function computeFeelsLike(
  temperatureCelsius: number,
  humidityPercent?: number | null,
  windSpeedMetersPerSecond?: number | null
): FeelsLikeResult {
  const fahrenheit = celsiusToFahrenheit(temperatureCelsius);
  const milesPerHour =
    (windSpeedMetersPerSecond ?? 0) * METERS_PER_SECOND_TO_MILES_PER_HOUR;

  if (
    typeof humidityPercent === 'number' &&
    fahrenheit >= HEAT_INDEX_MIN_FAHRENHEIT &&
    humidityPercent >= HEAT_INDEX_MIN_HUMIDITY
  ) {
    return {
      celsius: fahrenheitToCelsius(heatIndexFahrenheit(fahrenheit, humidityPercent)),
      basis: 'heat-index',
    };
  }

  if (
    fahrenheit <= WIND_CHILL_MAX_FAHRENHEIT &&
    milesPerHour >= WIND_CHILL_MIN_MILES_PER_HOUR
  ) {
    return {
      celsius: fahrenheitToCelsius(windChillFahrenheit(fahrenheit, milesPerHour)),
      basis: 'wind-chill',
    };
  }

  if (typeof humidityPercent === 'number') {
    return {
      celsius: apparentTemperatureCelsius(
        temperatureCelsius,
        humidityPercent,
        windSpeedMetersPerSecond ?? 0
      ),
      basis: 'apparent-temperature',
    };
  }

  return { celsius: temperatureCelsius, basis: 'temperature' };
}
