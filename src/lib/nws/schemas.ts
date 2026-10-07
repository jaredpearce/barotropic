/**
 * NWS API Response Schemas
 * Zod schemas for validating NWS API responses.
 * Uses strict validation with passthrough for forward-compatibility.
 */

import { z } from 'zod';

/**
 * NWS Points API response
 * https://api.weather.gov/points/{lat},{lon}
 */
export const PointSchema = z.object({
  id: z.string().optional(),
  properties: z
    .object({
      forecast: z.string().url().optional(),
      forecastHourly: z.string().url().optional(),
      observationStations: z.array(z.string().url()).default([]),
      relativeLocation: z
        .object({
          properties: z
            .object({
              city: z.string().optional(),
              state: z.string().optional(),
            })
            .passthrough()
            .optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough(),
}).passthrough();

export type Point = z.infer<typeof PointSchema>;

/**
 * NWS Forecast API response
 * https://api.weather.gov/gridpoints/{wfo}/{x},{y}/forecast
 */
export const ForecastSchema = z.object({
  properties: z
    .object({
      periods: z
        .array(
          z.object({
            number: z.number(),
            name: z.string(),
            startTime: z.string().datetime().optional(),
            endTime: z.string().datetime().optional(),
            isDaytime: z.boolean().optional(),
            temperature: z.number(),
            temperatureUnit: z.string(),
            windSpeed: z.string(),
            windDirection: z.string(),
            shortForecast: z.string(),
            detailedForecast: z.string(),
          })
        )
        .default([]),
    })
    .passthrough(),
}).passthrough();

export type Forecast = z.infer<typeof ForecastSchema>;

/**
 * NWS Latest Observation API response
 * https://api.weather.gov/stations/{stationId}/observations/latest
 */
export const LatestObservationSchema = z.object({
  properties: z
    .object({
      timestamp: z.string().datetime().optional(),
      textDescription: z.string().optional(),
      temperature: z
        .object({
          value: z.number().nullable().optional(),
          unitCode: z.string().optional(),
        })
        .passthrough()
        .optional(),
      dewpoint: z
        .object({
          value: z.number().nullable().optional(),
          unitCode: z.string().optional(),
        })
        .passthrough()
        .optional(),
      relativeHumidity: z
        .object({
          value: z.number().nullable().optional(),
          unitCode: z.string().optional(),
        })
        .passthrough()
        .optional(),
      windSpeed: z
        .object({
          value: z.number().nullable().optional(),
          unitCode: z.string().optional(),
        })
        .passthrough()
        .optional(),
      windDirection: z
        .object({
          value: z.number().nullable().optional(),
          unitCode: z.string().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough(),
}).passthrough();

export type LatestObservation = z.infer<typeof LatestObservationSchema>;

/**
 * NWS Zone API response
 * https://api.weather.gov/zones/forecast/{zoneId}
 */
export const ZoneSchema = z.object({
  id: z.string(),
  properties: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      state: z.string().optional(),
      type: z.string().optional(),
    })
    .passthrough(),
  geometry: z.any().optional(), // GeoJSON geometry (Polygon, MultiPolygon, etc.)
}).passthrough();

export type Zone = z.infer<typeof ZoneSchema>;

/**
 * NWS Alerts API response
 * https://api.weather.gov/alerts/active?zone={zoneId}
 */
export const AlertsResponseSchema = z.object({
  features: z
    .array(
      z.object({
        id: z.string(),
        properties: z
          .object({
            event: z.string().optional(),
            headline: z.string().optional(),
            severity: z.string().optional(),
            urgency: z.string().optional(),
            status: z.string().optional(),
            areaDesc: z.string().optional(),
            effective: z.string().datetime().optional(),
            expires: z.string().datetime().optional(),
            description: z.string().optional(),
          })
          .passthrough(),
        geometry: z.any().optional(), // GeoJSON geometry
      })
    )
    .default([]),
}).passthrough();

export type AlertsResponse = z.infer<typeof AlertsResponseSchema>;

/**
 * NWS Station Observations API response
 * https://api.weather.gov/stations/{stationId}/observations
 */
export const StationObservationsSchema = z.object({
  features: z
    .array(
      z.object({
        id: z.string(),
        properties: z
          .object({
            timestamp: z.string().datetime().optional(),
            textDescription: z.string().optional(),
            temperature: z
              .object({
                value: z.number().nullable().optional(),
                unitCode: z.string().optional(),
              })
              .passthrough()
              .optional(),
            dewpoint: z
              .object({
                value: z.number().nullable().optional(),
                unitCode: z.string().optional(),
              })
              .passthrough()
              .optional(),
            windSpeed: z
              .object({
                value: z.number().nullable().optional(),
                unitCode: z.string().optional(),
              })
              .passthrough()
              .optional(),
            windDirection: z
              .object({
                value: z.number().nullable().optional(),
                unitCode: z.string().optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      })
    )
    .default([]),
}).passthrough();

export type StationObservations = z.infer<typeof StationObservationsSchema>;
