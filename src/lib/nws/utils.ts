/**
 * NWS API Utilities
 * Helper functions for parsing and working with NWS data
 */

/**
 * Extract station ID from NWS observation station URL
 * Example: 'https://api.weather.gov/stations/KDEN' => 'KDEN'
 *
 * @param stationUrl - Full URL to station resource
 * @returns Station ID or null if extraction fails
 */
export function extractStationId(stationUrl: string): string | null {
  try {
    return stationUrl.split('/').pop() ?? null;
  } catch {
    return null;
  }
}

/**
 * Validate latitude/longitude values
 *
 * @param lat - Latitude string
 * @param lon - Longitude string
 * @returns Parsed latitude and longitude
 * @throws Error if values are invalid
 */
export function validateLatitudeLongitude(
  lat: string,
  lon: string
): { latitude: number; longitude: number } {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('lat and lon must be valid numbers');
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error('latitude must be between -90 and 90');
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error('longitude must be between -180 and 180');
  }

  return { latitude, longitude };
}

/**
 * Extract zone ID from query parameter (e.g., 'COZ001')
 *
 * @param zone - Zone identifier string
 * @returns Validated zone ID
 * @throws Error if zone is invalid
 */
export function validateZoneId(zone: string): string {
  const trimmed = zone.trim().toUpperCase();
  if (!trimmed || trimmed.length < 3) {
    throw new Error('zone must be a valid zone identifier (e.g., COZ001)');
  }
  return trimmed;
}
