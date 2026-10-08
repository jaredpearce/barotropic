import { z } from 'zod';

/**
 * Open-Meteo forecast response schema.
 *
 * Current Open-Meteo docs expose model names like `gfs` and `hrrr` for forecast generation.
 * We keep an app-level alias of `hrr` to support the simpler contract requested for this app.
 */
export const OpenMeteoHourlySchema = z
  .object({
    time: z.array(z.string()).default([]),
    temperature_2m: z.array(z.number()).default([]),
    relative_humidity_2m: z.array(z.number()).default([]),
    precipitation_probability: z.array(z.number()).default([]),
    weather_code: z.array(z.number()).default([]),
    wind_speed_10m: z.array(z.number()).default([]),
  })
  .passthrough();

export const OpenMeteoDailySchema = z
  .object({
    time: z.array(z.string()).default([]),
    weather_code: z.array(z.number()).default([]),
    temperature_2m_max: z.array(z.number()).default([]),
    temperature_2m_min: z.array(z.number()).default([]),
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
