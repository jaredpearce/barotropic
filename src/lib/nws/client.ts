/**
 * NWS API Client
 * Provides a centralized, reusable interface for National Weather Service API calls.
 * Enforces User-Agent header requirement and handles validation with Zod schemas.
 */

import { z } from 'zod';
import 'server-only';
import { isUpstreamTimeout, UpstreamApiError } from '../api-errors';

const NWS_BASE_URL = 'https://api.weather.gov';
const NWS_USER_AGENT =
  process.env.NWS_USER_AGENT ?? 'Barotropic/0.1.0';
const NWS_REQUEST_TIMEOUT_MS = 10_000;
const NWS_REVALIDATE_SECONDS = 60;

export interface FetchFromNwsOptions {
  /** Seconds to cache the upstream response. Defaults to 60. */
  revalidate?: number;
}

function resolveNwsUrl(endpoint: string): URL {
  if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
    throw new TypeError('NWS endpoint must be a path on api.weather.gov');
  }

  const url = new URL(endpoint, NWS_BASE_URL);
  if (url.origin !== NWS_BASE_URL) {
    throw new TypeError('NWS endpoint must be a path on api.weather.gov');
  }

  return url;
}

/**
 * Create NWS-compatible request headers
 * @returns Headers object suitable for NWS API calls
 */
export function createNwsHeaders(): HeadersInit {
  return {
    Accept: 'application/geo+json',
    'User-Agent': NWS_USER_AGENT,
  };
}

/**
 * Generic fetch wrapper for NWS API calls with validation
 * Handles errors, validates response with provided schema, and logs issues
 *
 * @param request - The incoming HTTP request (used for User-Agent)
 * @param endpoint - NWS API endpoint path (e.g., '/points/39.7392,-104.9903')
 * @param schema - Zod schema to validate and parse the response
 * @param options - Upstream caching options
 * @returns Validated response data
 * @throws UpstreamApiError when the provider request or response fails
 */
export async function fetchFromNws<Schema extends z.ZodTypeAny>(
  endpoint: string,
  schema: Schema,
  options: FetchFromNwsOptions = {}
): Promise<z.output<Schema>> {
  const url = resolveNwsUrl(endpoint);

  try {
    const response = await fetch(url, {
      headers: createNwsHeaders(),
      next: { revalidate: options.revalidate ?? NWS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(NWS_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`NWS API error: ${response.status} from ${url.pathname}`);

      throw new UpstreamApiError(
        'UPSTREAM_HTTP_ERROR',
        'National Weather Service request failed',
        'NWS',
        502,
        response.status >= 500 || response.status === 429,
        response.status
      );
    }

    try {
      const data = await response.json();
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        console.error('NWS response validation failed:', error);
        throw new UpstreamApiError(
          'UPSTREAM_MALFORMED_RESPONSE',
          'National Weather Service returned an invalid response',
          'NWS',
          502,
          false
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof UpstreamApiError) {
      throw error;
    }

    if (isUpstreamTimeout(error)) {
      throw new UpstreamApiError(
        'UPSTREAM_TIMEOUT',
        'National Weather Service request timed out',
        'NWS',
        504,
        true
      );
    }

    console.error('Unexpected error fetching from NWS:', error);
    throw new UpstreamApiError(
      'UPSTREAM_UNAVAILABLE',
      'National Weather Service is unavailable',
      'NWS',
      502,
      true
    );
  }
}
