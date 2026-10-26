import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import { CurrentConditions } from './CurrentConditions';
import type { NormalizedObservation } from '@/lib/schemas/normalized';

const POINT = { latitude: 35.7915, longitude: -78.7811 };

const OBSERVATION: NormalizedObservation = {
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

function conditionsResponse(
  currentConditions: NormalizedObservation | null
) {
  return Response.json({
    location: POINT,
    currentConditions,
    forecast: [],
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CurrentConditions integration', () => {
  it('Use Case: loads the station observation and renders the condition tiles', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(conditionsResponse(OBSERVATION));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <CurrentConditions latitude={POINT.latitude} longitude={POINT.longitude} />
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading current conditions'
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Current conditions · KRDU',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Partly Cloudy')).toBeInTheDocument();
    expect(screen.getByText('1012.4 mb')).toBeInTheDocument();
    expect(screen.getByText('RH 64%')).toBeInTheDocument();
    expect(screen.getByText('Feels like')).toBeInTheDocument();

    const requestedUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestedUrl.toString()).toContain('/api/nws/point');
    expect(requestedUrl.searchParams.get('lat')).toBe('35.7915');
    expect(requestedUrl.searchParams.get('lon')).toBe('-78.7811');
  });

  it('Use Case: shows an empty state when the endpoint has no observation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(conditionsResponse(null)));

    renderWithProviders(
      <CurrentConditions latitude={POINT.latitude} longitude={POINT.longitude} />
    );

    expect(
      await screen.findByText(
        'No current conditions available for this location.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Current conditions' })
    ).toBeInTheDocument();
  });

  it('Use Case: retries after the conditions request fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ error: 'NWS unavailable' }, { status: 502 })
      )
      .mockResolvedValueOnce(conditionsResponse(OBSERVATION));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <CurrentConditions latitude={POINT.latitude} longitude={POINT.longitude} />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load current conditions for this location.'
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Current conditions · KRDU',
      })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Use Case: refetches conditions when the selected location changes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(conditionsResponse(null))
      .mockResolvedValueOnce(conditionsResponse(OBSERVATION));
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = renderWithProviders(
      <CurrentConditions latitude={POINT.latitude} longitude={POINT.longitude} />
    );

    await screen.findByText(
      'No current conditions available for this location.'
    );

    rerender(<CurrentConditions latitude={40.7128} longitude={-74.006} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', {
        name: 'Current conditions · KRDU',
      })
    ).toBeInTheDocument();

    const secondUrl = fetchMock.mock.calls[1][0] as URL;
    expect(secondUrl.searchParams.get('lat')).toBe('40.7128');
    expect(secondUrl.searchParams.get('lon')).toBe('-74.006');
  });
});
