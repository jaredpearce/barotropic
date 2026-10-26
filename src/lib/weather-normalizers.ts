type NwsQuantity = {
  value?: number | null;
  unitCode?: string;
};

export function normalizeNwsTemperature(quantity?: NwsQuantity): number | null {
  const value = quantity?.value;
  if (value == null) return null;

  const unit = quantity?.unitCode?.toLowerCase() ?? '';
  if (unit.includes('degf')) return ((value - 32) * 5) / 9;
  if (unit.includes('degc')) return value;
  return null;
}

export function normalizeNwsWindSpeed(quantity?: NwsQuantity): number | null {
  const value = quantity?.value;
  if (value == null) return null;

  const unit = quantity?.unitCode?.toLowerCase() ?? '';
  if (unit.includes('km_h-1') || unit.includes('km/h')) return value / 3.6;
  if (unit.includes('mi_h-1') || unit.includes('mph')) return value * 0.44704;
  if (unit.includes('m_s-1') || unit.includes('m/s')) return value;
  if (unit.includes('knot') || unit === 'kt') return value * 0.514444;
  return null;
}

export function normalizeNwsWindSpeedText(value: string): number | null {
  const match = value.match(/\d+(?:\.\d+)?(?:\s+to\s+\d+(?:\.\d+)?)?/i);
  if (!match) return null;

  const numbers = match[0].match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numbers.length === 0) return null;

  const unit = value.toLowerCase();
  let metersPerSecond: number;
  if (unit.includes('mph')) {
    metersPerSecond = 0.44704;
  } else if (unit.includes('km/h') || unit.includes('kmh')) {
    metersPerSecond = 1 / 3.6;
  } else if (unit.includes('knot') || /\bkt\b/.test(unit)) {
    metersPerSecond = 0.514444;
  } else if (unit.includes('m/s')) {
    metersPerSecond = 1;
  } else {
    return null;
  }

  return (numbers.reduce((sum, number) => sum + number, 0) / numbers.length) * metersPerSecond;
}

const COMPASS_DIRECTIONS: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

export function normalizeNwsWindDirection(value: string): number | null {
  return COMPASS_DIRECTIONS[value.trim().toUpperCase()] ?? null;
}

export function normalizeNwsQuantityValue(quantity?: NwsQuantity): number | null {
  return quantity?.value ?? null;
}

/**
 * Normalize a barometric pressure reading to hectopascals.
 *
 * The NWS publishes pressure in pascals with a `wmoUnit:Pa` unit code;
 * 1 hPa equals 1 mb.
 */
export function normalizeNwsPressure(quantity?: NwsQuantity): number | null {
  const value = quantity?.value;
  if (value == null) return null;

  const unit = quantity?.unitCode?.toLowerCase() ?? '';
  if (unit.includes('hpa')) return value;
  if (unit.includes('pa')) return value / 100;
  return null;
}