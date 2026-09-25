/**
 * Domain type definitions for weather forecasting
 */

/**
 * Weather observation or forecast data point
 */
export interface WeatherData {
  timestamp: Date;
  temperature: number; // Celsius
  humidity: number; // Percentage 0-100
  pressure: number; // hPa
  windSpeed: number; // m/s
  windDirection: number; // Degrees 0-360
  windGust: number; // m/s
  precipitation: number; // mm
  condition: string; // Clear, Cloudy, Rainy, etc.
  visibility: number; // km
}

/**
 * Atmospheric evidence supporting a forecast
 */
export interface Evidence {
  id: string;
  createdAt: Date;
  description: string;
  type: "satellite" | "surface" | "model" | "observation" | "other";
  confidence: "high" | "medium" | "low";
  source?: string;
  notes?: string;
}

/**
 * Atmospheric pattern identified in analysis
 */
export interface AtmosphericPattern {
  id: string;
  name: string;
  description: string;
  scale: "local" | "regional" | "continental" | "global";
  systems: string[]; // e.g., ["high pressure", "cold front"]
  expectedDuration: number; // hours
  confidence: number; // 0-100
}

/**
 * Forecast scenario comparison
 */
export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-100
  reasoning: string;
  weatherOutcome: WeatherData[];
}

/**
 * Core forecast analysis combining evidence, patterns, and hypothesis
 */
export interface ForecastAnalysis {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  location: string;
  validStart: Date;
  validEnd: Date;
  hypothesis: string;
  evidence: Evidence[];
  patterns: AtmosphericPattern[];
  scenarios: ForecastScenario[];
  overallConfidence: number; // 0-100
  narrative: string; // Forecast narrative for communication
  accuracy?: number; // Historical accuracy if verified
}

/**
 * Forecast narrative - structured communication of forecast
 */
export interface ForecastNarrative {
  id: string;
  forecastId: string;
  summary: string; // Brief summary of the forecast
  detailedAnalysis: string; // In-depth analysis and reasoning
  keyMessages: string[]; // Main points to communicate
  uncertainties: string[]; // Areas of uncertainty
  confidence: number; // Overall confidence
}

/**
 * User forecast project for organization and collaboration
 */
export interface ForecastProject {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  forecasts: ForecastAnalysis[];
  collaborators: string[];
  isPublic: boolean;
}
