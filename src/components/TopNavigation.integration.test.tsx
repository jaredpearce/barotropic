import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopNavigation } from './TopNavigation';
import { renderWithProviders } from '../../tests/utils/render';

const { mockPathname } = vi.hoisted(() => ({ mockPathname: vi.fn(() => '/') }));

vi.mock('next/navigation', () => ({ usePathname: mockPathname }));

const SEATTLE_RESULT = {
  id: 123,
  name: 'Seattle',
  latitude: 47.6062,
  longitude: -122.3321,
  country: 'United States',
  admin1: 'Washington',
};

function stubAppFetch(results: unknown[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json({ results }))),
  );
}

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  mockPathname.mockReturnValue('/');
  vi.unstubAllGlobals();
});

describe('TopNavigation', () => {
  it('renders the brand, live indicator, and current time in the left section', () => {
    stubAppFetch();

    const { container } = renderWithProviders(<TopNavigation />);

    expect(screen.getByRole('img', { name: 'Barotropic' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Barotropic map' })).toHaveAttribute('href', '/');
    expect(screen.getByText('barotropic')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(container.querySelector('.app-topnav-clock')).toBeInTheDocument();
  });

  it('renders the primary destinations with heroicons in the right section', () => {
    stubAppFetch();

    renderWithProviders(<TopNavigation />);

    expect(screen.getByRole('link', { name: 'Forecast' })).toHaveAttribute('href', '/forecasts');
    expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute('href', '/compare');
    expect(screen.getByRole('link', { name: 'Track record' })).toHaveAttribute(
      'href',
      '/track-record',
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('button', { name: 'Ask Barotropic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cary, NC/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile settings' })).toHaveAttribute(
      'href',
      '/settings#profile',
    );
  });

  it('marks the current route as active', () => {
    mockPathname.mockReturnValue('/forecasts/new');
    stubAppFetch();

    renderWithProviders(<TopNavigation />);

    expect(screen.getByRole('link', { name: 'Forecast' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Compare' })).not.toHaveAttribute('aria-current');
  });

  it('Use Case: compacts the primary destinations into the dropdown menu', async () => {
    const user = userEvent.setup();
    stubAppFetch();

    renderWithProviders(<TopNavigation />);

    const trigger = screen.getByRole('button', { name: 'Navigation menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('menuitem', { name: 'Compare' })).toHaveAttribute('href', '/compare');
    expect(screen.getByRole('menuitem', { name: 'Forecast' })).toHaveAttribute(
      'href',
      '/forecasts',
    );
    expect(screen.getByRole('menuitem', { name: 'Track record' })).toHaveAttribute(
      'href',
      '/track-record',
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('Use Case: searches for a place and updates the selected navigation location', async () => {
    const user = userEvent.setup();
    stubAppFetch([SEATTLE_RESULT]);

    renderWithProviders(<TopNavigation />);
    await user.click(screen.getByRole('button', { name: /Cary, NC/i }));
    await user.type(
      screen.getByRole('searchbox', { name: 'City, state, or postal code' }),
      'Seattle',
    );
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await user.click(await screen.findByRole('button', { name: /Seattle, Washington/i }));

    expect(screen.getByRole('button', { name: /Seattle, Washington/i })).toBeInTheDocument();
    expect(window.localStorage.getItem('barotropic.location')).toContain('47.6062');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Use Case: displays an empty state when location search has no matches', async () => {
    const user = userEvent.setup();
    stubAppFetch();

    renderWithProviders(<TopNavigation />);
    await user.click(screen.getByRole('button', { name: /Cary, NC/i }));
    await user.type(
      screen.getByRole('searchbox', { name: 'City, state, or postal code' }),
      'Nowhere',
    );
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText(/No locations found/i)).toBeInTheDocument();
  });

  it('Use Case: toggles the light and dark navigation variants', async () => {
    const user = userEvent.setup();
    stubAppFetch();

    renderWithProviders(<TopNavigation />);

    await user.click(screen.getByRole('button', { name: 'Switch to light navigation' }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('barotropic.theme')).toBe('light');
    expect(screen.getByRole('button', { name: 'Switch to dark navigation' })).toBeInTheDocument();
  });
});
