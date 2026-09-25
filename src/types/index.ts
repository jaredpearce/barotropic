// TypeScript type definitions for the application

/**
 * Weather observation or forecast data
 */
export interface WeatherData {
  timestamp: Date;
  temperature: number; // Celsius
  humidity: number; // Percentage
  pressure: number; // hPa
  windSpeed: number; // m/s
  windDirection: number; // Degrees
  condition: string;
}

/**
 * Forecast analysis with hypothesis and evidence
 */
export interface ForecastAnalysis {
  id: string;
  location: string;
  createdAt: Date;
  hypothesis: string;
  evidence: string[];
  confidence: number; // 0-100
  forecast: WeatherData[];
}
