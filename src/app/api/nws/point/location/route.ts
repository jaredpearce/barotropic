import { NextResponse } from 'next/server';
import { upstreamErrorResponse } from '@/lib/api-errors';
import { fetchFromNws } from '@/lib/nws/client';
import { validateLatitudeLongitude } from '@/lib/nws/utils';
import { PointSchema } from '@/lib/schemas';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (lat === null || lon === null) {
    return NextResponse.json(
      { error: 'Both lat and lon query parameters are required' },
      { status: 400 }
    );
  }

  let latitude: number;
  let longitude: number;
  try {
    ({ latitude, longitude } = validateLatitudeLongitude(lat, lon));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid coordinates' },
      { status: 400 }
    );
  }

  try {
    const point = await fetchFromNws(`/points/${latitude},${longitude}`, PointSchema);
    const relativeLocation = point.properties.relativeLocation?.properties;

    return NextResponse.json({
      location: {
        latitude,
        longitude,
        city: relativeLocation?.city ?? null,
        state: relativeLocation?.state ?? null,
      },
    });
  } catch (error) {
    const upstreamResponse = upstreamErrorResponse(error);
    if (upstreamResponse) return upstreamResponse;

    console.error('Unexpected error in /api/nws/point/location:', error);
    return NextResponse.json({ error: 'Failed to look up location' }, { status: 500 });
  }
}