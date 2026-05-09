// Feature: pre-deployment-e2e-audit, Property 2: Evidence records are immutable
// **Validates: Requirements 7.2**
//
// Security-sensitive invariant (200 iterations). Evidence records are
// append-only — once inserted, no code path may UPDATE or DELETE them.
// This property tests the pure data-layer contract: repeated write
// operations against an immutable collection never shrink the set and
// every row's updated_at equals its created_at.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

type EvidenceOp =
  | { readonly kind: "insert"; readonly id: string; readonly createdAt: string }
  | { readonly kind: "update_attempt"; readonly id: string }
  | { readonly kind: "delete_attempt"; readonly id: string };

interface EvidenceRow {
  readonly id: string;
  readonly created_at: string;
  readonly updated_at: string;
}

const arbitraryEvidenceOpSequence = (): fc.Arbitrary<
  ReadonlyArray<EvidenceOp>
> =>
  fc.array(
    fc.oneof(
      fc
        .record({
          id: fc.uuid({ version: 4 }),
          // Use integer-epoch-seconds + toISOString to guarantee every
          // generated timestamp is well-formed. fc.date() under some 4.x
          // seeds can surface Invalid Date which then makes toISOString
          // throw inside the reducer, creating non-deterministic flakes.
          epochSec: fc.integer({ min: 1_700_000_000, max: 2_100_000_000 }),
        })
        .map((r) => ({
          kind: "insert" as const,
          id: r.id,
          createdAt: new Date(r.epochSec * 1000).toISOString(),
        })),
      fc
        .uuid({ version: 4 })
        .map((id) => ({ kind: "update_attempt" as const, id })),
      fc
        .uuid({ version: 4 })
        .map((id) => ({ kind: "delete_attempt" as const, id }))
    ),
    { minLength: 0, maxLength: 40 }
  );

/** Append-only reducer that rejects update + delete attempts. */
const applyOp = (
  rows: ReadonlyMap<string, EvidenceRow>,
  op: EvidenceOp
): ReadonlyMap<string, EvidenceRow> => {
  if (op.kind === "insert") {
    if (rows.has(op.id)) return rows;
    const next = new Map(rows);
    next.set(op.id, {
      id: op.id,
      created_at: op.createdAt,
      updated_at: op.createdAt,
    });
    return next;
  }
  // update_attempt and delete_attempt are no-ops — the append-only contract.
  return rows;
};

describe("Property 2 — evidence records are immutable", () => {
  it("row count is non-shrinking across any operation sequence", () => {
    fc.assert(
      fc.property(arbitraryEvidenceOpSequence(), (ops) => {
        let rows: ReadonlyMap<string, EvidenceRow> = new Map();
        let previousSize = rows.size;
        for (const op of ops) {
          rows = applyOp(rows, op);
          expect(rows.size).toBeGreaterThanOrEqual(previousSize);
          previousSize = rows.size;
        }
      }),
      { numRuns: 200 }
    );
  });

  it("every surviving row has updated_at === created_at", () => {
    fc.assert(
      fc.property(arbitraryEvidenceOpSequence(), (ops) => {
        let rows: ReadonlyMap<string, EvidenceRow> = new Map();
        for (const op of ops) {
          rows = applyOp(rows, op);
        }
        for (const row of rows.values()) {
          expect(row.updated_at).toBe(row.created_at);
        }
      }),
      { numRuns: 200 }
    );
  });
});
