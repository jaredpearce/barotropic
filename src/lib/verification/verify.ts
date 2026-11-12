/**
 * Verification math.
 *
 * Compares a forecast revision's numeric values (user + guidance) against an
 * aggregated observed day and produces per-source, per-variable samples. All
 * math is in canonical units: Celsius, m/s, and percentage points for PoP.
 */

import type {
  Forecast,
  ForecastRevision,
  ForecastSourceValues,
  ForecastValues,
  GuidanceSourceId,
  GuidanceValues,
  ObservedDayRecord,
} from '@/lib/forecast-workspace/db';
import { localDayBounds } from '@/lib/time';
import { parsePercentText, parseTemperatureText, parseWindSpeedText } from '@/lib/units';

export type VerificationVariable = 'high' | 'low' | 'pop' | 'wind';
export type VerificationSource = 'user' | GuidanceSourceId;

export const verificationVariables: VerificationVariable[] = ['high', 'low', 'wind', 'pop'];

export interface VerificationSample {
  forecastId: string;
  revisionId: string;
  revisionNumber: number;
  validDate: string;
  timeZone: string;
  source: VerificationSource;
  variable: VerificationVariable;
  forecastValue: number;
  observedValue: number;
  /** forecast - observed, in canonical units (percentage points for pop). */
  error: number;
  absError: number;
  /** Brier component for pop only: (p - o)^2 with p and o in [0, 1]. */
  brierComponent?: number;
  leadHours: number;
}

function finite(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Parse the user's free-text forecast values into canonical numbers. */
export function parseUserValues(values: ForecastValues): GuidanceValues {
  return {
    highC: parseTemperatureText(values.high),
    lowC: parseTemperatureText(values.low),
    popPercent: parsePercentText(values.pop),
    windSpeedMps: parseWindSpeedText(values.wind),
    sky: values.sky?.trim() || undefined,
  };
}

/** Best-effort parse of a legacy display-string snapshot into numeric values. */
export function parseLegacyValues(values: ForecastSourceValues | undefined): GuidanceValues {
  if (!values) return {};
  return {
    highC: parseTemperatureText(values.high),
    lowC: parseTemperatureText(values.low),
    popPercent: parsePercentText(values.pop),
    windSpeedMps: parseWindSpeedText(values.wind),
    sky: values.sky?.trim() || undefined,
  };
}

/** Numeric values for one source on a revision, preferring structured guidance. */
export function forecastValuesForRevision(
  revision: ForecastRevision,
  source: VerificationSource,
): GuidanceValues | undefined {
  if (source === 'user') return parseUserValues(revision.values);

  const snapshot = revision.guidance?.find((candidate) => candidate.source === source);
  if (snapshot) return snapshot.values;

  // Legacy revisions predate structured guidance.
  if (source === 'NWS') return parseLegacyValues(revision.officialValues);
  if (source === 'GFS') return parseLegacyValues(revision.modelValues);
  return undefined;
}

/** Every source that should be scored for a revision. */
export function revisionSources(revision: ForecastRevision): VerificationSource[] {
  const sources: VerificationSource[] = ['user'];
  if (revision.guidance && revision.guidance.length > 0) {
    for (const snapshot of revision.guidance) {
      if (!sources.includes(snapshot.source)) sources.push(snapshot.source);
    }
    return sources;
  }

  if (Object.keys(revision.officialValues ?? {}).length > 0) sources.push('NWS');
  if (Object.keys(revision.modelValues ?? {}).length > 0) sources.push('GFS');
  return sources;
}

function forecastValueFor(
  values: GuidanceValues,
  variable: VerificationVariable,
): number | undefined {
  switch (variable) {
    case 'high':
      return finite(values.highC);
    case 'low':
      return finite(values.lowC);
    case 'wind':
      return finite(values.windSpeedMps);
    case 'pop':
      return finite(values.popPercent);
  }
}

function observedValueFor(
  observedDay: ObservedDayRecord,
  variable: VerificationVariable,
): number | undefined {
  switch (variable) {
    case 'high':
      return finite(observedDay.highC);
    case 'low':
      return finite(observedDay.lowC);
    case 'wind':
      return finite(observedDay.meanWindMps);
    case 'pop':
      return observedDay.precipOccurred === undefined
        ? undefined
        : observedDay.precipOccurred
          ? 100
          : 0;
  }
}

/** Whether a revision was created before the local day it forecasts began. */
export function isExAnte(revision: ForecastRevision, validDate: string, timeZone: string): boolean {
  const { startMs } = localDayBounds(validDate, timeZone);
  return revision.createdAt.getTime() < startMs;
}

export interface VerifyRevisionInput {
  forecast: Forecast;
  revision: ForecastRevision;
  observedDay: ObservedDayRecord;
}

/**
 * Produce verification samples for a revision against an observed day.
 *
 * Returns an empty array when the revision is not ex-ante or no variable has
 * both a forecast and an observed value. Missing values are skipped, never
 * coerced to zero.
 */
export function verifyRevision({
  forecast,
  revision,
  observedDay,
}: VerifyRevisionInput): VerificationSample[] {
  const timeZone = revision.target?.timeZone ?? observedDay.timeZone;
  const validDate = forecast.validStart.slice(0, 10);
  if (!isExAnte(revision, validDate, timeZone)) return [];

  const { startMs } = localDayBounds(validDate, timeZone);
  const leadHours = (startMs - revision.createdAt.getTime()) / 3_600_000;
  const samples: VerificationSample[] = [];

  for (const source of revisionSources(revision)) {
    const values = forecastValuesForRevision(revision, source);
    if (!values) continue;

    for (const variable of verificationVariables) {
      const forecastValue = forecastValueFor(values, variable);
      const observedValue = observedValueFor(observedDay, variable);
      if (forecastValue === undefined || observedValue === undefined) continue;

      const error = forecastValue - observedValue;
      samples.push({
        forecastId: forecast.id,
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
        validDate,
        timeZone,
        source,
        variable,
        forecastValue,
        observedValue,
        error,
        absError: Math.abs(error),
        brierComponent:
          variable === 'pop' ? (forecastValue / 100 - observedValue / 100) ** 2 : undefined,
        leadHours,
      });
    }
  }

  return samples;
}
