import Dexie, { type Table } from 'dexie';

export const forecastFieldKeys = ['high', 'low', 'pop', 'wind', 'sky', 'hazards'] as const;

export type ForecastFieldKey = (typeof forecastFieldKeys)[number];
export type ForecastValues = Record<ForecastFieldKey, string>;
export type ForecastSourceValues = Partial<Record<ForecastFieldKey, string>>;

export const guidanceSourceIds = ['NWS', 'GFS', 'HRRR', 'ECMWF'] as const;
export type GuidanceSourceId = (typeof guidanceSourceIds)[number];

/** Canonical numeric guidance values. Display strings are derived from these. */
export interface GuidanceValues {
  highC?: number;
  lowC?: number;
  popPercent?: number;
  windSpeedMps?: number;
  windDirectionDegrees?: number;
  sky?: string;
}

export interface GuidanceSnapshot {
  source: GuidanceSourceId;
  /** Provider model id, e.g. ncep_gfs_seamless. Omitted for NWS. */
  modelId?: string;
  /** Provider initialization time when known. Null when the provider omits it. */
  runTime: string | null;
  /** When this app fetched the guidance. */
  retrievedAt: string;
  /** Provider-local offset for model timestamps, when known. */
  utcOffsetSeconds?: number;
  values: GuidanceValues;
}

/** Immutable verification target captured with a revision. */
export interface ForecastTarget {
  latitude?: number;
  longitude?: number;
  /** Nearest NWS observation station, e.g. KDEN. */
  stationId?: string;
  /** IANA time zone, e.g. America/Denver. */
  timeZone?: string;
}

/** Editable state shared by the editor and the persistence boundary. */
export interface ForecastDraft {
  locationName: string;
  latitude?: number;
  longitude?: number;
  validStart: string;
  values: ForecastValues;
  reasoning: string;
}

export interface ForecastLocation {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  /** Nearest NWS observation station for the current location. */
  stationId?: string;
  /** IANA time zone for the current location. */
  timeZone?: string;
  createdAt: Date;
}

export interface Forecast {
  id: string;
  locationId: string;
  locationName: string;
  validStart: string;
  updatedAt: Date;
  currentRevisionId: string;
}

export interface ForecastRevision {
  id: string;
  forecastId: string;
  revisionNumber: number;
  createdAt: Date;
  values: ForecastValues;
  reasoning: string;
  /** Structured snapshots used for verification. New revisions always write this. */
  guidance?: GuidanceSnapshot[];
  /** Immutable verification target captured with the revision. */
  target?: ForecastTarget;
  /** Legacy Epic 4 display snapshots, retained for old records. */
  officialValues: ForecastSourceValues;
  modelValues: ForecastSourceValues;
}

export type ObservedDayStatus = 'verified' | 'insufficient' | 'missing' | 'error';

/** One observed record per station, per local calendar day. */
export interface ObservedDayRecord {
  stationId: string;
  /** YYYY-MM-DD in the target time zone. */
  date: string;
  timeZone: string;
  timeZoneSource: 'provider' | 'fallback';
  status: ObservedDayStatus;
  highC?: number;
  lowC?: number;
  meanWindMps?: number;
  precipOccurred?: boolean;
  coverage: {
    temperatureHours: number;
    windHours: number;
    precipitationHours: number;
    requiredHours: number;
  };
  observationsRetrievedAt: string;
  fetchedAt: Date;
}

export interface ForecastSnapshot {
  forecast: Forecast;
  revision: ForecastRevision;
  location?: ForecastLocation;
}

export interface SaveForecastInput extends ForecastDraft {
  forecastId?: string;
  officialValues?: ForecastSourceValues;
  modelValues?: ForecastSourceValues;
  /** Numeric snapshots for every successful source. */
  guidance?: GuidanceSnapshot[];
  /** Coordinates, station, and time zone captured with the revision. */
  target?: ForecastTarget;
}

export const emptyForecastValues = (): ForecastValues => ({
  high: '',
  low: '',
  pop: '',
  wind: '',
  sky: '',
  hazards: '',
});

class ForecastWorkspaceDatabase extends Dexie {
  locations!: Table<ForecastLocation, string>;
  forecasts!: Table<Forecast, string>;
  revisions!: Table<ForecastRevision, string>;
  observedDays!: Table<ObservedDayRecord, [string, string]>;

  constructor() {
    super('barotropic-forecast-workspace');
    this.version(1).stores({
      locations: 'id, name',
      forecasts: 'id, locationId, updatedAt',
      revisions: 'id, forecastId, [forecastId+revisionNumber], createdAt',
    });
    this.version(2).stores({
      locations: 'id, name',
      forecasts: 'id, locationId, updatedAt',
      revisions: 'id, forecastId, &[forecastId+revisionNumber], createdAt',
    });
    this.version(3).stores({
      locations: 'id, name',
      forecasts: 'id, locationId, updatedAt',
      revisions: 'id, forecastId, &[forecastId+revisionNumber], createdAt',
      observedDays: '&[stationId+date], stationId, date, fetchedAt',
    });
  }
}

export const forecastDatabase = new ForecastWorkspaceDatabase();

function sameDraft(
  forecast: Forecast,
  revision: ForecastRevision,
  location: ForecastLocation | undefined,
  input: SaveForecastInput,
): boolean {
  return (
    forecast.locationName === input.locationName &&
    forecast.validStart === input.validStart &&
    location?.latitude === input.latitude &&
    location?.longitude === input.longitude &&
    revision.reasoning === input.reasoning &&
    forecastFieldKeys.every((key) => revision.values[key] === input.values[key])
  );
}

async function snapshotFor(
  forecast: Forecast,
  revision: ForecastRevision,
): Promise<ForecastSnapshot> {
  const location = await forecastDatabase.locations.get(forecast.locationId);
  return { forecast, revision, location };
}

/**
 * Append a revision for the forecast, creating the forecast and location on the
 * first save. Existing revisions are never updated in place.
 */
export async function saveForecastRevision(input: SaveForecastInput): Promise<ForecastSnapshot> {
  const forecastId = input.forecastId ?? crypto.randomUUID();
  const normalizedInput = { ...input, locationName: input.locationName.trim() };

  return forecastDatabase.transaction(
    'rw',
    forecastDatabase.locations,
    forecastDatabase.forecasts,
    forecastDatabase.revisions,
    async () => {
      const currentForecast = await forecastDatabase.forecasts.get(forecastId);
      const currentLocation = currentForecast
        ? await forecastDatabase.locations.get(currentForecast.locationId)
        : undefined;
      const previousRevision = currentForecast
        ? await forecastDatabase.revisions.get(currentForecast.currentRevisionId)
        : undefined;

      if (
        currentForecast &&
        previousRevision &&
        currentLocation &&
        sameDraft(currentForecast, previousRevision, currentLocation, normalizedInput)
      ) {
        return { forecast: currentForecast, revision: previousRevision, location: currentLocation };
      }

      const now = new Date();
      const locationId = currentForecast?.locationId ?? crypto.randomUUID();
      const location: ForecastLocation = {
        id: locationId,
        name: normalizedInput.locationName,
        latitude: normalizedInput.latitude,
        longitude: normalizedInput.longitude,
        stationId: normalizedInput.target?.stationId ?? currentLocation?.stationId,
        timeZone: normalizedInput.target?.timeZone ?? currentLocation?.timeZone,
        createdAt: currentLocation?.createdAt ?? now,
      };
      const revisions = await forecastDatabase.revisions
        .where('forecastId')
        .equals(forecastId)
        .toArray();
      const highestRevisionNumber = revisions.reduce(
        (highest, revision) => Math.max(highest, revision.revisionNumber),
        0,
      );
      const revision: ForecastRevision = {
        id: crypto.randomUUID(),
        forecastId,
        revisionNumber: highestRevisionNumber + 1,
        createdAt: now,
        values: { ...normalizedInput.values },
        reasoning: normalizedInput.reasoning,
        guidance: normalizedInput.guidance?.map((snapshot) => ({
          ...snapshot,
          values: { ...snapshot.values },
        })),
        target: normalizedInput.target ? { ...normalizedInput.target } : undefined,
        officialValues: { ...normalizedInput.officialValues },
        modelValues: { ...normalizedInput.modelValues },
      };
      const forecast: Forecast = {
        id: forecastId,
        locationId,
        locationName: normalizedInput.locationName,
        validStart: normalizedInput.validStart,
        updatedAt: now,
        currentRevisionId: revision.id,
      };

      await forecastDatabase.locations.put(location);
      await forecastDatabase.forecasts.put(forecast);
      await forecastDatabase.revisions.add(revision);

      return { forecast, revision, location };
    },
  );
}

export async function getForecastSnapshot(
  forecastId: string,
): Promise<ForecastSnapshot | undefined> {
  const forecast = await forecastDatabase.forecasts.get(forecastId);
  if (!forecast) return undefined;
  const revision = await forecastDatabase.revisions.get(forecast.currentRevisionId);
  if (!revision) {
    throw new Error(`Forecast ${forecastId} has no current revision.`);
  }
  return snapshotFor(forecast, revision);
}

export async function getForecastRevisionHistory(forecastId: string): Promise<ForecastRevision[]> {
  const revisions = await forecastDatabase.revisions
    .where('forecastId')
    .equals(forecastId)
    .toArray();
  return revisions.sort((left, right) => left.revisionNumber - right.revisionNumber);
}

export async function listForecastSnapshots(): Promise<ForecastSnapshot[]> {
  const forecasts = await forecastDatabase.forecasts.orderBy('updatedAt').reverse().toArray();
  return Promise.all(
    forecasts.map(async (forecast) => {
      const revision = await forecastDatabase.revisions.get(forecast.currentRevisionId);
      if (!revision) {
        throw new Error(`Forecast ${forecast.id} has no current revision.`);
      }
      return snapshotFor(forecast, revision);
    }),
  );
}

/** Every revision across all forecasts, for the verification job. */
export async function listAllForecastRevisions(): Promise<ForecastRevision[]> {
  return forecastDatabase.revisions.toArray();
}

/** Every forecast, for the verification job. */
export async function listAllForecasts(): Promise<Forecast[]> {
  return forecastDatabase.forecasts.toArray();
}

export async function getObservedDay(
  stationId: string,
  date: string,
): Promise<ObservedDayRecord | undefined> {
  return forecastDatabase.observedDays.get([stationId, date]);
}

export async function putObservedDay(record: ObservedDayRecord): Promise<void> {
  await forecastDatabase.observedDays.put(record);
}

export async function clearObservedDays(): Promise<void> {
  await forecastDatabase.observedDays.clear();
}
