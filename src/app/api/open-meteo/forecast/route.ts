/**
 * Open-Meteo forecast route handler
 * GET /api/open-meteo/forecast?lat={latitude}&lon={longitude}&models={gfs,hrr}
 *
 * Confirmed current upstream terms:
 * - model names: `gfs`, `hrrr`
 * - app alias kept for convenience: `hrr` -> `hrrr`
 * - radar tile URLs are not returned by the same Open-Meteo forecast endpoint;
 *   for map overlays we should separate a dedicated radar tile source from the model fetch.
 */

import { NextResponse } from 'next/server';
import { fetchFromOpenMeteo } from '@/lib/open-meteo/client';
import { OpenMeteoForecastSchema } from '@/lib/open-meteo/schemas';
import {
  buildOpenMeteoForecastQuery,
  normalizeOpenMeteoModels,
} from '@/lib/open-meteo/utils';
import { validateLatitudeLongitude } from '@/lib/nws/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const modelParam = searchParams.get('models');

    if (!lat || !lon) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          details: 'Both lat and lon query parameters are required',
          example: '/api/open-meteo/forecast?lat=39.7392&lon=-104.9903&models=gfs,hrr',
        },
        { status: 400 }
      );
    }

    let latitude: number;
    let longitude: number;
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

    let models: string[];
    try {
      models = normalizeOpenMeteoModels(modelParam);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid model selection',
          details:
            error instanceof Error ? error.message : 'A valid Open-Meteo model is required',
        },
        { status: 400 }
      );
    }

    const forecasts = await Promise.all(
      models.map(async (model) => {
        const endpoint = buildOpenMeteoForecastQuery(latitude, longitude, model, 7);
        const forecast = await fetchFromOpenMeteo(
          endpoint,
          OpenMeteoForecastSchema
        );

        return {
          model,
          forecast,
        };
      })
    );

    const modelResults = Object.fromEntries(
      forecasts.map(({ model, forecast }) => [model, forecast])
    );

    return NextResponse.json({
      location: {
        latitude,
        longitude,
      },
      requestedModels: models,
      models: modelResults,
      radar: {
        source: 'external-radar-tile-source',
        note:
          'Open-Meteo forecast API does not expose radar tile URLs directly; use a dedicated radar tile source or overlay config for map tiles.',
        tiles: [],
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error('Unexpected error in /api/open-meteo/forecast:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Open-Meteo forecast data' },
      { status: 500 }
    );
  }
}
