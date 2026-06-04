// =============================================================================
// Schema_Contract_Test (Part C, Req 18) — cross-references each mutation
// payload's keys against the target table's real Insert columns and its
// required (NOT NULL, no-default) columns, using the checked-in
// `requiredColumns.json` manifest (generated from information_schema) as the
// authority for required columns (Req 18.3).
//
// The seeded challenge + team descriptors are proven contract-clean: every
// required column for `social_challenges` and `teams` is present in their
// `*_INSERT_COLUMNS` constants, and every constant key is a real Insert column.
// Direct validator cases prove the harness actually detects violations and
// always names the offending key/column + table (Req 18.2, 18.3, 18.4).
// =============================================================================
import { describe, it, expect } from "vitest";

import {
  validateDescriptor,
  validateDescriptors,
  formatViolation,
  type MutationContractDescriptor,
  type SchemaModel,
} from "@/lib/db/schemaContract";
import {
  SOCIAL_CHALLENGES_INSERT_COLUMNS,
  TEAMS_INSERT_COLUMNS,
} from "@/lib/db/insertColumns";
import {
  MUTATION_DESCRIPTORS,
  type MutationDescriptor,
} from "@/__tests__/fixtures/mutationDescriptors";
import requiredColumns from "@/__tests__/fixtures/requiredColumns.json";

/**
 * Required-column authority (Req 18.3): the manifest generated from
 * `information_schema` and committed to the repo.
 */
const REQUIRED_COLUMNS: Readonly<Record<string, readonly string[]>> =
  requiredColumns;

/**
 * The real Insert-column oracle per table for the unknown-column check
 * (Req 18.2). Sourced from the `*_INSERT_COLUMNS` constants, which are
 * compile-time-proven to be real Insert columns. One entry per table covered
 * by the registry — extend alongside `MUTATION_DESCRIPTORS`.
 */
const INSERT_COLUMNS_BY_TABLE: Readonly<Record<string, readonly string[]>> = {
  social_challenges: SOCIAL_CHALLENGES_INSERT_COLUMNS,
  teams: TEAMS_INSERT_COLUMNS,
  // Real Insert columns of `notifications` (from `database.ts`), the oracle for
  // the `sendTeacherNudge` descriptor's unknown-column check.
  notifications: [
    "user_id",
    "type",
    "title",
    "body",
    "is_read",
    "metadata",
    "created_at",
    "id",
  ],
};

/** Resolve the {@link SchemaModel} (real + required columns) for a descriptor's table. */
const resolveModel = (descriptor: { table: string }): SchemaModel => ({
  insertColumns: INSERT_COLUMNS_BY_TABLE[descriptor.table] ?? [],
  requiredColumns: REQUIRED_COLUMNS[descriptor.table] ?? [],
});

describe("Schema_Contract_Test: seeded descriptors are contract-clean", () => {
  it("has a registered insert-column oracle for every descriptor's table", () => {
    for (const descriptor of MUTATION_DESCRIPTORS) {
      expect(
        INSERT_COLUMNS_BY_TABLE[descriptor.table],
        `missing insert-column oracle for table "${descriptor.table}" (add it alongside the descriptor)`
      ).toBeDefined();
    }
  });

  it.each(MUTATION_DESCRIPTORS.map((d) => [d.hook, d] as const))(
    "%s payload contains every required column and only real columns",
    (_hook, descriptor: MutationDescriptor) => {
      const violations = validateDescriptor(
        descriptor,
        resolveModel(descriptor)
      );
      expect(violations, violations.map(formatViolation).join("\n")).toEqual(
        []
      );
    }
  );

  it("reports zero violations across the whole registry (accumulating, Req 18.4)", () => {
    const violations = validateDescriptors(MUTATION_DESCRIPTORS, resolveModel);
    expect(violations.map(formatViolation)).toEqual([]);
  });
});

describe("Schema_Contract_Test validator: detection and identification", () => {
  it("flags an unknown column and names the key + table (Req 18.2)", () => {
    const descriptor: MutationContractDescriptor = {
      hook: "useBroken",
      table: "teams",
      payloadKeys: [...TEAMS_INSERT_COLUMNS, "not_a_real_column"],
      op: "insert",
    };
    const violations = validateDescriptor(descriptor, resolveModel(descriptor));

    expect(violations).toContainEqual({
      kind: "unknown-column",
      hook: "useBroken",
      table: "teams",
      key: "not_a_real_column",
    });
    expect(formatViolation(violations[0]!)).toContain("not_a_real_column");
    expect(formatViolation(violations[0]!)).toContain("teams");
  });

  it("flags a missing required column and names the column + table (Req 18.3)", () => {
    const descriptor: MutationContractDescriptor = {
      hook: "useBroken",
      table: "teams",
      // Drop the required `captain_id` column.
      payloadKeys: TEAMS_INSERT_COLUMNS.filter((c) => c !== "captain_id"),
      op: "insert",
    };
    const violations = validateDescriptor(descriptor, resolveModel(descriptor));

    expect(violations).toContainEqual({
      kind: "missing-required-column",
      hook: "useBroken",
      table: "teams",
      column: "captain_id",
    });
  });

  it("accumulates ALL violations rather than stopping at the first (Req 18.4)", () => {
    const model: SchemaModel = {
      insertColumns: ["a", "b"],
      requiredColumns: ["a", "b", "c"],
    };
    const descriptor: MutationContractDescriptor = {
      hook: "useMulti",
      table: "demo",
      // `x` and `y` are unknown; required `a`, `b`, `c` are all absent.
      payloadKeys: ["x", "y"],
      op: "insert",
    };
    const violations = validateDescriptor(descriptor, model);

    // 2 unknown-column + 3 missing-required-column = 5 total.
    expect(violations).toHaveLength(5);
    expect(violations.filter((v) => v.kind === "unknown-column")).toHaveLength(
      2
    );
    expect(
      violations.filter((v) => v.kind === "missing-required-column")
    ).toHaveLength(3);
  });
});
