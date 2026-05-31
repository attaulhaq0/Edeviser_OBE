// Task 11.2 / 11.3: Idempotent async runner (finalize guard)
// Requirements: 3.4
//
// Extracted from AdaptiveQuizSession's inline `finalizedRef` guard so the
// at-most-once finalization logic is a single, framework-agnostic, testable
// unit instead of being duplicated between the component and its tests.
//
// The runner models the exact guard the quiz finalization needs: across any
// number and ordering of triggers (timer expiry, manual finish, unmount) the
// underlying submission runs at most once on success, while a failed attempt
// releases the guard so a later trigger may retry (R3.4).

/**
 * A guard that runs a guarded async operation at most once across all callers.
 *
 * The completion flag is claimed *synchronously* before the operation is
 * awaited, so concurrent (interleaved) triggers in the same tick cannot both
 * pass the guard — only the first invocation runs the operation.
 */
export interface IdempotentRunner {
  /**
   * Whether a guarded operation has completed successfully. Once `true` it
   * never returns to `false`, so every subsequent `run` call is a no-op.
   */
  readonly hasCompleted: boolean;

  /**
   * Runs `operation` at most once across all calls to this runner.
   *
   * - WHEN a previous call already completed successfully: this is a no-op and
   *   `operation` is not invoked.
   * - WHEN no prior call has completed: the guard is claimed synchronously,
   *   then `operation` is awaited exactly once.
   * - WHEN `operation` rejects: the guard is released (so a later call may
   *   retry) and the error is re-thrown to the caller.
   */
  run(operation: () => Promise<void>): Promise<void>;
}

/**
 * Creates a fresh {@link IdempotentRunner}.
 *
 * Each runner owns independent completion state; create one per logical
 * operation (e.g. one per quiz attempt).
 */
export function createIdempotentRunner(): IdempotentRunner {
  // Mirrors the component's `finalizedRef.current`.
  let completed = false;

  return {
    get hasCompleted(): boolean {
      return completed;
    },

    async run(operation: () => Promise<void>): Promise<void> {
      // Already finalized -> no-op (never invoke the operation again).
      if (completed) return;

      // Claim the guard *before* awaiting so concurrent triggers in the same
      // tick cannot both pass — this is what makes finalization idempotent.
      completed = true;
      try {
        await operation();
        // Success: the guard stays claimed forever (no reset).
      } catch (error) {
        // Failed attempt: release the guard so a later trigger may retry, and
        // surface the error so the caller can react (e.g. show a toast).
        completed = false;
        throw error;
      }
    },
  };
}
