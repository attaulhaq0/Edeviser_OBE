/**
 * Pure schema-contract validator for database mutation payloads (Part C, Req 18).
 *
 * Given a {@link MutationContractDescriptor} (the table + the keys a hook sends
 * in its insert/upsert payload) and a {@link SchemaModel} (the table's real
 * `Insert` columns and its `NOT NULL`-without-default required columns), this
 * module returns every contract violation it can find:
 *
 *   (a) `unknown-column`          — a payload key that is not a real Insert
 *                                   column of the target table (Req 18.2).
 *   (b) `missing-required-column` — a Required_Column of the target table that
 *                                   is absent from the payload (Req 18.3).
 *
 * The validator is **pure** (no I/O, no mutation of its inputs) and
 * **accumulating**: it never stops at the first problem, so a single run
 * surfaces all violations together (Req 18.4). Every violation always names the
 * offending key/column **and** the table (plus the hook for context), so a
 * failure can never be reported without identifying its cause (Req 18.2/18.4).
 *
 * ── Design choice for the "unknown-column" (Real_Column) check ──────────────
 * The authoritative list of a table's real columns lives in the generated
 * Supabase types (`src/types/database.ts`), but those types cannot be reflected
 * into a runtime value set, and regenerating a DB-backed "all insertable
 * columns" manifest requires Supabase access that is not available offline
 * (and `database.ts` must never be hand-edited — see steering). Per the design,
 * real-column-ness is therefore enforced at TWO complementary layers:
 *
 *   • Compile time — the seeded descriptors spread the
 *     `*_INSERT_COLUMNS` constants from `src/lib/db/insertColumns.ts`, each
 *     declared `as const satisfies readonly InsertKeys<T>[]`. `tsc` already
 *     proves every such key is a real `Insert` column of its table.
 *   • Run time — this validator takes the table's known insert-column set as
 *     `SchemaModel.insertColumns` and flags any payload key outside it. The
 *     unit harness sources that set from the same checked-in
 *     `*_INSERT_COLUMNS` constants, so the unknown-column check stays live for
 *     hand-listed payloads while the **required-column** check (sourced from
 *     the DB-generated `requiredColumns.json`) is the primary runtime gate.
 *
 * This keeps the validator fully general and property-testable (it makes no
 * assumption about where its two column sets come from) while remaining
 * verifiable without a live database.
 */

/** A single, fully-identified contract violation for one mutation payload. */
export type ContractViolation =
  | {
      /** A payload key that is not a real Insert column of the table. */
      readonly kind: "unknown-column";
      /** The originating hook, for human-readable error messages. */
      readonly hook: string;
      /** The target table the payload is written to. */
      readonly table: string;
      /** The offending payload key. */
      readonly key: string;
    }
  | {
      /** A required (NOT NULL, no default) column missing from the payload. */
      readonly kind: "missing-required-column";
      /** The originating hook, for human-readable error messages. */
      readonly hook: string;
      /** The target table the payload is written to. */
      readonly table: string;
      /** The required column absent from the payload. */
      readonly column: string;
    };

/**
 * The minimal description of a mutation payload the validator checks: which
 * hook sends it, which table it targets, the payload keys, and the operation.
 *
 * This mirrors the registry entries in
 * `src/__tests__/fixtures/mutationDescriptors.ts` but is intentionally declared
 * with plain `string` fields so the validator carries no dependency on the
 * generated `Database` types and stays trivially unit/property testable.
 */
export interface MutationContractDescriptor {
  /** Hook name, e.g. `"useCreateTeam"` — used only in error messages. */
  readonly hook: string;
  /** Target table name, e.g. `"teams"`. */
  readonly table: string;
  /** The keys the hook sends in its insert/upsert payload. */
  readonly payloadKeys: readonly string[];
  /** The mutation operation. */
  readonly op: "insert" | "upsert";
}

/**
 * The schema facts a descriptor is validated against.
 *
 * @property insertColumns - Every real `Insert` column of the target table
 *   (the unknown-column oracle).
 * @property requiredColumns - Every `NOT NULL` column without a default or
 *   generation expression (the missing-required-column oracle).
 */
export interface SchemaModel {
  readonly insertColumns: readonly string[];
  readonly requiredColumns: readonly string[];
}

/**
 * Validate one mutation descriptor against its schema model, returning **all**
 * violations (never stopping at the first).
 *
 * @param descriptor - The payload contract to check.
 * @param model - The target table's real and required columns.
 * @returns Every detected violation, each naming the offending key/column and
 *   table; an empty array means the payload is contract-clean.
 */
export const validateDescriptor = (
  descriptor: MutationContractDescriptor,
  model: SchemaModel
): ContractViolation[] => {
  const violations: ContractViolation[] = [];
  const insertColumnSet = new Set(model.insertColumns);
  const payloadKeySet = new Set(descriptor.payloadKeys);

  // (a) Every payload key must be a real Insert column of the table.
  for (const key of descriptor.payloadKeys) {
    if (!insertColumnSet.has(key)) {
      violations.push({
        kind: "unknown-column",
        hook: descriptor.hook,
        table: descriptor.table,
        key,
      });
    }
  }

  // (b) Every required column of the table must be present in the payload.
  for (const column of model.requiredColumns) {
    if (!payloadKeySet.has(column)) {
      violations.push({
        kind: "missing-required-column",
        hook: descriptor.hook,
        table: descriptor.table,
        column,
      });
    }
  }

  return violations;
};

/**
 * Validate a batch of descriptors, accumulating violations across all of them
 * (Req 18.4). The `resolveModel` callback supplies the {@link SchemaModel} for
 * each descriptor's table.
 *
 * @param descriptors - The mutation contracts to check.
 * @param resolveModel - Maps a descriptor to the schema facts for its table.
 * @returns Every violation found across the whole batch.
 */
export const validateDescriptors = (
  descriptors: readonly MutationContractDescriptor[],
  resolveModel: (descriptor: MutationContractDescriptor) => SchemaModel
): ContractViolation[] =>
  descriptors.flatMap((descriptor) =>
    validateDescriptor(descriptor, resolveModel(descriptor))
  );

/**
 * Render a single violation as a stable, human-readable line that always names
 * the offending key/column and table (Req 18.2/18.3) — used in test failure
 * messages so a failure is never reported without identifying its cause.
 */
export const formatViolation = (violation: ContractViolation): string =>
  violation.kind === "unknown-column"
    ? `[${violation.hook}] unknown-column "${violation.key}" is not a real Insert column of table "${violation.table}"`
    : `[${violation.hook}] missing-required-column "${violation.column}" is required by table "${violation.table}" but absent from the payload`;
