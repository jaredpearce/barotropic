/**
 * Open-Meteo API Client
 * Provides a centralized, reusable interface for Open-Meteo API calls.
 * Mirrors the repo's NWS client pattern for consistency and maintainability.
 *
 * Note: current upstream model naming uses `gfs` and `hrrr` in the Open-Meteo API.
 * We keep a small app-layer alias (`hrr` -> `hrrr`) so the app contract remains simple.
 */

import { z } from 'zod';
import 'server-only';
import { isUpstreamTimeout, UpstreamApiError } from '../api-errors';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com';
const OPEN_METEO_API_PATH = '/v1';
const OPEN_METEO_REQUEST_TIMEOUT_MS = 10_000;
const OPEN_METEO_REVALIDATE_SECONDS = 60;

function resolveOpenMeteoUrl(endpoint: string): URL {
  if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
    throw new TypeError('Open-Meteo endpoint must be a path on api.open-meteo.com');
  }

  const url = new URL(`${OPEN_METEO_API_PATH}${endpoint}`, OPEN_METEO_BASE_URL);
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
 * Generic fetch wrapper for Open-Meteo API calls with validation.
 *
 * @param endpoint - Open-Meteo API endpoint path (e.g., '/forecast?latitude=40&longitude=-105')
 * @param schema - Zod schema to validate and parse the response
 * @returns Validated response data
 * @throws UpstreamApiError when the provider request or response fails
 */
export async function fetchFromOpenMeteo<Schema extends z.ZodTypeAny>(
  endpoint: string,
  schema: Schema
): Promise<z.output<Schema>> {
  const url = resolveOpenMeteoUrl(endpoint);

  try {
    const response = await fetch(url, {
      headers: createOpenMeteoHeaders(),
      next: { revalidate: OPEN_METEO_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(OPEN_METEO_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`Open-Meteo API error: ${response.status} from ${url.pathname}`);

      throw new UpstreamApiError(
        'UPSTREAM_HTTP_ERROR',
        'Open-Meteo request failed',
        'Open-Meteo',
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
        console.error('Open-Meteo response validation failed:', error);
        throw new UpstreamApiError(
          'UPSTREAM_MALFORMED_RESPONSE',
          'Open-Meteo returned an invalid response',
          'Open-Meteo',
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
        'Open-Meteo request timed out',
        'Open-Meteo',
        504,
        true
      );
    }

    console.error('Unexpected error fetching from Open-Meteo:', error);
    throw new UpstreamApiError(
      'UPSTREAM_UNAVAILABLE',
      'Open-Meteo is unavailable',
      'Open-Meteo',
      502,
      true
    );
  }
}
