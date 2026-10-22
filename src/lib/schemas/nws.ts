import { z } from 'zod';
import { GeoJsonPolygonalGeometryOrNullSchema } from './geojson';

const NwsQuantitySchema = z
  .object({
    value: z.number().nullable().optional(),
    unitCode: z.string().optional(),
  })
  .passthrough();

export const PointSchema = z
  .object({
    id: z.string().optional(),
    properties: z
      .object({
        forecast: z.string().url().optional(),
        forecastHourly: z.string().url().optional(),
        observationStations: z.string().url().optional(),
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
  })
  .passthrough();

export const ObservationStationsSchema = z
  .object({
    features: z
      .array(z.object({ id: z.string().url() }).passthrough())
      .default([]),
  })
  .passthrough();

export const ForecastSchema = z
  .object({
    properties: z
      .object({
        updateTime: z.string().datetime({ offset: true }).optional(),
        periods: z
          .array(
            z.object({
              number: z.number(),
              name: z.string(),
              startTime: z.string().datetime({ offset: true }).optional(),
              endTime: z.string().datetime({ offset: true }).optional(),
              isDaytime: z.boolean().optional(),
              temperature: z.number(),
              temperatureUnit: z.enum(['F', 'C']),
              windSpeed: z.string(),
              windDirection: z.string(),
              shortForecast: z.string(),
              detailedForecast: z.string(),
              probabilityOfPrecipitation: NwsQuantitySchema.optional(),
              relativeHumidity: NwsQuantitySchema.optional(),
            }),
          )
          .default([]),
      })
      .passthrough(),
  })
  .passthrough();

export const LatestObservationSchema = z
  .object({
    properties: z
      .object({
        timestamp: z.string().datetime({ offset: true }).optional(),
        textDescription: z.string().optional(),
        temperature: NwsQuantitySchema.optional(),
        dewpoint: NwsQuantitySchema.optional(),
        relativeHumidity: NwsQuantitySchema.optional(),
        windSpeed: NwsQuantitySchema.optional(),
        windGust: NwsQuantitySchema.optional(),
        windDirection: NwsQuantitySchema.optional(),
        barometricPressure: NwsQuantitySchema.optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const ZoneSchema = z
  .object({
    id: z.string(),
    properties: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        state: z.string().optional(),
        type: z.string().optional(),
        effectiveDate: z.string().datetime({ offset: true }).optional(),
      })
      .passthrough(),
    geometry: GeoJsonPolygonalGeometryOrNullSchema,
  })
  .passthrough();

export const AlertsResponseSchema = z
  .object({
    features: z
      .array(
        z.object({
          id: z.string(),
          properties: z
            .object({
              event: z.string().optional(),
              headline: z.string().nullable().optional(),
              sent: z.string().datetime({ offset: true }).optional(),
              severity: z.string().optional(),
              urgency: z.string().optional(),
              status: z.string().optional(),
              areaDesc: z.string().optional(),
              effective: z.string().datetime({ offset: true }).optional(),
              expires: z.string().datetime({ offset: true }).optional(),
              description: z.string().optional(),
            })
            .passthrough(),
          geometry: GeoJsonPolygonalGeometryOrNullSchema,
        }),
      )
      .default([]),
  })
  .passthrough();

export const StationObservationsSchema = z
  .object({
    features: z
      .array(
        z.object({
          id: z.string(),
          properties: z
            .object({
              timestamp: z.string().datetime({ offset: true }).optional(),
              textDescription: z.string().optional(),
              temperature: NwsQuantitySchema.optional(),
              dewpoint: NwsQuantitySchema.optional(),
              relativeHumidity: NwsQuantitySchema.optional(),
              windSpeed: NwsQuantitySchema.optional(),
              windDirection: NwsQuantitySchema.optional(),
            })
            .passthrough(),
        }),
      )
      .default([]),
  })
  .passthrough();

export type Point = z.infer<typeof PointSchema>;
export type Forecast = z.infer<typeof ForecastSchema>;
export type LatestObservation = z.infer<typeof LatestObservationSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type AlertsResponse = z.infer<typeof AlertsResponseSchema>;
export type StationObservations = z.infer<typeof StationObservationsSchema>;