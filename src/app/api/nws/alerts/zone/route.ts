/**
 * NWS Active Alerts by Zone Route Handler
 * GET /api/nws/alerts/zone?zone={zoneId}
 *
 * Returns active alerts for a zone with full zone polygon geometry.
 * Fetches both zone definition (including polygon) and active alerts.
 */

import { NextResponse } from 'next/server';
import { fetchFromNws } from '@/lib/nws/client';
import { ZoneSchema, AlertsResponseSchema } from '@/lib/nws/schemas';
import { validateZoneId } from '@/lib/nws/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const zone = searchParams.get('zone');

    if (!zone) {
      return NextResponse.json(
        {
          error: 'Missing required parameter',
          details: 'zone query parameter is required',
          example: '/api/nws/alerts/zone?zone=COZ001',
        },
        { status: 400 }
      );
    }

    // Validate zone ID
    let zoneId: string;
    try {
      zoneId = validateZoneId(zone);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid zone',
          details: error instanceof Error ? error.message : 'Validation failed',
        },
        { status: 400 }
      );
    }

    // Fetch zone metadata (includes geometry) and active alerts in parallel
    const [zoneData, alertsResponse] = await Promise.all([
      fetchFromNws(request, `/zones/forecast/${zoneId}`, ZoneSchema),
      fetchFromNws(request, `/alerts/active?zone=${zoneId}`, AlertsResponseSchema),
    ]);

    return NextResponse.json({
      zone: {
        id: zoneData.id,
        name: zoneData.properties?.name ?? null,
        state: zoneData.properties?.state ?? null,
        type: zoneData.properties?.type ?? null,
        // Include full polygon geometry (not bounding box)
        geometry: zoneData.geometry ?? null,
      },
      alerts: alertsResponse.features.map((feature) => ({
        id: feature.id,
        event: feature.properties.event ?? null,
        headline: feature.properties.headline ?? null,
        severity: feature.properties.severity ?? null,
        urgency: feature.properties.urgency ?? null,
        status: feature.properties.status ?? null,
        areaDescription: feature.properties.areaDesc ?? null,
        effective: feature.properties.effective ?? null,
        expires: feature.properties.expires ?? null,
        description: feature.properties.description ?? null,
        // Include alert geometry if available
        geometry: feature.geometry ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error('Unexpected error in /api/nws/alerts/zone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts for zone' },
      { status: 500 }
    );
  }
}
