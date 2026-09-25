/**
 * React hooks for forecast functionality
 */

import { useState, useCallback } from "react";
import type { ForecastAnalysis } from "@/types/domain";

/**
 * Hook for managing forecast form state
 */
export function useForecastForm(initialData?: Partial<ForecastAnalysis>) {
  const [formData, setFormData] = useState<Partial<ForecastAnalysis>>({
    hypothesis: "",
    evidence: [],
    patterns: [],
    scenarios: [],
    overallConfidence: 50,
    narrative: "",
    ...initialData,
  });

  const updateField = useCallback(
    <K extends keyof ForecastAnalysis>(
      field: K,
      value: ForecastAnalysis[K]
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const reset = useCallback(() => {
    setFormData({
      hypothesis: "",
      evidence: [],
      patterns: [],
      scenarios: [],
      overallConfidence: 50,
      narrative: "",
      ...initialData,
    });
  }, [initialData]);

  return { formData, updateField, reset };
}

/**
 * Hook for managing API loading states
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setStatus("pending");
    setData(null);
    setError(null);
    try {
      const response = await asyncFunction();
      setData(response);
      setStatus("success");
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    }
  }, [asyncFunction]);

  return { execute, status, data, error };
}
