export const OPEN_METEO_MODEL_ALIASES: Record<string, string> = {
  gfs: 'gfs',
  hrr: 'hrrr',
  hrrr: 'hrrr',
};

export const DEFAULT_OPEN_METEO_MODELS = ['gfs', 'hrrr'];

/**
 * Open-Meteo model names in the current upstream API are `gfs` and `hrrr`.
 * We accept `hrr` as an app-level shorthand while mapping it to `hrrr` when calling the API.
 */
export function normalizeOpenMeteoModels(rawModels: string | null): string[] {
  const requested = rawModels?.trim() || DEFAULT_OPEN_METEO_MODELS.join(',');

  const normalized = requested
    .split(',')
    .map((model) => model.trim().toLowerCase())
    .filter(Boolean)
    .map((model) => OPEN_METEO_MODEL_ALIASES[model] ?? model)
    .filter((model) => model === 'gfs' || model === 'hrrr');

  if (normalized.length === 0) {
    throw new Error(
      'models must include at least one valid Open-Meteo model (e.g., gfs,hrrr)'
    );
  }

  return [...new Set(normalized)];
}

export function buildOpenMeteoForecastQuery(
  latitude: number,
  longitude: number,
  model: string,
  forecastDays = 7
) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    daily: ['weather_code', 'temperature_2m_max', 'temperature_2m_min'].join(','),
    timezone: 'auto',
    forecast_days: String(forecastDays),
    models: model,
  });

  return `/forecast?${params.toString()}`;
}
