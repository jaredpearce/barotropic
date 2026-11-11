import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import {
  emptyForecastValues,
  forecastDatabase,
  type Forecast,
  type ForecastRevision,
} from '@/lib/forecast-workspace/db';
import type { NormalizedObservation } from '@/lib/schemas/normalized';
import { localDayBounds } from '@/lib/time';
import TrackRecord from './TrackRecord';

const STATION = 'KDEN';
const TIME_ZONE = 'America/Denver';

function dayStartIso(date: string): string {
  return new Date(localDayBounds(date, TIME_ZONE).startMs).toISOString();
}

function observationsFor(date: string, count = 24): NormalizedObservation[] {
  const { startMs } = localDayBounds(date, TIME_ZONE);
  return Array.from({ length: count }, (_, index) => {
    const timestamp = new Date(startMs + index * 3_600_000).toISOString();
    return {
      source: 'NWS' as const,
      id: `${STATION}:${timestamp}`,
      stationId: STATION,
      timestamp,
      retrievedAt: '2026-06-16T06:30:00Z',
      issuedAt: timestamp,
      description: null,
      temperatureC: index === 20 ? 28 : 10,
      dewpointC: null,
      humidityPercent: null,
      windSpeedMps: 4,
      windGustMps: null,
      windDirectionDegrees: null,
      temperatureQualityControl: 'V',
      windSpeedQualityControl: 'V',
      precipitationLastHourMm: index === 0 ? 0.5 : 0,
      precipitationQualityControl: 'V',
    };
  });
}

const OBSERVATIONS: Record<string, NormalizedObservation[]> = {
  [dayStartIso('2026-06-15')]: observationsFor('2026-06-15'),
  [dayStartIso('2026-06-16')]: observationsFor('2026-06-16', 5),
};

function stubObservations() {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.includes(`/api/nws/stations/${STATION}/observations`)) {
      const start = new URL(url).searchParams.get('start') ?? '';
      return Promise.resolve(Response.json({ observations: OBSERVATIONS[start] ?? [] }));
    }
    return Promise.resolve(Response.json({}));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function forecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    id: 'f1',
    locationId: 'l1',
    locationName: 'Denver',
    validStart: '2026-06-15T12:00',
    updatedAt: new Date('2026-06-14T12:00:00Z'),
    currentRevisionId: 'r1',
    ...overrides,
  };
}

function revision(overrides: Partial<ForecastRevision> = {}): ForecastRevision {
  return {
    id: 'r1',
    forecastId: 'f1',
    revisionNumber: 1,
    createdAt: new Date('2026-06-14T12:00:00Z'),
    values: { ...emptyForecastValues(), high: '30', low: '12', pop: '40', wind: '5' },
    reasoning: '',
    guidance: [
      {
        source: 'GFS',
        modelId: 'ncep_gfs_seamless',
        runTime: null,
        retrievedAt: '2026-06-14T12:00:00Z',
        values: { highC: 31, lowC: 13 },
      },
    ],
    target: { latitude: 39.7392, longitude: -104.9903, stationId: STATION, timeZone: TIME_ZONE },
    officialValues: {},
    modelValues: {},
    ...overrides,
  };
}

async function seed(fc: Forecast, rev: ForecastRevision) {
  await forecastDatabase.forecasts.put(fc);
  await forecastDatabase.revisions.put(rev);
}

beforeEach(async () => {
  window.localStorage.clear();
  await forecastDatabase.transaction(
    'rw',
    forecastDatabase.locations,
    forecastDatabase.forecasts,
    forecastDatabase.revisions,
    forecastDatabase.observedDays,
    async () => {
      await forecastDatabase.revisions.clear();
      await forecastDatabase.forecasts.clear();
      await forecastDatabase.locations.clear();
      await forecastDatabase.observedDays.clear();
    },
  );
});

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('TrackRecord integration', () => {
  it('shows the MAE/Brier table, error chart, and past-forecast list', async () => {
    window.localStorage.setItem('barotropic.unit-system', 'metric');
    stubObservations();
    await seed(forecast(), revision());

    renderWithProviders(<TrackRecord width={720} />);

    expect(await screen.findByRole('heading', { name: 'Track record' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'High signed error' })).toBeInTheDocument();

    const rowByHeader = (table: HTMLElement, header: string) =>
      within(table)
        .getAllByRole('row')
        .find((row) => within(row).queryByRole('rowheader', { name: header }));

    // MAE table: user high error is 2 °C, GFS high error is 3 °C.
    const summary = screen.getByRole('table', { name: /Mean error by source and variable/i });
    const highRow = rowByHeader(summary, 'High');
    expect(highRow).toBeDefined();
    expect(within(highRow!).getByText('2°C')).toBeInTheDocument();
    expect(within(highRow!).getByText('3°C')).toBeInTheDocument();
    // PoP Brier for the user: (0.4 - 1)^2 = 0.36.
    expect(within(summary).getByText('0.36')).toBeInTheDocument();
    expect(within(summary).getAllByText('n=1').length).toBeGreaterThan(0);

    // Past-forecast list with a verified row.
    expect(screen.getByText('2026-06-15')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Revision 1')).toBeInTheDocument();

    // Details table exposes forecast/observed/error per source.
    const details = screen.getByRole('table', {
      name: /Forecast, observed, and error by source/i,
    });
    const highDetails = rowByHeader(details, 'High');
    expect(highDetails).toBeDefined();
    const [userCell, gfsCell] = within(highDetails!).getAllByRole('cell');
    expect(within(userCell).getByText('Forecast 30°C')).toBeInTheDocument();
    expect(within(userCell).getByText('Observed 28°C')).toBeInTheDocument();
    expect(within(userCell).getByText('Error 2°C')).toBeInTheDocument();
    expect(within(gfsCell).getByText('Forecast 31°C')).toBeInTheDocument();
  });

  it('switches the error chart variable', async () => {
    window.localStorage.setItem('barotropic.unit-system', 'metric');
    stubObservations();
    await seed(forecast(), revision());
    const user = userEvent.setup();

    renderWithProviders(<TrackRecord width={720} />);
    await screen.findByRole('img', { name: 'High signed error' });

    await user.click(screen.getByRole('tab', { name: 'PoP' }));

    expect(await screen.findByRole('img', { name: 'PoP signed error' })).toBeInTheDocument();
    expect(screen.getByText('Units: pp')).toBeInTheDocument();
  });

  it('shows insufficient-coverage and pending revisions explicitly', async () => {
    stubObservations();
    await seed(
      forecast({ validStart: '2026-06-16T12:00' }),
      revision({ createdAt: new Date('2026-06-15T12:00:00Z') }),
    );
    await seed(
      forecast({ id: 'f2', currentRevisionId: 'r2', validStart: '2099-01-01T12:00' }),
      revision({
        id: 'r2',
        forecastId: 'f2',
        createdAt: new Date('2098-12-31T12:00:00Z'),
      }),
    );

    renderWithProviders(<TrackRecord width={720} />);

    expect(await screen.findByText('Insufficient coverage')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    const counts = screen.getByRole('list', { name: 'Verification counts' });
    expect(within(counts).getByText('Insufficient: 1')).toBeInTheDocument();
    expect(within(counts).getByText('Pending: 1')).toBeInTheDocument();
    expect(within(counts).getByText('Verified: 0')).toBeInTheDocument();
  });

  it('shows an empty state when there are no past forecasts', async () => {
    stubObservations();

    renderWithProviders(<TrackRecord width={720} />);

    expect(await screen.findByText('No past forecasts to verify yet.')).toBeInTheDocument();
  });

  it('re-runs verification on demand', async () => {
    window.localStorage.setItem('barotropic.unit-system', 'metric');
    const fetchMock = stubObservations();
    await seed(forecast(), revision());
    const user = userEvent.setup();

    renderWithProviders(<TrackRecord width={720} />);
    await screen.findByText('Verified');

    await user.click(screen.getByRole('button', { name: 'Re-run verification' }));

    expect(await screen.findByText('Verified')).toBeInTheDocument();
    const observationCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes('/observations'),
    );
    // A verified day is cached, so the second run does not re-fetch observations.
    expect(observationCalls).toHaveLength(1);
  });
});
