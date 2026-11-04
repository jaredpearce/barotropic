import Dexie, { type Table } from 'dexie';

export const forecastFieldKeys = ['high', 'low', 'pop', 'wind', 'sky', 'hazards'] as const;

export type ForecastFieldKey = (typeof forecastFieldKeys)[number];
export type ForecastValues = Record<ForecastFieldKey, string>;
export type ForecastSourceValues = Partial<Record<ForecastFieldKey, string>>;

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
  officialValues: ForecastSourceValues;
  modelValues: ForecastSourceValues;
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
