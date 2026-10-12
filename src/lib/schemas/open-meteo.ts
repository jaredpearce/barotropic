import { z } from 'zod';

const NullableNumberArray = z.array(z.number().nullable());

export const OpenMeteoHourlySchema = z
  .object({
    time: z.array(z.string()).default([]),
    temperature_2m: NullableNumberArray.default([]),
    relative_humidity_2m: NullableNumberArray.default([]),
    precipitation_probability: NullableNumberArray.default([]),
    weather_code: NullableNumberArray.default([]),
    wind_speed_10m: NullableNumberArray.default([]),
  })
  .passthrough();

export const OpenMeteoDailySchema = z
  .object({
    time: z.array(z.string()).default([]),
    weather_code: NullableNumberArray.default([]),
    temperature_2m_max: NullableNumberArray.default([]),
    temperature_2m_min: NullableNumberArray.default([]),
  })
  .passthrough();

export const OpenMeteoForecastSchema = z
  .object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    generationtime_ms: z.number().optional(),
    utc_offset_seconds: z.number().optional(),
    timezone: z.string().optional(),
    timezone_abbreviation: z.string().optional(),
    hourly: OpenMeteoHourlySchema.optional(),
    daily: OpenMeteoDailySchema.optional(),
  })
  .passthrough();

export type OpenMeteoForecast = z.infer<typeof OpenMeteoForecastSchema>;