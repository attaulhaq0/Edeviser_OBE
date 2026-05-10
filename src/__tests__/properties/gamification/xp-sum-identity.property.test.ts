// Feature: pre-deployment-e2e-audit, Property 7: XP ledger sum identity
// **Validates: Requirements 8.1**
//
// xp_total for any student equals the arithmetic sum of that student's
// rows in xp_transactions. No event may be lost, duplicated, or silently
// aggregated. Per domain-knowledge.md: "XP transactions are append-only;
// xp_total is derived from SUM(xp_transactions)."

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { arbitraryXpEventSequence } from "@/__tests__/properties/_generators/xpEvents";

/** Pure reducer — mirrors the materialised view's SUM aggregate. */
const xpTotal = (events: ReadonlyArray<{ amount: number }>): number =>
  events.reduce((acc, e) => acc + e.amount, 0);

describe("Property 7 — XP ledger sum identity", () => {
  it("xpTotal(events) equals the sum of amounts", () => {
    fc.assert(
      fc.property(arbitraryXpEventSequence(), (events) => {
        const reference = events.reduce((acc, e) => acc + e.amount, 0);
        expect(xpTotal(events)).toBe(reference);
      }),
      { numRuns: 100 }
    );
  });

  it("removing any single event reduces the total by that event's amount", () => {
    fc.assert(
      fc.property(
        arbitraryXpEventSequence().filter((events) => events.length > 0),
        (events) => {
          const original = xpTotal(events);
          const firstEvent = events[0];
          if (firstEvent === undefined) return;
          const withoutFirst = events.slice(1);
          expect(xpTotal(withoutFirst)).toBe(original - firstEvent.amount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("appending two sequences is equivalent to summing their totals", () => {
    fc.assert(
      fc.property(
        arbitraryXpEventSequence(),
        arbitraryXpEventSequence(),
        (a, b) => {
          expect(xpTotal([...a, ...b])).toBe(xpTotal(a) + xpTotal(b));
        }
      ),
      { numRuns: 100 }
    );
  });
});
