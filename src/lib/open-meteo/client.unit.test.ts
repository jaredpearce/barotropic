import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));

import { fetchFromOpenMeteo } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchFromOpenMeteo', () => {
  const responseSchema = z.object({ value: z.string() });

  it('Use Case: revalidates successful responses with Next.js', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ value: 'forecast' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchFromOpenMeteo('/forecast?latitude=40&longitude=-105', responseSchema)
    ).resolves.toEqual({ value: 'forecast' });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://api.open-meteo.com/v1/forecast?latitude=40&longitude=-105'),
      expect.objectContaining({ next: { revalidate: 60 } })
    );
  });

  it('Use Case: classifies upstream server failures as retryable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(
      fetchFromOpenMeteo('/forecast?latitude=40&longitude=-105', responseSchema)
    ).rejects.toMatchObject({
      code: 'UPSTREAM_HTTP_ERROR',
      httpStatus: 502,
      retryable: true,
      upstreamStatus: 503,
    });
  });

  it('Use Case: classifies malformed JSON as an upstream response error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{')));

    await expect(
      fetchFromOpenMeteo('/forecast?latitude=40&longitude=-105', responseSchema)
    ).rejects.toMatchObject({
      code: 'UPSTREAM_MALFORMED_RESPONSE',
      httpStatus: 502,
      upstream: 'Open-Meteo',
    });
  });

  it('Use Case: classifies request timeouts as retryable', async () => {
    const timeout = new Error('timed out');
    timeout.name = 'TimeoutError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));

    await expect(
      fetchFromOpenMeteo('/forecast?latitude=40&longitude=-105', responseSchema)
    ).rejects.toMatchObject({
      code: 'UPSTREAM_TIMEOUT',
      httpStatus: 504,
      retryable: true,
    });
  });
});