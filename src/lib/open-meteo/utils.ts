export const OPEN_METEO_MODELS = {
  gfs: { name: 'GFS', id: 'ncep_gfs_seamless' },
  hrrr: { name: 'HRRR', id: 'ncep_hrrr_conus' },
} as const;

export type OpenMeteoModelName = keyof typeof OPEN_METEO_MODELS;

export const DEFAULT_OPEN_METEO_MODELS: OpenMeteoModelName[] = ['gfs', 'hrrr'];

const OPEN_METEO_MODEL_ALIASES: Record<string, OpenMeteoModelName> = {
  gfs: 'gfs',
  ncep_gfs_seamless: 'gfs',
  hrr: 'hrrr',
  hrrr: 'hrrr',
  ncep_hrrr_conus: 'hrrr',
};

export function normalizeOpenMeteoModels(
  rawModels: string | null
): OpenMeteoModelName[] {
  const requested = rawModels?.trim() || DEFAULT_OPEN_METEO_MODELS.join(',');
  const normalized = requested
    .split(',')
    .map((model) => OPEN_METEO_MODEL_ALIASES[model.trim().toLowerCase()])
    .filter((model): model is OpenMeteoModelName => model !== undefined);

  if (normalized.length === 0) {
    throw new Error('models must include gfs or hrrr');
  }

  return [...new Set(normalized)];
}

export function buildOpenMeteoForecastQuery(
  latitude: number,
  longitude: number,
  modelId: string,
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
    temperature_unit: 'celsius',
    wind_speed_unit: 'ms',
    precipitation_unit: 'mm',
    models: modelId,
  });

  return `/forecast?${params.toString()}`;
}
