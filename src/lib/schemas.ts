import { z } from 'zod';
import type {
  WeatherData,
  Evidence,
  AtmosphericPattern,
  ForecastScenario,
  ForecastAnalysis,
  ForecastNarrative,
} from '@/types/domain';

/**
 * Zod validation schemas for weather domain types
 *
 * These schemas validate external data (API responses, form inputs, database records)
 * against the domain interfaces defined in {@link src/types/domain.ts}.
 *
 * **Usage Pattern (Pattern 2: Types as Source of Truth):**
 * - Use these schemas at API boundaries: route handlers, form submissions, external API calls
 * - Never export types from schemas; use domain interfaces instead
 * - Parse incoming data with these schemas; throw or handle errors gracefully
 *
 * @see {@link src/types/domain.ts} for the source-of-truth type definitions
 */

// ============================================================================
// Weather Condition Schemas
// ============================================================================

/**
 * Weather condition enum that aligns with WeatherData.condition
 */
export const WeatherConditionEnum = z.enum([
  'clear',
  'cloudy',
  'partly-cloudy',
  'overcast',
  'rainy',
  'heavy-rain',
  'thunderstorms',
  'snow',
  'heavy-snow',
  'sleet',
  'freezing-rain',
  'fog',
  'haze',
  'dust-storm',
  'squall',
]);

/**
 * Validates weather observation/forecast data point
 * Corresponds to {@link WeatherData}
 */
export const WeatherDataSchema: z.ZodType<WeatherData> = z.object({
  timestamp: z.coerce.date(),
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  pressure: z.number().min(0),
  windSpeed: z.number().min(0),
  windDirection: z.number().min(0).max(360),
  windGust: z.number().min(0),
  precipitation: z.number().min(0),
  condition: z.string(),
  visibility: z.number().min(0),
});

// ============================================================================
// Evidence & Pattern Schemas
// ============================================================================

/**
 * Evidence type enum
 */
export const EvidenceTypeEnum = z.enum([
  'satellite',
  'surface',
  'model',
  'observation',
  'other',
]);

/**
 * Confidence level enum
 */
export const ConfidenceLevelEnum = z.enum(['low', 'medium', 'high']);

/**
 * Validates atmospheric evidence supporting a forecast
 * Corresponds to {@link Evidence}
 */
export const EvidenceSchema: z.ZodType<Evidence> = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  description: z.string().min(1),
  type: EvidenceTypeEnum,
  confidence: ConfidenceLevelEnum,
  source: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Pattern scale enum
 */
export const PatternScaleEnum = z.enum([
  'local',
  'regional',
  'continental',
  'global',
]);

/**
 * Validates atmospheric pattern identified in analysis
 * Corresponds to {@link AtmosphericPattern}
 */
export const AtmosphericPatternSchema: z.ZodType<AtmosphericPattern> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  scale: PatternScaleEnum,
  systems: z.array(z.string()),
  expectedDuration: z.number().min(0),
  confidence: z.number().min(0).max(100),
});

// ============================================================================
// Forecast Schemas
// ============================================================================

/**
 * Validates forecast scenario comparison
 * Corresponds to {@link ForecastScenario}
 */
export const ForecastScenarioSchema: z.ZodType<ForecastScenario> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  probability: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  weatherOutcome: z.array(WeatherDataSchema),
});

/**
 * Validates forecast narrative for structured communication
 * Corresponds to {@link ForecastNarrative}
 */
export const ForecastNarrativeSchema: z.ZodType<ForecastNarrative> = z.object({
  id: z.string().uuid(),
  forecastId: z.string().uuid(),
  summary: z.string().min(1),
  detailedAnalysis: z.string().min(1),
  keyMessages: z.array(z.string().min(1)),
  uncertainties: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

/**
 * Validates core forecast analysis
 * Corresponds to {@link ForecastAnalysis}
 */
export const ForecastAnalysisSchema: z.ZodType<ForecastAnalysis> = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  publishedAt: z.coerce.date().optional(),
  location: z.string().min(1),
  validStart: z.coerce.date(),
  validEnd: z.coerce.date(),
  hypothesis: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  patterns: z.array(AtmosphericPatternSchema),
  scenarios: z.array(ForecastScenarioSchema),
  overallConfidence: z.number().min(0).max(100),
  narrative: z.string().min(1),
  accuracy: z.number().min(0).max(100).optional(),
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate weather data, throwing on invalid input
 */
export function validateWeatherData(data: unknown): WeatherData {
  return WeatherDataSchema.parse(data);
}

/**
 * Safely validate weather data, returning errors instead of throwing
 */
export function validateWeatherDataSafe(data: unknown) {
  return WeatherDataSchema.safeParse(data);
}

/**
 * Validate forecast analysis, throwing on invalid input
 */
export function validateForecastAnalysis(data: unknown): ForecastAnalysis {
  return ForecastAnalysisSchema.parse(data);
}

/**
 * Safely validate forecast analysis, returning errors instead of throwing
 */
export function validateForecastAnalysisSafe(data: unknown) {
  return ForecastAnalysisSchema.safeParse(data);
}

/**
 * Validate evidence, throwing on invalid input
 */
export function validateEvidence(data: unknown): Evidence {
  return EvidenceSchema.parse(data);
}

/**
 * Safely validate evidence, returning errors instead of throwing
 */
export function validateEvidenceSafe(data: unknown) {
  return EvidenceSchema.safeParse(data);
}

/**
 * Validate forecast narrative, throwing on invalid input
 */
export function validateForecastNarrative(data: unknown): ForecastNarrative {
  return ForecastNarrativeSchema.parse(data);
}

/**
 * Safely validate forecast narrative, returning errors instead of throwing
 */
export function validateForecastNarrativeSafe(data: unknown) {
  return ForecastNarrativeSchema.safeParse(data);
}
