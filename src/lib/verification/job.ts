/**
 * Client-side verification job.
 *
 * Loads stored revisions, resolves the observed day for each station/date
 * (cache first, then the NWS observations route), aggregates observations,
 * verifies eligible revisions, and summarizes the samples. Individual station
 * or day failures are recorded as warnings and never abort the run.
 */

import {
  getObservedDay,
  listAllForecastRevisions,
  listAllForecasts,
  putObservedDay,
  type Forecast,
  type ForecastRevision,
  type ObservedDayRecord,
} from '@/lib/forecast-workspace/db';
import type { NormalizedObservation } from '@/lib/schemas/normalized';
import { isValidTimeZone, localDayBounds } from '@/lib/time';
import { aggregateObservedDay } from './observed';
import { summarizeSamples, type VariableSummary } from './summary';
import { isExAnte, verifyRevision, type VerificationSample } from './verify';

export type VerificationOutcome =
  | 'verified'
  | 'pending'
  | 'not-ex-ante'
  | 'insufficient-coverage'
  | 'missing'
  | 'unverifiable';

export interface PastForecast {
  forecastId: string;
  revisionId: string;
  revisionNumber: number;
  locationName: string;
  validDate: string;
  timeZone?: string;
  leadHours: number;
  createdAt: string;
  status: VerificationOutcome;
  samples: VerificationSample[];
}

export interface VerificationCounts {
  verified: number;
  pending: number;
  notExAnte: number;
  insufficient: number;
  missing: number;
  unverifiable: number;
}

export interface VerificationRunResult {
  samples: VerificationSample[];
  summaries: VariableSummary[];
  pastForecasts: PastForecast[];
  counts: VerificationCounts;
  warnings: string[];
}

export type ObservationLoader = (
  stationId: string,
  date: string,
  timeZone: string,
) => Promise<NormalizedObservation[]>;

export interface VerificationProgress {
  total: number;
  completed: number;
}

export interface RunVerificationOptions {
  now?: Date;
  /** Inject for tests; defaults to the NWS observations route. */
  loadObservations?: ObservationLoader;
  concurrency?: number;
  /** Called once per classified revision so callers can show progress. */
  onProgress?: (progress: VerificationProgress) => void;
}

const VERIFICATION_LAG_MS = 2 * 3_600_000;
const RETRY_MS = 6 * 3_600_000;
const DEFAULT_CONCURRENCY = 3;

async function defaultLoadObservations(
  stationId: string,
  date: string,
  timeZone: string,
): Promise<NormalizedObservation[]> {
  const { startMs, endMs } = localDayBounds(date, timeZone);
  const url = new URL(`/api/nws/stations/${stationId}/observations`, window.location.origin);
  url.searchParams.set('start', new Date(startMs).toISOString());
  url.searchParams.set('end', new Date(endMs).toISOString());
  url.searchParams.set('limit', '500');

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Observations request failed (${response.status})`);
  const payload = (await response.json()) as { observations?: NormalizedObservation[] };
  return payload.observations ?? [];
}

interface Candidate {
  forecast: Forecast;
  revision: ForecastRevision;
  validDate: string;
  timeZone: string;
  stationId: string;
  leadHours: number;
}

function baseOf(candidate: Candidate): Omit<PastForecast, 'status' | 'samples'> {
  return {
    forecastId: candidate.forecast.id,
    revisionId: candidate.revision.id,
    revisionNumber: candidate.revision.revisionNumber,
    locationName: candidate.forecast.locationName,
    validDate: candidate.validDate,
    timeZone: candidate.timeZone,
    leadHours: candidate.leadHours,
    createdAt: candidate.revision.createdAt.toISOString(),
  };
}

function emptyCounts(): VerificationCounts {
  return {
    verified: 0,
    pending: 0,
    notExAnte: 0,
    insufficient: 0,
    missing: 0,
    unverifiable: 0,
  };
}

function errorObservedDay(stationId: string, date: string, timeZone: string): ObservedDayRecord {
  return {
    stationId,
    date,
    timeZone,
    timeZoneSource: 'provider',
    status: 'error',
    coverage: { temperatureHours: 0, windHours: 0, precipitationHours: 0, requiredHours: 0 },
    observationsRetrievedAt: new Date().toISOString(),
    fetchedAt: new Date(),
  };
}

async function resolveObservedDay(
  stationId: string,
  date: string,
  timeZone: string,
  loadObservations: ObservationLoader,
  warnings: string[],
): Promise<ObservedDayRecord> {
  const cached = await getObservedDay(stationId, date);
  const now = Date.now();
  if (cached) {
    const immutable = cached.status === 'verified' || cached.status === 'insufficient';
    const retryExpired = now - cached.fetchedAt.getTime() >= RETRY_MS;
    if (immutable || !retryExpired) return cached;
  }

  try {
    const observations = await loadObservations(stationId, date, timeZone);
    const record = aggregateObservedDay({
      stationId,
      date,
      timeZone,
      timeZoneSource: 'provider',
      observations,
      observationsRetrievedAt: new Date().toISOString(),
    });
    await putObservedDay(record);
    return record;
  } catch (error) {
    warnings.push(
      `Observations unavailable for ${stationId} on ${date}: ${
        error instanceof Error ? error.message : 'request failed'
      }`,
    );
    const record = errorObservedDay(stationId, date, timeZone);
    await putObservedDay(record);
    return record;
  }
}

export async function runVerification(
  options: RunVerificationOptions = {},
): Promise<VerificationRunResult> {
  const now = options.now ?? new Date();
  const loadObservations = options.loadObservations ?? defaultLoadObservations;
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);

  const [revisions, forecasts] = await Promise.all([
    listAllForecastRevisions(),
    listAllForecasts(),
  ]);
  const forecastById = new Map(forecasts.map((forecast) => [forecast.id, forecast]));

  const pastForecasts: PastForecast[] = [];
  const warnings: string[] = [];
  const counts = emptyCounts();
  const groups = new Map<string, Candidate[]>();

  const relevantRevisions = revisions.filter((revision) => forecastById.has(revision.forecastId));
  const total = relevantRevisions.length;
  let completed = 0;
  const onProgress = options.onProgress;
  const pushPast = (past: PastForecast) => {
    pastForecasts.push(past);
    completed += 1;
    onProgress?.({ total, completed });
  };

  for (const revision of relevantRevisions) {
    const forecast = forecastById.get(revision.forecastId) as Forecast;

    const validDate = forecast.validStart.slice(0, 10);
    const timeZone = revision.target?.timeZone;
    const stationId = revision.target?.stationId;

    if (!timeZone || !isValidTimeZone(timeZone) || !stationId) {
      counts.unverifiable += 1;
      pushPast({
        forecastId: forecast.id,
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
        locationName: forecast.locationName,
        validDate,
        timeZone,
        leadHours: 0,
        createdAt: revision.createdAt.toISOString(),
        status: 'unverifiable',
        samples: [],
      });
      continue;
    }

    const { startMs, endMs } = localDayBounds(validDate, timeZone);
    const leadHours = (startMs - revision.createdAt.getTime()) / 3_600_000;

    if (!isExAnte(revision, validDate, timeZone)) {
      counts.notExAnte += 1;
      pushPast({
        forecastId: forecast.id,
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
        locationName: forecast.locationName,
        validDate,
        timeZone,
        leadHours,
        createdAt: revision.createdAt.toISOString(),
        status: 'not-ex-ante',
        samples: [],
      });
      continue;
    }

    if (now.getTime() < endMs + VERIFICATION_LAG_MS) {
      counts.pending += 1;
      pushPast({
        forecastId: forecast.id,
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
        locationName: forecast.locationName,
        validDate,
        timeZone,
        leadHours,
        createdAt: revision.createdAt.toISOString(),
        status: 'pending',
        samples: [],
      });
      continue;
    }

    const key = `${stationId}|${validDate}|${timeZone}`;
    const group = groups.get(key) ?? [];
    group.push({ forecast, revision, validDate, timeZone, stationId, leadHours });
    groups.set(key, group);
  }

  const groupList = [...groups.values()];
  const samples: VerificationSample[] = [];

  let nextIndex = 0;
  async function worker() {
    while (nextIndex < groupList.length) {
      const group = groupList[nextIndex];
      nextIndex += 1;
      const { stationId, validDate, timeZone } = group[0];
      const observedDay = await resolveObservedDay(
        stationId,
        validDate,
        timeZone,
        loadObservations,
        warnings,
      );

      for (const candidate of group) {
        const base = baseOf(candidate);
        if (observedDay.status === 'missing') {
          counts.missing += 1;
          pushPast({ ...base, status: 'missing', samples: [] });
          continue;
        }
        if (observedDay.status === 'error') {
          counts.unverifiable += 1;
          pushPast({ ...base, status: 'unverifiable', samples: [] });
          continue;
        }

        const revisionSamples = verifyRevision({
          forecast: candidate.forecast,
          revision: candidate.revision,
          observedDay,
        });

        if (observedDay.status === 'insufficient' || revisionSamples.length === 0) {
          counts.insufficient += 1;
          pushPast({ ...base, status: 'insufficient-coverage', samples: [] });
          continue;
        }

        counts.verified += 1;
        samples.push(...revisionSamples);
        pushPast({ ...base, status: 'verified', samples: revisionSamples });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, groupList.length) }, () => worker()),
  );

  pastForecasts.sort((left, right) => {
    if (left.validDate !== right.validDate) return left.validDate < right.validDate ? 1 : -1;
    return right.revisionNumber - left.revisionNumber;
  });

  return {
    samples,
    summaries: summarizeSamples(samples),
    pastForecasts,
    counts,
    warnings,
  };
}
