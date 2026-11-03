import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import { HourlyForecast } from './HourlyForecast';
import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';

const POINT = { latitude: 35.7915, longitude: -78.7811 };

function forecastRecord(
  timestamp: string,
  overrides: Partial<NormalizedWeatherRecord> = {},
): NormalizedWeatherRecord {
  return {
    source: 'Open-Meteo',
    timestamp,
    retrievedAt: '2026-11-03T12:00:00Z',
    runTime: null,
    temperatureC: 20,
    precipitationProbabilityPercent: 35,
    weatherCode: 61,
    windSpeedMps: 5,
    ...overrides,
  };
}

function forecastResponse(hours: NormalizedWeatherRecord[]) {
  return Response.json({ models: { gfs: { hourly: hours } } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HourlyForecast integration', () => {
  it('Use Case: loads hourly weather data and renders formatted forecast rows', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(forecastResponse([forecastRecord('2026-11-03T09:00')]));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<HourlyForecast latitude={POINT.latitude} longitude={POINT.longitude} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading hourly forecast');
    expect(
      await screen.findByRole('listitem', {
        name: '9:00 AM forecast 68° rain',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('10 kt')).toBeInTheDocument();

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as URL);
    expect(requestedUrl.pathname).toBe('/api/open-meteo/forecast');
    expect(requestedUrl.searchParams.get('lat')).toBe('35.7915');
    expect(requestedUrl.searchParams.get('lon')).toBe('-78.7811');
    expect(requestedUrl.searchParams.get('models')).toBe('gfs');
  });

  it('Use Case: shows an empty state when the forecast has no hours', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(forecastResponse([])));

    renderWithProviders(<HourlyForecast latitude={POINT.latitude} longitude={POINT.longitude} />);

    expect(
      await screen.findByText('No hourly forecast available for this location.'),
    ).toBeInTheDocument();
  });

  it('Use Case: retries after the hourly forecast request fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: 'Provider unavailable' }, { status: 502 }))
      .mockResolvedValueOnce(forecastResponse([forecastRecord('2026-11-03T10:00')]));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<HourlyForecast latitude={POINT.latitude} longitude={POINT.longitude} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load the hourly forecast',
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('listitem', {
        name: '10:00 AM forecast 68° rain',
      }),
    ).toBeInTheDocument();
  });

  it('Use Case: updates hourly forecast when the selected location changes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(forecastResponse([forecastRecord('2026-11-03T09:00')]))
      .mockResolvedValueOnce(
        forecastResponse([forecastRecord('2026-11-03T10:00', { temperatureC: 15 })]),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = renderWithProviders(
      <HourlyForecast latitude={POINT.latitude} longitude={POINT.longitude} />,
    );
    expect(
      await screen.findByRole('listitem', {
        name: '9:00 AM forecast 68° rain',
      }),
    ).toBeInTheDocument();

    rerender(<HourlyForecast latitude={40.7128} longitude={-74.006} />);

    expect(
      await screen.findByRole('listitem', {
        name: '10:00 AM forecast 59° rain',
      }),
    ).toBeInTheDocument();
  });
});
