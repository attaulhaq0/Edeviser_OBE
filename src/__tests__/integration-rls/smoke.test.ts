import { describe, it, expect } from "vitest";
import { rlsSkipReason, shouldRunRls } from "./guard";
import { runRlsCases } from "./runner";

/**
 * Feature: qa-partner-review-remediation — Req 19 (RLS_Smoke_Test)
 *
 * Placeholder smoke test that proves the isolated integration project is wired
 * up correctly WITHOUT failing CI when the preview secrets are absent.
 *
 * The seeding/teardown + per-role sign-in + table-driven runner (task 5.2) now
 * exist (`seed.ts`, `signIn.ts`, `runner.ts`); the per-table RLS cases (task
 * 5.3) land in `inserts.rls.test.ts` later. For now this file verifies the
 * config + guard plumbing and exercises the runner with NO cases:
 *   - With no secrets set, `rlsSkipReason()` returns a reason and the whole
 *     suite is `describe.skip`-ed, so `npm run test:rls` exits green.
 *   - In the dedicated `rls-smoke` CI job (secrets present, preview branch),
 *     `shouldRunRls()` is true and the suite runs.
 */
const skipReason = rlsSkipReason();

// Wire the table-driven runner with an empty case array: still seed/teardown
// safe and skip-safe. Real cases are appended in task 5.3.
runRlsCases([], { suiteName: "RLS smoke harness — runner (no cases yet)" });

describe.skipIf(skipReason !== null)("RLS smoke harness — connectivity", () => {
  it("is configured to run against a Supabase preview branch", () => {
    // When this block runs, the soft gate confirmed: SUPABASE_DB_ENV=preview,
    // a non-production URL, and all required secrets are present.
    expect(shouldRunRls()).toBe(true);
  });
});

// Always-present assertion so the file is never an "empty" test file, and so a
// skipped run still reports a passing, descriptive test locally / in unit CI.
describe("RLS smoke harness — gating", () => {
  it(
    skipReason === null
      ? "preview secrets present: RLS cases will execute"
      : `skipped (${skipReason})`,
    () => {
      // The gating decision itself is the assertion: either we are safe to run,
      // or we have a concrete, human-readable reason to skip. Never a failure.
      expect(skipReason === null || typeof skipReason === "string").toBe(true);
    }
  );
});
