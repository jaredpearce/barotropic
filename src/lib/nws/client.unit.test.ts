import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { fetchFromNws } from './client';
import { z } from 'zod';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchFromNws', () => {
  const responseSchema = z.object({ value: z.string() });

  it('Use Case: fetches a same-origin endpoint and validates its response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ value: 'forecast' })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchFromNws('/points/39.7392,-104.9903', responseSchema)
    ).resolves.toEqual({ value: 'forecast' });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://api.weather.gov/points/39.7392,-104.9903'),
      expect.objectContaining({ cache: 'no-store' })
    );
  });

  it('Use Case: rejects absolute URLs outside the NWS origin', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchFromNws('https://attacker.example/data', responseSchema)
    ).rejects.toThrow('NWS endpoint must be a path on api.weather.gov');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Use Case: rejects protocol-relative and non-path endpoints', async () => {
    await expect(
      fetchFromNws('//attacker.example/data', responseSchema)
    ).rejects.toThrow(TypeError);
    await expect(fetchFromNws('points/1,2', responseSchema)).rejects.toThrow(
      TypeError
    );
  });
});