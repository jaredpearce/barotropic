import { conditionFromWeatherCode, type HourlyCondition } from '@/lib/forecast/weather-code';
import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';
import type { ForecastSourceValues, GuidanceValues } from './db';

const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

const CONDITION_LABELS: Record<HourlyCondition, string> = {
  clear: 'Clear',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  rain: 'Rain',
  storm: 'Thunderstorms',
  snow: 'Snow',
  fog: 'Fog',
};

export interface SelectedGuidance extends GuidanceValues {
  runTime: string | null;
  retrievedAt: string;
  utcOffsetSeconds?: number;
}

function targetTime(validStart: string): number | null {
  const timestamp = Date.parse(validStart);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function recordTime(record: NormalizedWeatherRecord): number | null {
  const timestamp = Date.parse(record.timestamp);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function nearestRecord(
  records: readonly NormalizedWeatherRecord[],
  target: number | null,
): NormalizedWeatherRecord | undefined {
  if (records.length === 0) return undefined;
  if (target === null) return records[0];

  return records.reduce((nearest, record) => {
    const nearestTime = recordTime(nearest);
    const recordTimestamp = recordTime(record);
    if (recordTimestamp === null) return nearest;
    if (nearestTime === null) return record;
    return Math.abs(recordTimestamp - target) < Math.abs(nearestTime - target) ? record : nearest;
  });
}

function nearestDateRecord(
  records: readonly NormalizedWeatherRecord[],
  validStart: string,
): NormalizedWeatherRecord | undefined {
  const date = validStart.slice(0, 10);
  const sameDate = records.find((record) => record.timestamp.slice(0, 10) === date);
  return sameDate ?? nearestRecord(records, targetTime(validStart));
}

function formatNumber(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function formatTemperature(value: number | null | undefined): string | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatNumber(value)}°C`
    : undefined;
}

function formatPercent(value: number | null | undefined): string | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatNumber(value)}%`
    : undefined;
}

function cardinalDirection(degrees: number): string {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % CARDINAL_DIRECTIONS.length;
  return CARDINAL_DIRECTIONS[index];
}

function formatWind(
  speed: number | null | undefined,
  direction: number | null | undefined,
): string | undefined {
  if (typeof speed !== 'number' || !Number.isFinite(speed)) return undefined;
  const directionLabel =
    typeof direction === 'number' && Number.isFinite(direction)
      ? `${cardinalDirection(direction)} `
      : '';
  return `${directionLabel}${formatNumber(speed)} m/s`;
}

function compact(values: ForecastSourceValues): ForecastSourceValues {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => Boolean(value)),
  ) as ForecastSourceValues;
}

function finite(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Select numeric NWS guidance nearest the forecast's valid start. */
export function selectNwsGuidance(
  periods: readonly NormalizedWeatherRecord[],
  validStart: string,
): SelectedGuidance {
  const target = targetTime(validStart);
  const selected = nearestRecord(periods, target);
  const daytime = nearestRecord(
    periods.filter((period) => period.isDaytime === true),
    target,
  );
  const nighttime = nearestRecord(
    periods.filter((period) => period.isDaytime === false),
    target,
  );
  const values: GuidanceValues = {
    highC: finite((daytime ?? selected)?.temperatureC),
    lowC: finite((nighttime ?? selected)?.temperatureC),
    popPercent: finite(selected?.precipitationProbabilityPercent),
    windSpeedMps: finite(selected?.windSpeedMps),
    windDirectionDegrees: finite(selected?.windDirectionDegrees),
    sky: selected?.condition?.trim() || undefined,
  };

  return {
    ...values,
    runTime: selected?.issuedAt ?? null,
    retrievedAt: selected?.retrievedAt ?? new Date().toISOString(),
  };
}

/** Select numeric model guidance nearest the forecast's valid start. */
export function selectModelGuidance(
  daily: readonly NormalizedWeatherRecord[],
  hourly: readonly NormalizedWeatherRecord[],
  validStart: string,
): SelectedGuidance {
  const target = targetTime(validStart);
  const selectedDay = nearestDateRecord(daily, validStart);
  const selectedHour = nearestRecord(hourly, target);
  const weatherCode = selectedDay?.weatherCode ?? selectedHour?.weatherCode;

  const values: GuidanceValues = {
    highC: finite(selectedDay?.maximumTemperatureC),
    lowC: finite(selectedDay?.minimumTemperatureC),
    popPercent: finite(selectedHour?.precipitationProbabilityPercent),
    windSpeedMps: finite(selectedHour?.windSpeedMps),
    windDirectionDegrees: finite(selectedHour?.windDirectionDegrees),
    sky:
      weatherCode === null || weatherCode === undefined
        ? undefined
        : CONDITION_LABELS[conditionFromWeatherCode(weatherCode)],
  };

  return {
    ...values,
    // Open-Meteo's standard endpoint does not expose a model run time.
    runTime: null,
    retrievedAt: selectedHour?.retrievedAt ?? selectedDay?.retrievedAt ?? new Date().toISOString(),
  };
}

/** Extract just the numeric values from a selection. */
export function guidanceValuesOf(selected: SelectedGuidance): GuidanceValues {
  return {
    highC: selected.highC,
    lowC: selected.lowC,
    popPercent: selected.popPercent,
    windSpeedMps: selected.windSpeedMps,
    windDirectionDegrees: selected.windDirectionDegrees,
    sky: selected.sky,
  };
}

/** Single display formatter for numeric guidance values. */
export function formatGuidanceValues(values: GuidanceValues): ForecastSourceValues {
  return compact({
    high: formatTemperature(values.highC),
    low: formatTemperature(values.lowC),
    pop: formatPercent(values.popPercent),
    wind: formatWind(values.windSpeedMps, values.windDirectionDegrees),
    sky: values.sky,
  });
}

/** Map the nearest official NWS periods to the editor's source fields. */
export function sourceValuesFromNws(
  periods: readonly NormalizedWeatherRecord[],
  validStart: string,
): ForecastSourceValues {
  return formatGuidanceValues(selectNwsGuidance(periods, validStart));
}

/** Map the nearest model daily/hourly records to the editor's source fields. */
export function sourceValuesFromModel(
  daily: readonly NormalizedWeatherRecord[],
  hourly: readonly NormalizedWeatherRecord[],
  validStart: string,
): ForecastSourceValues {
  return formatGuidanceValues(selectModelGuidance(daily, hourly, validStart));
}
