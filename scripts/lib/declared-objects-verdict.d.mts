// Type declarations for the pure declared-object verdict helper
// (`declared-objects-verdict.mjs`). Lets the Vitest property test and `tsc`
// type-check imports of the native ESM helper consumed by
// `scripts/check-declared-objects.mjs`. Feature: qa-partner-review-remediation.

/** A DB object a spec/task declares as created (manifest entry shape). */
export interface DeclaredObject {
  /** Object kind, e.g. `"materialized_view" | "function" | "table" | ...`. */
  readonly type: string;
  /** Object name, e.g. `"mv_historical_evidence"`. */
  readonly name: string;
  /** Schema; defaults to {@link DEFAULT_SCHEMA} when omitted. */
  readonly schema?: string;
  /** The task that declared this object (for traceable failure messages). */
  readonly declaringTask: string;
}

/** A DB object observed to exist in the target schema. */
export interface PresentObject {
  readonly type: string;
  readonly name: string;
  readonly schema?: string;
}

/** A declared object found to be absent from the target schema. */
export interface MissingObject {
  readonly type: string;
  readonly name: string;
  /** The resolved schema (default applied). */
  readonly schema: string;
  readonly declaringTask: string;
}

/** Schema assumed when a declared/present object does not specify one. */
export const DEFAULT_SCHEMA: string;

/** Stable identity key combining type + schema + name. */
export function objectKey(type: string, schema: string, name: string): string;

/** Build a Set of present-object identity keys. */
export function buildPresentSet(
  present: readonly PresentObject[],
  defaultSchema?: string
): Set<string>;

/**
 * PURE verdict: `missing = declared − present`. Returns every declared object
 * whose (type, schema, name) is absent from `presentKeys`, each carrying its
 * resolved schema and declaringTask.
 */
export function findMissingObjects(
  declared: readonly DeclaredObject[],
  presentKeys: ReadonlySet<string>,
  defaultSchema?: string
): MissingObject[];
