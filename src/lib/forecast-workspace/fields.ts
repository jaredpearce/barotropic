import type { ForecastDraft, ForecastFieldKey, ForecastValues } from './db';

export interface ForecastFieldDefinition {
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

/**
 * Single source of truth for forecast field rendering and validation.
 *
 * User-entered values stay as strings so an empty or partially typed field does
 * not get coerced into a misleading number. Structured constraints are applied
 * by the input and validated again before saving.
 */
export const forecastFields: readonly ForecastFieldDefinition[] = [
  {
    key: 'high',
    label: 'High',
    kind: 'number',
    step: 1,
    unit: '°C',
    placeholder: 'e.g. 25',
  },
  {
    key: 'low',
    label: 'Low',
    kind: 'number',
    step: 1,
    unit: '°C',
    placeholder: 'e.g. 14',
  },
  {
    key: 'pop',
    label: 'Probability of precipitation',
    kind: 'number',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    placeholder: '0–100',
  },
  {
    key: 'wind',
    label: 'Wind',
    kind: 'text',
    placeholder: 'e.g. SW 8 m/s',
  },
  {
    key: 'sky',
    label: 'Sky',
    kind: 'select',
    options: ['Clear', 'Partly cloudy', 'Cloudy', 'Rain', 'Thunderstorms', 'Snow', 'Fog'],
  },
  {
    key: 'hazards',
    label: 'Hazards',
    kind: 'textarea',
    placeholder: 'e.g. Hail, damaging winds, flooding',
  },
];

export const forecastFieldByKey = Object.fromEntries(
  forecastFields.map((field) => [field.key, field]),
) as Record<ForecastFieldKey, ForecastFieldDefinition>;

/** Validate the editable draft before it reaches IndexedDB. */
export function validateForecastDraft(draft: ForecastDraft): string | null {
  if (!draft.locationName.trim()) {
    return 'Enter a location before saving.';
  }

  for (const field of forecastFields) {
    const value = draft.values[field.key].trim();
    if (!value || field.kind !== 'number') continue;

    const number = Number(value);
    if (!Number.isFinite(number)) {
      return `${field.label} must be a number.`;
    }
    if (field.min !== undefined && number < field.min) {
      return `${field.label} must be at least ${field.min}${field.unit ?? ''}.`;
    }
    if (field.max !== undefined && number > field.max) {
      return `${field.label} must be at most ${field.max}${field.unit ?? ''}.`;
    }
  }

  return null;
}

/** Fill fields added since the saved revision with their empty defaults. */
export function mergeForecastValues(
  values: ForecastValues,
  defaults: ForecastValues,
): ForecastValues {
  return { ...defaults, ...values };
}
