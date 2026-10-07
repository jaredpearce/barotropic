import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import { WeatherCard } from './WeatherCard';

describe('WeatherCard integration', () => {
  it('Use Case: loads and displays forecast data on render', async () => {
    renderWithProviders(<WeatherCard />);

    expect(screen.getByText('Loading forecast...')).toBeInTheDocument();
    expect(await screen.findByText('Partly cloudy')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cary' })).toBeInTheDocument();
    expect(screen.getByText('84°F')).toBeInTheDocument();
  });
});
