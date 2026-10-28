/**
 * NWS Active Alerts by Zone Route Handler
 * GET /api/nws/alerts/zone?zone={zoneId}
 *
 * Returns active alerts for a zone with full zone polygon geometry.
 * Fetches both zone definition (including polygon) and active alerts.
 */

import { NextResponse } from 'next/server';
import { fetchFromNws } from '@/lib/nws/client';
import { upstreamErrorResponse } from '@/lib/api-errors';
import {
  AlertsResponseSchema,
  NormalizedAlertSchema,
  NormalizedZoneSchema,
  ZoneSchema,
} from '@/lib/schemas';
import { validateZoneId } from '@/lib/nws/utils';

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
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
      fetchFromNws(`/zones/forecast/${zoneId}`, ZoneSchema),
      fetchFromNws(`/alerts/active?zone=${zoneId}`, AlertsResponseSchema),
    ]);

    const retrievedAt = new Date().toISOString();

    return NextResponse.json({
      zone: NormalizedZoneSchema.parse({
        source: 'NWS',
        id: zoneData.id,
        retrievedAt,
        issuedAt: zoneData.properties?.effectiveDate ?? retrievedAt,
        name: zoneData.properties?.name ?? null,
        state: zoneData.properties?.state ?? null,
        type: zoneData.properties?.type ?? null,
        geometry: zoneData.geometry,
      }),
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
    });
  } catch (error) {
    const upstreamResponse = upstreamErrorResponse(error);
    if (upstreamResponse) {
      return upstreamResponse;
    }

    console.error('Unexpected error in /api/nws/alerts/zone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts for zone' },
      { status: 500 }
    );
  }
}
