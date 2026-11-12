/**
 * NWS Station Observations Route Handler
 * GET /api/nws/stations/{stationId}/observations
 *
 * Returns recent observations from a specific weather station for verification.
 * Optionally accepts `start`/`end` ISO timestamps (max 31 days) to fetch a
 * historical window, plus `limit` up to 500. Defaults to the latest 20.
 */

import { NextResponse } from 'next/server';
import { fetchFromNws } from '@/lib/nws/client';
import { normalizeNwsObservation } from '@/lib/nws/normalize-observation';
import { upstreamErrorResponse } from '@/lib/api-errors';
import { StationObservationsQuerySchema, StationObservationsSchema } from '@/lib/schemas';

const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 20;
const RANGE_LIMIT = 500;

export async function GET(request: Request, { params }: { params: { stationId: string } }) {
  try {
    const stationId = params.stationId?.trim().toUpperCase();

    if (!stationId || stationId.length < 2) {
      return NextResponse.json(
        {
          error: 'Missing or invalid station ID',
          details: 'stationId must be a valid ICAO identifier (e.g., KDEN)',
          example: '/api/nws/stations/KDEN/observations',
        },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = StationObservationsQuerySchema.safeParse({
      start: searchParams.get('start') ?? undefined,
      end: searchParams.get('end') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: 'start and end must be ISO timestamps and limit must be 1-500',
          example:
            '/api/nws/stations/KDEN/observations?start=2026-11-01T00:00:00Z&end=2026-11-02T00:00:00Z&limit=500',
        },
        { status: 400 },
      );
    }

    const { start, end, limit } = parsedQuery.data;

    if ((start && !end) || (!start && end)) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: 'start and end must be provided together',
        },
        { status: 400 },
      );
    }

    let query: URLSearchParams;
    if (start && end) {
      const startMs = Date.parse(start);
      const endMs = Date.parse(end);
      if (!(endMs > startMs)) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: 'end must be after start' },
          { status: 400 },
        );
      }
      if (endMs - startMs > MAX_RANGE_MS) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: 'date range cannot exceed 31 days' },
          { status: 400 },
        );
      }
      query = new URLSearchParams({
        start,
        end,
        limit: String(limit ?? RANGE_LIMIT),
      });
    } else {
      query = new URLSearchParams({ limit: String(limit ?? DEFAULT_LIMIT) });
    }

    const observations = await fetchFromNws(
      `/stations/${stationId}/observations?${query.toString()}`,
      StationObservationsSchema,
    );

    const retrievedAt = new Date().toISOString();

    return NextResponse.json({
      stationId,
      retrievedAt,
      observations: observations.features.map((feature) =>
        normalizeNwsObservation(stationId, { properties: feature.properties }, retrievedAt),
      ),
    });
  } catch (error) {
    const upstreamResponse = upstreamErrorResponse(error);
    if (upstreamResponse) {
      return upstreamResponse;
    }

    console.error(`Unexpected error in /api/nws/stations/[stationId]/observations:`, error);
    return NextResponse.json({ error: 'Failed to fetch station observations' }, { status: 500 });
  }
}
