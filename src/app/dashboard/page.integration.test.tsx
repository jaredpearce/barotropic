import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../tests/utils/render';
import DashboardPage from './page';

describe('Forecast dashboard integration', () => {
  it('Use Case: presents the empty forecast summary', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('heading', { name: 'Barotropic' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active Forecasts' })).toBeInTheDocument();
    expect(screen.getByText('No forecasts in progress')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent Analyses' })).toBeInTheDocument();
    expect(screen.getByText('No recent analyses')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Accuracy Score' })).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('Use Case: links to the forecasts page', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('link', { name: 'Forecasts' })).toHaveAttribute('href', '/forecasts');
  });

  it('Use Case: links to create a new forecast', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('link', { name: 'Create New Forecast' })).toHaveAttribute(
      'href',
      '/forecasts/new'
    );
  });
});