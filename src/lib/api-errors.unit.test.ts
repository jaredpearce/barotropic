import { describe, expect, it } from 'vitest';
import { UpstreamApiError, upstreamErrorResponse } from './api-errors';

describe('upstreamErrorResponse', () => {
  it('Use Case: serializes typed upstream details and HTTP status', async () => {
    const error = new UpstreamApiError(
      'UPSTREAM_HTTP_ERROR',
      'Provider request failed',
      'NWS',
      502,
      true,
      503
    );

    const response = upstreamErrorResponse(error);

    expect(response?.status).toBe(502);
    await expect(response?.json()).resolves.toEqual({
      error: {
        code: 'UPSTREAM_HTTP_ERROR',
        message: 'Provider request failed',
        upstream: 'NWS',
        retryable: true,
        upstreamStatus: 503,
      },
    });
  });

  it('Use Case: leaves non-upstream errors for the route handler', () => {
    expect(upstreamErrorResponse(new Error('unexpected'))).toBeNull();
  });
});