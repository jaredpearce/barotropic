import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './StatusPill';

const NOW = new Date('2026-11-03T12:00:00Z');

describe('StatusPill integration', () => {
  it('Use Case: announces live data with its age', () => {
    render(<StatusPill retrievedAt="2026-11-03T11:56:00Z" now={NOW} />);

    const pill = screen.getByRole('status');
    expect(pill).toHaveTextContent('LIVE');
    expect(pill).toHaveAttribute('data-state', 'live');
    expect(pill).toHaveAttribute('title', 'Updated 4 minutes ago');
  });

  it('Use Case: announces stale data past the threshold', () => {
    render(<StatusPill retrievedAt="2026-11-03T11:30:00Z" now={NOW} />);

    const pill = screen.getByRole('status');
    expect(pill).toHaveTextContent('STALE');
    expect(pill).toHaveAttribute('data-state', 'stale');
    expect(pill).toHaveAttribute('title', 'Updated 30 minutes ago');
  });

  it('Use Case: falls back to stale when no retrieval time is available', () => {
    render(<StatusPill now={NOW} />);

    const pill = screen.getByRole('status');
    expect(pill).toHaveTextContent('STALE');
    expect(pill).toHaveAttribute('data-state', 'stale');
    expect(pill).toHaveAttribute('title', 'Update time unavailable');
  });

  it('Use Case: hides the decorative indicator from assistive technology', () => {
    const { container } = render(<StatusPill retrievedAt="2026-11-03T11:56:00Z" now={NOW} />);

    expect(container.querySelector('.status-pill-indicator')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
