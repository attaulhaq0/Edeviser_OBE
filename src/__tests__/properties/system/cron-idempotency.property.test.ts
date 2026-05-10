// Feature: pre-deployment-e2e-audit, Property 14: Cron idempotency
// **Validates: Requirements 15.3**
//
// For the idempotent-reducer slice of every cron handler, applying the
// same input twice produces the same state as applying it once. This is
// the pure-function contract every cron body must satisfy at the data
// layer so a retry never duplicates rows.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  applyCron,
  arbitraryCronInput,
  type CronState,
} from "@/__tests__/properties/_generators/cronInputs";

describe("Property 14 — cron idempotency", () => {
  it("applyCron(applyCron(s, i), i) equals applyCron(s, i) for any initial state", () => {
    fc.assert(
      fc.property(arbitraryCronInput(), (input) => {
        const initial: CronState = {};
        const once = applyCron(initial, input);
        const twice = applyCron(once, input);
        expect(twice).toEqual(once);
      }),
      { numRuns: 200 }
    );
  });

  it("applyCron is associative over identical inputs — any number of calls converges", () => {
    fc.assert(
      fc.property(
        arbitraryCronInput(),
        fc.integer({ min: 1, max: 10 }),
        (input, callCount) => {
          const first = applyCron({}, input);
          let state: CronState = first;
          for (let i = 0; i < callCount; i += 1) {
            state = applyCron(state, input);
          }
          expect(state).toEqual(first);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("applying two different inputs commutes on non-conflicting student sets", () => {
    fc.assert(
      fc.property(
        fc.record({
          runDate: fc.constantFrom("2026-06-01", "2026-06-02"),
          studentsA: fc.array(fc.uuid({ version: 4 }), {
            minLength: 0,
            maxLength: 10,
          }),
          studentsB: fc.array(fc.uuid({ version: 4 }), {
            minLength: 0,
            maxLength: 10,
          }),
        }),
        ({ runDate, studentsA, studentsB }) => {
          const aThenB = applyCron(
            applyCron({}, { runDate, eligibleStudentIds: studentsA }),
            { runDate, eligibleStudentIds: studentsB }
          );
          const bThenA = applyCron(
            applyCron({}, { runDate, eligibleStudentIds: studentsB }),
            { runDate, eligibleStudentIds: studentsA }
          );
          expect(aThenB).toEqual(bThenA);
        }
      ),
      { numRuns: 100 }
    );
  });
});
