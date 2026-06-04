// Feature: qa-partner-review-remediation, Property 2 (challenge payload whitelist)
// **Validates: Requirements 2.1, 2.2, 2.6**
//
// Property 2 (design): *For any* challenge form object — including arbitrary
// extra UI-only keys such as `xp_race_acknowledged` — every key in the insert
// payload produced by the Challenge_Create_Handler
// (`pickColumns(input, SOCIAL_CHALLENGES_INSERT_COLUMNS)`) SHALL be a Real_Column
// of `social_challenges`, and no excluded UI-only field SHALL appear.
//
// This exercises the REAL, pure `pickColumns` from `src/lib/db/pickColumns.ts`
// against the REAL `SOCIAL_CHALLENGES_INSERT_COLUMNS` whitelist from
// `src/lib/db/insertColumns.ts` (neither is mocked). The generator builds
// arbitrary form objects mixing a random subset of real columns (with defined
// values) and arbitrary UI-only junk keys — always including the canonical
// `xp_race_acknowledged` gate field — and asserts the whitelist invariant.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { pickColumns } from "@/lib/db/pickColumns";
import { SOCIAL_CHALLENGES_INSERT_COLUMNS } from "@/lib/db/insertColumns";

// ── Fixtures ──────────────────────────────────────────────────────────────
// The whitelist is the authority for what a Real_Column is, in this test.
const REAL_COLUMNS: readonly string[] = SOCIAL_CHALLENGES_INSERT_COLUMNS;
const REAL_COLUMN_SET = new Set<string>(REAL_COLUMNS);
const UI_ONLY_FIELD = "xp_race_acknowledged"; // intentionally NOT a column

// ── Generators ──────────────────────────────────────────────────────────────
// Values are never `undefined`, so any real column we include is "defined" and
// must therefore be preserved by `pickColumns` (it only drops undefined keys).
const arbValue: fc.Arbitrary<unknown> = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.date({ noInvalidDate: true }).map((d) => d.toISOString())
);

const recordFromKeys = (
  keys: readonly string[]
): fc.Arbitrary<Record<string, unknown>> =>
  fc.record(
    Object.fromEntries(
      keys.map((k): [string, fc.Arbitrary<unknown>] => [k, arbValue])
    )
  );

/** A random subset of real columns, each with a defined value. */
const arbRealSubset: fc.Arbitrary<Record<string, unknown>> = fc
  .subarray([...REAL_COLUMNS])
  .chain((keys) => recordFromKeys(keys));

/** UI-only junk keys: never a real column and never the ack field. */
const arbJunkKey: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 12 })
  .filter((s) => !REAL_COLUMN_SET.has(s) && s !== UI_ONLY_FIELD);

const arbJunk: fc.Arbitrary<Record<string, unknown>> = fc
  .array(arbJunkKey, { maxLength: 5 })
  .chain((keys) => recordFromKeys(keys));

interface FormCase {
  form: Record<string, unknown>;
  realKeys: string[]; // real columns present with a defined value
  junkKeys: string[]; // UI-only keys that must not leak through
}

const arbForm: fc.Arbitrary<FormCase> = fc
  .tuple(arbRealSubset, arbJunk, arbValue)
  .map(([real, junk, ackValue]) => {
    const form: Record<string, unknown> = {
      ...real,
      ...junk,
      [UI_ONLY_FIELD]: ackValue, // always include the UI-only ack gate
    };
    return {
      form,
      realKeys: Object.keys(real),
      junkKeys: Object.keys(junk),
    };
  });

describe("Property 2 — challenge payload whitelist (pickColumns)", () => {
  it("every output key is a Real_Column, xp_race_acknowledged is dropped, and defined real columns are preserved", () => {
    fc.assert(
      fc.property(arbForm, ({ form, realKeys, junkKeys }) => {
        const output = pickColumns(form, SOCIAL_CHALLENGES_INSERT_COLUMNS);
        const out: Record<string, unknown> = output;
        const outKeys = Object.keys(out);

        // (a) every output key is a member of SOCIAL_CHALLENGES_INSERT_COLUMNS
        for (const key of outKeys) {
          expect(REAL_COLUMN_SET.has(key)).toBe(true);
        }

        // (b) xp_race_acknowledged is never present in the output
        expect(Object.prototype.hasOwnProperty.call(out, UI_ONLY_FIELD)).toBe(
          false
        );

        // (c) no extra/unknown UI-only key leaks through
        for (const jk of junkKeys) {
          expect(Object.prototype.hasOwnProperty.call(out, jk)).toBe(false);
        }

        // (d) real columns supplied with a defined value are preserved as-is
        for (const rk of realKeys) {
          expect(Object.prototype.hasOwnProperty.call(out, rk)).toBe(true);
          expect(out[rk]).toBe(form[rk]);
        }
      }),
      { numRuns: 200 }
    );
  });
});
