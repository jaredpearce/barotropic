import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import ForecastEditor from './ForecastEditor';
import {
  emptyForecastValues,
  forecastDatabase,
  getForecastRevisionHistory,
  listForecastSnapshots,
  saveForecastRevision,
} from '../lib/forecast-workspace/db';

const nwsForecast = [
  {
    source: 'NWS',
    timestamp: '2026-11-03T00:00:00Z',
    retrievedAt: '2026-11-03T12:00:00Z',
    issuedAt: '2026-11-03T11:00:00Z',
    isDaytime: false,
    temperatureC: 14,
    precipitationProbabilityPercent: 20,
    windSpeedMps: 3,
    windDirectionDegrees: 180,
    condition: 'Clear',
  },
  {
    source: 'NWS',
    timestamp: '2026-11-03T12:00:00Z',
    retrievedAt: '2026-11-03T12:00:00Z',
    issuedAt: '2026-11-03T11:00:00Z',
    isDaytime: true,
    temperatureC: 24,
    precipitationProbabilityPercent: 40,
    windSpeedMps: 5,
    windDirectionDegrees: 225,
    condition: 'Partly Cloudy',
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ForecastEditor integration', () => {
  beforeEach(async () => {
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

  it('Use Case: renders structured fields and source guidance', () => {
    renderWithProviders(<ForecastEditor />);

    expect(screen.getByRole('heading', { name: 'New Forecast' })).toBeInTheDocument();
    for (const field of ['High', 'Low', 'Probability of precipitation', 'Wind', 'Sky', 'Hazards']) {
      expect(screen.getByLabelText(field)).toBeInTheDocument();
      expect(screen.getByRole('status', { name: `${field} official` })).toHaveTextContent(
        'Unavailable',
      );
      expect(screen.getByRole('status', { name: `${field} model` })).toHaveTextContent(
        'Unavailable',
      );
    }
    expect(screen.getByLabelText('Reasoning')).toBeInTheDocument();
  });

  it('Use Case: autosaves edits as new immutable revisions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForecastEditor />);

    await user.type(screen.getByRole('textbox', { name: 'Location' }), 'Boston');
    await user.type(screen.getByRole('spinbutton', { name: 'High' }), '25');
    await user.type(screen.getByRole('textbox', { name: 'Reasoning' }), 'Warm air arrives.');

    expect(
      await screen.findByText('Saved · revision 1', {}, { timeout: 5000 }),
    ).toBeInTheDocument();

    const [firstSnapshot] = await listForecastSnapshots();
    expect(firstSnapshot.revision.values.high).toBe('25');

    await user.clear(screen.getByRole('spinbutton', { name: 'High' }));
    await user.type(screen.getByRole('spinbutton', { name: 'High' }), '28');

    expect(
      await screen.findByText('Saved · revision 2', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    const history = screen.getByRole('region', {
      name: 'Saved revision history',
    });
    expect(history).toHaveTextContent('Revision 1 · High: 25');
    expect(history).toHaveTextContent('Revision 2 · High: 28');

    const revisions = await getForecastRevisionHistory(firstSnapshot.forecast.id);
    expect(revisions).toHaveLength(2);
    expect(revisions[0].values.high).toBe('25');
    expect(revisions[0].reasoning).toBe('Warm air arrives.');
    expect(revisions[1].values.high).toBe('28');
  });

  it('Use Case: persists a created forecast across a reload', async () => {
    const user = userEvent.setup();
    const firstRender = renderWithProviders(<ForecastEditor />);

    await user.type(screen.getByRole('textbox', { name: 'Location' }), 'Boston');
    await user.type(screen.getByRole('spinbutton', { name: 'High' }), '25');
    await user.type(screen.getByRole('textbox', { name: 'Reasoning' }), 'Persisted reasoning.');

    expect(
      await screen.findByText('Saved · revision 1', {}, { timeout: 5000 }),
    ).toBeInTheDocument();

    const [saved] = await listForecastSnapshots();
    expect(saved.revision.values.high).toBe('25');
    expect(saved.revision.reasoning).toBe('Persisted reasoning.');

    firstRender.unmount();
    forecastDatabase.close();
    await forecastDatabase.open();

    renderWithProviders(<ForecastEditor forecastId={saved.forecast.id} />);

    expect(await screen.findByDisplayValue('Boston')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'High' })).toHaveValue(25);
    expect(screen.getByRole('textbox', { name: 'Reasoning' })).toHaveValue('Persisted reasoning.');
  });

  it('loads an existing forecast and appends a revision on edit', async () => {
    const saved = await saveForecastRevision({
      locationName: 'Boston',
      validStart: '2026-11-03T12:00',
      values: { ...emptyForecastValues(), high: '25', wind: 'SW 8 m/s' },
      reasoning: 'First reasoning.',
      officialValues: { high: '24°C' },
      modelValues: { high: '26°C' },
    });
    const user = userEvent.setup();

    renderWithProviders(<ForecastEditor forecastId={saved.forecast.id} />);

    expect(await screen.findByDisplayValue('25')).toBeInTheDocument();
    expect(screen.getByDisplayValue('First reasoning.')).toBeInTheDocument();
    expect(await screen.findByText('24°C')).toBeInTheDocument();

    await user.clear(screen.getByRole('spinbutton', { name: 'High' }));
    await user.type(screen.getByRole('spinbutton', { name: 'High' }), '27');

    expect(
      await screen.findByText('Saved · revision 2', {}, { timeout: 5000 }),
    ).toBeInTheDocument();

    const history = await getForecastRevisionHistory(saved.forecast.id);
    expect(history).toHaveLength(2);
    expect(history[0].values.high).toBe('25');
    expect(history[0].reasoning).toBe('First reasoning.');
    expect(history[1].values.high).toBe('27');
  });

  it('renders live official guidance even when model guidance fails', async () => {
    const saved = await saveForecastRevision({
      locationName: 'Boston',
      latitude: 42.3601,
      longitude: -71.0589,
      validStart: '2026-11-03T12:00',
      values: { ...emptyForecastValues(), high: '25' },
      reasoning: 'First reasoning.',
    });
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.includes('/api/nws/point')) {
        return Promise.resolve(Response.json({ forecast: nwsForecast }));
      }
      if (url.includes('/api/open-meteo/forecast')) {
        return Promise.resolve(Response.json({ error: 'Upstream unavailable' }, { status: 502 }));
      }
      return Promise.resolve(Response.json({ results: [] }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderWithProviders(<ForecastEditor forecastId={saved.forecast.id} />);

    expect(await screen.findByText('24°C')).toBeInTheDocument();
    expect(
      await screen.findByText(/Model guidance is unavailable for this location\./),
    ).toBeInTheDocument();

    await user.clear(screen.getByRole('spinbutton', { name: 'High' }));
    await user.type(screen.getByRole('spinbutton', { name: 'High' }), '27');

    expect(
      await screen.findByText('Saved · revision 2', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('shows a save error, keeps the draft, and saves after the value is fixed', async () => {
    renderWithProviders(<ForecastEditor />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Location' }), {
      target: { value: 'Boston' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Probability of precipitation' }), {
      target: { value: '150' },
    });

    expect(
      await screen.findByText(
        'Probability of precipitation must be at most 100%.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Location' })).toHaveValue('Boston');

    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(
      await screen.findByText(
        'Probability of precipitation must be at most 100%.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Probability of precipitation' }), {
      target: { value: '50' },
    });

    expect(
      await screen.findByText('Saved · revision 1', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    const [snapshot] = await listForecastSnapshots();
    expect(snapshot.revision.values.pop).toBe('50');
  });

  it('flushes a pending edit when the editor unmounts', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<ForecastEditor />);

    await user.type(screen.getByRole('textbox', { name: 'Location' }), 'Denver');
    await user.type(screen.getByRole('spinbutton', { name: 'High' }), '18');
    unmount();

    await waitFor(async () => {
      const snapshots = await listForecastSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].revision.values.high).toBe('18');
    });
  });

  it('snapshots all successful guidance sources and the verification target', async () => {
    const saved = await saveForecastRevision({
      locationName: 'Boston',
      latitude: 42.3601,
      longitude: -71.0589,
      validStart: '2026-11-03T12:00',
      values: { ...emptyForecastValues(), high: '25' },
      reasoning: 'First reasoning.',
    });

    const modelRecord = (timestamp: string, overrides: Record<string, unknown>) => ({
      source: 'Open-Meteo',
      timestamp,
      retrievedAt: '2026-11-03T12:00:00Z',
      runTime: null,
      ...overrides,
    });

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.includes('/api/nws/point')) {
        return Promise.resolve(
          Response.json({
            forecast: nwsForecast,
            hourly: nwsForecast,
            timeZone: 'America/New_York',
            stationId: 'KBOS',
            forecastIssuedAt: '2026-11-03T11:00:00Z',
            retrievedAt: '2026-11-03T12:00:00Z',
          }),
        );
      }
      if (url.includes('/api/open-meteo/forecast')) {
        return Promise.resolve(
          Response.json({
            models: {
              gfs: {
                modelId: 'ncep_gfs_seamless',
                retrievedAt: '2026-11-03T12:00:00Z',
                runTime: null,
                utcOffsetSeconds: -18000,
                daily: [
                  modelRecord('2026-11-03', { maximumTemperatureC: 26, minimumTemperatureC: 15 }),
                ],
                hourly: [
                  modelRecord('2026-11-03T12:00:00Z', {
                    precipitationProbabilityPercent: 30,
                    windSpeedMps: 6,
                  }),
                ],
              },
              hrrr: {
                modelId: 'ncep_hrrr_conus',
                retrievedAt: '2026-11-03T12:00:00Z',
                runTime: null,
                daily: [
                  modelRecord('2026-11-03', { maximumTemperatureC: 27, minimumTemperatureC: 16 }),
                ],
                hourly: [],
              },
              ecmwf: {
                modelId: 'ecmwf_ifs025',
                retrievedAt: '2026-11-03T12:00:00Z',
                runTime: null,
                daily: [
                  modelRecord('2026-11-03', { maximumTemperatureC: 25, minimumTemperatureC: 14 }),
                ],
                hourly: [],
              },
            },
          }),
        );
      }
      return Promise.resolve(Response.json({ results: [] }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderWithProviders(<ForecastEditor forecastId={saved.forecast.id} />);

    expect(await screen.findByText('24°C')).toBeInTheDocument();

    await user.clear(screen.getByRole('spinbutton', { name: 'High' }));
    await user.type(screen.getByRole('spinbutton', { name: 'High' }), '27');

    expect(
      await screen.findByText('Saved · revision 2', {}, { timeout: 5000 }),
    ).toBeInTheDocument();

    const history = await getForecastRevisionHistory(saved.forecast.id);
    const latest = history[history.length - 1];
    expect(latest.guidance?.map((snapshot) => snapshot.source)).toEqual([
      'NWS',
      'GFS',
      'HRRR',
      'ECMWF',
    ]);
    expect(latest.target).toMatchObject({
      latitude: 42.3601,
      longitude: -71.0589,
      stationId: 'KBOS',
      timeZone: 'America/New_York',
    });
    expect(latest.guidance?.[0].runTime).toBe('2026-11-03T11:00:00Z');
    expect(latest.guidance?.[1].runTime).toBeNull();
    expect(latest.guidance?.[1].modelId).toBe('ncep_gfs_seamless');
  });
});
