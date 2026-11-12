'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  runVerification,
  type VerificationProgress,
  type VerificationRunResult,
} from '@/lib/verification/job';

export type TrackRecordStatus = 'idle' | 'running' | 'success' | 'error';

export interface UseTrackRecordResult {
  status: TrackRecordStatus;
  progress: VerificationProgress;
  result: VerificationRunResult | null;
  error: string | null;
  /** Re-run the verification job. Aborts any run already in flight. */
  reload: () => void;
}

const EMPTY_PROGRESS: VerificationProgress = { total: 0, completed: 0 };

/**
 * Run the client-side verification job on mount and on demand.
 *
 * The job never rejects for individual station or day failures; it reports them
 * as warnings. Only an unexpected failure of the whole run sets `error`.
 */
export function useTrackRecord(): UseTrackRecordResult {
  const [status, setStatus] = useState<TrackRecordStatus>('idle');
  const [progress, setProgress] = useState<VerificationProgress>(EMPTY_PROGRESS);
  const [result, setResult] = useState<VerificationRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);
  const runIdRef = useRef(0);

  const reload = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  useEffect(() => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    setStatus('running');
    setError(null);
    setProgress(EMPTY_PROGRESS);

    runVerification({
      onProgress: (next) => {
        if (runIdRef.current === runId) setProgress(next);
      },
    })
      .then((nextResult) => {
        if (runIdRef.current !== runId) return;
        setResult(nextResult);
        setProgress({
          total: nextResult.pastForecasts.length,
          completed: nextResult.pastForecasts.length,
        });
        setStatus('success');
      })
      .catch((caught: unknown) => {
        if (runIdRef.current !== runId) return;
        setError(caught instanceof Error ? caught.message : 'Verification failed.');
        setStatus('error');
      });
  }, [requestId]);

  return { status, progress, result, error, reload };
}
