# Epic 5 — Model Compare & Track Record Implementation Plan

## 1. Goal

Deliver a client-side comparison and verification layer on top of the existing
browser-local forecast workspace:

- A reusable visx `SeriesChart` for temperature, precipitation probability, and
  wind over time.
- A Model Compare screen showing NWS, GFS, HRRR, and ECMWF with run/retrieved
  metadata labeled per series.
- A documented observed high/low rule that handles local calendar days, missing
  observations, and NWS quality-control flags.
- A verification job that runs when Track Record is visited and compares past
  forecast revisions against observed station data.
- A Track Record screen with an error chart, MAE/Brier summaries per variable and
  source, and a list of past forecasts.
- Unit tests for verification math, missing-data handling, and unit conversions.

Everything remains browser-local. No server persistence, accounts, background
jobs, or historical model backfill is in scope.

## 2. Decisions locked in

| Topic                 | Decision                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verification scope    | Score the user's forecast plus every guidance source captured with the revision: NWS, GFS, HRRR, ECMWF.                                                     |
| Observed data         | NWS station observations, aggregated into a local calendar day.                                                                                             |
| Missing/QC policy     | Only NWS `qualityControl === 'V'` readings count. Require 75% hourly coverage; otherwise mark the day unverifiable.                                         |
| Model run time        | Open-Meteo does not expose it. Render `Run: unavailable` and always show the real `retrievedAt`. Never fabricate a cycle.                                   |
| Historical model data | Capture-forward only. Track Record verifies guidance snapshots already stored in IndexedDB revisions.                                                       |
| Compare series        | NWS + GFS + HRRR + ECMWF (European model).                                                                                                                  |
| Units                 | Canonical metric in storage and math. Display defaults to US/imperial, with a persisted metric/imperial preference that a future Settings screen can reuse. |
| Screens               | Standalone `/compare` and `/track-record` routes inside the existing `AppLayout` shell.                                                                     |

## 3. Current baseline

What already exists and should be reused:

- `src/lib/forecast-workspace/db.ts` — Dexie database with append-only revisions.
- `src/lib/forecast-workspace/guidance.ts` — NWS/model-to-display mapping.
- `src/lib/hooks/use-forecast-guidance.ts` — parallel official/model guidance fetch.
- `src/components/ForecastEditor.tsx` — autosave and revision snapshotting.
- `/api/nws/point` — NWS periods, current conditions, station list.
- `/api/nws/stations/[stationId]/observations` — latest 20 observations.
- `/api/open-meteo/forecast` — GFS/HRRR hourly and daily records.
- `NormalizedWeatherRecord` / `NormalizedObservation` schemas.
- `src/lib/weather-normalizers.ts` — NWS unit conversion.
- `src/lib/freshness.ts` — retrieved-time semantics.
- `src/lib/location.ts` — selected location and localStorage key.
- `src/components/AppLayout.tsx` — app shell and selected-location state.
- `fake-indexeddb`, MSW, Vitest unit/integration projects.

Gaps this epic must close:

1. No charting dependency is installed.
2. Open-Meteo records have `runTime: null` and only `retrievedAt`.
3. The observations route cannot fetch a historical day and drops QC/precip data.
4. Revisions store guidance as formatted strings, not numeric values plus
   metadata, so verification math cannot be trusted.
5. Forecast locations do not store the NWS station or IANA time zone.
6. There is no verification module, observed-day cache, or Track Record UI.
7. The NWS point route returns 12-hour periods only, which is too coarse for a
   useful time-series chart.

## 4. KISS / DRY rules for this epic

1. **One chart component.** `SeriesChart` renders both forecast series and error
   series. Variable definitions drive accessors, units, and formatting.
2. **One numeric guidance shape.** Store numeric canonical values plus source
   metadata. Derive display strings with one formatter; do not store formatted
   values and numeric values as parallel sources of truth for new revisions.
3. **One verification module.** All math lives in `src/lib/verification/*`.
   Components only render results.
4. **One observed-day rule.** High, low, wind, and precipitation occurrence all
   come from the same aggregation function and the same QC/coverage policy.
5. **One unit module.** No inline conversion factors or `+32` in components.
6. **One time-zone helper.** Local-day bounds and local-date conversion are
   shared by verification, charts, and metadata labels.
7. **One write path.** Components never touch Dexie tables directly; DB helpers
   own reads and writes.
8. **One observed-day cache.** Do not cache verification results until there is a
   demonstrated performance need; observations are immutable once a past day is
   complete.
9. **Fail per source.** A failed NWS or model request must not blank the other
   series.
10. **No fake metadata.** Missing run time is displayed as unavailable.

## 5. Target data model

### 5.1 Numeric guidance snapshots

Add to `src/lib/forecast-workspace/db.ts`:

```ts
export const guidanceSourceIds = ['NWS', 'GFS', 'HRRR', 'ECMWF'] as const;
export type GuidanceSourceId = (typeof guidanceSourceIds)[number];

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
  /** NWS forecast updateTime. Null when the provider does not expose it. */
  runTime: string | null;
  /** When this app fetched the guidance. */
  retrievedAt: string;
  /** Provider-local offset for model timestamps, when known. */
  utcOffsetSeconds?: number;
  values: GuidanceValues;
}

export interface ForecastTarget {
  latitude?: number;
  longitude?: number;
  /** Nearest NWS observation station, e.g. KDEN. */
  stationId?: string;
  /** IANA time zone, e.g. America/Denver. */
  timeZone?: string;
}
```

Extend `ForecastRevision`:

```ts
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
  officialValues?: ForecastSourceValues;
  modelValues?: ForecastSourceValues;
}
```

Extend `ForecastLocation` with `stationId?: string` and `timeZone?: string` for
current-location display. The revision `target` remains the source of truth for
verification so later location edits cannot rewrite history.

### 5.2 Observed-day cache

```ts
export type ObservedDayStatus = 'verified' | 'insufficient' | 'missing' | 'error';

export interface ObservedDayRecord {
  stationId: string;
  /** YYYY-MM-DD in the target time zone. */
  date: string;
  timeZone: string;
  timeZoneSource: 'provider' | 'fallback';
  /** Day-level outcome; per-variable values below are present only when that
   * variable met its own coverage threshold. */
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
```

Dexie version 3 adds one table and needs no record migration:

```ts
this.version(3).stores({
  locations: 'id, name',
  forecasts: 'id, locationId, updatedAt',
  revisions: 'id, forecastId, &[forecastId+revisionNumber], createdAt',
  observedDays: '&[stationId+date], stationId, date, fetchedAt',
});
```

### 5.3 Backward compatibility

- Old revisions have no `guidance` or `target`. Verification falls back to:
  - the current location/forecast coordinates for the target;
  - `officialValues` / `modelValues` parsed best-effort into numeric snapshots;
  - `revision.createdAt` as the retrieved time and `runTime: null`.
- If parsing fails, the source is marked unverifiable, not zero.
- New revisions always write `guidance` and `target`. Do not rewrite old
  revisions.

### 5.4 Verification result types

```ts
export type VerificationVariable = 'high' | 'low' | 'pop' | 'wind';
export type VerificationSource = 'user' | GuidanceSourceId;

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

export interface VariableSummary {
  source: VerificationSource;
  variable: VerificationVariable;
  sampleCount: number;
  mae: number;
  bias: number;
  /** Pop only. */
  brier?: number;
}
```

## 6. Observed high/low rule

The canonical rule is documented in [`docs/verification-rules.md`](../verification-rules.md)
and implemented in `src/lib/verification/observed.ts`. Summary:

- Local calendar day = `[00:00, 24:00)` in the forecast location's IANA time
  zone, with correct 23/24/25-hour DST handling.
- Only observations whose quantity-level `qualityControl === 'V'` are eligible.
  `C`, `S`, `Z`, missing, and unknown flags are excluded.
- Coverage is counted per variable as distinct local hours with an eligible
  reading. Required coverage is `ceil(0.75 * dayLengthHours)` (18 hours on a
  normal day).
- High = max eligible temperature; low = min eligible temperature; wind = mean
  eligible sustained wind; precipitation occurrence = any eligible accumulation
  greater than zero.
- No interpolation, nearby-station substitution, or model backfill.
- A day is verifiable only after `localDayEnd + 2 hours`.
- A revision is only scored if it was created before the local day began
  (`revision.createdAt < localDayStart`). Revisions created during the day are
  `not-ex-ante` and excluded.

The rule also defines the observed probability used for PoP verification:
`100%` if precipitation occurred, otherwise `0%`. PoP is scored with a Brier
score; MAE in percentage points is shown for consistency with the other
variables.

## 7. Work breakdown

### 7.1 Shared foundations: dependencies, units, time zones

**Files:** `package.json`, new `src/lib/units.ts`, new
`src/lib/units.unit.test.ts`, new `src/lib/time.ts`, new
`src/lib/time.unit.test.ts`, new `src/lib/hooks/use-unit-system.ts`, new
`src/lib/hooks/use-selected-location.ts`

1. Add the minimal visx set with Bun:
   `@visx/axis`, `@visx/curve`, `@visx/grid`, `@visx/group`,
   `@visx/responsive`, `@visx/scale`, `@visx/shape`.
   visx 4 supports React 19 peer dependencies.
2. Add pure unit helpers in `src/lib/units.ts`:
   - `celsiusToFahrenheit`, `fahrenheitToCelsius`
   - `mpsToMph`, `mphToMps`, `kmhToMps`, `knotsToMps`
   - `mmToInches`, `inchesToMm`
   - `formatTemperature`, `formatTemperatureDelta`, `formatWindSpeed`,
     `formatPrecipProbability`, `formatPercent`
   - `parseTemperatureText`, `parsePercentText`, `parseWindSpeedText`
   - `UnitSystem = 'imperial' | 'metric'`
3. Keep all stored and computed values canonical: Celsius, m/s, mm. Temperature
   **errors** are deltas, so imperial conversion is `c * 9/5` with no `+32`.
   This is the most common unit bug in verification code; unit-test it
   explicitly.
4. `parseWindSpeedText` accepts `SW 8 m/s`, `8 mph`, `15 kt`, `20 km/h`, and
   unitless values. Unitless wind defaults to m/s, matching the current editor
   placeholder and metric storage. Invalid strings return `undefined`, never
   zero.
5. `parseTemperatureText` accepts `25`, `25°C`, `77°F`; unitless defaults to
   Celsius. `parsePercentText` accepts `40` and `40%`, clamps nothing, and
   returns `undefined` outside `0–100`.
6. Add `src/lib/time.ts`:
   - `localDateOf(instant, timeZone): string`
   - `localDayBounds(date, timeZone): { startMs, endMs, hours }`
   - `zonedDateTimeToUtc(localDateTime, timeZone): number`
   - `formatDateTime(instant, timeZone, options?)`
   - `isValidTimeZone(timeZone)`
     Implement offset lookup with `Intl.DateTimeFormat` and iterate once for DST
     boundaries. Do not add a date library.
7. Add `useUnitSystem()`: reads `barotropic.unit-system` from localStorage,
   defaults to `imperial`, persists changes, and subscribes to the same
   cross-tab/storage event pattern as the location hook. A future Settings
   screen reuses this hook.
8. Extract `useSelectedLocation()` from `AppLayout`:
   - initializes from `LOCATION_STORAGE_KEY`, validates the shape, falls back to
     `DEFAULT_LOCATION`;
   - writes through a `setLocation` function;
   - dispatches and listens for a `barotropic.location-changed` event so the
     shell and new screens stay in sync.
     Refactor `AppLayout` to use the hook instead of owning location state. Keep
     the existing geolocation/search behavior.

**Acceptance:** unit conversions round-trip; delta conversions are correct;
time-zone helpers pass normal and DST cases; existing AppLayout tests still pass.

### 7.2 Data capture: NWS and Open-Meteo routes

**Files:** `src/lib/schemas/nws.ts`, `src/lib/schemas/normalized.ts`,
`src/lib/nws/normalize-observation.ts`,
`src/app/api/nws/stations/[stationId]/observations/route.ts`,
`src/app/api/nws/point/route.ts`, `src/lib/open-meteo/utils.ts`,
`src/app/api/open-meteo/forecast/route.ts`, related unit tests.

1. **NWS observations**
   - Extend `StationObservationsSchema` to accept optional `start`/`end` query
     parameters and a `limit` up to 500. Default behavior remains the latest 20.
   - Validate `start`/`end` as ISO timestamps, require `end > start`, and cap the
     range at 31 days. Return `400` with a useful message otherwise.
   - Share one `ObservationPropertiesSchema` between latest and list responses so
     `normalizeNwsObservation` can be reused by both route handlers.
   - Add precipitation and QC fields to `NormalizedObservation`:
     `temperatureQualityControl`, `windSpeedQualityControl`,
     `precipitationLastHourMm`, `precipitationLast3HoursMm`,
     `precipitationLast6HoursMm`, `precipitationQualityControl`.
   - Add a `qualityControl` helper in `weather-normalizers.ts` (or the new
     observation normalizer) that reads the per-quantity flag without converting
     it.
   - Add `normalizeNwsPrecipitation` (to millimeters) alongside the existing
     temperature/wind/pressure normalizers, and use it for all three
     accumulation fields.
   - Reuse `normalizeNwsObservation` in the list route instead of duplicating the
     mapping.

2. **NWS point**
   - Parse `properties.timeZone` and `properties.forecastHourly` in
     `PointSchema`.
   - Fetch the 12-hour `forecast`, the hourly `forecastHourly`, and the station
     list in parallel. A failure of one should not discard the others; return
     `hourlyError` / `forecastError` metadata and an empty array for the failed
     part.
   - Return top-level `timeZone`, `stationId`, `forecastIssuedAt`, and
     `retrievedAt`.
   - Normalize hourly periods with the existing NWS period mapping. Compare uses
     `hourly`; the editor continues to use `forecast` periods for daily
     high/low.

3. **Open-Meteo**
   - Add `ecmwf` to `OPEN_METEO_MODELS` with
     `{ name: 'ECMWF', id: 'ecmwf_ifs025' }` and aliases `ecmwf`,
     `ecmwf_ifs025`, `ifs`.
   - Keep the default model list as `['gfs', 'hrrr']` so existing behavior does
     not change; compare and guidance explicitly request
     `models=gfs,hrrr,ecmwf`.
   - Add an optional `timezone=auto|UTC` query parameter. Default `auto` for
     backward compatibility; compare requests `UTC` so timestamps are
     unambiguous. Pass it through `buildOpenMeteoForecastQuery`.
   - Add top-level per-model `retrievedAt` and `runTime: null` metadata. Keep
     per-record `retrievedAt`.
   - Update the invalid-model error message and the route unit tests.

**Acceptance:** observations can be fetched for a single historical day with QC
and precipitation; `/api/nws/point` returns hourly records, time zone, and
station metadata; Open-Meteo returns GFS, HRRR, and ECMWF in UTC with honest
`runTime: null`.

### 7.3 Guidance snapshots and revision persistence

**Files:** `src/lib/forecast-workspace/guidance.ts`,
`src/lib/hooks/use-forecast-guidance.ts`, `src/components/ForecastEditor.tsx`,
`src/lib/forecast-workspace/db.ts`, `db.unit.test.ts`, `guidance.unit.test.ts`,
`ForecastEditor.integration.test.tsx`

1. Refactor `guidance.ts` around one numeric selection path:
   - `selectNwsGuidance(periods, validStart): GuidanceValues & { runTime, retrievedAt }`
   - `selectModelGuidance(daily, hourly, validStart): GuidanceValues & { runTime, retrievedAt, utcOffsetSeconds }`
   - `formatGuidanceValues(values): ForecastSourceValues` as the single display
     formatter.
   - Keep `sourceValuesFromNws` / `sourceValuesFromModel` as thin wrappers or
     update callers directly; do not duplicate the selection logic.
2. `useForecastGuidance` requests NWS plus all three Open-Meteo models in one
   call. It returns:
   - display `officialValues` (NWS) and `modelValues` (GFS) for the existing
     editor columns;
   - `guidance: GuidanceSnapshot[]` containing every successful source;
   - `target` with coordinates, `stationId`, and `timeZone`.
     If one model fails, the others still populate.
3. `ForecastEditor` passes `guidance` and `target` into
   `saveForecastRevision`. The editor UI does not need new columns; it continues
   to show official and GFS values while snapshotting all four sources.
4. `saveForecastRevision`:
   - clones `guidance` and `target` into the immutable revision;
   - updates `ForecastLocation.stationId` / `timeZone` for current display when
     provided;
   - treats guidance refresh alone as a no-op, preserving Epic 4 behavior;
   - never mutates existing revisions.
5. Add DB helpers:
   - `listAllForecastRevisions(): Promise<ForecastRevision[]>`
   - `getObservedDay(stationId, date)`
   - `putObservedDay(record)`
   - `clearObservedDays()` for tests.
6. Dexie version 3 adds `observedDays`; no migration of existing records is
   required. Update test cleanup to clear the new table.

**Acceptance:** a new revision stores numeric NWS/GFS/HRRR/ECMWF snapshots and an
immutable target; old revisions still load; guidance refresh alone does not
create a revision; all existing editor tests pass with the richer snapshot.

### 7.4 Observed aggregation and verification job

**Files:** new `src/lib/verification/observed.ts`,
`src/lib/verification/verify.ts`, `src/lib/verification/summary.ts`,
`src/lib/verification/job.ts`, new `src/lib/hooks/use-track-record.ts`, unit
tests.

1. `observed.ts` implements the canonical rule in
   [`docs/verification-rules.md`](../verification-rules.md):
   - local day bounds;
   - per-variable QC filtering (`V` only);
   - distinct-hour coverage;
   - high/low/wind/precip aggregation;
   - dedupe by timestamp;
   - statuses `verified`, `insufficient`, `missing`, `error`.
2. `verify.ts`:
   - `forecastValuesForRevision(revision, source)` returns numeric canonical
     values. Use `guidance` when present; otherwise parse legacy display strings
     best-effort.
   - `parseUserValues(values)` parses the user's high/low/pop/wind strings with
     the shared unit parsers.
   - `verifyRevision({ forecast, revision, observedDay, now })` returns
     `VerificationSample[]`.
   - Enforce ex-ante eligibility: `revision.createdAt < localDayStart`.
   - Skip missing forecast/observed values; never coerce them to zero.
   - For PoP, set `observedValue` to 0 or 100, compute percentage-point error,
     and set `brierComponent = (forecast/100 - observed/100)^2`.
3. `summary.ts`:
   - `summarizeSamples(samples)` groups by source + variable and returns
     `sampleCount`, `mae`, `bias`, and `brier` for PoP.
   - MAE uses `absError`; bias uses signed `error`; both in canonical units.
   - Empty groups return `sampleCount: 0` and `undefined` metrics, not `NaN`.
4. `job.ts` orchestrates the client-side run:
   - load all revisions;
   - build candidates with target/time zone/valid date/lead hours;
   - exclude `pending` and `not-ex-ante` revisions;
   - group by `stationId + date`;
   - read `observedDays` cache; fetch missing days from
     `/api/nws/stations/{stationId}/observations?start&end&limit=500`;
   - aggregate, cache, verify, and summarize;
   - limit observation fetches to 3 concurrent requests;
   - continue after individual failures and report counts.
5. `use-track-record.ts` runs the job on mount and on refresh, exposes progress
   (`total`, `completed`), results, warnings, and an abortable reload.
6. Cache policy:
   - Past verified/insufficient days are immutable; keep them.
   - `missing`/`error` days are retried after 6 hours.
   - Do not cache verification samples; recompute in memory so rule changes take
     effect immediately.

**Acceptance:** the job scores user/NWS/GFS/HRRR/ECMWF samples for eligible past
days, excludes insufficient and late revisions, caches observed days, and never
throws because one station or day failed.

### 7.5 `SeriesChart` component (visx)

**Files:** new `src/components/SeriesChart.tsx`, new
`src/components/SeriesLegend.tsx`, new `src/lib/charts/variables.ts`, new
`src/lib/charts/series.ts`, new `src/lib/charts/theme.ts`, unit and integration
tests.

1. Define one chart data shape:

```ts
export interface ChartPoint {
  timestamp: number; // epoch ms
  value: number | null;
}

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
  /** Compare screen: provider initialization/issue time. */
  runTime?: string | null;
  /** Compare screen: when this app fetched the series. */
  retrievedAt?: string;
  /** Error chart: e.g. "12 samples" or "latest revision only". */
  description?: string;
  note?: string;
}
```

2. `SeriesChart` props:

```ts
interface SeriesChartProps {
  series: ChartSeries[];
  height?: number;
  /** Pass in tests to avoid ResizeObserver. */
  width?: number;
  unitLabel: string;
  formatValue: (value: number) => string;
  ariaLabel: string;
  emptyMessage?: string;
  yDomain?: [number, number];
  showZeroLine?: boolean;
  /** Compare passes the location zone; Track Record may omit it. */
  timeZone?: string;
}
```

3. Implementation:
   - `ParentSize` when `width` is omitted; fixed `width` in tests.
   - `scaleTime` x-domain from all points with one-hour padding.
   - `scaleLinear` y-domain with padding; fixed `[0, 100]` for precipitation
     probability.
   - `AxisBottom` with `Intl.DateTimeFormat` day/hour ticks; `AxisLeft` with the
     supplied formatter.
   - `GridRows` optional; zero baseline when `showZeroLine`.
   - One `LinePath` per contiguous non-null segment, `curveMonotoneX`, stroke
     from the series color. Break lines at nulls; do not connect gaps.
   - `SeriesLegend` is HTML, not SVG, so run/retrieved metadata is accessible and
     testable. It renders `runTime` / `retrievedAt` when present, otherwise
     `description`.
   - `role="img"` + `aria-label` on the SVG; a `<details>` data table provides a
     non-visual equivalent.
   - Empty state when no series has points.
4. `charts/variables.ts` owns the three variable definitions:
   - temperature: `temperatureC`, unit `°C`, display `°F` when imperial;
   - precipitation: `precipitationProbabilityPercent`, unit `%`, fixed 0–100;
   - wind: `windSpeedMps`, unit `m/s`, display `mph` when imperial.
5. `charts/series.ts` converts normalized records to `ChartSeries`:
   - parse NWS timestamps with offsets directly;
   - parse Open-Meteo UTC timestamps by appending `Z` (compare requests
     `timezone=UTC`);
   - drop records with non-finite timestamps;
   - preserve null values as gaps.
6. `charts/theme.ts` maps sources to token-based colors:
   NWS amber, GFS emerald, HRRR rose, ECMWF violet.

**Acceptance:** the chart renders multiple series, axes, units, legend metadata,
null gaps, and an accessible data table; it works without ResizeObserver when a
width is supplied.

### 7.6 Model Compare screen

**Files:** new `src/app/compare/page.tsx`, `layout.tsx`, new
`src/components/ModelCompare.tsx`, new
`src/lib/hooks/use-model-comparison.ts`, integration test.

1. Route `/compare` renders `<AppLayout><ModelCompare /></AppLayout>` with page
   metadata.
2. Use `useSelectedLocation()` so the screen follows the shell's location.
3. `useModelComparison` fetches in parallel:
   - `/api/nws/point?lat&lon` for NWS hourly + periods, `timeZone`, `stationId`,
     `forecastIssuedAt`, `retrievedAt`;
   - `/api/open-meteo/forecast?lat&lon&models=gfs,hrrr,ecmwf&timezone=UTC`.
4. Build four `ChartSeries`:
   - NWS: hourly records, `runTime = forecastIssuedAt`;
   - GFS/HRRR/ECMWF: hourly records, `runTime = null`, real `retrievedAt`.
     Fall back to NWS periods if hourly is unavailable.
5. UI:
   - Header: location, refresh, unit toggle, last retrieval time.
   - Variable tabs: Temperature, Precipitation, Wind.
   - `SeriesChart` + `SeriesLegend`.
   - Each legend item shows source, color, `Run: <time>` or `Run: unavailable`,
     and `Retrieved: <time>`.
   - Per-source error state; a failed source is omitted from the chart and shown
     as an unavailable legend/card.
   - Loading and empty states.
6. Do not persist compare requests or create revisions from this screen.

**Acceptance:** with all sources available the screen shows four series with
run/retrieved metadata; switching variables updates the chart; one source failure
still renders the others.

### 7.7 Track Record screen

**Files:** new `src/app/track-record/page.tsx`, `layout.tsx`, new
`src/components/TrackRecord.tsx`, new `src/components/TrackRecordTable.tsx`,
integration test.

1. Route `/track-record` renders `<AppLayout><TrackRecord /></AppLayout>` with
   page metadata.
2. Use `useTrackRecord()` to run the verification job on visit.
3. Summary:
   - Overall sample counts and verified/unverifiable/pending counts.
   - MAE table: rows High, Low, Wind, PoP MAE (percentage points), PoP Brier;
     columns You, NWS, GFS, HRRR, ECMWF.
   - Show sample count in each cell or as a secondary line; do not imply
     precision from tiny samples.
4. Error chart:
   - Reuse `SeriesChart` with one series per source and one point per valid date.
     If a date has multiple eligible revisions, plot the mean signed error for
     that date and show the revision count in the series description.
   - Variable selector; signed error (`forecast - observed`) with a zero baseline.
   - Temperature/wind errors use delta formatting; PoP uses percentage points.
   - Empty state when no verified samples.
5. Past forecasts list:
   - One expandable row/card per forecast revision.
   - Summary: valid date, location, revision number, lead time, status.
   - Details: source-by-source forecast, observed, error for high/low/PoP/wind.
   - Sort newest valid date first; show `not-ex-ante`, `pending`,
     `insufficient-coverage`, and `missing` explicitly.
6. Accessibility: captions on tables, `<time>` elements, status text in addition
   to color, keyboard-operable expand/collapse.
7. No new persistence; Track Record is a read-only view over IndexedDB plus the
   observed-day cache.

**Acceptance:** seeded revisions and observations produce the correct MAE/Brier
table, error chart, and past-forecast list; insufficient/pending data is visible
and excluded from metrics.

### 7.8 Navigation, documentation, polish

**Files:** `src/components/AppLayout.tsx`, `src/styles/globals.css` or
`tokens.css`, `README.md`, `src/components/index.ts`.

1. Add `Compare` and `Track record` links to the app header, plus a link back to
   Forecasts. Keep the existing header actions and responsive behavior.
2. Add minimal chart/table styles consistent with the existing sky/slate theme;
   use existing tokens where possible.
3. Update `README.md`:
   - new routes and what they do;
   - ECMWF model id and the fact that Open-Meteo run time is unavailable;
   - link to `docs/verification-rules.md`;
   - unit preference behavior.
4. Export new reusable components from `src/components/index.ts` only if the
   existing barrel is used by consumers; avoid unused exports.

**Acceptance:** both screens are reachable from the shell, documented, and usable
on mobile and desktop.

## 8. Testing plan

### Unit tests (node)

1. `units.unit.test.ts`
   - Celsius/Fahrenheit round-trip.
   - Temperature **delta** conversion (`9/5`, no `+32`).
   - m/s ↔ mph, km/h, knots.
   - mm ↔ inches.
   - `parseWindSpeedText` with direction, explicit units, unitless default,
     invalid input.
   - `parseTemperatureText`, `parsePercentText` edge cases.
2. `time.unit.test.ts`
   - Local day bounds in `America/Denver`, `America/New_York`, and `UTC`.
   - Spring-forward (23h) and fall-back (25h) days.
   - `zonedDateTimeToUtc` across DST.
   - Invalid time zone handling.
3. `observed.unit.test.ts`
   - Complete day produces correct high/low/mean wind/precip occurrence.
   - QC flags `C`, `S`, `Z`, missing, and unknown are excluded.
   - Fewer than 75% hours → insufficient.
   - DST coverage thresholds.
   - Duplicate timestamps deduped.
   - Empty/missing station.
   - Precipitation accumulation variants (1h/3h/6h).
4. `verify.unit.test.ts`
   - MAE and bias math for high/low/wind.
   - Brier and percentage-point error for PoP.
   - Missing forecast or observed values excluded, not zero.
   - Ex-ante eligibility.
   - Structured guidance snapshots and legacy display-string fallback.
   - Unit conversions do not change canonical math.
5. `summary.unit.test.ts`
   - Grouping by source/variable.
   - Empty groups return zero samples and no `NaN`.
6. `charts/series.unit.test.ts`
   - NWS offset timestamps and model UTC timestamps parse correctly.
   - Null values preserved as gaps.
   - Variable accessors and unit formatting.
7. `db.unit.test.ts` additions
   - Guidance/target persisted and cloned.
   - Old revisions without guidance still load.
   - Observed-day cache read/write.
   - No-op save with changed guidance does not append a revision.

### API tests

1. Observations route: default latest-20 behavior, `start`/`end` validation,
   range cap, QC/precip mapping, upstream error.
2. NWS point route: hourly + periods, time zone, station metadata, partial
   failure.
3. Open-Meteo route: ECMWF alias/id, `timezone=UTC`, `runTime: null`, existing
   GFS/HRRR behavior.

### Integration tests (happy-dom)

1. `SeriesChart.integration.test.tsx`
   - Four series render with legend labels and run/retrieved metadata.
   - Variable unit formatting (imperial and metric).
   - Null gaps do not crash.
   - Empty state and accessible data table.
2. `ModelCompare.integration.test.tsx`
   - MSW returns NWS + GFS + HRRR + ECMWF.
   - Four legend items, variable switching, refresh.
   - One source 502 still renders the others.
3. `TrackRecord.integration.test.tsx`
   - Seed IndexedDB with revisions and MSW observations.
   - MAE/Brier table values, error chart, past-forecast list.
   - Insufficient coverage and pending states.
   - Empty state and retry.
4. `ForecastEditor.integration.test.tsx`
   - Guidance snapshots include all successful models and target metadata.
   - Existing autosave/revision behavior remains unchanged.

### Test setup

- Keep `fake-indexeddb/auto`.
- Clear `observedDays` along with revisions/forecasts/locations in `beforeEach`.
- Add a minimal `ResizeObserver` polyfill only if a component uses `ParentSize`
  without a fixed width; prefer passing `width` in tests.
- Extend MSW handlers with NWS point hourly, observations, and Open-Meteo
  multi-model fixtures.

## 9. Suggested implementation sequence

1. **Foundations:** add visx, `units.ts`, `time.ts`, unit/system and
   selected-location hooks; tests.
2. **Data capture:** extend NWS observation/point schemas and routes; add ECMWF,
   UTC, and hourly data to Open-Meteo; API tests.
3. **Snapshots:** refactor guidance selection, persist `guidance`/`target` in
   revisions, Dexie v3 `observedDays`; DB and guidance tests.
4. **Verification core:** implement observed aggregation, verify, summary, and
   job; unit tests.
5. **Chart:** implement `SeriesChart`/`SeriesLegend`, chart data shaping, and
   integration tests.
6. **Compare screen:** hook, page, variable switching, per-source failures, tests.
7. **Track Record screen:** hook, MAE/Brier table, error chart, past forecasts,
   tests.
8. **Polish:** navigation, responsive styles, README, full quality gates.

Each step should remain shippable. Do not change the revision schema without the
DB tests, and do not build UI on verification math that is not unit-tested.

## 10. Out of scope / deliberately deferred

- Server-side persistence, accounts, sharing, or multi-device sync.
- Background verification jobs or cron.
- Backfilling historical model runs via Open-Meteo's previous-runs API.
- NWS daily climate products (CLI/DSM) as an observation source.
- Verifying sky condition, hazards, or wind direction.
- Full Settings UI; Epic 5 only ships the reusable unit preference and local
  toggle.
- Changing the forecast editor's metric input labels; the editor keeps its
  current behavior until Settings ships.
- Model-run selection, ensemble members, or custom model catalogs beyond
  GFS/HRRR/ECMWF.
- Chart export, annotations, or brushing/zooming.

## 11. Risks and open questions

1. **NWS observation latency and gaps.** Stations report irregularly and can miss
   hours. The 75% coverage rule plus the 2-hour verification lag is the
   mitigation; insufficient days are visible, not silently scored.
2. **NWS QC semantics.** Only `V` is accepted. If NWS frequently omits QC flags
   for a station, coverage may be lower than expected. The rule doc makes this
   explicit and the aggregation tests pin the behavior.
3. **Station changes.** A forecast is tied to the station captured in
   `revision.target`. If that station is retired, the day becomes missing; do not
   silently switch stations.
4. **Time zones.** IANA conversion without a date library is subtle, especially
   around DST. Keep the helper small and test 23/25-hour days.
5. **Open-Meteo run time.** The standard endpoint does not expose model
   initialization. Showing `Run: unavailable` is intentional; estimated cycles
   are out of scope to avoid misleading users.
6. **ECMWF coverage.** `ecmwf_ifs025` may not cover every location or may fail
   independently. The compare screen must degrade per source.
7. **PoP is not an observation.** Brier score plus percentage-point MAE is the
   correct treatment; label it clearly so it is not confused with temperature
   MAE.
8. **Free-text wind input.** Unitless wind defaults to m/s. If the editor later
   switches to imperial input, the parser default must change with it or the
   input must require a unit. Documented and unit-tested.
9. **Legacy revisions.** Old revisions have only formatted strings. Best-effort
   parsing may skip some values; they are excluded rather than guessed.
10. **visx + React 19.** visx 4 declares React 19 peer support; verify the
    install and run the chart integration test early.
11. **NWS rate limits.** Verification fetches one station-day at a time with a
    concurrency limit of 3 and caches completed days. If a user has many past
    forecasts, the first Track Record visit may take a while; show progress.
12. **Chart accessibility.** SVG charts are not inherently accessible. The hidden
    data table and text legend are part of the acceptance criteria, not optional
    polish.

## 12. Verification and definition of done

Run from the repository root:

```bash
bun run test
bun run test:unit
bun run test:integration
bun run type-check
bun run lint
bun run format:check
```

Definition of done:

- `SeriesChart` renders temperature, precipitation probability, and wind series
  with axes, units, null gaps, legend metadata, and an accessible data table.
- `/compare` shows NWS + GFS + HRRR + ECMWF with run/retrieved labels; a failed
  source does not blank the others.
- `docs/verification-rules.md` is the canonical observed high/low rule, including
  local-day, QC, missing-data, DST, and verification-lag behavior.
- The verification job runs on Track Record visits, scores eligible past
  revisions for all captured sources, caches observed days, and handles failures.
- `/track-record` shows an error chart, MAE/Brier table per variable and source,
  and a list of past forecasts with explicit pending/insufficient/missing states.
- Unit tests cover verification math, missing/QC data, time zones, and unit
  conversions.
- No component writes to Dexie directly; no revision is mutated; no fake run
  time is displayed.
- All quality gates pass.
