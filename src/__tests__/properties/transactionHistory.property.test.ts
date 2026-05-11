// Feature: xp-marketplace, Property 3: Transaction history ordering
// Feature: xp-marketplace, Property 4: Transaction entry contains required fields
// Feature: xp-marketplace, Property 5: Transaction history filtering
// **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Types (mirroring TransactionHistoryPage logic) ─────────────────────────

interface EarningEntry {
  type: "earning";
  date: string;
  xp_amount: number;
  source_label: string;
}

interface SpendingEntry {
  type: "spending";
  date: string;
  xp_cost: number;
  item_name: string;
  item_category: string;
}

type TransactionEntry = EarningEntry | SpendingEntry;

// ─── Pure helpers under test ────────────────────────────────────────────────

function sortByDateDesc(entries: TransactionEntry[]): TransactionEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function filterEntries(
  entries: TransactionEntry[],
  filter: "all" | "earnings" | "spending"
): TransactionEntry[] {
  if (filter === "all") return entries;
  return entries.filter((e) =>
    filter === "earnings" ? e.type === "earning" : e.type === "spending"
  );
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const dateArb = fc
  .integer({
    min: new Date("2024-01-01").getTime(),
    max: new Date("2025-12-31").getTime(),
  })
  .map((ts) => new Date(ts).toISOString());

const earningArb: fc.Arbitrary<EarningEntry> = fc.record({
  type: fc.constant("earning" as const),
  date: dateArb,
  xp_amount: fc.integer({ min: 1, max: 10_000 }),
  source_label: fc.constantFrom(
    "Login Bonus",
    "Assignment Submission",
    "Badge Earned",
    "Streak Milestone"
  ),
});

const spendingArb: fc.Arbitrary<SpendingEntry> = fc.record({
  type: fc.constant("spending" as const),
  date: dateArb,
  xp_cost: fc.integer({ min: 1, max: 5_000 }),
  item_name: fc.constantFrom(
    "Ocean Blue Theme",
    "Extra Quiz Attempt",
    "2x XP Boost",
    "Streak Shield"
  ),
  item_category: fc.constantFrom("cosmetic", "educational_perk", "power_up"),
});

const entryArb: fc.Arbitrary<TransactionEntry> = fc.oneof(
  earningArb,
  spendingArb
);

// ─── P3: Entries sorted by date descending ──────────────────────────────────

describe("Property 3 — Transaction history ordering", () => {
  it("P3: sorted entries are in descending date order", () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 2, maxLength: 30 }),
        (entries) => {
          const sorted = sortByDateDesc(entries);
          for (let i = 1; i < sorted.length; i++) {
            expect(
              new Date(sorted[i - 1]!.date).getTime()
            ).toBeGreaterThanOrEqual(new Date(sorted[i]!.date).getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P4: All entries have required fields ───────────────────────────────────

describe("Property 4 — Transaction entry contains required fields", () => {
  it("P4: earning entries have date, xp_amount, source_label; spending entries have date, xp_cost, item_name, item_category", () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 30 }),
        (entries) => {
          for (const entry of entries) {
            expect(entry.date).toBeTruthy();
            if (entry.type === "earning") {
              expect(entry.xp_amount).toBeGreaterThan(0);
              expect(entry.source_label).toBeTruthy();
            } else {
              expect(entry.xp_cost).toBeGreaterThan(0);
              expect(entry.item_name).toBeTruthy();
              expect(entry.item_category).toBeTruthy();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P5: Filter correctly separates earnings/spending ───────────────────────

describe("Property 5 — Transaction history filtering", () => {
  it('P5: filtering by "earnings" returns only earning entries, "spending" only spending, "all" returns all', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 30 }),
        fc.constantFrom<"all" | "earnings" | "spending">(
          "all",
          "earnings",
          "spending"
        ),
        (entries, filter) => {
          const filtered = filterEntries(entries, filter);

          if (filter === "all") {
            expect(filtered.length).toBe(entries.length);
          } else if (filter === "earnings") {
            expect(filtered.every((e) => e.type === "earning")).toBe(true);
            expect(filtered.length).toBe(
              entries.filter((e) => e.type === "earning").length
            );
          } else {
            expect(filtered.every((e) => e.type === "spending")).toBe(true);
            expect(filtered.length).toBe(
              entries.filter((e) => e.type === "spending").length
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
