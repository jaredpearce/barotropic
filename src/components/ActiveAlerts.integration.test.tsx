import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import { ActiveAlerts } from './ActiveAlerts';
import type { GeoJsonPolygon } from '@/lib/schemas/geojson';
import type { NormalizedAlert } from '@/lib/schemas/normalized';

const POINT = { latitude: 35.7915, longitude: -78.7811 };

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
    areaDescription: 'Wake / Chatham / Durham counties',
    effective: '2026-10-26T12:00:00Z',
    expires: '2099-10-26T23:00:00Z',
    description: 'Hot and humid conditions.',
    instruction: 'Drink water.',
    senderName: 'NWS Raleigh',
    geometry: null,
    ...overrides,
  };
}

function alertsResponse(alerts: NormalizedAlert[]) {
  return Response.json({ point: POINT, alerts });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ActiveAlerts integration', () => {
  it('Use Case: loads alerts and shows the count and highest severity', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      alertsResponse([
        makeAlert({
          id: 'polygon',
          event: 'Heat Advisory',
          severity: 'Moderate',
          geometry: POLYGON_AROUND_POINT,
        }),
        makeAlert({
          id: 'area',
          event: 'Flood Watch',
          severity: 'Extreme',
          geometry: null,
        }),
      ])
    );
    vi.stubGlobal('fetch', fetchMock);

    const { container } = renderWithProviders(
      <ActiveAlerts latitude={POINT.latitude} longitude={POINT.longitude} />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading active alerts');

    expect(
      await screen.findByRole('heading', { name: 'Active alerts (2)' })
    ).toBeInTheDocument();
    expect(screen.getByText('Heat Advisory')).toBeInTheDocument();
    expect(screen.getByText('Flood Watch')).toBeInTheDocument();
    expect(screen.getByText('Highest: Extreme')).toBeInTheDocument();
    expect(container.querySelector('.active-alerts-highest')).toHaveAttribute(
      'data-severity',
      'extreme'
    );

    const requestedUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestedUrl.toString()).toContain('/api/nws/alerts/point');
    expect(requestedUrl.searchParams.get('lat')).toBe('35.7915');
    expect(requestedUrl.searchParams.get('lon')).toBe('-78.7811');
  });

  it('Use Case: distinguishes polygon and area-based alerts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        alertsResponse([
          makeAlert({
            id: 'polygon',
            event: 'Heat Advisory',
            geometry: POLYGON_AROUND_POINT,
          }),
          makeAlert({
            id: 'area',
            event: 'Flood Watch',
            geometry: null,
          }),
        ])
      )
    );

    const { container } = renderWithProviders(
      <ActiveAlerts latitude={POINT.latitude} longitude={POINT.longitude} />
    );

    await screen.findByText('Heat Advisory');

    const cards = container.querySelectorAll('.alert-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('data-match', 'polygon');
    expect(cards[1]).toHaveAttribute('data-match', 'area');
    expect(
      screen.getByText(
        'Area-based alert. NWS did not publish a polygon for this alert.'
      )
    ).toBeInTheDocument();
  });

  it('Use Case: shows an empty state when the location has no alerts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(alertsResponse([])));

    renderWithProviders(
      <ActiveAlerts latitude={POINT.latitude} longitude={POINT.longitude} />
    );

    expect(
      await screen.findByText('No active alerts for this location.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Active alerts' })
    ).toBeInTheDocument();
  });

  it('Use Case: retries after the alert request fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: 'NWS unavailable' }, { status: 502 }))
      .mockResolvedValueOnce(alertsResponse([makeAlert({ event: 'Heat Advisory' })]));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <ActiveAlerts latitude={POINT.latitude} longitude={POINT.longitude} />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load alerts for this location.'
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Heat Advisory')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Use Case: refetches alerts when the selected location changes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(alertsResponse([]))
      .mockResolvedValueOnce(alertsResponse([makeAlert({ event: 'Flood Watch' })]));
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = renderWithProviders(
      <ActiveAlerts latitude={POINT.latitude} longitude={POINT.longitude} />
    );

    await screen.findByText('No active alerts for this location.');

    rerender(<ActiveAlerts latitude={40.7128} longitude={-74.006} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Flood Watch')).toBeInTheDocument();

    const secondUrl = fetchMock.mock.calls[1][0] as URL;
    expect(secondUrl.searchParams.get('lat')).toBe('40.7128');
    expect(secondUrl.searchParams.get('lon')).toBe('-74.006');
  });
});
