// Feature: qa-partner-review-remediation, Property 7 (non-increasing allowlist)
// **Validates: Requirements 17.2, 17.4, 17.5, 17.7**
//
// Property 7 (design): *For any* pair of (baseline allowlist count, current set
// of detected `as never` violations), the Static_Cast_Guard SHALL pass **if and
// only if** every current violation is present in the allowlist **and** the
// current violation count does not exceed the recorded baseline; introducing any
// violation outside the allowlist, or exceeding the baseline count, SHALL fail.
//
// This exercises the PURE verdict `evaluateCastGuard(violations, allowlist)` from
// `src/lib/db/castGuard.ts` over arbitrary generated violation sets + allowlists.
// No I/O, no mocked Supabase — the real verdict logic is tested directly.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  evaluateCastGuard,
  type CastPattern,
  type CastViolation,
  type Allowlist,
  type AllowlistEntry,
} from "@/lib/db/castGuard";

const PATTERNS: readonly CastPattern[] = [
  "from-as-never",
  "insert-as-never",
  "update-as-never",
  "upsert-as-never",
];

/** Stable identity key for a (file, pattern) pair, matching the module's keying. */
const keyOf = (v: { file: string; pattern: CastPattern }): string =>
  `${v.file}::${v.pattern}`;

// ── Generators ────────────────────────────────────────────────────────────────
// Constrain to a small, realistic input space: a handful of distinct
// (file, pattern) identities so collisions and overlaps actually occur, plus
// arbitrary line numbers and multiplicities (a single (file, pattern) can occur
// on several lines, which is why `maxCount` is a separate occurrence-count gate).

const arbFile = fc.constantFrom(
  "src/hooks/useTeams.ts",
  "src/hooks/useChallenges.ts",
  "src/hooks/useCourses.ts",
  "src/hooks/usePLOs.ts",
  "src/pages/admin/Foo.tsx",
  "src/providers/LanguageProvider.tsx"
);
const arbPattern = fc.constantFrom(...PATTERNS);

/** One detected occurrence (file + pattern + 1-indexed line). */
const arbViolation: fc.Arbitrary<CastViolation> = fc.record({
  file: arbFile,
  pattern: arbPattern,
  line: fc.integer({ min: 1, max: 500 }),
});

/** An allowlist entry identity (file + pattern; no line, mirroring the design). */
const arbAllowEntry: fc.Arbitrary<AllowlistEntry> = fc.record({
  file: arbFile,
  pattern: arbPattern,
});

const arbViolations: fc.Arbitrary<CastViolation[]> = fc.array(arbViolation, {
  maxLength: 12,
});

/** De-duplicate allowlist entries by (file, pattern) — a real allowlist is a set. */
const arbEntries: fc.Arbitrary<AllowlistEntry[]> = fc
  .array(arbAllowEntry, { maxLength: 12 })
  .map((entries) => {
    const seen = new Set<string>();
    return entries.filter((e) => {
      const k = keyOf(e);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });

describe("Property 7 — non-increasing allowlist (evaluateCastGuard)", () => {
  it("passes IFF every live violation is allowlisted AND count <= maxCount AND no stale entry", () => {
    fc.assert(
      fc.property(
        arbViolations,
        arbEntries,
        // maxCount spans below/at/above the violation count so all three branches fire.
        fc.integer({ min: 0, max: 14 }),
        (violations, entries, maxCount) => {
          const allowlist: Allowlist = { maxCount, entries };
          const verdict = evaluateCastGuard(violations, allowlist);

          const allowKeys = new Set(entries.map(keyOf));
          const violationKeys = new Set(violations.map(keyOf));

          const everyViolationAllowed = violations.every((v) =>
            allowKeys.has(keyOf(v))
          );
          const noStaleEntry = entries.every((e) =>
            violationKeys.has(keyOf(e))
          );
          const withinCount = violations.length <= maxCount;

          const expectedPass =
            everyViolationAllowed && noStaleEntry && withinCount;

          // The IFF: the verdict's pass flag is exactly the conjunction.
          expect(verdict.pass).toBe(expectedPass);

          // Cross-checks on the structured verdict fields.
          expect(verdict.violationCount).toBe(violations.length);
          expect(verdict.countExceeded).toBe(!withinCount);
          expect(
            verdict.newViolations.every((v) => !allowKeys.has(keyOf(v)))
          ).toBe(true);
          expect(
            verdict.staleEntries.every((e) => !violationKeys.has(keyOf(e)))
          ).toBe(true);

          // A failing verdict must always explain itself (never a bare fail).
          if (!verdict.pass) {
            expect(verdict.reasons.length).toBeGreaterThan(0);
          } else {
            expect(verdict.reasons).toHaveLength(0);
          }

          // Sub-conditions ⇒ specific failure signals.
          if (!everyViolationAllowed) {
            expect(verdict.newViolations.length).toBeGreaterThan(0);
          }
          if (!noStaleEntry) {
            expect(verdict.staleEntries.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it("a NEW violation outside the allowlist fails (added on top of an otherwise-clean baseline)", () => {
    fc.assert(
      fc.property(arbViolations, arbViolation, (baseline, extra) => {
        // Allowlist exactly covers the baseline (set of identities), maxCount
        // generous, so the baseline alone would pass.
        const baselineEntries: AllowlistEntry[] = [];
        const seen = new Set<string>();
        for (const v of baseline) {
          const k = keyOf(v);
          if (!seen.has(k)) {
            seen.add(k);
            baselineEntries.push({ file: v.file, pattern: v.pattern });
          }
        }
        // Skip runs where the "extra" violation is actually already covered —
        // then it is not a *new* violation and the property doesn't apply.
        fc.pre(!seen.has(keyOf(extra)));

        const allowlist: Allowlist = {
          maxCount: baseline.length + 5,
          entries: baselineEntries,
        };
        const verdict = evaluateCastGuard([...baseline, extra], allowlist);

        expect(verdict.pass).toBe(false);
        expect(
          verdict.newViolations.some((v) => keyOf(v) === keyOf(extra))
        ).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("a STALE allowlist entry (no matching violation) fails", () => {
    fc.assert(
      fc.property(arbViolations, arbAllowEntry, (violations, ghost) => {
        const violationKeys = new Set(violations.map(keyOf));
        // Only meaningful when the ghost entry has no matching live violation.
        fc.pre(!violationKeys.has(keyOf(ghost)));

        // Allowlist = exactly the live violations + the ghost; maxCount generous.
        const liveEntries: AllowlistEntry[] = [];
        const seen = new Set<string>();
        for (const v of violations) {
          const k = keyOf(v);
          if (!seen.has(k)) {
            seen.add(k);
            liveEntries.push({ file: v.file, pattern: v.pattern });
          }
        }
        const allowlist: Allowlist = {
          maxCount: violations.length + 5,
          entries: [...liveEntries, ghost],
        };
        const verdict = evaluateCastGuard(violations, allowlist);

        expect(verdict.pass).toBe(false);
        expect(
          verdict.staleEntries.some((e) => keyOf(e) === keyOf(ghost))
        ).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("exceeding maxCount fails even when every (file, pattern) is allowlisted", () => {
    fc.assert(
      fc.property(
        fc.array(arbViolation, { minLength: 1, maxLength: 12 }),
        (violations) => {
          // Allowlist covers all identities, so the only failure cause is count.
          const entries: AllowlistEntry[] = [];
          const seen = new Set<string>();
          for (const v of violations) {
            const k = keyOf(v);
            if (!seen.has(k)) {
              seen.add(k);
              entries.push({ file: v.file, pattern: v.pattern });
            }
          }
          // Baseline strictly below the live occurrence count ⇒ count regressed.
          const allowlist: Allowlist = {
            maxCount: violations.length - 1,
            entries,
          };
          const verdict = evaluateCastGuard(violations, allowlist);

          expect(verdict.countExceeded).toBe(true);
          expect(verdict.pass).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});
