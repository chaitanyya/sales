import { useRef, useCallback } from "react";

/**
 * Hook for managing job submission with double-click prevention.
 *
 * Uses a ref-based guard to prevent multiple simultaneous submissions.
 * No pending state tracking - job appears in tabs when DB query returns it.
 */
export function useJobSubmission() {
  const isSubmittingRef = useRef(false);

  /**
   * Submit a job with double-click prevention.
   *
   * @param jobFn - Async function that starts the job.
   * @returns Promise that resolves when the job submission completes
   */
  const submit = useCallback(
    async <T>(jobFn: () => Promise<T>): Promise<T | undefined> => {
      // Guard against double-clicks using ref (synchronous check)
      if (isSubmittingRef.current) {
        return undefined;
      }

      isSubmittingRef.current = true;

      try {
        return await jobFn();
      } finally {
        isSubmittingRef.current = false;
      }
    },
    []
  );

  return {
    submit,
    /**
     * Returns true if a submission is currently in progress.
     * This is a ref-based check, not reactive state.
     */
    get isSubmitting() {
      return isSubmittingRef.current;
    },
  };
}
