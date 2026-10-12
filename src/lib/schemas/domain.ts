import { z } from 'zod';
import type {
  WeatherData,
  Evidence,
  AtmosphericPattern,
  ForecastScenario,
  ForecastAnalysis,
  ForecastNarrative,
} from '@/types/domain';

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

export const EvidenceTypeEnum = z.enum([
  'satellite',
  'surface',
  'model',
  'observation',
  'other',
]);

export const ConfidenceLevelEnum = z.enum(['low', 'medium', 'high']);

export const EvidenceSchema: z.ZodType<Evidence> = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  description: z.string().min(1),
  type: EvidenceTypeEnum,
  confidence: ConfidenceLevelEnum,
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const PatternScaleEnum = z.enum([
  'local',
  'regional',
  'continental',
  'global',
]);

export const AtmosphericPatternSchema: z.ZodType<AtmosphericPattern> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  scale: PatternScaleEnum,
  systems: z.array(z.string()),
  expectedDuration: z.number().min(0),
  confidence: z.number().min(0).max(100),
});

export const ForecastScenarioSchema: z.ZodType<ForecastScenario> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  probability: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  weatherOutcome: z.array(WeatherDataSchema),
});

export const ForecastNarrativeSchema: z.ZodType<ForecastNarrative> = z.object({
  id: z.string().uuid(),
  forecastId: z.string().uuid(),
  summary: z.string().min(1),
  detailedAnalysis: z.string().min(1),
  keyMessages: z.array(z.string().min(1)),
  uncertainties: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

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

export function validateWeatherData(data: unknown): WeatherData {
  return WeatherDataSchema.parse(data);
}

export function validateWeatherDataSafe(data: unknown) {
  return WeatherDataSchema.safeParse(data);
}

export function validateForecastAnalysis(data: unknown): ForecastAnalysis {
  return ForecastAnalysisSchema.parse(data);
}

export function validateForecastAnalysisSafe(data: unknown) {
  return ForecastAnalysisSchema.safeParse(data);
}

export function validateEvidence(data: unknown): Evidence {
  return EvidenceSchema.parse(data);
}

export function validateEvidenceSafe(data: unknown) {
  return EvidenceSchema.safeParse(data);
}

export function validateForecastNarrative(data: unknown): ForecastNarrative {
  return ForecastNarrativeSchema.parse(data);
}

export function validateForecastNarrativeSafe(data: unknown) {
  return ForecastNarrativeSchema.safeParse(data);
}