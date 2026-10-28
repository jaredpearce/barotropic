import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';
import { renderWithProviders } from '../../tests/utils/render';

interface StubAppFetchOptions {
  results?: unknown[];
  alerts?: unknown[];
  conditions?: unknown;
}

/**
 * Route-aware fetch stub: the layout loads alerts and conditions on mount and
 * geocodes only after a search, so a single fixed response would be consumed
 * twice.
 */
function stubAppFetch({
  results = [],
  alerts = [],
  conditions = null,
}: StubAppFetchOptions = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : input.toString();

    if (url.includes('/api/nws/alerts/point')) {
      return Promise.resolve(
        Response.json({
          point: { latitude: 35.7915, longitude: -78.7811 },
          alerts,
        })
      );
    }

    if (url.includes('/api/nws/point')) {
      return Promise.resolve(
        Response.json({
          location: { latitude: 35.7915, longitude: -78.7811 },
          currentConditions: conditions,
          forecast: [],
        })
      );
    }

    return Promise.resolve(Response.json({ results }));
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const SEATTLE_RESULT = {
  id: 123,
  name: 'Seattle',
  latitude: 47.6062,
  longitude: -122.3321,
  country: 'United States',
  admin1: 'Washington',
};

const ACTIVE_ALERT = {
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
};

const CURRENT_OBSERVATION = {
  source: 'NWS',
  id: 'KRDU:2026-10-26T16:53:00Z',
  stationId: 'KRDU',
  timestamp: '2026-10-26T16:53:00Z',
  retrievedAt: '2026-10-26T17:00:00Z',
  issuedAt: '2026-10-26T16:53:00Z',
  description: 'Partly Cloudy',
  temperatureC: 28.9,
  dewpointC: 21.1,
  humidityPercent: 64,
  windSpeedMps: 4.63,
  windGustMps: 7.72,
  windDirectionDegrees: 135,
  pressureHpa: 1012.4,
};

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('AppLayout location selection', () => {
  it('renders the Barotropic logo and wordmark as one accessible brand', () => {
    stubAppFetch();

    renderWithProviders(<AppLayout />);

    expect(screen.getByRole('img', { name: 'Barotropic' })).toBeInTheDocument();
    expect(screen.getByText('Barotropic')).toBeInTheDocument();
  });

  it('Use Case: searches for a place and updates the selected navigation location', async () => {
    const user = userEvent.setup();
    stubAppFetch({ results: [SEATTLE_RESULT] });

    renderWithProviders(<AppLayout />);
    await user.click(screen.getByRole('button', { name: /Cary, NC/i }));
    await user.type(screen.getByRole('searchbox', { name: 'City, state, or postal code' }), 'Seattle');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await user.click(await screen.findByRole('button', { name: /Seattle, Washington/i }));

    expect(screen.getByRole('button', { name: /Seattle, Washington/i })).toBeInTheDocument();
    expect(window.localStorage.getItem('barotropic.location')).toContain('47.6062');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Use Case: displays an empty state when location search has no matches', async () => {
    const user = userEvent.setup();
    stubAppFetch();

    renderWithProviders(<AppLayout />);
    await user.click(screen.getByRole('button', { name: /Cary, NC/i }));
    await user.type(screen.getByRole('searchbox', { name: 'City, state, or postal code' }), 'Nowhere');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText(/No locations found/i)).toBeInTheDocument();
  });

  it('Use Case: shows the active alerts for the selected location in the sidebar', async () => {
    stubAppFetch({ alerts: [ACTIVE_ALERT] });

    renderWithProviders(<AppLayout />);

    expect(
      await screen.findByRole('heading', { name: 'Active alerts (1)' })
    ).toBeInTheDocument();
    expect(screen.getByText('Heat Advisory')).toBeInTheDocument();
    expect(screen.getByText('Highest: Moderate')).toBeInTheDocument();
  });

  it('Use Case: shows the live current conditions for the selected location', async () => {
    stubAppFetch({ conditions: CURRENT_OBSERVATION });

    renderWithProviders(<AppLayout />);

    expect(
      await screen.findByRole('heading', {
        name: 'Current conditions · KRDU',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Partly Cloudy')).toBeInTheDocument();
    expect(screen.getByText('1012.4 mb')).toBeInTheDocument();
  });
});
