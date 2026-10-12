import { z } from 'zod';

export const GeoJsonPositionSchema = z.union([
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number()]),
]);

export const GeoJsonLinearRingSchema = z.array(GeoJsonPositionSchema).min(4);
export const GeoJsonPolygonCoordinatesSchema = z.array(GeoJsonLinearRingSchema).min(1);
export const GeoJsonMultiPolygonCoordinatesSchema = z
  .array(GeoJsonPolygonCoordinatesSchema)
  .min(1);

export const GeoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: GeoJsonPolygonCoordinatesSchema,
  bbox: z.array(z.number()).min(4).optional(),
});

export const GeoJsonMultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: GeoJsonMultiPolygonCoordinatesSchema,
  bbox: z.array(z.number()).min(4).optional(),
});

export const GeoJsonPolygonalGeometrySchema = z.union([
  GeoJsonPolygonSchema,
  GeoJsonMultiPolygonSchema,
]);

export const GeoJsonPolygonalGeometryOrNullSchema =
  GeoJsonPolygonalGeometrySchema.nullable();

export type GeoJsonPolygon = z.infer<typeof GeoJsonPolygonSchema>;
export type GeoJsonMultiPolygon = z.infer<typeof GeoJsonMultiPolygonSchema>;
export type GeoJsonPolygonalGeometry = z.infer<
  typeof GeoJsonPolygonalGeometrySchema
>;