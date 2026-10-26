/**
 * NWS Active Alerts by Point Route Handler
 * GET /api/nws/alerts/point?lat={latitude}&lon={longitude}
 *
 * Returns active alerts relevant to a coordinate. NWS applies its own zone and
 * polygon filtering; the normalized geometry is retained so the client can
 * distinguish polygon-based alerts from area-based alerts.
 */

import { NextResponse } from 'next/server';
import { upstreamErrorResponse } from '@/lib/api-errors';
import { fetchFromNws } from '@/lib/nws/client';
import { validateLatitudeLongitude } from '@/lib/nws/utils';
import {
  AlertsResponseSchema,
  NormalizedAlertSchema,
} from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (lat === null || lon === null) {
    return NextResponse.json(
      {
        error: 'Missing required parameters',
        details: 'Both lat and lon query parameters are required',
        example: '/api/nws/alerts/point?lat=35.7915&lon=-78.7811',
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

  try {
    const alertsResponse = await fetchFromNws(
      `/alerts/active?point=${latitude},${longitude}`,
      AlertsResponseSchema,
      { revalidate: 30 }
    );
    const retrievedAt = new Date().toISOString();

    return NextResponse.json(
      {
        point: { latitude, longitude },
        alerts: alertsResponse.features.map((feature) =>
          NormalizedAlertSchema.parse({
            source: 'NWS',
            id: feature.id,
            retrievedAt,
            issuedAt: feature.properties.sent ?? retrievedAt,
            event: feature.properties.event ?? null,
            headline: feature.properties.headline ?? null,
            severity: feature.properties.severity ?? null,
            certainty: feature.properties.certainty ?? null,
            urgency: feature.properties.urgency ?? null,
            status: feature.properties.status ?? null,
            messageType: feature.properties.messageType ?? null,
            category: feature.properties.category ?? null,
            areaDescription: feature.properties.areaDesc ?? null,
            onset: feature.properties.onset ?? null,
            effective: feature.properties.effective ?? null,
            expires: feature.properties.expires ?? null,
            ends: feature.properties.ends ?? null,
            description: feature.properties.description ?? null,
            instruction: feature.properties.instruction ?? null,
            senderName: feature.properties.senderName ?? null,
            geometry: feature.geometry,
          })
        ),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const upstreamResponse = upstreamErrorResponse(error);
    if (upstreamResponse) return upstreamResponse;

    console.error('Unexpected error in /api/nws/alerts/point:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts for point' },
      { status: 500 }
    );
  }
}
