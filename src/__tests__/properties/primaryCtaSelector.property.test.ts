// Feature: student-experience-remediation, Property 6: Primary CTA is the highest-priority applicable candidate
// **Validates: Requirements 16.1, 16.2, 16.3**
//
// For any set of candidate actions each marked applicable or not and carrying a
// priority, `selectPrimary` returns the single applicable candidate with the
// highest precedence (lowest priority value) when any applicable candidate
// exists and `null` otherwise; it never returns a non-applicable candidate; and
// after removing the selected candidate (or marking it non-applicable),
// re-selecting returns the next-highest-precedence applicable candidate.
// `orderSecondary` returns the remaining applicable candidates in precedence
// order without the primary.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  selectPrimary,
  orderSecondary,
  type CtaCandidate,
} from "@/lib/primaryCtaSelector";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a candidate set with unique ids (ids are stable identifiers, unique
 * within a candidate set per the contract). Priorities are intentionally drawn
 * from a small range so ties on `priority` are common, exercising the
 * deterministic input-order tie-break.
 */
const candidateSetArb: fc.Arbitrary<CtaCandidate[]> = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), {
    minLength: 0,
    maxLength: 8,
  })
  .chain((ids) =>
    fc.tuple(
      ...ids.map((id) =>
        fc.record({
          id: fc.constant(id),
          priority: fc.integer({ min: 0, max: 5 }),
          applicable: fc.boolean(),
        })
      )
    )
  );

// Reference implementation of "highest-precedence applicable candidate":
// lowest priority wins, ties broken by first occurrence in input order.
function expectedPrimary(
  candidates: readonly CtaCandidate[]
): CtaCandidate | null {
  let best: CtaCandidate | null = null;
  for (const c of candidates) {
    if (!c.applicable) continue;
    if (best === null || c.priority < best.priority) best = c;
  }
  return best;
}

// ─── P6: Primary CTA selection ──────────────────────────────────────────────

describe("Property 6 — Primary CTA is the highest-priority applicable candidate", () => {
  it("P6a: selectPrimary returns an applicable candidate, or null only when none applies", () => {
    fc.assert(
      fc.property(candidateSetArb, (candidates) => {
        const primary = selectPrimary(candidates);
        const anyApplicable = candidates.some((c) => c.applicable);

        if (!anyApplicable) {
          expect(primary).toBeNull();
        } else {
          expect(primary).not.toBeNull();
          // never returns a non-applicable candidate (R16.2)
          expect(primary?.applicable).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("P6b: selectPrimary returns the lowest-priority applicable candidate (ties → first in input order)", () => {
    fc.assert(
      fc.property(candidateSetArb, (candidates) => {
        const primary = selectPrimary(candidates);
        const expected = expectedPrimary(candidates);
        expect(primary).toEqual(expected);

        if (primary !== null) {
          // No applicable candidate has strictly higher precedence than the primary.
          for (const c of candidates) {
            if (c.applicable) {
              expect(c.priority).toBeGreaterThanOrEqual(primary.priority);
            }
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  it("P6c: removing the selected primary promotes the next-highest-precedence applicable candidate", () => {
    fc.assert(
      fc.property(candidateSetArb, (candidates) => {
        const primary = selectPrimary(candidates);
        if (primary === null) return; // nothing to promote

        // Remove the selected candidate and re-select.
        const removed = candidates.filter((c) => c.id !== primary.id);
        const promotedByRemoval = selectPrimary(removed);

        // Marking it non-applicable should yield the same promotion.
        const markedNonApplicable = candidates.map((c) =>
          c.id === primary.id ? { ...c, applicable: false } : c
        );
        const promotedByFlag = selectPrimary(markedNonApplicable);

        expect(promotedByRemoval).toEqual(promotedByFlag);

        // The promoted candidate is exactly the highest-precedence applicable
        // candidate among those other than the original primary.
        const expectedNext = expectedPrimary(removed);
        expect(promotedByRemoval).toEqual(expectedNext);

        // Promotion never resurrects the original primary.
        expect(promotedByRemoval?.id).not.toBe(primary.id);
      }),
      { numRuns: 200 }
    );
  });
});

// ─── P6: Secondary ordering ─────────────────────────────────────────────────

describe("Property 6 — orderSecondary returns the remaining applicable candidates in precedence order", () => {
  it("P6d: orderSecondary excludes the primary and all non-applicable candidates", () => {
    fc.assert(
      fc.property(candidateSetArb, (candidates) => {
        const primary = selectPrimary(candidates);
        const secondary = orderSecondary(candidates, primary?.id ?? null);

        // Never includes a non-applicable candidate (R16.2).
        for (const c of secondary) {
          expect(c.applicable).toBe(true);
        }
        // Never includes the primary (R16.4: secondary is subordinate to primary).
        if (primary !== null) {
          expect(secondary.some((c) => c.id === primary.id)).toBe(false);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("P6e: orderSecondary is sorted by ascending precedence with stable input-order tie-break", () => {
    fc.assert(
      fc.property(candidateSetArb, (candidates) => {
        const primary = selectPrimary(candidates);
        const secondary = orderSecondary(candidates, primary?.id ?? null);

        const indexOf = new Map(candidates.map((c, i) => [c.id, i] as const));
        for (let i = 1; i < secondary.length; i++) {
          const prev = secondary[i - 1];
          const curr = secondary[i];
          if (prev === undefined || curr === undefined) continue;
          if (prev.priority === curr.priority) {
            // ties preserve original input order
            expect(indexOf.get(prev.id)!).toBeLessThan(indexOf.get(curr.id)!);
          } else {
            expect(prev.priority).toBeLessThan(curr.priority);
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  it("P6f: primary + secondary partition exactly the applicable candidates (no loss, no duplication)", () => {
    fc.assert(
      fc.property(candidateSetArb, (candidates) => {
        const primary = selectPrimary(candidates);
        const secondary = orderSecondary(candidates, primary?.id ?? null);

        const applicableIds = candidates
          .filter((c) => c.applicable)
          .map((c) => c.id)
          .sort();

        const selectedIds = [
          ...(primary ? [primary.id] : []),
          ...secondary.map((c) => c.id),
        ].sort();

        // Exact partition: every applicable candidate appears once across
        // primary ∪ secondary, and nothing extra is introduced.
        expect(selectedIds).toEqual(applicableIds);
        expect(new Set(selectedIds).size).toBe(selectedIds.length);
      }),
      { numRuns: 200 }
    );
  });

  it("P6g: orderSecondary computes the primary itself when primaryId is omitted", () => {
    fc.assert(
      fc.property(candidateSetArb, (candidates) => {
        const primary = selectPrimary(candidates);
        const withImplicitPrimary = orderSecondary(candidates);
        const withExplicitPrimary = orderSecondary(
          candidates,
          primary?.id ?? null
        );
        expect(withImplicitPrimary).toEqual(withExplicitPrimary);
      }),
      { numRuns: 200 }
    );
  });
});
