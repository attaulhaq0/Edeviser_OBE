// Feature: student-experience-remediation, Property 8: Finalization is idempotent (no double-submit)
// For any number and ordering of finalization triggers (timer expiry, manual finish,
// unmount) guarded by the finalized flag, the quiz attempt submission is invoked at
// most once.
// **Validates: Requirements 3.4**
//
// Task 11.2 fixed AdaptiveQuizSession's timer with a finalize guard so that
// finalization runs at most once across timer expiry, unmount, and manual submit.
// Task 11.3 extracts that guard into the pure `createIdempotentRunner` helper in
// `src/lib/idempotentRunner.ts` and the component drives finalization through it.
//
// This property test exercises the REAL helper (not a re-implemented model) so the
// idempotence invariant is asserted against the exact code the component runs: for
// ANY count and ordering of triggers the underlying submission succeeds at most once,
// and no submission is ever issued after a successful one. A failed submission
// releases the guard so a later trigger may retry.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createIdempotentRunner } from "@/lib/idempotentRunner";

/** The three sources that can trigger finalization in AdaptiveQuizSession. */
type TriggerKind = "timer" | "manual" | "unmount";

/** A single finalization trigger plus the outcome its submission would have. */
interface Trigger {
  readonly kind: TriggerKind;
  /** Whether the (mocked) submission for this trigger would succeed. */
  readonly submitSucceeds: boolean;
}

/** Outcome of an individual submission attempt produced by the guard. */
type SubmissionOutcome = "success" | "fail";

/**
 * Drives the REAL `createIdempotentRunner` guard with the given trigger
 * sequence, mirroring how AdaptiveQuizSession's `finalizeQuiz` calls
 * `finalizeGuardRef.current.run(...)`. Each trigger attempts to submit; a
 * failing submission throws (the runner releases the guard and re-throws,
 * which the component catches to show a toast).
 *
 * Returns the ordered log of submission outcomes that actually ran.
 */
async function runFinalizeGuard(
  hasSession: boolean,
  triggers: readonly Trigger[]
): Promise<SubmissionOutcome[]> {
  const runner = createIdempotentRunner();
  const submissions: SubmissionOutcome[] = [];

  for (const trigger of triggers) {
    // if (!session) return; — cannot finalize before a session exists.
    if (!hasSession) continue;

    try {
      await runner.run(async () => {
        // The guarded operation == the quiz submission. It only runs when the
        // runner lets it through (i.e. not already completed).
        if (trigger.submitSucceeds) {
          submissions.push("success");
        } else {
          submissions.push("fail");
          throw new Error("submit failed");
        }
      });
    } catch {
      // Mirrors the component's catch: the runner already released the guard so
      // a later trigger may retry.
    }
  }

  return submissions;
}

const triggerArb: fc.Arbitrary<Trigger> = fc.record({
  kind: fc.constantFrom<TriggerKind>("timer", "manual", "unmount"),
  submitSucceeds: fc.boolean(),
});

// Arbitrary-length, arbitrary-order sequences of triggers (including empty).
const triggerSequenceArb = fc.array(triggerArb, {
  minLength: 0,
  maxLength: 50,
});

describe("AdaptiveQuizSession finalize guard — Property 8: finalization is idempotent", () => {
  // Core invariant: across ANY count/ordering of triggers, the attempt is
  // successfully submitted at most once.
  it("submits the attempt successfully at most once for any trigger sequence", async () => {
    await fc.assert(
      fc.asyncProperty(triggerSequenceArb, async (triggers) => {
        const outcomes = await runFinalizeGuard(true, triggers);
        const successes = outcomes.filter((o) => o === "success").length;
        expect(successes).toBeLessThanOrEqual(1);
      }),
      { numRuns: 300 }
    );
  });

  // Once a submission succeeds, no further submission is ever issued — the
  // success (if any) is always the final attempt in the log.
  it("never issues a submission after a successful one", async () => {
    await fc.assert(
      fc.asyncProperty(triggerSequenceArb, async (triggers) => {
        const outcomes = await runFinalizeGuard(true, triggers);
        const successIndex = outcomes.indexOf("success");
        if (successIndex !== -1) {
          // A success must be the last recorded submission outcome.
          expect(successIndex).toBe(outcomes.length - 1);
        }
      }),
      { numRuns: 300 }
    );
  });

  // The simplest reading of Property 8: when submissions succeed, the attempt is
  // submitted at most once regardless of how many triggers fire or their order.
  it("submits at most once when every submission would succeed", async () => {
    const successTriggerArb = fc.record({
      kind: fc.constantFrom<TriggerKind>("timer", "manual", "unmount"),
      submitSucceeds: fc.constant(true),
    });
    await fc.assert(
      fc.asyncProperty(
        fc.array(successTriggerArb, { minLength: 1, maxLength: 50 }),
        async (triggers) => {
          const outcomes = await runFinalizeGuard(true, triggers);
          expect(outcomes.length).toBe(1);
          expect(outcomes[0]).toBe("success");
        }
      ),
      { numRuns: 200 }
    );
  });

  // A failed submission resets the guard so a later trigger may retry, but the
  // number of successful submissions never exceeds one.
  it("allows retries after failure yet still caps successful submissions at one", async () => {
    await fc.assert(
      fc.asyncProperty(triggerSequenceArb, async (triggers) => {
        const outcomes = await runFinalizeGuard(true, triggers);
        const failures = outcomes.filter((o) => o === "fail").length;
        const successes = outcomes.filter((o) => o === "success").length;
        // Total attempts accounted for entirely by failures + successes.
        expect(failures + successes).toBe(outcomes.length);
        expect(successes).toBeLessThanOrEqual(1);
      }),
      { numRuns: 300 }
    );
  });

  // Before a session exists, no trigger can finalize — submission is never invoked.
  it("never submits while there is no active session", async () => {
    await fc.assert(
      fc.asyncProperty(triggerSequenceArb, async (triggers) => {
        const outcomes = await runFinalizeGuard(false, triggers);
        expect(outcomes.length).toBe(0);
      }),
      { numRuns: 200 }
    );
  });

  // `hasCompleted` reflects the guard state: true exactly when a success ran.
  it("exposes hasCompleted true exactly when a submission has succeeded", async () => {
    await fc.assert(
      fc.asyncProperty(triggerSequenceArb, async (triggers) => {
        const runner = createIdempotentRunner();
        let succeeded = false;
        for (const trigger of triggers) {
          try {
            await runner.run(async () => {
              if (!trigger.submitSucceeds) throw new Error("submit failed");
              succeeded = true;
            });
          } catch {
            // failed submit -> guard released
          }
        }
        expect(runner.hasCompleted).toBe(succeeded);
      }),
      { numRuns: 200 }
    );
  });

  // Concurrent (interleaved, same-tick) triggers cannot both pass the guard:
  // firing many runs in parallel still results in at most one success because
  // the guard is claimed synchronously before the submission is awaited.
  it("admits at most one success even when triggers fire concurrently", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 25 }),
        async (parallelCount) => {
          const runner = createIdempotentRunner();
          let successes = 0;
          await Promise.all(
            Array.from({ length: parallelCount }, () =>
              runner
                .run(async () => {
                  successes += 1;
                })
                .catch(() => undefined)
            )
          );
          expect(successes).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Each runner owns independent state — one finalized attempt does not block a
  // fresh attempt (e.g. a new quiz attempt id gets a new guard).
  it("isolates completion state per runner instance", async () => {
    const first = createIdempotentRunner();
    await first.run(async () => undefined);
    expect(first.hasCompleted).toBe(true);

    const second = createIdempotentRunner();
    expect(second.hasCompleted).toBe(false);
    let ran = false;
    await second.run(async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });
});
