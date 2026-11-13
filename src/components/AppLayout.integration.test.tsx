import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';
import { renderWithProviders } from '../../tests/utils/render';

vi.mock('./MapPanel', () => ({
  default: ({
    alerts = [],
    label,
    latitude,
    longitude,
    stations = [],
  }: {
    alerts?: unknown[];
    label?: string;
    latitude: number;
    longitude: number;
    stations?: unknown[];
  }) => (
    <div
      data-alerts={alerts.length}
      data-label={label}
      data-latitude={latitude}
      data-longitude={longitude}
      data-stations={stations.length}
      data-testid="map-panel"
    />
  ),
}));

interface StubAppFetchOptions {
  alerts?: unknown[];
  conditions?: unknown;
  stations?: unknown[];
}

/**
 * Route-aware fetch stub: the layout loads alerts and conditions on mount, so a
 * single fixed response would be consumed twice.
 */
function stubAppFetch({ alerts = [], conditions = null, stations = [] }: StubAppFetchOptions = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : input.toString();

    if (url.includes('/api/nws/alerts/point')) {
      return Promise.resolve(
        Response.json({
          point: { latitude: 35.7915, longitude: -78.7811 },
          alerts,
        }),
      );
    }

    return Promise.resolve(
      Response.json({
        location: { latitude: 35.7915, longitude: -78.7811 },
        currentConditions: conditions,
        stations,
        forecast: [],
      }),
    );
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

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

const STATIONS = [
  { id: 'KRDU', name: 'Raleigh-Durham International Airport', latitude: 35.89, longitude: -78.79 },
  { id: 'KJNX', name: 'Johnston Regional Airport', latitude: 35.54, longitude: -78.39 },
];

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

function stubViewport(isDesktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)' && isDesktop,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe('AppLayout weather panels', () => {
  it('Use Case: opens weather details by default on desktop and lets the user toggle them', async () => {
    const user = userEvent.setup();
    stubViewport(true);
    stubAppFetch({ alerts: [ACTIVE_ALERT] });

    renderWithProviders(<AppLayout />);

    const toggle = screen.getByRole('button', { name: 'Hide weather details' });
    expect(toggle.closest('header')).toBeInTheDocument();
    expect(toggle.closest('aside')).toHaveAttribute('data-sidebar-open', 'true');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByRole('heading', { name: 'Active alerts (1)' })).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Show weather details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await user.click(screen.getByRole('button', { name: 'Show weather details' }));
    expect(screen.getByRole('button', { name: 'Hide weather details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('Use Case: closes weather details by default on smaller screens and lets the user open them', async () => {
    const user = userEvent.setup();
    stubViewport(false);
    stubAppFetch({ alerts: [ACTIVE_ALERT] });

    renderWithProviders(<AppLayout />);

    const toggle = screen.getByRole('button', { name: 'Show weather details' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.closest('header')).toBeInTheDocument();
    expect(toggle.closest('aside')).toHaveAttribute('data-sidebar-open', 'false');
    expect(screen.queryByRole('heading', { name: 'Active alerts (1)' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide weather details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(await screen.findByRole('heading', { name: 'Active alerts (1)' })).toBeInTheDocument();
  });

  it('renders the map for the default location', () => {
    stubAppFetch();

    renderWithProviders(<AppLayout />);

    expect(screen.getByTestId('map-panel')).toHaveAttribute('data-label', 'Cary, NC');
  });

  it('Use Case: shows the active alerts for the selected location in the sidebar', async () => {
    stubAppFetch({ alerts: [ACTIVE_ALERT] });

    renderWithProviders(<AppLayout />);

    expect(await screen.findByRole('heading', { name: 'Active alerts (1)' })).toBeInTheDocument();
    expect(screen.getByText('Heat Advisory')).toBeInTheDocument();
    expect(screen.getByText('Highest: Moderate')).toBeInTheDocument();
  });

  it('Use Case: shows the current conditions for the selected location', async () => {
    stubAppFetch({ conditions: CURRENT_OBSERVATION });

    renderWithProviders(<AppLayout />);

    expect(
      await screen.findByRole('heading', {
        name: 'Current conditions · KRDU',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Partly Cloudy')).toBeInTheDocument();
    expect(screen.getByText('1012.4 mb')).toBeInTheDocument();
  });

  it('Use Case: passes alert polygons and station points to the map', async () => {
    stubAppFetch({
      alerts: [
        {
          ...ACTIVE_ALERT,
          geometry: {
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
          },
        },
      ],
      conditions: CURRENT_OBSERVATION,
      stations: STATIONS,
    });

    renderWithProviders(<AppLayout />);

    await screen.findByRole('heading', { name: 'Active alerts (1)' });
    await screen.findByRole('heading', { name: 'Current conditions · KRDU' });

    expect(screen.getByTestId('map-panel')).toHaveAttribute('data-alerts', '1');
    expect(screen.getByTestId('map-panel')).toHaveAttribute('data-stations', '2');
  });
});
