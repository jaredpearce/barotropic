import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nws/client', () => ({
  fetchFromNws: vi.fn(),
}));

import { GET } from './route';
import { fetchFromNws } from '@/lib/nws/client';

beforeEach(() => {
  vi.mocked(fetchFromNws).mockReset();
});

describe('NWS point route station coordinates', () => {
  it('Use Case: returns nearby station coordinates for the map overlay', async () => {
    vi.mocked(fetchFromNws).mockImplementation(async (endpoint) => {
      if (endpoint.startsWith('/points/')) {
        return {
          properties: {
            forecast: 'https://api.weather.gov/gridpoints/RAH/1,1/forecast',
            observationStations: 'https://api.weather.gov/gridpoints/RAH/1,1/stations',
          },
        } as never;
      }
      if (endpoint.endsWith('/forecast')) {
        return { properties: { periods: [] } } as never;
      }
      if (endpoint.endsWith('/stations')) {
        return {
          features: [
            {
              id: 'https://api.weather.gov/stations/KRDU',
              geometry: { type: 'Point', coordinates: [-78.79, 35.89] },
              properties: { name: 'Raleigh-Durham International Airport' },
            },
            {
              id: 'https://api.weather.gov/stations/KJNX',
              geometry: { type: 'Point', coordinates: [-78.39, 35.54] },
              properties: { name: 'Johnston Regional Airport' },
            },
            {
              id: 'https://api.weather.gov/stations/KNONE',
              properties: { name: 'No geometry' },
            },
          ],
        } as never;
      }
      if (endpoint.includes('/observations/latest')) {
        return { properties: {} } as never;
      }
      throw new Error(`Unexpected NWS endpoint: ${endpoint}`);
    });

    const response = await GET(new Request('http://localhost/api/nws/point?lat=35.79&lon=-78.78'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      stations: [
        {
          id: 'KRDU',
          name: 'Raleigh-Durham International Airport',
          latitude: 35.89,
          longitude: -78.79,
        },
        {
          id: 'KJNX',
          name: 'Johnston Regional Airport',
          latitude: 35.54,
          longitude: -78.39,
        },
      ],
    });
    expect(fetchFromNws).toHaveBeenCalledWith(
      '/stations/KRDU/observations/latest',
      expect.anything(),
    );
  });
});
