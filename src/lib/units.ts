/**
 * Canonical unit conversions and display formatting.
 *
 * Storage and verification math use Celsius, meters per second, and
 * millimeters. Imperial formatting is display-only. Temperature *deltas* use a
 * different conversion than absolute temperatures, so the two helpers are kept
 * separate on purpose.
 */

export type UnitSystem = 'imperial' | 'metric';

export const MPS_TO_MPH = 2.2369362920544;
export const KMH_TO_MPS = 1 / 3.6;
export const KNOTS_TO_MPS = 0.5144444444444445;
export const MM_PER_INCH = 25.4;

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function mpsToMph(mps: number): number {
  return mps * MPS_TO_MPH;
}

export function mphToMps(mph: number): number {
  return mph / MPS_TO_MPH;
}

export function kmhToMps(kmh: number): number {
  return kmh * KMH_TO_MPS;
}

export function knotsToMps(knots: number): number {
  return knots * KNOTS_TO_MPS;
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

function formatNumber(value: number, digits = 1): string {
  return Number(value.toFixed(digits)).toString();
}

export function formatTemperature(celsius: number, system: UnitSystem, digits = 1): string {
  const value = system === 'imperial' ? celsiusToFahrenheit(celsius) : celsius;
  return `${formatNumber(value, digits)}°${system === 'imperial' ? 'F' : 'C'}`;
}

/** Convert and format a temperature difference, never an absolute value. */
export function formatTemperatureDelta(
  celsiusDelta: number,
  system: UnitSystem,
  digits = 1,
): string {
  const value = system === 'imperial' ? (celsiusDelta * 9) / 5 : celsiusDelta;
  return `${formatNumber(value, digits)}°${system === 'imperial' ? 'F' : 'C'}`;
}

export function formatWindSpeed(mps: number, system: UnitSystem, digits = 1): string {
  const value = system === 'imperial' ? mpsToMph(mps) : mps;
  return `${formatNumber(value, digits)} ${system === 'imperial' ? 'mph' : 'm/s'}`;
}

export function formatPrecipProbability(percent: number, digits = 0): string {
  return `${formatNumber(percent, digits)}%`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${formatNumber(value, digits)}%`;
}

export function formatBrier(score: number, digits = 3): string {
  return formatNumber(score, digits);
}

/** Parse a temperature string into Celsius. Unitless values are Celsius. */
export function parseTemperatureText(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:°\s*)?([CF])?$/i);
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;

  return match[2]?.toUpperCase() === 'F' ? fahrenheitToCelsius(amount) : amount;
}

/** Parse a percentage string into a 0-100 number. */
export function parsePercentText(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*%?$/);
  if (!match) return undefined;

  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount >= 0 && amount <= 100 ? amount : undefined;
}

/**
 * Parse a wind string into meters per second.
 *
 * Accepts an optional direction and an optional unit, e.g. "SW 8 m/s",
 * "15 mph", "20 km/h", "10 kt". Unitless values default to m/s to match the
 * editor's current metric input.
 */
export function parseWindSpeedText(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/(-?\d+(?:\.\d+)?)\s*(mph|m\/s|ms|km\/h|kmh|kt|knots?)?/i);
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;

  const unit = match[2]?.toLowerCase();
  if (!unit || unit === 'm/s' || unit === 'ms') return amount;
  if (unit === 'mph') return mphToMps(amount);
  if (unit === 'km/h' || unit === 'kmh') return kmhToMps(amount);
  return knotsToMps(amount);
}
