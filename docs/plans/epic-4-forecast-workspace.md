# Epic 4 — Forecast Workspace Implementation Plan

## 1. Goal

Deliver the forecast workspace as a browser-local, evidence-oriented editor:

- Structured forecast fields: high, low, PoP, wind, sky, hazards.
- Official and model guidance shown beside each field.
- Free-text reasoning stored with the forecast.
- Autosave to IndexedDB.
- Append-only revisions: every edit creates a new revision, and saved revisions are never mutated.

The workspace is client-only. No server sync, collaboration, rich-text editing, or revision restore is in scope.

## 2. Current baseline

A first pass already exists and passes `bun run test`, `bun run type-check`, and `bun run lint`:

- `src/lib/forecast-workspace/db.ts` — Dexie database and save/read helpers.
- `src/components/ForecastField.tsx` — field row with user, official, and model values.
- `src/components/ForecastEditor.tsx` — editor, debounced autosave, revision history.
- `src/app/forecasts/page.tsx` — forecast list.
- `src/app/forecasts/new/page.tsx` and `src/app/forecasts/[forecastId]/page.tsx` — new/edit routes.
- `src/components/ForecastEditor.integration.test.tsx` — render, autosave, new-revision test.
- `dexie` and `fake-indexeddb` are already dependencies; test setup enables fake IndexedDB.

This plan therefore hardens and completes the existing implementation rather than replacing it.

## 3. KISS / DRY rules for this epic

1. One shared field configuration drives labels, input types, constraints, validation, and source formatting.
2. One `ForecastDraft` type is shared by the editor and database boundary; do not duplicate payload interfaces.
3. One write path: the editor calls `saveForecastRevision`; components never touch Dexie tables directly.
4. Revisions are whole immutable snapshots, not per-field diffs.
5. Reuse existing data plumbing:
   - `/api/nws/point` for official NWS guidance.
   - `/api/open-meteo/forecast` for model guidance.
   - existing `NormalizedWeatherRecord` types and normalization helpers.
   - existing `/api/geocode` if location search is needed.
6. Store form values as strings (blank/in-progress input is valid), validate at the save boundary.
7. No state-management library, no generic repository abstraction, no derived “revision event” tables.

## 4. Target data model

Keep the existing three-table shape and align it to the spec:

```ts
export const forecastFieldKeys = ['high', 'low', 'pop', 'wind', 'sky', 'hazards'] as const;
export type ForecastFieldKey = (typeof forecastFieldKeys)[number];
export type ForecastValues = Record<ForecastFieldKey, string>;
export type ForecastSourceValues = Partial<Record<ForecastFieldKey, string>>;

export interface ForecastDraft {
  locationName: string;
  latitude?: number; // needed to fetch guidance; optional until a location is selected
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
  locationName: string; // denormalized for the list view
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
```

Dexie version 2:

```ts
this.version(2).stores({
  locations: 'id, name',
  forecasts: 'id, locationId, updatedAt',
  revisions: 'id, forecastId, &[forecastId+revisionNumber], createdAt',
});
```

Notes:

- `&[forecastId+revisionNumber]` makes duplicate revision numbers impossible.
- The added `latitude`/`longitude` fields need no index or record migration.
- Verify existing databases before shipping the unique index; there should be no duplicate revision pairs because of the current serialized save path.
- If the spec has different field names or a valid-end time, reconcile it here before touching UI code.

## 5. Work breakdown

### 5.1 Dexie schema and persistence helpers

**Files:** `src/lib/forecast-workspace/db.ts`, new `src/lib/forecast-workspace/db.unit.test.ts`

1. Add the `ForecastDraft` type above and derive save input from it, removing duplicate inline payload shapes.
2. Add optional latitude/longitude to location and forecast records.
3. Add the unique compound revision index (schema version 2).
4. Keep `saveForecastRevision` as the only writer:
   - Load current forecast and current revision in one `rw` transaction.
   - Return the existing snapshot when the editable payload is unchanged.
   - Compute the next revision number from the highest existing revision for that forecast, not only the current pointer.
   - `revisions.add(...)` only. Never call `put`, `update`, or `delete` on revisions.
   - Clone `values`, `officialValues`, and `modelValues` into the new revision.
   - Update the forecast’s `currentRevisionId` and `updatedAt` in the same transaction.
   - Upsert/update the location name and coordinates in the same transaction.
5. Snapshot current guidance into the new revision:
   - Extend save input with `officialValues` and `modelValues`.
   - Do not carry stale guidance forward from the previous revision when the current source values are unavailable; store `{}` instead.
6. Read helpers:
   - `getForecastSnapshot(id)` returns the current forecast + revision.
   - `getForecastRevisionHistory(id)` orders by `revisionNumber` ascending.
   - `listForecastSnapshots()` stays as the list-view query.
7. Add runtime validation at the boundary for required values and PoP range; keep it simple and reuse the field config.

**Acceptance:** create, reload, edit, and list all work against IndexedDB; no code path mutates a stored revision.

### 5.2 `ForecastField` component

**Files:** `src/components/ForecastField.tsx`, new `src/lib/forecast-workspace/fields.ts`

1. Create one field-definition map used by both the field component and validation:

```ts
interface ForecastFieldDefinition {
  key: ForecastFieldKey;
  label: string;
  kind: 'number' | 'text' | 'select' | 'textarea';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: readonly string[];
  placeholder?: string;
}
```

2. Recommended field types:
   - `high`, `low`: number inputs, step per spec (default `1`).
   - `pop`: number input constrained to `0–100`.
   - `wind`: text input (e.g. `SW 15 mph`) unless the spec requires separate speed/direction fields.
   - `sky`: select using the spec’s sky categories (derive from the existing condition vocabulary where possible).
   - `hazards`: textarea or comma-separated text.
3. Render three read-only columns: user value, official value, model value. Use a responsive stacked layout on small screens and a row layout on larger screens.
4. Keep the component presentational: it receives a definition, values, and `onChange`; it does not fetch or persist.
5. Use stable accessible names for tests (`High`, `High official`, `High model`) and associate the description/unit with the input via `aria-describedby`.
6. Show `Unavailable` when a source has no value.

**Acceptance:** every field renders the correct input control and constraints; official/model values appear beside the corresponding user field; changing a field calls `onChange` once.

### 5.3 Editor page with official and model guidance

**Files:** `src/components/ForecastEditor.tsx`, new `src/lib/forecast-workspace/guidance.ts`, optional `src/lib/hooks/use-forecast-guidance.ts`

1. Keep the existing new/edit routes and editor composition.
2. Add a location selection path that yields coordinates:
   - Reuse the existing `/api/geocode` endpoint and location helpers.
   - Persist the selected name plus latitude/longitude in the draft/location record.
   - If only free text is entered, allow saving but show guidance as unavailable.
3. Add guidance loading with the existing APIs:
   - Official: `/api/nws/point?lat&lon`, using the returned normalized NWS periods.
   - Model: `/api/open-meteo/forecast?lat&lon&models=gfs`, using daily max/min plus the hourly record nearest `validStart`.
4. Put all mapping in pure functions in `guidance.ts`:
   - `guidanceFromNws(records, validStart): ForecastSourceValues`
   - `guidanceFromModel(records, validStart): ForecastSourceValues`
   - One shared formatter for temperature, PoP, wind, sky, and missing values.
   - Map official `condition` directly; map model weather codes through the existing weather-code helper.
   - Hazards are `Unavailable` unless an existing alerts source is deliberately included later.
5. Fetch both sources in parallel with abort handling. Fail independently: one unavailable source must not blank the other.
6. Display source label and load/error state (`Official · NWS`, `Model · GFS`); render values in `ForecastField`.
7. Snapshot the currently displayed guidance into the next revision when the user saves. Guidance refreshes alone must not create revisions.

**Acceptance:** with coordinates, official and model values populate beside the matching fields; without coordinates or on API failure, the editor still saves and shows `Unavailable`.

### 5.4 Local persistence and autosave

**Files:** `src/components/ForecastEditor.tsx`, optional new `src/lib/hooks/use-forecast-autosave.ts`

1. Keep the existing debounced signature comparison to suppress no-op writes.
2. Serialize saves through a promise queue so rapid edits cannot create duplicate forecasts or revision numbers.
3. Gate the first save on a minimal valid draft (at least a non-empty location; add valid time if the spec requires it). Show a clear status instead of creating blank forecast records.
4. Flush pending edits when leaving the page:
   - Clear the debounce timer on cleanup.
   - Call `saveNow()` best-effort on unmount and on `pagehide`/`visibilitychange` when the document becomes hidden.
   - Read the latest draft from a ref so the flush does not save a stale snapshot.
5. Status states: `Unsaved changes`, `Saving…`, `Saved · revision N`, `Save failed`. Keep the polite live region and add a retry action on failure.
6. Preserve the draft in UI state on save failure; never clear the editor.
7. Keep the injectable debounce delay (or exported constant) so tests can run deterministically.

**Acceptance:** edits persist after reload; a quick edit followed by navigation is not silently lost; failures are visible and retryable.

### 5.5 Append-only revision creation

**Files:** `src/lib/forecast-workspace/db.ts`, `src/lib/forecast-workspace/db.unit.test.ts`

1. Enforce append-only in one place, `saveForecastRevision`:
   - Only `add` revisions.
   - Never expose a revision update helper.
   - Clone all mutable payload pieces before insertion.
2. Make revision numbering deterministic and unique:
   - Query the highest revision number for the forecast.
   - Insert `highest + 1`.
   - Rely on the unique compound index as the final guard.
3. Treat the current revision pointer on `Forecast` as a pointer only; history is the source of truth.
4. Ensure a no-op save returns the current revision and does not append.
5. Do not implement restore/edit-old-revision in this epic. If added later, it must append a new revision using an old snapshot.

**Acceptance:** editing any field or reasoning appends exactly one revision; the previous revision’s values and reasoning remain byte-for-byte unchanged; reloading shows the latest revision.

### 5.6 Free-text reasoning

1. Keep reasoning as a plain string on each revision, alongside structured values.
2. Include it in the autosave signature and no-op comparison.
3. Render one accessible textarea with a clear label and helper text.
4. Preserve reasoning in revision history and in the edit-existing flow.
5. Do not split reasoning into a separate table; a revision is the unit of record.

**Acceptance:** reasoning saves and reloads; a reasoning-only edit creates a new revision; older revisions retain their original reasoning.

### 5.7 Component and persistence tests

**Files:** `src/components/ForecastEditor.integration.test.tsx`, `src/components/ForecastField.integration.test.tsx`, `src/lib/forecast-workspace/db.unit.test.ts`, `src/lib/forecast-workspace/guidance.unit.test.ts`

Required editor tests:

1. Renders all six structured fields, reasoning, and source columns, with `Unavailable` when no sources exist.
2. Typing a location and values autosaves and shows `Saved · revision 1`; assert one forecast and one revision in fake IndexedDB.
3. Editing a value appends revision 2; assert revision 1 still has its original value and reasoning.
4. Loading an existing `forecastId` renders its latest values and history; editing appends the next revision.
5. Saving the same payload twice does not append a revision.
6. Guidance values render beside the matching field when the guidance hook/mapper returns data, and a source failure does not block saving.
7. Save failure shows an alert, keeps the draft, and retry succeeds.

Required unit tests:

1. Field config constraints and labels.
2. NWS and model guidance mapping, including missing values and nearest-period selection.
3. Revision helper: history order, next revision number, immutability, no-op save.

Test setup:

- Keep `fake-indexeddb/auto` in `tests/setup/vitest.setup.ts`.
- Clear `revisions`, `forecasts`, and `locations` in `beforeEach`.
- Prefer a zero/low autosave delay in tests; otherwise keep `findBy*` timeouts bounded.

**Acceptance:** the required component test from the epic exists and passes: editor renders, saves, and creates a new revision on edit.

## 6. Suggested implementation sequence

1. **Schema + helpers:** update `db.ts`, add `ForecastDraft`, unique revision index, and DB unit tests.
2. **Field model:** add `fields.ts`, refactor `ForecastField`, add field tests.
3. **Append-only save:** implement guidance snapshot input, revision numbering, and immutability tests.
4. **Autosave hardening:** extract or clean up the autosave flow, add flush/retry behavior.
5. **Guidance integration:** add pure mappers and the client hook, then render live official/model values.
6. **Editor tests:** extend the existing integration test to cover edit-existing and revision immutability.
7. **Polish:** accessible labels, responsive layout, error states, README update if behavior changes.
8. **Final verification:** run all quality gates below.

Each step should remain shippable; do not merge the schema change without the DB tests.

## 7. Out of scope / deliberately deferred

- Server-side persistence or multi-device sync.
- Authentication, collaboration, or sharing.
- Revision diff view, restore, delete, or prune.
- Rich-text reasoning, attachments, or evidence tables.
- Cross-tab live synchronization. Last writer wins; revisions still remain append-only.
- Model comparison beyond the single selected model required by the epic.

## 8. Risks and open questions

1. **Spec alignment:** confirm units (°C/°F), wind representation, sky categories, hazard representation, and whether a valid end time is required.
2. **Source mapping:** valid-start-to-period matching needs a documented rule (nearest period vs containing day). Keep it deterministic and unit-tested.
3. **Location coordinates:** free-text locations cannot produce guidance. Decide whether coordinates are required or guidance is simply unavailable for free text.
4. **IndexedDB availability:** private browsing/quota/eviction can fail. Surface errors and keep the in-memory draft.
5. **Autosave races:** rapid edits, navigation, and React StrictMode can re-run effects. Serialize writes and use refs for latest state.
6. **Source failure/rate limits:** NWS and Open-Meteo are external. Fail per source, avoid retry storms, and never block local saves.
7. **Unique index migration:** verify no existing duplicate `[forecastId+revisionNumber]` records before enabling the constraint.
8. **Time zones:** store the user’s local datetime string as entered; use provider offsets only when selecting guidance records.

## 9. Verification

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

- All seven epic items have an implementation and a test or explicit manual verification.
- A new forecast can be created, reloaded, edited, and listed.
- Editing any field or reasoning creates exactly one new revision.
- Previously saved revisions are unchanged after edit.
- Official/model values are displayed beside fields when available and degrade to `Unavailable` without blocking saves.
- No direct table writes exist outside `src/lib/forecast-workspace/db.ts`.
