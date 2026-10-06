import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import { WeatherCard } from './WeatherCard';
import { server } from '../../tests/msw/server';
import { http, HttpResponse } from 'msw';

describe('WeatherCard', () => {
  it('Use Case: fetches and displays forecast data after a user action', async () => {
    server.use(
      http.get('/api/weather/forecast', () => {
        return HttpResponse.json({
          location: 'Cary',
          summary: 'Partly cloudy',
          temperature: 84,
          units: 'F',
        });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<WeatherCard location="Cary" />);

    await user.click(screen.getByRole('button', { name: /load forecast/i }));

    await waitFor(() => {
      expect(screen.getByText('Cary')).toBeInTheDocument();
      expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
      expect(screen.getByText('84°F')).toBeInTheDocument();
    });
  });
});
