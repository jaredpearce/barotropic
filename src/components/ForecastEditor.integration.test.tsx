import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../tests/msw/server';
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

describe('ForecastEditor integration', () => {
  beforeEach(async () => {
    await forecastDatabase.transaction(
      'rw',
      forecastDatabase.locations,
      forecastDatabase.forecasts,
      forecastDatabase.revisions,
      async () => {
        await forecastDatabase.revisions.clear();
        await forecastDatabase.forecasts.clear();
        await forecastDatabase.locations.clear();
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
});
