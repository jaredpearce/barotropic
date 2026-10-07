/**
 * NWS API Client
 * Provides a centralized, reusable interface for National Weather Service API calls.
 * Enforces User-Agent header requirement and handles validation with Zod schemas.
 */

import { z } from 'zod';
import 'server-only';

const NWS_BASE_URL = 'https://api.weather.gov';
const NWS_USER_AGENT =
  process.env.NWS_USER_AGENT ?? 'Barotropic/0.1.0';
const NWS_REQUEST_TIMEOUT_MS = 10_000;

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
 * @returns Validated response data
 * @throws Response with appropriate HTTP status on error
 */
export async function fetchFromNws<Schema extends z.ZodTypeAny>(
  endpoint: string,
  schema: Schema
): Promise<z.output<Schema>> {
  const url = resolveNwsUrl(endpoint);

  try {
    const response = await fetch(url, {
      headers: createNwsHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(NWS_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`NWS API error: ${response.status} from ${url.pathname}`);

      throw new Response(
        JSON.stringify({
          error: 'Failed to fetch data from National Weather Service',
          status: response.status,
          details:
            response.status === 404
              ? 'The requested location or resource was not found'
              : 'Check your request parameters and try again',
        }),
        {
          status: response.status >= 500 ? 502 : response.status,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    return schema.parse(data);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      console.error('NWS response validation failed:', error.errors);
      throw new Response(
        JSON.stringify({
          error: 'Invalid response format from National Weather Service',
          details: 'Response validation failed',
        }),
        {
          status: 502,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    console.error('Unexpected error fetching from NWS:', error);
    throw new Response(
      JSON.stringify({
        error: 'Unexpected error fetching from National Weather Service',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
