import Dexie, { type Table } from "dexie";

export const forecastFieldKeys = ["high", "low", "pop", "wind", "sky", "hazards"] as const;

export type ForecastFieldKey = (typeof forecastFieldKeys)[number];
export type ForecastValues = Record<ForecastFieldKey, string>;
export type ForecastSourceValues = Partial<Record<ForecastFieldKey, string>>;

export interface ForecastLocation {
  id: string;
  name: string;
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
}

export const emptyForecastValues = (): ForecastValues => ({
  high: "",
  low: "",
  pop: "",
  wind: "",
  sky: "",
  hazards: "",
});

class ForecastWorkspaceDatabase extends Dexie {
  locations!: Table<ForecastLocation, string>;
  forecasts!: Table<Forecast, string>;
  revisions!: Table<ForecastRevision, string>;

  constructor() {
    super("barotropic-forecast-workspace");
    this.version(1).stores({
      locations: "id, name",
      forecasts: "id, locationId, updatedAt",
      revisions: "id, forecastId, [forecastId+revisionNumber], createdAt",
    });
  }
}

export const forecastDatabase = new ForecastWorkspaceDatabase();

export async function saveForecastRevision(input: {
  forecastId?: string;
  locationName: string;
  validStart: string;
  values: ForecastValues;
  reasoning: string;
}): Promise<ForecastSnapshot> {
  const forecastId = input.forecastId ?? crypto.randomUUID();

  return forecastDatabase.transaction(
    "rw",
    forecastDatabase.locations,
    forecastDatabase.forecasts,
    forecastDatabase.revisions,
    async () => {
      const currentForecast = await forecastDatabase.forecasts.get(forecastId);
      const previousRevision = currentForecast
        ? await forecastDatabase.revisions.get(currentForecast.currentRevisionId)
        : undefined;

      if (
        currentForecast &&
        previousRevision &&
        currentForecast.locationName === input.locationName &&
        currentForecast.validStart === input.validStart &&
        previousRevision.reasoning === input.reasoning &&
        forecastFieldKeys.every((key) => previousRevision.values[key] === input.values[key])
      ) {
        return { forecast: currentForecast, revision: previousRevision };
      }

      const now = new Date();
      const locationId = currentForecast?.locationId ?? crypto.randomUUID();
      const location: ForecastLocation = {
        id: locationId,
        name: input.locationName,
        createdAt: now,
      };
      const revision: ForecastRevision = {
        id: crypto.randomUUID(),
        forecastId,
        revisionNumber: previousRevision ? previousRevision.revisionNumber + 1 : 1,
        createdAt: now,
        values: { ...input.values },
        reasoning: input.reasoning,
        officialValues: previousRevision?.officialValues ?? {},
        modelValues: previousRevision?.modelValues ?? {},
      };
      const forecast: Forecast = {
        id: forecastId,
        locationId,
        locationName: input.locationName,
        validStart: input.validStart,
        updatedAt: now,
        currentRevisionId: revision.id,
      };

      if (currentForecast) {
        await forecastDatabase.locations.update(locationId, {
          name: input.locationName,
        });
        await forecastDatabase.forecasts.put(forecast);
      } else {
        await forecastDatabase.locations.add(location);
        await forecastDatabase.forecasts.add(forecast);
      }
      await forecastDatabase.revisions.add(revision);

      return { forecast, revision };
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
  return { forecast, revision };
}

export async function getForecastRevisionHistory(forecastId: string): Promise<ForecastRevision[]> {
  return forecastDatabase.revisions
    .where("forecastId")
    .equals(forecastId)
    .reverse()
    .sortBy("revisionNumber");
}

export async function listForecastSnapshots(): Promise<ForecastSnapshot[]> {
  const forecasts = await forecastDatabase.forecasts.orderBy("updatedAt").reverse().toArray();
  const snapshots = await Promise.all(
    forecasts.map(async (forecast) => {
      const revision = await forecastDatabase.revisions.get(forecast.currentRevisionId);
      if (!revision) {
        throw new Error(`Forecast ${forecast.id} has no current revision.`);
      }
      return { forecast, revision };
    }),
  );
  return snapshots;
}
