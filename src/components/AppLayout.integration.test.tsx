import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';
import { renderWithProviders } from '../../tests/utils/render';

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('AppLayout location selection', () => {
  it('Use Case: searches for a place and updates the selected navigation location', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          results: [
            {
              id: 123,
              name: 'Seattle',
              latitude: 47.6062,
              longitude: -122.3321,
              country: 'United States',
              admin1: 'Washington',
            },
          ],
        })
      )
    );

    renderWithProviders(<AppLayout />);
    await user.click(screen.getByRole('button', { name: /Cary, NC/i }));
    await user.type(screen.getByRole('searchbox', { name: 'City, state, or postal code' }), 'Seattle');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await user.click(await screen.findByRole('button', { name: /Seattle, Washington/i }));

    expect(screen.getByRole('button', { name: /Seattle, Washington/i })).toBeInTheDocument();
    expect(window.localStorage.getItem('barotropic.location')).toContain('47.6062');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Use Case: displays an empty state when location search has no matches', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ results: [] })));

    renderWithProviders(<AppLayout />);
    await user.click(screen.getByRole('button', { name: /Cary, NC/i }));
    await user.type(screen.getByRole('searchbox', { name: 'City, state, or postal code' }), 'Nowhere');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText(/No locations found/i)).toBeInTheDocument();
  });
});