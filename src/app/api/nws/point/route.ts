/**
 * NWS Point Data Route Handler
 * GET /api/nws/point?lat={latitude}&lon={longitude}
 *
 * Returns current conditions and forecast for a given latitude/longitude.
 * Combines data from NWS Points API (to get forecast URL and nearby stations)
 * with Forecast API and latest observations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchFromNws } from '@/lib/nws/client';
import { normalizeNwsObservation } from '@/lib/nws/normalize-observation';
import { upstreamErrorResponse } from '@/lib/api-errors';
import {
  NormalizedWeatherRecordSchema,
  PointSchema,
  ForecastSchema,
  LatestObservationSchema,
  ObservationStationsSchema,
} from '@/lib/schemas';
import {
  normalizeNwsQuantityValue,
  normalizeNwsWindDirection,
  normalizeNwsWindSpeedText,
} from '@/lib/weather-normalizers';
import {
  validateLatitudeLongitude,
  extractStationId,
  toNwsPath,
} from '@/lib/nws/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
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
      `/points/${latitude},${longitude}`,
      PointSchema
    );

    const forecastUrl = point.properties.forecast;
    const stationsUrl = point.properties.observationStations;
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

    // Fetch the forecast and nearby stations in parallel
    const forecastPath = toNwsPath(forecastUrl);
    const stationsPath = stationsUrl ? toNwsPath(stationsUrl) : null;
    const [forecast, stations] = await Promise.all([
      fetchFromNws(forecastPath, ForecastSchema),
      stationsPath
        ? fetchFromNws(stationsPath, ObservationStationsSchema)
        : Promise.resolve(null),
    ]);
    const stationUrl = stations?.features[0]?.id;
    const stationId = stationUrl ? extractStationId(stationUrl) : null;
    const currentConditions = stationId
      ? await fetchFromNws(
          `/stations/${stationId}/observations/latest`,
          LatestObservationSchema
        )
      : null;

    const retrievedAt = new Date().toISOString();
    const normalizedCurrentConditions =
      stationId && currentConditions
        ? normalizeNwsObservation(stationId, currentConditions, retrievedAt)
        : null;

    return NextResponse.json({
      location: {
        latitude,
        longitude,
        city: relativeLocation?.city ?? undefined,
        state: relativeLocation?.state ?? undefined,
      },
      currentConditions: normalizedCurrentConditions,
      forecast: (forecast.properties.periods ?? []).map((period) =>
        NormalizedWeatherRecordSchema.parse({
          source: 'NWS',
          timestamp: period.startTime ?? retrievedAt,
          retrievedAt,
          issuedAt: forecast.properties.updateTime ?? retrievedAt,
          temperatureC:
            period.temperatureUnit === 'F'
              ? ((period.temperature - 32) * 5) / 9
              : period.temperature,
          humidityPercent: normalizeNwsQuantityValue(period.relativeHumidity),
          windSpeedMps: normalizeNwsWindSpeedText(period.windSpeed),
          windDirectionDegrees: normalizeNwsWindDirection(period.windDirection),
          precipitationProbabilityPercent: normalizeNwsQuantityValue(
            period.probabilityOfPrecipitation
          ),
          condition: period.shortForecast,
          periodName: period.name,
          isDaytime: period.isDaytime,
        })
      ),
    });
  } catch (error) {
    const upstreamResponse = upstreamErrorResponse(error);
    if (upstreamResponse) {
      return upstreamResponse;
    }

    console.error('Unexpected error in /api/nws/point:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
