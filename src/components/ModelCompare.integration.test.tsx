import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';
import ModelCompare from './ModelCompare';

function nwsRecord(
  timestamp: string,
  overrides: Partial<NormalizedWeatherRecord> = {},
): NormalizedWeatherRecord {
  return {
    source: 'NWS',
    timestamp,
    retrievedAt: '2026-11-03T12:00:00Z',
    issuedAt: '2026-11-03T11:00:00Z',
    isDaytime: true,
    temperatureC: 20,
    precipitationProbabilityPercent: 20,
    windSpeedMps: 4,
    ...overrides,
  };
}

function modelRecord(
  timestamp: string,
  overrides: Partial<NormalizedWeatherRecord> = {},
): NormalizedWeatherRecord {
  return {
    source: 'Open-Meteo',
    timestamp,
    retrievedAt: '2026-11-03T12:05:00Z',
    runTime: null,
    temperatureC: 21,
    precipitationProbabilityPercent: 30,
    windSpeedMps: 6,
    ...overrides,
  };
}

const NWS_POINT = {
  forecast: [nwsRecord('2026-11-03T12:00:00-05:00')],
  hourly: [
    nwsRecord('2026-11-03T12:00:00-05:00'),
    nwsRecord('2026-11-03T13:00:00-05:00', { temperatureC: 22 }),
  ],
  timeZone: 'America/New_York',
  stationId: 'KBOS',
  forecastIssuedAt: '2026-11-03T11:00:00Z',
  retrievedAt: '2026-11-03T12:00:00Z',
};

const MODEL_HOURLY = [
  modelRecord('2026-11-03T12:00'),
  modelRecord('2026-11-03T13:00', { temperatureC: 23 }),
];

function modelsResponse(
  overrides: {
    models?: Record<string, unknown>;
    modelErrors?: Record<string, string>;
  } = {},
) {
  return {
    models: overrides.models ?? {
      gfs: {
        modelId: 'ncep_gfs_seamless',
        retrievedAt: '2026-11-03T12:05:00Z',
        runTime: null,
        hourly: MODEL_HOURLY,
      },
      hrrr: {
        modelId: 'ncep_hrrr_conus',
        retrievedAt: '2026-11-03T12:06:00Z',
        runTime: null,
        hourly: MODEL_HOURLY,
      },
      ecmwf: {
        modelId: 'ecmwf_ifs025',
        retrievedAt: '2026-11-03T12:07:00Z',
        runTime: null,
        hourly: MODEL_HOURLY,
      },
    },
    modelErrors: overrides.modelErrors ?? {},
  };
}

interface StubOptions {
  nws?: unknown;
  nwsStatus?: number;
  models?: unknown;
  modelsStatus?: number;
}

function stubComparisonFetch({
  nws = NWS_POINT,
  nwsStatus = 200,
  models = modelsResponse(),
  modelsStatus = 200,
}: StubOptions = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.includes('/api/nws/point')) {
      return Promise.resolve(Response.json(nws, { status: nwsStatus }));
    }
    if (url.includes('/api/open-meteo/forecast')) {
      return Promise.resolve(Response.json(models, { status: modelsStatus }));
    }
    return Promise.resolve(Response.json({ results: [] }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('ModelCompare integration', () => {
  it('renders NWS, GFS, HRRR, and ECMWF with run and retrieved metadata', async () => {
    stubComparisonFetch();

    renderWithProviders(<ModelCompare width={720} />);

    expect(await screen.findByRole('img', { name: 'Temperature comparison' })).toBeInTheDocument();

    const legend = screen.getAllByRole('list')[0];
    for (const label of ['NWS', 'GFS', 'HRRR', 'ECMWF']) {
      expect(within(legend).getByText(label)).toBeInTheDocument();
    }
    expect(within(legend).getByText('Run: 2026-11-03T11:00:00Z')).toBeInTheDocument();
    expect(within(legend).getAllByText('Run: unavailable')).toHaveLength(3);
    expect(within(legend).getAllByText(/^Retrieved:/)).toHaveLength(4);
  });

  it('switches the plotted variable and unit label', async () => {
    stubComparisonFetch();
    const user = userEvent.setup();

    renderWithProviders(<ModelCompare width={720} />);
    await screen.findByRole('img', { name: 'Temperature comparison' });

    await user.click(screen.getByRole('tab', { name: 'Wind' }));

    expect(await screen.findByRole('img', { name: 'Wind comparison' })).toBeInTheDocument();
    expect(screen.getByText('Units: mph')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Wind' })).toHaveAttribute('aria-selected', 'true');
  });

  it('re-fetches both endpoints when refreshed', async () => {
    const fetchMock = stubComparisonFetch();
    const user = userEvent.setup();

    renderWithProviders(<ModelCompare width={720} />);
    await screen.findByRole('img', { name: 'Temperature comparison' });

    const nwsCalls = () =>
      fetchMock.mock.calls.filter((call) => String(call[0]).includes('/api/nws/point')).length;
    expect(nwsCalls()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByRole('img', { name: 'Temperature comparison' })).toBeInTheDocument();
    expect(nwsCalls()).toBe(2);
  });

  it('renders the remaining sources when one model fails', async () => {
    stubComparisonFetch({
      models: modelsResponse({
        models: {
          gfs: {
            modelId: 'ncep_gfs_seamless',
            retrievedAt: '2026-11-03T12:05:00Z',
            runTime: null,
            hourly: MODEL_HOURLY,
          },
          ecmwf: {
            modelId: 'ecmwf_ifs025',
            retrievedAt: '2026-11-03T12:07:00Z',
            runTime: null,
            hourly: MODEL_HOURLY,
          },
        },
        modelErrors: { hrrr: 'HRRR is out of range for this location.' },
      }),
    });

    renderWithProviders(<ModelCompare width={720} />);
    await screen.findByRole('img', { name: 'Temperature comparison' });

    const legend = screen.getAllByRole('list')[0];
    expect(within(legend).getByText('NWS')).toBeInTheDocument();
    expect(within(legend).getByText('GFS')).toBeInTheDocument();
    expect(within(legend).getByText('ECMWF')).toBeInTheDocument();
    expect(within(legend).queryByText('HRRR')).not.toBeInTheDocument();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'HRRR is out of range for this location.',
    );
  });

  it('shows an empty state when every source fails', async () => {
    stubComparisonFetch({ nwsStatus: 500, modelsStatus: 502 });

    renderWithProviders(<ModelCompare width={720} />);

    expect(
      await screen.findByText('No comparison data available for this location.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
