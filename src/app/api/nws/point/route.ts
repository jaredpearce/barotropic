/**
 * NWS Point Data Route Handler
 * GET /api/nws/point?lat={latitude}&lon={longitude}
 *
 * Returns current conditions, 12-hour forecast periods, hourly periods, and
 * nearby stations for a given latitude/longitude. A failure of one upstream
 * resource does not discard the others.
 */

import { NextResponse } from 'next/server';
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
import { validateLatitudeLongitude, extractStationId, toNwsPath } from '@/lib/nws/utils';
import { normalizeObservationStations } from '@/lib/nws/stations';

export const dynamic = 'force-dynamic';

type ForecastPayload = {
  properties: {
    updateTime?: string;
    periods?: Array<{
      startTime?: string;
      temperature: number;
      temperatureUnit: 'F' | 'C';
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      probabilityOfPrecipitation?: { value?: number | null };
      relativeHumidity?: { value?: number | null };
      isDaytime?: boolean;
      name: string;
    }>;
  };
};

function normalizePeriods(
  payload: ForecastPayload | null,
  retrievedAt: string,
): ReturnType<typeof NormalizedWeatherRecordSchema.parse>[] {
  if (!payload) return [];
  const issuedAt = payload.properties.updateTime ?? retrievedAt;
  return (payload.properties.periods ?? []).map((period) =>
    NormalizedWeatherRecordSchema.parse({
      source: 'NWS',
      timestamp: period.startTime ?? retrievedAt,
      retrievedAt,
      issuedAt,
      temperatureC:
        period.temperatureUnit === 'F' ? ((period.temperature - 32) * 5) / 9 : period.temperature,
      humidityPercent: normalizeNwsQuantityValue(period.relativeHumidity),
      windSpeedMps: normalizeNwsWindSpeedText(period.windSpeed),
      windDirectionDegrees: normalizeNwsWindDirection(period.windDirection),
      precipitationProbabilityPercent: normalizeNwsQuantityValue(period.probabilityOfPrecipitation),
      condition: period.shortForecast,
      periodName: period.name,
      isDaytime: period.isDaytime,
    }),
  );
}

function errorMessage(result: PromiseSettledResult<unknown>): string | null {
  return result.status === 'rejected'
    ? result.reason instanceof Error
      ? result.reason.message
      : 'Request failed'
    : null;
}

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
        { status: 400 },
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
        { status: 400 },
      );
    }

    // Fetch point metadata and observation stations
    const point = await fetchFromNws(`/points/${latitude},${longitude}`, PointSchema);

    const forecastUrl = point.properties.forecast;
    const hourlyUrl = point.properties.forecastHourly;
    const stationsUrl = point.properties.observationStations;
    const timeZone = point.properties.timeZone ?? null;
    const relativeLocation = point.properties.relativeLocation?.properties;

    if (!forecastUrl) {
      return NextResponse.json(
        {
          error: 'Forecast not available',
          details: 'The requested location does not have forecast data available',
          coordinates: { latitude, longitude },
        },
        { status: 404 },
      );
    }

    // Fetch the daily forecast, hourly forecast, and nearby stations in parallel.
    // One upstream failure must not discard the others.
    const [forecastResult, hourlyResult, stationsResult] = await Promise.allSettled([
      fetchFromNws(toNwsPath(forecastUrl), ForecastSchema),
      hourlyUrl ? fetchFromNws(toNwsPath(hourlyUrl), ForecastSchema) : Promise.resolve(null),
      stationsUrl
        ? fetchFromNws(toNwsPath(stationsUrl), ObservationStationsSchema)
        : Promise.resolve(null),
    ]);

    const forecast = forecastResult.status === 'fulfilled' ? forecastResult.value : null;
    const hourly = hourlyResult.status === 'fulfilled' ? hourlyResult.value : null;
    const stations = stationsResult.status === 'fulfilled' ? stationsResult.value : null;

    const stationUrl = stations?.features[0]?.id;
    const stationId = stationUrl ? extractStationId(stationUrl) : null;
    const stationCoordinates = normalizeObservationStations(stations);

    let currentConditions: Awaited<ReturnType<typeof fetchFromNws>> | null = null;
    if (stationId) {
      try {
        currentConditions = await fetchFromNws(
          `/stations/${stationId}/observations/latest`,
          LatestObservationSchema,
        );
      } catch {
        currentConditions = null;
      }
    }

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
      timeZone,
      stationId,
      retrievedAt,
      forecastIssuedAt: forecast?.properties.updateTime ?? null,
      currentConditions: normalizedCurrentConditions,
      stations: stationCoordinates,
      forecast: normalizePeriods(forecast, retrievedAt),
      hourly: normalizePeriods(hourly, retrievedAt),
      forecastError: errorMessage(forecastResult),
      hourlyError: errorMessage(hourlyResult),
    });
  } catch (error) {
    const upstreamResponse = upstreamErrorResponse(error);
    if (upstreamResponse) {
      return upstreamResponse;
    }

    console.error('Unexpected error in /api/nws/point:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
