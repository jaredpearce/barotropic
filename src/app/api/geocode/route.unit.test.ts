import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Geocoding route', () => {
  it('Use Case: rejects short searches without calling the geocoder', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/geocode?q=a'));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Use Case: returns validated place matches from the fixed geocoding service', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
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
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/geocode?q=Seattle'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      results: [{ name: 'Seattle', latitude: 47.6062, longitude: -122.3321 }],
    });
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      'https://geocoding-api.open-meteo.com/v1/search?name=Seattle&count=8&countryCode=US'
    );
  });
});