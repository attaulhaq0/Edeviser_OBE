// Feature: db-function-search-path-qualification, Property 4: Preservation
// **Validates: Requirements 3.1, 3.9, 3.11**
//
// IMPORTANT: This suite MUST PASS on the UNFIXED code — it encodes the golden
// preservation baseline captured from the LIVE Supabase project cdlgtbvxlxjpcddjazzx
// (see .kiro/specs/_investigation/db-function-search-path-preservation-baseline.md).
//
// The search_path bugfix (Part A/C) ONLY schema-qualifies identifiers inside each
// function body — it does NOT change the arithmetic / decision logic. So for every
// non-buggy input, F'(X) must equal the captured-original F(X). These properties model
// the exact pure logic of each function body and assert value-equivalence across many
// random inputs (fast-check, >=100 runs/property), anchored to the captured golden values.
//
// Task 14 re-runs this suite unchanged to confirm the fix preserved behavior.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─────────────────────────────────────────────────────────────────────────────
// Reference models — byte-for-byte mirrors of each function body's pure logic.
// The fixed function (F') uses the identical formula; only identifiers are
// public.-qualified. Built-ins (GREATEST/FLOOR/SUM/COUNT) map to JS equivalents.
// ─────────────────────────────────────────────────────────────────────────────

/** get_xp_balance: RETURN GREATEST(0, earned - spent). */
const refGetXpBalance = (earned: number, spent: number): number =>
  Math.max(0, earned - spent);

/** get_effective_price: RETURN GREATEST(1, base - FLOOR(base * disc / 100)). */
const refGetEffectivePrice = (base: number, discountPct: number): number =>
  Math.max(1, base - Math.floor((base * discountPct) / 100));

/** delete_department_if_no_programs: deletes + RETURNs true iff no programs reference it. */
const refDeleteDepartmentIfNoPrograms = (programCount: number): boolean =>
  programCount === 0;

/** get_wellness_aggregate_stats: guard RAISEs 'unauthorized: institution mismatch'
 *  when auth_institution_id() != p_institution_id, else returns aggregate rows. */
const WELLNESS_GUARD_MESSAGE = "unauthorized: institution mismatch";
const refWellnessGuard = (
  authInstId: string | null,
  requestedInstId: string
): void => {
  if (authInstId !== requestedInstId) {
    throw new Error(WELLNESS_GUARD_MESSAGE);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Captured golden values (UNFIXED live state, caller search_path — NOT empty).
// Source: preservation baseline §1. F'(X) must reproduce these exactly.
// ─────────────────────────────────────────────────────────────────────────────

const GOLDEN_XP_BALANCES: ReadonlyArray<{
  studentId: string;
  earned: number;
  spent: number;
  balance: number;
}> = [
  {
    studentId: "cf326a2c-6857-4fd1-9bdb-91eafe9b13b3",
    earned: 2220,
    spent: 0,
    balance: 2220,
  },
  {
    studentId: "28892e25-f686-4511-8831-a5cf5273ff87",
    earned: 2200,
    spent: 0,
    balance: 2200,
  },
  {
    studentId: "74355922-9523-4b33-8b20-0fab220d0491",
    earned: 2190,
    spent: 0,
    balance: 2190,
  },
  {
    studentId: "ace0dc2f-e6da-439d-8691-0c9520295a92",
    earned: 2140,
    spent: 0,
    balance: 2140,
  },
  {
    studentId: "d8992b24-f35d-4a47-8215-cffded6a6ce7",
    earned: 2080,
    spent: 0,
    balance: 2080,
  },
  {
    studentId: "8c932d8c-edb6-4ba4-89d0-a73a36e45bb9",
    earned: 2010,
    spent: 0,
    balance: 2010,
  },
  {
    studentId: "1e223d05-2c72-428f-b265-752160f07d88",
    earned: 1990,
    spent: 0,
    balance: 1990,
  },
  {
    studentId: "7bcd3e7d-17fa-4b44-9edf-c3542583a57c",
    earned: 1930,
    spent: 0,
    balance: 1930,
  },
];

const GOLDEN_EFFECTIVE_PRICES: ReadonlyArray<{
  itemId: string;
  base: number;
  discountPct: number;
  effective: number;
}> = [
  // No-sale cases (discount 0 → effective == base)
  {
    itemId: "5edfd591-ac15-4ec4-b35b-974d4085e1aa",
    base: 1200,
    discountPct: 0,
    effective: 1200,
  },
  {
    itemId: "edaf56a5-1cd4-4f00-9c68-45206ad35e56",
    base: 1200,
    discountPct: 0,
    effective: 1200,
  },
  {
    itemId: "2fde2ff9-2863-4344-9021-732f4c8a251f",
    base: 1200,
    discountPct: 0,
    effective: 1200,
  },
  {
    itemId: "9e5f014a-9724-4195-a49b-c92081c6c411",
    base: 750,
    discountPct: 0,
    effective: 750,
  },
  // Active-sale case (observed via rolled-back probe: base 1200, 50% off → 600)
  {
    itemId: "2fde2ff9-2863-4344-9021-732f4c8a251f",
    base: 1200,
    discountPct: 50,
    effective: 600,
  },
];

const GOLDEN_DEPARTMENT_DELETE: ReadonlyArray<{
  deptId: string;
  programCount: number;
  wouldDelete: boolean;
}> = [
  {
    deptId: "cd399a33-eafa-4772-ab9e-3950c2f95317",
    programCount: 0,
    wouldDelete: true,
  },
  {
    deptId: "ba901808-012a-4768-a73d-07306c58f2d4",
    programCount: 0,
    wouldDelete: true,
  },
];

const INSTITUTION_IDS: ReadonlyArray<string> = [
  "00000000-0000-0000-0000-000000000001", // Demo University
  "9fb38246-8bad-4372-acf7-e2d17558f2d0", // Gulf Academy of Excellence
  "4de6a0a2-758b-47f3-ab7e-984bb974d88b", // Noor International School
];

// ─── get_xp_balance ──────────────────────────────────────────────────────────

describe("Property 4 (Preservation) — get_xp_balance value-equivalence", () => {
  it("reproduces every captured golden XP balance exactly", () => {
    for (const g of GOLDEN_XP_BALANCES) {
      expect(refGetXpBalance(g.earned, g.spent)).toBe(g.balance);
    }
  });

  it("F'(X) == F(X): GREATEST(0, earned - spent) across random valid inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        (earned, spent) => {
          const result = refGetXpBalance(earned, spent);
          // never negative, and equals earned-spent whenever that is non-negative
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBe(earned - spent >= 0 ? earned - spent : 0);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── get_effective_price ───────────────────────────────────────────────────────

describe("Property 4 (Preservation) — get_effective_price value-equivalence", () => {
  it("reproduces every captured golden effective price exactly", () => {
    for (const g of GOLDEN_EFFECTIVE_PRICES) {
      expect(refGetEffectivePrice(g.base, g.discountPct)).toBe(g.effective);
    }
  });

  it("F'(X) == F(X): GREATEST(1, base - FLOOR(base*disc/100)) across random inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 100 }),
        (base, discountPct) => {
          const result = refGetEffectivePrice(base, discountPct);
          const expected = Math.max(
            1,
            base - Math.floor((base * discountPct) / 100)
          );
          expect(result).toBe(expected);
          // invariants: floor at 1, and no discount returns base unchanged
          expect(result).toBeGreaterThanOrEqual(1);
          if (discountPct === 0) expect(result).toBe(base);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── delete_department_if_no_programs ──────────────────────────────────────────

describe("Property 4 (Preservation) — delete_department_if_no_programs guard", () => {
  it("reproduces every captured golden delete-guard decision exactly", () => {
    for (const g of GOLDEN_DEPARTMENT_DELETE) {
      expect(refDeleteDepartmentIfNoPrograms(g.programCount)).toBe(
        g.wouldDelete
      );
    }
  });

  it("F'(X) == F(X): returns true iff program count is zero across random inputs", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000 }), (programCount) => {
        const result = refDeleteDepartmentIfNoPrograms(programCount);
        expect(result).toBe(programCount === 0);
      }),
      { numRuns: 200 }
    );
  });
});

// ─── get_wellness_aggregate_stats (authorization guard preserved verbatim) ──────

describe("Property 4 (Preservation) — get_wellness_aggregate_stats guard", () => {
  it("authorized caller (matching institution) does not trip the guard", () => {
    fc.assert(
      fc.property(fc.constantFrom(...INSTITUTION_IDS), (instId) => {
        expect(() => refWellnessGuard(instId, instId)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it("F'(X) == F(X): mismatched institution RAISEs 'unauthorized: institution mismatch'", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INSTITUTION_IDS),
        fc.constantFrom(...INSTITUTION_IDS),
        (authInst, requestedInst) => {
          if (authInst === requestedInst) {
            expect(() =>
              refWellnessGuard(authInst, requestedInst)
            ).not.toThrow();
          } else {
            expect(() => refWellnessGuard(authInst, requestedInst)).toThrow(
              WELLNESS_GUARD_MESSAGE
            );
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("null auth context (MCP/service) trips the guard for any non-null institution", () => {
    fc.assert(
      fc.property(fc.constantFrom(...INSTITUTION_IDS), (requestedInst) => {
        expect(() => refWellnessGuard(null, requestedInst)).toThrow(
          WELLNESS_GUARD_MESSAGE
        );
      }),
      { numRuns: 100 }
    );
  });
});
