/**
 * Verification summaries.
 *
 * Groups samples by source + variable and computes MAE, bias, and (for PoP) the
 * Brier score. Empty groups return zero samples and undefined metrics, never
 * `NaN`.
 */

import type { VerificationSample, VerificationSource, VerificationVariable } from './verify';

export interface VariableSummary {
  source: VerificationSource;
  variable: VerificationVariable;
  sampleCount: number;
  /** Mean absolute error in canonical units (percentage points for pop). */
  mae?: number;
  /** Mean signed error in canonical units. */
  bias?: number;
  /** PoP only: mean Brier component. */
  brier?: number;
}

function groupKey(source: VerificationSource, variable: VerificationVariable): string {
  return `${source}:${variable}`;
}

function mean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** An empty summary for a source/variable with no samples. */
export function emptySummary(
  source: VerificationSource,
  variable: VerificationVariable,
): VariableSummary {
  return { source, variable, sampleCount: 0, mae: undefined, bias: undefined, brier: undefined };
}

/** Group samples by source + variable and compute aggregate metrics. */
export function summarizeSamples(samples: readonly VerificationSample[]): VariableSummary[] {
  const groups = new Map<
    string,
    { source: VerificationSource; variable: VerificationVariable; samples: VerificationSample[] }
  >();

  for (const sample of samples) {
    const key = groupKey(sample.source, sample.variable);
    const group = groups.get(key) ?? {
      source: sample.source,
      variable: sample.variable,
      samples: [],
    };
    group.samples.push(sample);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    const brierValues =
      group.variable === 'pop'
        ? group.samples
            .map((sample) => sample.brierComponent)
            .filter((value): value is number => value !== undefined)
        : [];
    return {
      source: group.source,
      variable: group.variable,
      sampleCount: group.samples.length,
      mae: mean(group.samples.map((sample) => sample.absError)),
      bias: mean(group.samples.map((sample) => sample.error)),
      brier: group.variable === 'pop' ? mean(brierValues) : undefined,
    };
  });
}
