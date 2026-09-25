/**
 * Utility functions for weather forecasting domain
 */

import type { ForecastAnalysis, Evidence, AtmosphericPattern } from "./domain";

/**
 * Calculate overall forecast confidence based on evidence and patterns
 */
export function calculateForecastConfidence(
  evidenceItems: Evidence[],
  patterns: AtmosphericPattern[]
): number {
  if (evidenceItems.length === 0 && patterns.length === 0) return 0;

  const evidenceScore =
    evidenceItems.length > 0
      ? (
          evidenceItems.reduce((sum, e) => {
            const confidenceMap = { high: 1, medium: 0.67, low: 0.33 };
            return sum + confidenceMap[e.confidence];
          }, 0) / evidenceItems.length
        ) * 100
      : 0;

  const patternScore =
    patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;

  return Math.round((evidenceScore + patternScore) / 2);
}

/**
 * Format forecast for display
 */
export function formatForecast(forecast: ForecastAnalysis): string {
  return `${forecast.location} - ${forecast.validStart.toLocaleDateString()}`;
}

/**
 * Validate forecast analysis has required data
 */
export function validateForecast(forecast: ForecastAnalysis): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!forecast.location) errors.push("Location is required");
  if (!forecast.hypothesis) errors.push("Hypothesis is required");
  if (forecast.evidence.length === 0) errors.push("At least one evidence item is required");
  if (forecast.overallConfidence < 0 || forecast.overallConfidence > 100) {
    errors.push("Confidence must be between 0 and 100");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
