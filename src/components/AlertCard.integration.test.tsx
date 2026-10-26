import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import { AlertCard } from './AlertCard';
import type { AlertCardData } from '@/lib/alerts';

function makeCard(overrides: Partial<AlertCardData> = {}): AlertCardData {
  return {
    id: 'alert-1',
    event: 'Heat Advisory',
    severity: 'moderate',
    severityLabel: 'Moderate',
    areaDescription: 'Wake / Chatham / Durham counties',
    headline: 'Heat advisory in effect',
    instruction: 'Drink water and limit outdoor activity.',
    senderName: 'NWS Raleigh',
    effectiveIso: '2026-10-26T12:00:00Z',
    expiresIso: '2026-10-26T23:00:00Z',
    effectiveLabel: 'Oct 26, 12:00 PM UTC',
    expiresLabel: 'Oct 26, 11:00 PM UTC',
    match: 'polygon',
    geometry: {
      kind: 'polygon',
      polygonCount: 1,
      paths: [{ d: 'M4,4 L116,4 L116,68 L4,68 Z', containsPoint: true }],
    },
    ...overrides,
  };
}

describe('AlertCard integration', () => {
  it('Use Case: renders the event, severity, and affected area', () => {
    renderWithProviders(<AlertCard alert={makeCard()} />);

    expect(screen.getByText('Heat Advisory')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(
      screen.getByText('Wake / Chatham / Durham counties')
    ).toBeInTheDocument();
    expect(screen.getByText('Heat advisory in effect')).toBeInTheDocument();
  });

  it('Use Case: exposes severity and geometry match as data attributes', () => {
    const { container } = renderWithProviders(
      <AlertCard alert={makeCard({ severity: 'extreme' })} />
    );

    const card = container.querySelector('.alert-card');
    expect(card).toHaveAttribute('data-severity', 'extreme');
    expect(card).toHaveAttribute('data-match', 'polygon');
    expect(card).toHaveAttribute('data-alert-id', 'alert-1');
  });

  it('Use Case: renders an accessible SVG preview for polygon alerts', () => {
    const { container } = renderWithProviders(<AlertCard alert={makeCard()} />);

    const preview = screen.getByRole('img', {
      name: 'Polygon preview for Heat Advisory',
    });
    expect(preview.tagName.toLowerCase()).toBe('svg');
    expect(preview).toHaveAttribute('viewBox', '0 0 120 72');

    const shape = container.querySelector('.alert-card-preview-shape');
    expect(shape).toHaveAttribute('data-contains-point', 'true');
    expect(shape).toHaveClass('alert-card-preview-shape--contained');
    expect(screen.getByText('Affects this location')).toBeInTheDocument();
    expect(screen.getByText('Polygon')).toBeInTheDocument();
  });

  it('Use Case: marks a polygon that misses the selected point as nearby', () => {
    const { container } = renderWithProviders(
      <AlertCard
        alert={makeCard({
          match: 'outside',
          geometry: {
            kind: 'multi-polygon',
            polygonCount: 2,
            paths: [
              { d: 'M4,4 L50,4 L50,40 Z', containsPoint: false },
              { d: 'M60,20 L116,20 L116,68 Z', containsPoint: false },
            ],
          },
        })}
      />
    );

    expect(screen.getByText('Nearby area')).toBeInTheDocument();
    expect(screen.getByText('2 polygons')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-contains-point="false"]')
    ).toHaveLength(2);
  });

  it('Use Case: labels area-based alerts without drawing a polygon', () => {
    const { container } = renderWithProviders(
      <AlertCard
        alert={makeCard({
          match: 'area',
          geometry: { kind: 'area', polygonCount: 0, paths: [] },
        })}
      />
    );

    expect(
      screen.getByText(
        'Area-based alert. NWS did not publish a polygon for this alert.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('.alert-card-preview')).toBeNull();
  });

  it('Use Case: renders timing, source, and safety instructions', () => {
    renderWithProviders(<AlertCard alert={makeCard()} />);

    expect(screen.getByText('Effective')).toBeInTheDocument();
    expect(screen.getByText('Oct 26, 12:00 PM UTC')).toBeInTheDocument();
    expect(screen.getByText('Expires')).toBeInTheDocument();
    expect(screen.getByText('Oct 26, 11:00 PM UTC')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('NWS Raleigh')).toBeInTheDocument();
    expect(screen.getByText('Safety instructions')).toBeInTheDocument();
    expect(
      screen.getByText('Drink water and limit outdoor activity.')
    ).toBeInTheDocument();
  });

  it('Use Case: omits optional details that NWS did not provide', () => {
    const { container } = renderWithProviders(
      <AlertCard
        alert={makeCard({
          headline: undefined,
          areaDescription: undefined,
          senderName: undefined,
          instruction: undefined,
          effectiveLabel: undefined,
          expiresLabel: undefined,
        })}
      />
    );

    expect(container.querySelector('.alert-card-meta')).toBeNull();
    expect(container.querySelector('.alert-card-instructions')).toBeNull();
    expect(container.querySelector('.alert-card-headline')).toBeNull();
  });
});
