import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChartSeries } from '@/lib/charts/series';
import SeriesChart from './SeriesChart';

const hour = 3_600_000;

const series: ChartSeries[] = [
  {
    id: 'nws',
    label: 'NWS',
    color: '#fb923c',
    runTime: '2026-11-03T11:00:00Z',
    retrievedAt: '2026-11-03T12:00:00Z',
    points: [
      { timestamp: Date.parse('2026-11-03T12:00:00Z'), value: 20 },
      { timestamp: Date.parse('2026-11-03T13:00:00Z'), value: null },
      { timestamp: Date.parse('2026-11-03T14:00:00Z'), value: 22 },
    ],
  },
  {
    id: 'gfs',
    label: 'GFS',
    color: '#34d399',
    runTime: null,
    retrievedAt: '2026-11-03T12:00:00Z',
    points: [
      { timestamp: Date.parse('2026-11-03T12:00:00Z'), value: 21 },
      { timestamp: Date.parse('2026-11-03T13:00:00Z'), value: 23 },
    ],
  },
];

describe('SeriesChart', () => {
  it('renders a legend with run and retrieved metadata', () => {
    render(
      <SeriesChart
        ariaLabel="Temperature comparison"
        formatValue={(value) => `${value}°`}
        series={series}
        unitLabel="°C"
        width={640}
      />,
    );

    expect(screen.getByRole('img', { name: 'Temperature comparison' })).toBeInTheDocument();

    const legend = screen.getByRole('list');
    expect(within(legend).getByText('NWS')).toBeInTheDocument();
    expect(within(legend).getByText('GFS')).toBeInTheDocument();
    expect(within(legend).getByText('Run: 2026-11-03T11:00:00Z')).toBeInTheDocument();
    expect(within(legend).getByText('Run: unavailable')).toBeInTheDocument();
    expect(within(legend).getAllByText('Retrieved: 2026-11-03T12:00:00Z')).toHaveLength(2);
  });

  it('preserves null gaps without crashing and exposes a data table', () => {
    render(
      <SeriesChart
        ariaLabel="Temperature comparison"
        formatValue={(value) => `${value}°`}
        series={series}
        unitLabel="°C"
        width={640}
      />,
    );

    expect(screen.getByText('View data table')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getAllByText('20°').length).toBeGreaterThan(0);
  });

  it('formats values for the active unit system', () => {
    render(
      <SeriesChart
        ariaLabel="Temperature comparison (imperial)"
        formatValue={(value) => `${value}°F`}
        series={series}
        unitLabel="°F"
        width={640}
      />,
    );

    expect(screen.getByText('Units: °F')).toBeInTheDocument();
    expect(screen.getAllByText('20°F').length).toBeGreaterThan(0);
  });

  it('renders the empty state when no series has values', () => {
    render(
      <SeriesChart
        ariaLabel="Empty chart"
        emptyMessage="No verification samples yet."
        formatValue={(value) => `${value}`}
        series={[
          {
            id: 'nws',
            label: 'NWS',
            color: '#fb923c',
            points: [{ timestamp: Date.now(), value: null }],
          },
        ]}
        unitLabel="°C"
        width={640}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('No verification samples yet.');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('accepts a fixed width without a ResizeObserver', () => {
    const { container } = render(
      <SeriesChart
        ariaLabel="Fixed width"
        formatValue={(value) => `${value}`}
        series={[
          {
            id: 'a',
            label: 'A',
            color: '#000000',
            points: [
              { timestamp: Date.parse('2026-11-03T12:00:00Z'), value: 1 },
              { timestamp: Date.parse('2026-11-03T12:00:00Z') + hour, value: 2 },
            ],
          },
        ]}
        unitLabel="m/s"
        width={480}
      />,
    );

    expect(container.querySelector('svg')).toHaveAttribute('width', '480');
  });
});
