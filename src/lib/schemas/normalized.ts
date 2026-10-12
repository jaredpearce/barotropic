import { z } from 'zod';
import { GeoJsonPolygonalGeometryOrNullSchema } from './geojson';

const MetadataFields = {
  retrievedAt: z.string().datetime(),
  issuedAt: z.string().datetime().nullable().optional(),
  runTime: z.string().datetime().nullable().optional(),
};

export const NormalizedWeatherRecordSchema = z
  .object({
    ...MetadataFields,
    source: z.enum(['NWS', 'Open-Meteo']),
    timestamp: z.string().min(1),
    model: z.string().optional(),
    modelId: z.string().optional(),
    temperatureC: z.number().nullable().optional(),
    minimumTemperatureC: z.number().nullable().optional(),
    maximumTemperatureC: z.number().nullable().optional(),
    humidityPercent: z.number().min(0).max(100).nullable().optional(),
    windSpeedMps: z.number().nullable().optional(),
    windDirectionDegrees: z.number().min(0).max(360).nullable().optional(),
    precipitationProbabilityPercent: z.number().min(0).max(100).nullable().optional(),
    weatherCode: z.number().nullable().optional(),
    condition: z.string().nullable().optional(),
    periodName: z.string().optional(),
    isDaytime: z.boolean().optional(),
  })
  .refine((record) => record.issuedAt !== undefined || record.runTime !== undefined, {
    message: 'A weather record must include issuedAt or runTime metadata',
  });

export const NormalizedObservationSchema = z
  .object({
    ...MetadataFields,
    source: z.literal('NWS'),
    id: z.string(),
    stationId: z.string().optional(),
    timestamp: z.string().nullable(),
    description: z.string().nullable(),
    temperatureC: z.number().nullable(),
    dewpointC: z.number().nullable(),
    humidityPercent: z.number().min(0).max(100).nullable(),
    windSpeedMps: z.number().nullable(),
    windDirectionDegrees: z.number().min(0).max(360).nullable(),
  })
  .refine((record) => record.issuedAt !== undefined || record.runTime !== undefined, {
    message: 'An observation must include issuedAt or runTime metadata',
  });

export const NormalizedAlertSchema = z
  .object({
    ...MetadataFields,
    source: z.literal('NWS'),
    id: z.string(),
    event: z.string().nullable(),
    headline: z.string().nullable(),
    severity: z.string().nullable(),
    urgency: z.string().nullable(),
    status: z.string().nullable(),
    areaDescription: z.string().nullable(),
    effective: z.string().nullable(),
    expires: z.string().nullable(),
    description: z.string().nullable(),
    geometry: GeoJsonPolygonalGeometryOrNullSchema,
  })
  .refine((record) => record.issuedAt !== undefined || record.runTime !== undefined, {
    message: 'An alert must include issuedAt or runTime metadata',
  });

export const NormalizedZoneSchema = z
  .object({
    ...MetadataFields,
    source: z.literal('NWS'),
    id: z.string(),
    name: z.string().nullable(),
    state: z.string().nullable(),
    type: z.string().nullable(),
    geometry: GeoJsonPolygonalGeometryOrNullSchema,
  })
  .refine((record) => record.issuedAt !== undefined || record.runTime !== undefined, {
    message: 'A zone must include issuedAt or runTime metadata',
  });

export type NormalizedWeatherRecord = z.infer<typeof NormalizedWeatherRecordSchema>;
export type NormalizedObservation = z.infer<typeof NormalizedObservationSchema>;
export type NormalizedAlert = z.infer<typeof NormalizedAlertSchema>;
export type NormalizedZone = z.infer<typeof NormalizedZoneSchema>;