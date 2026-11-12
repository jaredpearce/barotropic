# Observed High/Low Rule

Canonical rule for turning NWS station observations into the observed values used
by Track Record verification. Implemented by `src/lib/verification/observed.ts`
and covered by `observed.unit.test.ts`.

## 1. Scope

This rule produces one observed record per station, per local calendar day:

- `highC` — daily maximum temperature
- `lowC` — daily minimum temperature
- `meanWindMps` — daily mean sustained wind speed
- `precipOccurred` — whether measurable precipitation occurred

The same record is used to verify the user's forecast, NWS guidance, and the
GFS/HRRR/ECMWF guidance snapshots.

## 2. Definitions

### Local calendar day

A local calendar day is the half-open interval
`[00:00:00, 24:00:00)` in the **forecast location's IANA time zone**, for example
`America/Denver`.

- The time zone comes from the NWS `/points` response and is stored on the
  forecast revision's `target.timeZone`.
- If the time zone is unavailable, fall back to the browser's resolved IANA time
  zone and mark the result with `timeZoneSource: 'fallback'`.
- If neither is available, the day is unverifiable.
- Daylight-saving days are handled by the time-zone conversion, so a day may be
  23, 24, or 25 hours long.

### Eligible observation

An observation is eligible for a variable only when **all** of the following are
true:

1. It has a valid ISO timestamp.
2. The variable's numeric value is present and finite.
3. The variable's NWS `qualityControl` flag is exactly `V` (valid).

NWS quality-control flags are treated as follows:

| Flag             | Meaning             | Used? |
| ---------------- | ------------------- | ----- |
| `V`              | Valid               | Yes   |
| `C`              | Caution             | No    |
| `S`              | Suspect             | No    |
| `Z`              | Missing             | No    |
| absent / unknown | Not confirmed valid | No    |

No interpolation, gap filling, nearby-station substitution, or model-based
backfill is allowed.

### Coverage

Coverage is counted **per variable** as the number of distinct local clock hours
that contain at least one eligible reading. Multiple readings in the same hour
count once.

The required number of hours is 75% of the actual length of the local day:

```ts
requiredHours = Math.ceil(0.75 * dayLengthHours);
```

For a normal 24-hour day that is 18 hours. For 23- and 25-hour DST days the
threshold follows the real day length.

A variable is verified only when `coverageHours >= requiredHours`. Otherwise the
observed value is `undefined` and the sample is marked `insufficient-coverage`.

## 3. Algorithm

```ts
function observedDay(observations, date, timeZone) {
  const { startMs, endMs, hours } = localDayBounds(date, timeZone);
  const requiredHours = Math.ceil(0.75 * hours);

  const inDay = observations
    .filter((observation) => {
      const timestamp = Date.parse(observation.timestamp);
      return Number.isFinite(timestamp) && timestamp >= startMs && timestamp < endMs;
    })
    .filter(uniqueByTimestamp); // keep one reading per timestamp

  const temperatures = inDay.filter(
    (observation) =>
      isFiniteNumber(observation.temperatureC) && observation.temperatureQualityControl === 'V',
  );
  const winds = inDay.filter(
    (observation) =>
      isFiniteNumber(observation.windSpeedMps) && observation.windSpeedQualityControl === 'V',
  );
  const precipitation = inDay.filter(hasValidPrecipitation);

  const temperatureHours = countLocalHours(temperatures, timeZone);
  const windHours = countLocalHours(winds, timeZone);
  const precipitationHours = countLocalHours(precipitation, timeZone);

  return {
    stationId,
    date,
    timeZone,
    timeZoneSource,
    coverage: {
      temperatureHours,
      windHours,
      precipitationHours,
      requiredHours,
    },
    highC:
      temperatureHours >= requiredHours
        ? Math.max(...temperatures.map((observation) => observation.temperatureC))
        : undefined,
    lowC:
      temperatureHours >= requiredHours
        ? Math.min(...temperatures.map((observation) => observation.temperatureC))
        : undefined,
    meanWindMps:
      windHours >= requiredHours
        ? mean(winds.map((observation) => observation.windSpeedMps))
        : undefined,
    precipOccurred:
      precipitationHours >= requiredHours
        ? precipitation.some((observation) => precipitationMm(observation) > 0)
        : undefined,
  };
}
```

## 4. Precip occurrence

`precipOccurred` is `true` when an eligible NWS precipitation accumulation is
greater than zero during the local day. Prefer `precipitationLastHour`; when it
is missing, fall back to the smallest available accumulation
(`precipitationLast3Hours`, then `precipitationLast6Hours`). Coarse accumulations
are attributed to the observation's local hour, which can slightly blur the
day boundary; this is a deliberate KISS trade-off.

The observed probability used for verification is:

```ts
observedPopPercent = precipOccurred ? 100 : 0;
```

This is intentionally a binary occurrence check, not a probability. Probability
forecasts are scored with the Brier score (see the plan), with MAE in percentage
points shown for consistency.

## 5. Wind

`meanWindMps` is the arithmetic mean of all eligible sustained wind-speed
readings in the local day. It is **not** the maximum gust and **not** the daily
maximum sustained wind. Direction is not verified.

## 6. Rounding

- All calculations use full precision in canonical units: Celsius, meters per
  second, millimeters.
- Rounding happens only at display time, typically to one decimal place.
- Never round before computing error, MAE, or Brier score.

## 7. Missing-data outcomes

| Situation                                                         | Outcome                 |
| ----------------------------------------------------------------- | ----------------------- |
| No observations for the station/day                               | `missing`               |
| Station/time zone cannot be resolved                              | `unverifiable`          |
| Fewer than `requiredHours` eligible readings                      | `insufficient-coverage` |
| Day has not ended, or the 2-hour verification lag has not elapsed | `pending`               |
| Forecast revision was created after the local day began           | `not-ex-ante`           |

These outcomes are excluded from MAE and Brier denominators and are surfaced as
counts on Track Record.

## 8. Station selection

- Use the nearest NWS observation station returned by `/points`
  (`observationStations.features[0]`), captured as `target.stationId` on the
  forecast revision.
- Never mix readings from multiple stations for one day.
- If the stored station has no data, mark the day missing; do not silently switch
  stations for a historical forecast.

## 9. Verification lag

A day becomes verifiable only after `localDayEnd + 2 hours`, to allow late
observations to arrive. Track Record shows earlier days as `pending` rather than
scoring incomplete data.

## 10. Examples

- **Normal day, complete data:** 24 hours with valid `V` temperatures, high
  `28.4°C`, low `11.2°C`. Verified.
- **Sparse day:** only 12 hours with valid temperatures. `insufficient-coverage`;
  no high/low, and the sample is excluded from MAE.
- **Flagged extremes:** a 30°C reading flagged `S` is excluded; the high comes
  from the remaining `V` readings.
- **DST spring-forward:** 23-hour day, `requiredHours = 18`. Verified if at least
  18 distinct local hours have valid readings.
- **Late revision:** a revision created at 10:00 local for that same day is
  `not-ex-ante` and is not scored.

## 11. Non-goals

- Estimating high/low from a model or reanalysis.
- Quality-controlling observations ourselves beyond the NWS flag.
- Using daily climate products (CLI/DSM) in Epic 5.
- Verifying sky condition or hazards.
