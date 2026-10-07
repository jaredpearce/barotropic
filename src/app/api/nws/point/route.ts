/**
 * NWS Point Data Route Handler
 * GET /api/nws/point?lat={latitude}&lon={longitude}
 *
 * Returns current conditions and forecast for a given latitude/longitude.
 * Combines data from NWS Points API (to get forecast URL and nearby stations)
 * with Forecast API and latest observations.
 */

import { NextResponse } from 'next/server';
import { fetchFromNws } from '@/lib/nws/client';
import {
  PointSchema,
  ForecastSchema,
  LatestObservationSchema,
} from '@/lib/nws/schemas';
import {
  validateLatitudeLongitude,
  extractStationId,
} from '@/lib/nws/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          details: 'Both lat and lon query parameters are required',
          example: '/api/nws/point?lat=39.7392&lon=-104.9903',
        },
        { status: 400 }
      );
    }

    // Validate coordinates
    let latitude: number, longitude: number;
    try {
      ({ latitude, longitude } = validateLatitudeLongitude(lat, lon));
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid coordinates',
          details: error instanceof Error ? error.message : 'Validation failed',
        },
        { status: 400 }
      );
    }

    // Fetch point metadata and observation stations
    const point = await fetchFromNws(
      request,
      `/points/${latitude},${longitude}`,
      PointSchema
    );

    const forecastUrl = point.properties.forecast;
    const observationStations = point.properties.observationStations ?? [];
    const relativeLocation = point.properties.relativeLocation?.properties;

    if (!forecastUrl) {
      return NextResponse.json(
        {
          error: 'Forecast not available',
          details: 'The requested location does not have forecast data available',
          coordinates: { latitude, longitude },
        },
        { status: 404 }
      );
    }

    // Fetch forecast and current conditions in parallel
    const forecastPath = forecastUrl.replace('https://api.weather.gov', '');
    const [forecast, currentConditions] = await Promise.all([
      fetchFromNws(request, forecastPath, ForecastSchema),
      observationStations.length > 0
        ? fetchFromNws(
            request,
            `/stations/${extractStationId(observationStations[0])}/observations/latest`,
            LatestObservationSchema
          ).catch(() => null) // Observation data may not always be available
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      location: {
        latitude,
        longitude,
        city: relativeLocation?.city ?? undefined,
        state: relativeLocation?.state ?? undefined,
      },
      currentConditions: currentConditions
        ? {
            timestamp: currentConditions.properties.timestamp,
            description: currentConditions.properties.textDescription,
            temperature: currentConditions.properties.temperature,
            dewpoint: currentConditions.properties.dewpoint,
            humidity: currentConditions.properties.relativeHumidity,
            windSpeed: currentConditions.properties.windSpeed,
            windDirection: currentConditions.properties.windDirection,
          }
        : null,
      forecast: forecast.properties.periods ?? [],
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error('Unexpected error in /api/nws/point:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
