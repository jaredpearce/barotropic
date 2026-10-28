import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const GeocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        country: z.string(),
        admin1: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json(
      { error: 'Search query must be between 2 and 100 characters' },
      { status: 400 }
    );
  }

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '8');
  url.searchParams.set('countryCode', 'US');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Location search is unavailable' }, { status: 502 });
    }

    const result = GeocodingResponseSchema.safeParse(await response.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Location search returned invalid data' }, { status: 502 });
    }

    return NextResponse.json({ results: result.data.results });
  } catch {
    return NextResponse.json({ error: 'Location search is unavailable' }, { status: 502 });
  }
}