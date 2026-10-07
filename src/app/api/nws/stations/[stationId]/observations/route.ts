/**
 * NWS Station Observations Route Handler
 * GET /api/nws/stations/{stationId}/observations
 *
 * Returns recent observations from a specific weather station for verification.
 * Useful for comparing forecasts against actual observed conditions.
 */

import { NextResponse } from 'next/server';
import { fetchFromNws } from '@/lib/nws/client';
import { StationObservationsSchema } from '@/lib/nws/schemas';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
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
      request,
      `/stations/${stationId}/observations?limit=20`,
      StationObservationsSchema
    );

    return NextResponse.json({
      stationId,
      observations: observations.features.map((feature) => ({
        id: feature.id,
        timestamp: feature.properties.timestamp ?? null,
        description: feature.properties.textDescription ?? null,
        temperature: feature.properties.temperature ?? null,
        dewpoint: feature.properties.dewpoint ?? null,
        windSpeed: feature.properties.windSpeed ?? null,
        windDirection: feature.properties.windDirection ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
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
