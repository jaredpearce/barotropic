/**
 * Open-Meteo forecast route handler
 * GET /api/open-meteo/forecast?models={gfs,hrrr}
 *
 * The generic endpoint uses a fixed Cary, NC location while this API is being developed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchFromOpenMeteo } from '@/lib/open-meteo/client';
import { upstreamErrorResponse } from '@/lib/api-errors';
import { OpenMeteoForecastSchema } from '@/lib/schemas';
import {
  buildOpenMeteoForecastQuery,
  normalizeOpenMeteoModels,
  OPEN_METEO_MODELS,
  type OpenMeteoModelName,
} from '@/lib/open-meteo/utils';
import { NormalizedWeatherRecordSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const CARY_LOCATION = {
  latitude: 35.7915,
  longitude: -78.7811,
  city: 'Cary',
  state: 'NC',
};

const RADAR_WMS_URL =
  'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const modelParam = searchParams.get('models');

    let models: OpenMeteoModelName[];
    try {
      models = normalizeOpenMeteoModels(modelParam);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid model selection',
          details:
            error instanceof Error ? error.message : 'A valid Open-Meteo model is required',
          example: '/api/open-meteo/forecast?models=gfs,hrrr',
        },
        { status: 400 }
      );
    }

    const forecasts = await Promise.all(
      models.map(async (modelName) => {
        const model = OPEN_METEO_MODELS[modelName];
        const endpoint = buildOpenMeteoForecastQuery(
          CARY_LOCATION.latitude,
          CARY_LOCATION.longitude,
          model.id,
          7
        );
        const forecast = await fetchFromOpenMeteo(
          endpoint,
          OpenMeteoForecastSchema
        );
        const retrievedAt = new Date().toISOString();
        const hourly = (forecast.hourly?.time ?? []).map((timestamp, index) =>
          NormalizedWeatherRecordSchema.parse({
            source: 'Open-Meteo',
            model: model.name,
            modelId: model.id,
            timestamp,
            retrievedAt,
            runTime: null,
            temperatureC: forecast.hourly?.temperature_2m[index] ?? null,
            humidityPercent: forecast.hourly?.relative_humidity_2m[index] ?? null,
            precipitationProbabilityPercent:
              forecast.hourly?.precipitation_probability[index] ?? null,
            weatherCode: forecast.hourly?.weather_code[index] ?? null,
            windSpeedMps: forecast.hourly?.wind_speed_10m[index] ?? null,
          })
        );
        const daily = (forecast.daily?.time ?? []).map((timestamp, index) =>
          NormalizedWeatherRecordSchema.parse({
            source: 'Open-Meteo',
            model: model.name,
            modelId: model.id,
            timestamp,
            retrievedAt,
            runTime: null,
            weatherCode: forecast.daily?.weather_code[index] ?? null,
            minimumTemperatureC: forecast.daily?.temperature_2m_min[index] ?? null,
            maximumTemperatureC: forecast.daily?.temperature_2m_max[index] ?? null,
          })
        );

        return {
          modelName,
          modelId: model.id,
          name: model.name,
          hourly,
          daily,
        };
      })
    );

    const modelResults = Object.fromEntries(
      forecasts.map(({ modelName, ...forecast }) => [modelName, forecast])
    );

    return NextResponse.json({
      location: {
        ...CARY_LOCATION,
      },
      requestedModels: models,
      models: modelResults,
      radar: {
        source: 'NOAA/NCEP MRMS Base Reflectivity',
        attribution: 'NOAA/NCEP Multi-Radar Multi-Sensor (MRMS)',
        attributionUrl: 'https://opengeo.ncep.noaa.gov/geoserver/',
        capabilitiesUrl: `${RADAR_WMS_URL}?service=WMS&request=GetCapabilities`,
        tileUrlTemplate:
          `${RADAR_WMS_URL}?service=WMS&version=1.1.1&request=GetMap` +
          '&layers=conus_bref_qcd&styles=&format=image/png&transparent=true' +
          '&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}',
      },
    });
  } catch (error) {
    const upstreamResponse = upstreamErrorResponse(error);
    if (upstreamResponse) {
      return upstreamResponse;
    }

    console.error('Unexpected error in /api/open-meteo/forecast:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Open-Meteo forecast data' },
      { status: 500 }
    );
  }
}
