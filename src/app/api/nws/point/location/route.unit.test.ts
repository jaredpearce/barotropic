import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nws/client', () => ({
  fetchFromNws: vi.fn(),
}));

import { GET } from './route';
import { fetchFromNws } from '@/lib/nws/client';

beforeEach(() => {
  vi.mocked(fetchFromNws).mockReset();
});

describe('NWS reverse location route', () => {
  it('Use Case: rejects invalid coordinates before calling NWS', async () => {
    const response = await GET(
      new Request('http://localhost/api/nws/point/location?lat=91&lon=-78')
    );

    expect(response.status).toBe(400);
    expect(fetchFromNws).not.toHaveBeenCalled();
  });

  it('Use Case: returns a city and state using only the NWS points lookup', async () => {
    vi.mocked(fetchFromNws).mockResolvedValue({
      properties: {
        relativeLocation: {
          properties: { city: 'Raleigh', state: 'NC' },
        },
      },
    } as never);

    const response = await GET(
      new Request('http://localhost/api/nws/point/location?lat=35.78&lon=-78.64')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      location: { city: 'Raleigh', state: 'NC', latitude: 35.78, longitude: -78.64 },
    });
    expect(fetchFromNws).toHaveBeenCalledWith('/points/35.78,-78.64', expect.anything());
  });
});