import { z } from 'zod';

/**
 * Zod validation schemas for weather domain types
 * These schemas provide runtime validation and type inference for:
 * - Weather conditions and observations
 * - Forecasts and scenarios
 * - Atmospheric alerts and warnings
 */

// ============================================================================
// Weather Condition Schemas
// ============================================================================

/**
 * Enum for common weather condition types
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

export type WeatherCondition = z.infer<typeof WeatherConditionEnum>;

/**
 * Wind direction/component schema
 */
export const WindSchema = z.object({
  speed: z.number().min(0).describe('Wind speed in m/s'),
  direction: z.number().min(0).max(360).describe('Wind direction in degrees (0-360)'),
  gust: z.number().min(0).describe('Wind gust speed in m/s'),
});

export type Wind = z.infer<typeof WindSchema>;

/**
 * Complete weather observation/condition data point
 */
export const WeatherDataSchema = z.object({
  timestamp: z.date().describe('Time of observation or forecast validity'),
  temperature: z.number().describe('Temperature in Celsius'),
  humidity: z.number().min(0).max(100).describe('Humidity as percentage'),
  pressure: z.number().min(0).describe('Atmospheric pressure in hPa'),
  wind: WindSchema,
  precipitation: z.number().min(0).describe('Precipitation amount in mm'),
  condition: WeatherConditionEnum,
  visibility: z.number().min(0).describe('Visibility in km'),
  dewpoint: z.number().optional().describe('Dewpoint temperature in Celsius'),
  ceiling: z.number().optional().describe('Cloud ceiling in feet'),
});

export type WeatherData = z.infer<typeof WeatherDataSchema>;

// ============================================================================
// Evidence & Pattern Schemas
// ============================================================================

/**
 * Evidence type classification
 */
export const EvidenceTypeEnum = z.enum([
  'satellite',
  'surface',
  'model',
  'observation',
  'radar',
  'upper-air',
  'other',
]);

export type EvidenceType = z.infer<typeof EvidenceTypeEnum>;

/**
 * Confidence level classification
 */
export const ConfidenceLevelEnum = z.enum(['low', 'medium', 'high']);

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelEnum>;

/**
 * Atmospheric evidence supporting a forecast
 */
export const EvidenceSchema = z.object({
  id: z.string().uuid().describe('Unique evidence identifier'),
  createdAt: z.date().describe('When the evidence was documented'),
  description: z.string().min(1).describe('Description of the evidence'),
  type: EvidenceTypeEnum,
  confidence: ConfidenceLevelEnum,
  source: z.string().optional().describe('Data source reference'),
  notes: z.string().optional().describe('Additional notes or context'),
  url: z.string().url().optional().describe('Link to source material'),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

/**
 * Atmospheric pattern scale classification
 */
export const PatternScaleEnum = z.enum([
  'local',
  'regional',
  'continental',
  'global',
]);

export type PatternScale = z.infer<typeof PatternScaleEnum>;

/**
 * Atmospheric pattern identified in analysis
 */
export const AtmosphericPatternSchema = z.object({
  id: z.string().uuid().describe('Unique pattern identifier'),
  name: z.string().min(1).describe('Pattern name (e.g., "Upper-level ridge", "Cold front")'),
  description: z.string().min(1).describe('Detailed pattern description'),
  scale: PatternScaleEnum,
  systems: z.array(z.string()).describe('Weather systems comprising the pattern'),
  expectedDuration: z.number().min(0).describe('Expected duration in hours'),
  confidence: z.number().min(0).max(100).describe('Confidence level 0-100'),
  impactArea: z.string().optional().describe('Geographic area affected'),
});

export type AtmosphericPattern = z.infer<typeof AtmosphericPatternSchema>;

// ============================================================================
// Forecast Schemas
// ============================================================================

/**
 * Forecast scenario comparing alternative outcomes
 */
export const ForecastScenarioSchema = z.object({
  id: z.string().uuid().describe('Unique scenario identifier'),
  name: z.string().min(1).describe('Scenario name (e.g., "Most Likely", "Worst Case")'),
  description: z.string().min(1).describe('Scenario description and reasoning'),
  probability: z.number().min(0).max(100).describe('Probability of this scenario (0-100)'),
  reasoning: z.string().min(1).describe('Explanation of why this scenario is probable'),
  weatherOutcome: z.array(WeatherDataSchema).describe('Predicted weather for this scenario'),
});

export type ForecastScenario = z.infer<typeof ForecastScenarioSchema>;

/**
 * Forecast narrative for structured communication
 */
export const ForecastNarrativeSchema = z.object({
  id: z.string().uuid().describe('Unique narrative identifier'),
  forecastId: z.string().uuid().describe('Associated forecast ID'),
  summary: z.string().min(1).describe('Brief forecast summary'),
  detailedAnalysis: z.string().min(1).describe('In-depth analysis and reasoning'),
  keyMessages: z.array(z.string().min(1)).describe('Main points for communication'),
  uncertainties: z.array(z.string()).describe('Areas of uncertainty in the forecast'),
  confidence: z.number().min(0).max(100).describe('Overall confidence level 0-100'),
  metadata: z
    .object({
      author: z.string().optional(),
      reviewer: z.string().optional(),
      lastUpdated: z.date().optional(),
    })
    .optional(),
});

export type ForecastNarrative = z.infer<typeof ForecastNarrativeSchema>;

/**
 * Core forecast analysis combining evidence, patterns, and hypothesis
 */
export const ForecastAnalysisSchema = z.object({
  id: z.string().uuid().describe('Unique forecast identifier'),
  createdAt: z.date().describe('Forecast creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp'),
  publishedAt: z.date().optional().describe('Publication timestamp if published'),
  location: z.string().min(1).describe('Forecast location'),
  validStart: z.date().describe('Forecast valid start time'),
  validEnd: z.date().describe('Forecast valid end time'),
  hypothesis: z.string().min(1).describe('Weather forecast hypothesis'),
  evidence: z.array(EvidenceSchema).describe('Supporting evidence'),
  patterns: z.array(AtmosphericPatternSchema).describe('Identified atmospheric patterns'),
  scenarios: z.array(ForecastScenarioSchema).describe('Alternative forecast scenarios'),
  overallConfidence: z.number().min(0).max(100).describe('Overall forecast confidence 0-100'),
  narrative: z.string().describe('Narrative description of the forecast'),
  accuracy: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Historical verification accuracy if available'),
});

export type ForecastAnalysis = z.infer<typeof ForecastAnalysisSchema>;

// ============================================================================
// Alert Schemas
// ============================================================================

/**
 * Alert severity classification
 */
export const AlertSeverityEnum = z.enum([
  'advisory',
  'warning',
  'watch',
  'statement',
]);

export type AlertSeverity = z.infer<typeof AlertSeverityEnum>;

/**
 * Alert type classification
 */
export const AlertTypeEnum = z.enum([
  'heat',
  'cold',
  'wind',
  'winter-storm',
  'thunderstorm',
  'tornado',
  'flood',
  'frost',
  'fire-weather',
  'air-quality',
  'marine',
  'other',
]);

export type AlertType = z.infer<typeof AlertTypeEnum>;

/**
 * Weather alert or warning
 */
export const WeatherAlertSchema = z.object({
  id: z.string().uuid().describe('Unique alert identifier'),
  type: AlertTypeEnum,
  severity: AlertSeverityEnum,
  headline: z.string().min(1).describe('Alert headline'),
  description: z.string().min(1).describe('Detailed alert description'),
  affectedArea: z.string().min(1).describe('Geographic area affected (e.g., county list)'),
  effectiveStart: z.date().describe('Alert start time'),
  effectiveEnd: z.date().describe('Alert end time'),
  issuedAt: z.date().describe('When the alert was issued'),
  issuedBy: z.string().describe('Issuing authority (e.g., "NWS Raleigh")'),
  instructions: z.string().optional().describe('Public safety instructions'),
  impact: z
    .object({
      temperature: z.number().optional().describe('Critical temperature'),
      windSpeed: z.number().optional().describe('Critical wind speed in m/s'),
      rainfall: z.number().optional().describe('Expected rainfall in mm'),
      snowfall: z.number().optional().describe('Expected snowfall in cm'),
    })
    .optional()
    .describe('Specific weather impacts'),
});

export type WeatherAlert = z.infer<typeof WeatherAlertSchema>;

// ============================================================================
// Observation Schemas
// ============================================================================

/**
 * Station type classification
 */
export const StationTypeEnum = z.enum([
  'airport',
  'weather-station',
  'metar',
  'personal',
  'radar',
]);

export type StationType = z.infer<typeof StationTypeEnum>;

/**
 * Weather observation from a specific station
 */
export const WeatherObservationSchema = z.object({
  id: z.string().uuid().describe('Unique observation identifier'),
  stationId: z.string().describe('Weather station identifier (e.g., KRDU)'),
  stationName: z.string().describe('Human-readable station name'),
  stationType: StationTypeEnum,
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      elevation: z.number().optional().describe('Elevation in meters'),
    })
    .describe('Station geographic location'),
  timestamp: z.date().describe('Observation time'),
  weather: WeatherDataSchema.describe('Weather conditions at observation time'),
  qualityControl: z
    .object({
      passed: z.boolean().describe('Whether data passed QC checks'),
      issues: z.array(z.string()).optional().describe('Any QC issues found'),
    })
    .optional()
    .describe('Data quality information'),
});

export type WeatherObservation = z.infer<typeof WeatherObservationSchema>;

// ============================================================================
// Composite Request/Response Schemas
// ============================================================================

/**
 * Request to create a new forecast
 */
export const CreateForecastRequestSchema = z.object({
  location: z.string().min(1),
  validStart: z.date(),
  validEnd: z.date(),
  hypothesis: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  patterns: z.array(AtmosphericPatternSchema),
  scenarios: z.array(ForecastScenarioSchema),
  overallConfidence: z.number().min(0).max(100),
});

export type CreateForecastRequest = z.infer<typeof CreateForecastRequestSchema>;

/**
 * Response containing forecast with related data
 */
export const ForecastResponseSchema = z.object({
  forecast: ForecastAnalysisSchema,
  narrative: ForecastNarrativeSchema.optional(),
  alerts: z.array(WeatherAlertSchema),
  observations: z.array(WeatherObservationSchema),
});

export type ForecastResponse = z.infer<typeof ForecastResponseSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a validated weather condition from input
 */
export function createWeatherData(data: unknown): WeatherData {
  return WeatherDataSchema.parse(data);
}

/**
 * Create a validated forecast analysis from input
 */
export function createForecastAnalysis(data: unknown): ForecastAnalysis {
  return ForecastAnalysisSchema.parse(data);
}

/**
 * Create a validated weather alert from input
 */
export function createWeatherAlert(data: unknown): WeatherAlert {
  return WeatherAlertSchema.parse(data);
}

/**
 * Create a validated weather observation from input
 */
export function createWeatherObservation(data: unknown): WeatherObservation {
  return WeatherObservationSchema.parse(data);
}

/**
 * Safely parse weather data, returning errors instead of throwing
 */
export function parseWeatherDataSafe(data: unknown) {
  return WeatherDataSchema.safeParse(data);
}

/**
 * Safely parse forecast analysis, returning errors instead of throwing
 */
export function parseForecastAnalysisSafe(data: unknown) {
  return ForecastAnalysisSchema.safeParse(data);
}

/**
 * Safely parse weather alert, returning errors instead of throwing
 */
export function parseWeatherAlertSafe(data: unknown) {
  return WeatherAlertSchema.safeParse(data);
}
