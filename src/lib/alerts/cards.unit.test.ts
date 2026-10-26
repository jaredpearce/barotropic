import { describe, expect, it } from 'vitest';
import type { GeoJsonPolygon } from '@/lib/schemas/geojson';
import type { NormalizedAlert } from '@/lib/schemas/normalized';
import { buildAlertCards } from './cards';

const NOW = new Date('2026-10-26T12:00:00Z');
const POINT = { latitude: 35.5, longitude: -78.5 };

const POLYGON_AROUND_POINT: GeoJsonPolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-79, 35],
      [-78, 35],
      [-78, 36],
      [-79, 36],
      [-79, 35],
    ],
  ],
};

const POLYGON_AWAY_FROM_POINT: GeoJsonPolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-70, 40],
      [-69, 40],
      [-69, 41],
      [-70, 41],
      [-70, 40],
    ],
  ],
};

function makeAlert(overrides: Partial<NormalizedAlert> = {}): NormalizedAlert {
  return {
    source: 'NWS',
    id: 'alert-1',
    retrievedAt: '2026-10-26T12:00:00Z',
    issuedAt: '2026-10-26T11:00:00Z',
    event: 'Heat Advisory',
    headline: 'Heat advisory in effect',
    severity: 'Moderate',
    certainty: 'Likely',
    urgency: 'Expected',
    status: 'Actual',
    messageType: 'Alert',
    category: 'Met',
    areaDescription: 'Wake / Chatham / Durham counties',
    onset: '2026-10-26T12:00:00Z',
    effective: '2026-10-26T12:00:00Z',
    expires: '2026-10-26T23:00:00Z',
    ends: null,
    description: 'Hot and humid conditions.',
    instruction: 'Drink water and limit outdoor activity.',
    senderName: 'NWS Raleigh',
    geometry: null,
    ...overrides,
  };
}

describe('alert cards', () => {
  it('Use Case: uses CAP severity instead of the event name', () => {
    const [card] = buildAlertCards(
      [
        makeAlert({
          event: 'Tornado Warning',
          severity: 'Minor',
        }),
      ],
      { now: NOW, point: POINT }
    );

    expect(card.severity).toBe('minor');
    expect(card.severityLabel).toBe('Minor');
  });

  it('Use Case: marks missing severity as unknown', () => {
    const [card] = buildAlertCards([makeAlert({ severity: null })], {
      now: NOW,
      point: POINT,
    });

    expect(card.severity).toBe('unknown');
    expect(card.severityLabel).toBe('Unknown');
  });

  it('Use Case: classifies alerts that contain the selected point', () => {
    const [polygonCard] = buildAlertCards(
      [makeAlert({ geometry: POLYGON_AROUND_POINT })],
      { now: NOW, point: POINT }
    );

    expect(polygonCard.match).toBe('polygon');
    expect(polygonCard.geometry.paths[0].containsPoint).toBe(true);
  });

  it('Use Case: labels null geometry as area-based', () => {
    const [card] = buildAlertCards([makeAlert({ geometry: null })], {
      now: NOW,
      point: POINT,
    });

    expect(card.match).toBe('area');
    expect(card.geometry).toEqual({
      kind: 'area',
      polygonCount: 0,
      paths: [],
    });
  });

  it('Use Case: labels a polygon that does not contain the point as nearby', () => {
    const [card] = buildAlertCards(
      [makeAlert({ geometry: POLYGON_AWAY_FROM_POINT })],
      { now: NOW, point: POINT }
    );

    expect(card.match).toBe('outside');
    expect(card.geometry.paths[0].containsPoint).toBe(false);
  });

  it('Use Case: removes expired alerts and keeps alerts without an expiry', () => {
    const cards = buildAlertCards(
      [
        makeAlert({ id: 'expired', expires: '2026-10-26T11:59:00Z' }),
        makeAlert({ id: 'active', expires: '2026-10-26T23:00:00Z' }),
        makeAlert({ id: 'open-ended', expires: null }),
      ],
      { now: NOW, point: POINT }
    );

    expect(cards.map((card) => card.id)).toEqual(['active', 'open-ended']);
  });

  it('Use Case: collapses duplicate alert IDs', () => {
    const cards = buildAlertCards(
      [
        makeAlert({ id: 'duplicate', event: 'First copy' }),
        makeAlert({ id: 'duplicate', event: 'Second copy' }),
      ],
      { now: NOW, point: POINT }
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].event).toBe('First copy');
  });

  it('Use Case: orders cards by geometry match, severity, then expiry', () => {
    const cards = buildAlertCards(
      [
        makeAlert({
          id: 'outside',
          event: 'Outside',
          severity: 'Extreme',
          geometry: POLYGON_AWAY_FROM_POINT,
        }),
        makeAlert({
          id: 'area',
          event: 'Area',
          severity: 'Extreme',
          geometry: null,
        }),
        makeAlert({
          id: 'polygon-minor',
          event: 'Polygon Minor',
          severity: 'Minor',
          expires: '2026-10-26T20:00:00Z',
          geometry: POLYGON_AROUND_POINT,
        }),
        makeAlert({
          id: 'polygon-severe',
          event: 'Polygon Severe',
          severity: 'Severe',
          expires: '2026-10-26T22:00:00Z',
          geometry: POLYGON_AROUND_POINT,
        }),
        makeAlert({
          id: 'polygon-severe-sooner',
          event: 'Polygon Severe Sooner',
          severity: 'Severe',
          expires: '2026-10-26T18:00:00Z',
          geometry: POLYGON_AROUND_POINT,
        }),
      ],
      { now: NOW, point: POINT }
    );

    expect(cards.map((card) => card.id)).toEqual([
      'polygon-severe-sooner',
      'polygon-severe',
      'polygon-minor',
      'area',
      'outside',
    ]);
  });

  it('Use Case: formats effective and expiry times in the requested time zone', () => {
    const [card] = buildAlertCards([makeAlert()], {
      now: NOW,
      point: POINT,
      locale: 'en-US',
      timeZone: 'UTC',
    });

    expect(card.effectiveIso).toBe('2026-10-26T12:00:00Z');
    expect(card.expiresIso).toBe('2026-10-26T23:00:00Z');
    expect(card.expiresLabel).toContain('Oct 26');
    expect(card.expiresLabel).toContain('UTC');
  });

  it('Use Case: falls back to a generic event name when NWS omits one', () => {
    const [card] = buildAlertCards(
      [
        makeAlert({
          event: null,
          headline: null,
          areaDescription: null,
          senderName: null,
          instruction: null,
        }),
      ],
      { now: NOW, point: POINT }
    );

    expect(card.event).toBe('Weather alert');
    expect(card.headline).toBeUndefined();
    expect(card.areaDescription).toBeUndefined();
    expect(card.senderName).toBeUndefined();
    expect(card.instruction).toBeUndefined();
  });
});
