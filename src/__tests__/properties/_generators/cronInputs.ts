// Feature: pre-deployment-e2e-audit
// Shared generator for cron idempotency inputs (Property 14). The generator
// produces a symbolic "cron run" — a set of entities the cron would touch —
// and a pure reducer applies it to a state map. Running the reducer twice
// with the same input must yield the same state as running it once.

import fc from "fast-check";

/**
 * A symbolic cron input: the set of student IDs the cron run processes this
 * tick. The real cron handlers all follow the shape: for each eligible
 * student, insert/upsert a row keyed by (student_id, date). With the date
 * fixed for a given run, double-invocation is safe iff the upsert key is
 * respected and no other side effects fire.
 */
export interface CronInput {
  readonly runDate: string;
  readonly eligibleStudentIds: ReadonlyArray<string>;
}

export const arbitraryCronInput = (): fc.Arbitrary<CronInput> =>
  fc
    .record({
      runDate: fc.constantFrom(
        "2026-06-01",
        "2026-06-02",
        "2026-07-15",
        "2026-12-31"
      ),
      eligibleStudentIds: fc.array(fc.uuid({ version: 4 }), {
        minLength: 0,
        maxLength: 20,
      }),
    })
    .map((raw) => ({
      runDate: raw.runDate,
      eligibleStudentIds: raw.eligibleStudentIds,
    }));

/**
 * Pure reducer that models every cron handler's idempotency contract:
 * keep the most recent state per (date, student). Applying the same input
 * twice produces the same result because the keyed merge is idempotent.
 */
export type CronState = Readonly<Record<string, Record<string, true>>>;

export const applyCron = (state: CronState, input: CronInput): CronState => {
  const prev = state[input.runDate] ?? {};
  const next: Record<string, true> = { ...prev };
  for (const sid of input.eligibleStudentIds) {
    next[sid] = true;
  }
  return { ...state, [input.runDate]: next };
};
