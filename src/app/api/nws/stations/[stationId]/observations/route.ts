/**
 * NWS Station Observations Route Handler
 * GET /api/nws/stations/{stationId}/observations
 *
 * Returns recent observations from a specific weather station for verification.
 * Useful for comparing forecasts against actual observed conditions.
 */

import { NextResponse } from 'next/server';
import { fetchFromNws } from '@/lib/nws/client';
import { upstreamErrorResponse } from '@/lib/api-errors';
import { NormalizedObservationSchema, StationObservationsSchema } from '@/lib/schemas';
import {
  normalizeNwsQuantityValue,
  normalizeNwsTemperature,
  normalizeNwsWindSpeed,
} from '@/lib/weather-normalizers';

export async function GET(
  _request: Request,
  { params }: { params: { stationId: string } }
) {
  try {
    const stationId = params.stationId?.trim().toUpperCase();

    if (!stationId || stationId.length < 2) {
      return NextResponse.json(
        {
          error: 'Missing or invalid station ID',
          details: 'stationId must be a valid ICAO identifier (e.g., KDEN)',
          example: '/api/nws/stations/KDEN/observations',
        },
        { status: 400 }
      );
    }

    // Fetch observations with a limit of 20 most recent
    const observations = await fetchFromNws(
      `/stations/${stationId}/observations?limit=20`,
      StationObservationsSchema
    );

    const retrievedAt = new Date().toISOString();

    return NextResponse.json({
      stationId,
      observations: observations.features.map((feature) =>
        NormalizedObservationSchema.parse({
          source: 'NWS',
          id: feature.id,
          stationId,
          timestamp: feature.properties.timestamp ?? null,
          retrievedAt,
          issuedAt: feature.properties.timestamp ?? retrievedAt,
          description: feature.properties.textDescription ?? null,
          temperatureC: normalizeNwsTemperature(feature.properties.temperature),
          dewpointC: normalizeNwsTemperature(feature.properties.dewpoint),
          humidityPercent: normalizeNwsQuantityValue(
            feature.properties.relativeHumidity
          ),
          windSpeedMps: normalizeNwsWindSpeed(feature.properties.windSpeed),
          windDirectionDegrees: normalizeNwsQuantityValue(
            feature.properties.windDirection
          ),
        })
      ),
    });
  } catch (error) {
    const upstreamResponse = upstreamErrorResponse(error);
    if (upstreamResponse) {
      return upstreamResponse;
    }

    console.error(
      `Unexpected error in /api/nws/stations/[stationId]/observations:`,
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch station observations' },
      { status: 500 }
    );
  }
}
