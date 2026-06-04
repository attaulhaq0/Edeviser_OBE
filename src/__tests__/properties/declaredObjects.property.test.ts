// Feature: qa-partner-review-remediation, Property 9 (declared-object existence)
// **Validates: Requirements 20.1, 20.2, 20.5**
//
// Property 9 (design): *For any* DB object declared as created by a completed
// task in the declared-objects manifest, that object SHALL exist in the target
// schema; the Declared_Object_Check SHALL pass if and only if every declared
// object is present, and on failure SHALL name the missing object and its
// declaring task.
//
// This exercises the PURE verdict `findMissingObjects(declared, presentKeys)`
// extracted to `scripts/lib/declared-objects-verdict.mjs` and consumed by
// `scripts/check-declared-objects.mjs` (the script does the impure manifest read
// + Postgres query; the verdict is pure set difference). The oracle here computes
// `missing = declared − present` independently and asserts:
//   • missing set equals declared − present (keyed on type+schema+name),
//   • the check "passes" iff missing is empty,
//   • every missing item carries its declaringTask (Req 20.2).

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  findMissingObjects,
  buildPresentSet,
  objectKey,
  DEFAULT_SCHEMA,
  type DeclaredObject,
  type PresentObject,
} from "../../../scripts/lib/declared-objects-verdict.mjs";

// ── Generators ──────────────────────────────────────────────────────────────
// Small vocabularies of type/name/schema so declared and present sets overlap
// meaningfully (some declared objects present, some missing). `schema` is
// sometimes omitted to exercise the DEFAULT_SCHEMA fallback on both sides.

const arbType = fc.constantFrom(
  "materialized_view",
  "function",
  "table",
  "view",
  "index"
);
const arbName = fc.constantFrom(
  "mv_historical_evidence",
  "send_teacher_nudge",
  "fan_out_announcement_notifications",
  "teams",
  "leaderboard_weekly",
  "idx_foo"
);
const arbSchema = fc.constantFrom(undefined, "public", "auth", "analytics");
const arbTask = fc.constantFrom(
  "qa-partner-review-remediation 9.2",
  "qa-partner-review-remediation 12.2",
  "qa-partner-review-remediation 24.2"
);

const arbDeclared: fc.Arbitrary<DeclaredObject> = fc.record({
  type: arbType,
  name: arbName,
  schema: arbSchema,
  declaringTask: arbTask,
});

const arbPresent: fc.Arbitrary<PresentObject> = fc.record({
  type: arbType,
  name: arbName,
  schema: arbSchema,
});

const arbDeclaredList = fc.array(arbDeclared, { maxLength: 10 });
const arbPresentList = fc.array(arbPresent, { maxLength: 10 });

/** Resolve an object's identity exactly as the verdict does (default schema applied). */
const idOf = (o: { type: string; name: string; schema?: string }): string =>
  objectKey(o.type, o.schema || DEFAULT_SCHEMA, o.name);

describe("Property 9 — declared-object existence (findMissingObjects)", () => {
  it("missing = declared − present; passes IFF none missing; each carries declaringTask", () => {
    fc.assert(
      fc.property(arbDeclaredList, arbPresentList, (declared, present) => {
        const presentKeys = buildPresentSet(present);
        const missing = findMissingObjects(declared, presentKeys);

        // Independent oracle: a declared object is missing iff its identity is
        // not in the present set.
        const presentIds = new Set(present.map(idOf));
        const expectedMissingIds = new Set(
          declared.filter((d) => !presentIds.has(idOf(d))).map(idOf)
        );

        const gotMissingIds = new Set(missing.map(idOf));
        expect(gotMissingIds).toEqual(expectedMissingIds);

        // Pass iff nothing missing (Req 20.5).
        const passes = missing.length === 0;
        expect(passes).toBe(expectedMissingIds.size === 0);

        // Every missing item names the object and its declaring task (Req 20.2).
        for (const m of missing) {
          expect(typeof m.name).toBe("string");
          expect(m.name.length).toBeGreaterThan(0);
          expect(typeof m.declaringTask).toBe("string");
          expect(m.declaringTask.length).toBeGreaterThan(0);
          expect(typeof m.schema).toBe("string"); // resolved (default applied)
          // The reported missing object must be one of the declared objects.
          expect(declared.some((d) => idOf(d) === idOf(m))).toBe(true);
          // And it must genuinely be absent from the present set.
          expect(presentIds.has(idOf(m))).toBe(false);
        }
      }),
      { numRuns: 300 }
    );
  });

  it("when every declared object is present, nothing is missing (the check passes)", () => {
    fc.assert(
      fc.property(arbDeclaredList, (declared) => {
        // Present set = exactly the declared objects (schema default applied so
        // identities line up regardless of whether schema was omitted).
        const present: PresentObject[] = declared.map((d) => ({
          type: d.type,
          name: d.name,
          schema: d.schema || DEFAULT_SCHEMA,
        }));
        const missing = findMissingObjects(declared, buildPresentSet(present));
        expect(missing).toHaveLength(0);
      }),
      { numRuns: 200 }
    );
  });

  it("a declared object absent from the present set is reported as missing with its task", () => {
    fc.assert(
      fc.property(arbDeclared, arbPresentList, (target, present) => {
        const presentKeys = buildPresentSet(present);
        // Only meaningful when the target is genuinely absent.
        fc.pre(!presentKeys.has(idOf(target)));

        const missing = findMissingObjects([target], presentKeys);
        expect(missing).toHaveLength(1);
        expect(missing[0]?.name).toBe(target.name);
        expect(missing[0]?.declaringTask).toBe(target.declaringTask);
      }),
      { numRuns: 200 }
    );
  });
});
