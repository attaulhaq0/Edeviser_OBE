// Feature: qa-partner-review-remediation, Property 6 (schema-contract validation soundness)
// **Validates: Requirements 18.1, 18.2, 18.3, 18.7**
//
// Property 6 (design): *For any* mutation descriptor `{ table, payloadKeys }`
// checked against a schema model `{ insertColumns, requiredColumns }`, the
// Schema_Contract_Test validator SHALL flag exactly the payload keys that are not
// Real_Columns and exactly the Required_Columns absent from `payloadKeys` —
// flagging no compliant payload and passing no payload that has an unknown key or
// a missing required column.
//
// This exercises the PURE `validateDescriptor` / `validateDescriptors` from
// `src/lib/db/schemaContract.ts` over arbitrary {insertColumns, requiredColumns,
// payloadKeys}. The oracle is computed independently as straight set arithmetic:
//   unknown-column          = payloadKeys − insertColumns
//   missing-required-column = requiredColumns − payloadKeys
// No false positives, no false negatives.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateDescriptor,
  validateDescriptors,
  type ContractViolation,
  type MutationContractDescriptor,
  type SchemaModel,
} from "@/lib/db/schemaContract";

// ── Generators ──────────────────────────────────────────────────────────────
// A modest column vocabulary so payloadKeys, insertColumns, and requiredColumns
// overlap in interesting ways (some keys real+required, some real-only, some
// unknown, some required-but-missing). `requiredColumns ⊆ insertColumns` in a
// real schema (a required column is a real column), so the generator enforces
// that invariant by drawing requiredColumns from insertColumns.

const arbColumn = fc.constantFrom(
  "id",
  "name",
  "title",
  "course_id",
  "institution_id",
  "captain_id",
  "created_by",
  "status",
  "start_date",
  "end_date",
  "goal_target",
  "xp_race_acknowledged", // a classic UI-only non-column
  "avatar_letter",
  "description"
);

const arbColumnSet = (maxLength: number): fc.Arbitrary<string[]> =>
  fc.array(arbColumn, { maxLength }).map((cols) => Array.from(new Set(cols)));

const arbOp = fc.constantFrom<"insert" | "upsert">("insert", "upsert");

/** A descriptor + a schema model whose requiredColumns ⊆ insertColumns. */
const arbCase: fc.Arbitrary<{
  descriptor: MutationContractDescriptor;
  model: SchemaModel;
}> = fc
  .record({
    hook: fc.constantFrom("useCreateTeam", "useCreateChallenge", "sendNudge"),
    table: fc.constantFrom("teams", "social_challenges", "notifications"),
    payloadKeys: arbColumnSet(10),
    insertColumns: arbColumnSet(12),
    op: arbOp,
  })
  .chain(({ hook, table, payloadKeys, insertColumns, op }) =>
    // requiredColumns is a subset of insertColumns (schema-faithful).
    fc.subarray(insertColumns).map((requiredColumns) => ({
      descriptor: { hook, table, payloadKeys, op },
      model: { insertColumns, requiredColumns },
    }))
  );

// Independent oracle (re-implemented as plain set arithmetic, not the SUT).
const expectedUnknown = (
  payloadKeys: readonly string[],
  insertColumns: readonly string[]
): string[] => {
  const real = new Set(insertColumns);
  return payloadKeys.filter((k) => !real.has(k));
};
const expectedMissing = (
  requiredColumns: readonly string[],
  payloadKeys: readonly string[]
): string[] => {
  const sent = new Set(payloadKeys);
  return requiredColumns.filter((c) => !sent.has(c));
};

const unknownKeys = (vs: ContractViolation[]): string[] =>
  vs.filter((v) => v.kind === "unknown-column").map((v) => v.key);
const missingCols = (vs: ContractViolation[]): string[] =>
  vs.filter((v) => v.kind === "missing-required-column").map((v) => v.column);

describe("Property 6 — schema-contract validation soundness (validateDescriptor)", () => {
  it("flags EXACTLY the unknown keys and EXACTLY the missing required columns (no FP/FN)", () => {
    fc.assert(
      fc.property(arbCase, ({ descriptor, model }) => {
        const violations = validateDescriptor(descriptor, model);

        const gotUnknown = unknownKeys(violations).sort();
        const gotMissing = missingCols(violations).sort();
        const wantUnknown = expectedUnknown(
          descriptor.payloadKeys,
          model.insertColumns
        ).sort();
        const wantMissing = expectedMissing(
          model.requiredColumns,
          descriptor.payloadKeys
        ).sort();

        // Soundness + completeness: the flagged sets equal the oracle sets.
        expect(gotUnknown).toEqual(wantUnknown);
        expect(gotMissing).toEqual(wantMissing);

        // Every violation always names the offending key/column AND the table
        // (Req 18.2/18.3) — a failure is never reported without identification.
        for (const v of violations) {
          expect(v.table).toBe(descriptor.table);
          expect(v.hook).toBe(descriptor.hook);
          if (v.kind === "unknown-column") {
            expect(typeof v.key).toBe("string");
            expect(v.key.length).toBeGreaterThan(0);
          } else {
            expect(typeof v.column).toBe("string");
            expect(v.column.length).toBeGreaterThan(0);
          }
        }
      }),
      { numRuns: 300 }
    );
  });

  it("a compliant payload (every required present, no unknown keys) yields zero violations", () => {
    fc.assert(
      fc.property(
        arbColumnSet(12).filter((c) => c.length > 0),
        arbOp,
        (insertColumns, op) => {
          // requiredColumns ⊆ insertColumns; payload sends exactly the real
          // columns (a superset of required) ⇒ contract-clean by construction.
          const requiredColumns = insertColumns.slice(
            0,
            Math.ceil(insertColumns.length / 2)
          );
          const descriptor: MutationContractDescriptor = {
            hook: "useCreateTeam",
            table: "teams",
            payloadKeys: insertColumns,
            op,
          };
          const model: SchemaModel = { insertColumns, requiredColumns };
          expect(validateDescriptor(descriptor, model)).toHaveLength(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("validateDescriptors accumulates violations across the whole batch", () => {
    fc.assert(
      fc.property(fc.array(arbCase, { maxLength: 6 }), (cases) => {
        const descriptors = cases.map((c) => c.descriptor);
        // Resolve each descriptor to its paired model by object identity, so the
        // mapping is robust to duplicate descriptor shapes.
        const modelFor = new Map<MutationContractDescriptor, SchemaModel>(
          cases.map((c) => [c.descriptor, c.model] as const)
        );
        const all = validateDescriptors(
          descriptors,
          (d) => modelFor.get(d) as SchemaModel
        );

        const expectedTotal = cases.reduce(
          (sum, c) =>
            sum +
            expectedUnknown(c.descriptor.payloadKeys, c.model.insertColumns)
              .length +
            expectedMissing(c.model.requiredColumns, c.descriptor.payloadKeys)
              .length,
          0
        );
        expect(all).toHaveLength(expectedTotal);
      }),
      { numRuns: 200 }
    );
  });
});
