import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { fetchFromNws } from './client';
import { UpstreamApiError } from '../api-errors';
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
      expect.objectContaining({ next: { revalidate: 60 } })
    );
  });

  it('Use Case: reports upstream server failures with a typed error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(
      fetchFromNws('/points/39.7392,-104.9903', responseSchema)
    ).rejects.toMatchObject<Partial<UpstreamApiError>>({
      code: 'UPSTREAM_HTTP_ERROR',
      httpStatus: 502,
      retryable: true,
      upstreamStatus: 503,
    });
  });

  it('Use Case: reports malformed provider data with a typed error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ value: 42 })));

    await expect(
      fetchFromNws('/points/39.7392,-104.9903', responseSchema)
    ).rejects.toMatchObject<Partial<UpstreamApiError>>({
      code: 'UPSTREAM_MALFORMED_RESPONSE',
      httpStatus: 502,
    });
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