/**
 * Open-Meteo API Client
 * Provides a centralized, reusable interface for Open-Meteo API calls.
 * Mirrors NWS client pattern for consistency and maintainability.
 *
 * @see https://open-meteo.com/en/docs
 */

import { z } from 'zod';
import 'server-only';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';
const OPEN_METEO_REQUEST_TIMEOUT_MS = 10_000;

function resolveOpenMeteoUrl(endpoint: string): URL {
  if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
    throw new TypeError('Open-Meteo endpoint must be a path on api.open-meteo.com');
  }

  const url = new URL(endpoint, OPEN_METEO_BASE_URL);
  if (url.origin !== OPEN_METEO_BASE_URL) {
    throw new TypeError('Open-Meteo endpoint must be a path on api.open-meteo.com');
  }

  return url;
}

/**
 * Create Open-Meteo-compatible request headers
 * @returns Headers object suitable for Open-Meteo API calls
 */
export function createOpenMeteoHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
  };
}

/**
 * Generic fetch wrapper for Open-Meteo API calls with validation
 * Handles errors, validates response with provided schema, and logs issues
 *
 * @param endpoint - Open-Meteo API endpoint path (e.g., '/forecast')
 * @param schema - Zod schema to validate and parse the response
 * @returns Validated response data
 * @throws Response with appropriate HTTP status on error
 */
export async function fetchFromOpenMeteo<Schema extends z.ZodTypeAny>(
  endpoint: string,
  schema: Schema
): Promise<z.output<Schema>> {
  const url = resolveOpenMeteoUrl(endpoint);

  try {
    const response = await fetch(url, {
      headers: createOpenMeteoHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(OPEN_METEO_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`Open-Meteo API error: ${response.status} from ${url.pathname}`);

      throw new Response(
        JSON.stringify({
          error: 'Failed to fetch data from Open-Meteo',
          status: response.status,
          details:
            response.status === 404
              ? 'The requested resource was not found'
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
      console.error('Open-Meteo response validation failed:', error.errors);
      throw new Response(
        JSON.stringify({
          error: 'Invalid response format from Open-Meteo',
          details: 'Response validation failed',
        }),
        {
          status: 502,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    console.error('Unexpected error fetching from Open-Meteo:', error);
    throw new Response(
      JSON.stringify({
        error: 'Unexpected error fetching from Open-Meteo',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
