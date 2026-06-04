// =============================================================================
// declared-objects-verdict.mjs — PURE verdict for the Declared_Object_Check
// Feature: qa-partner-review-remediation (Part C, Req 20)
// -----------------------------------------------------------------------------
// This module is the side-effect-free heart of `scripts/check-declared-objects.mjs`:
// it answers "which declared objects are missing from the target schema?" with no
// I/O, no DB access, and no knowledge of how the present-set was obtained. The
// script does the impure work (read manifest, query Postgres) and hands the
// results here; the property test (`declaredObjects.property.test.ts`) feeds
// synthetic declared/present sets to the same function.
//
// WHY THIS IS A `.mjs` (not `src/lib/db/declaredObjects.ts`): the consumer is a
// plain `node scripts/check-declared-objects.mjs` invocation (engines: node >=20),
// which cannot import TypeScript at runtime. Extracting the verdict as native ESM
// lets BOTH the script (native `node` import) AND the Vitest property test
// (Vite resolves `.mjs`, types come from the sibling `.d.mts`) use one canonical
// implementation — cleaner than a re-implementation that could drift.
//
// The verdict is exactly set difference: missing = declared − present, keyed on
// (type, schema, name). It passes iff nothing is missing, and every missing item
// carries its `declaringTask` so the gap is traceable to the task that claimed to
// create it (Req 20.1, 20.2, 20.5).
// =============================================================================

/** Schema assumed when a declared/present object does not specify one. */
export const DEFAULT_SCHEMA = "public";

/**
 * Stable identity key for an object, combining type + schema + name with a NUL
 * separator so names containing dots/spaces cannot collide.
 * @param {string} type
 * @param {string} schema
 * @param {string} name
 * @returns {string}
 */
export const objectKey = (type, schema, name) =>
  `${type}\u0000${schema}\u0000${name}`;

/**
 * Build a Set of present-object identity keys from a list of present objects.
 * @param {ReadonlyArray<{type:string,name:string,schema?:string}>} present
 * @param {string} [defaultSchema]
 * @returns {Set<string>}
 */
export const buildPresentSet = (present, defaultSchema = DEFAULT_SCHEMA) =>
  new Set(
    present.map((o) => objectKey(o.type, o.schema || defaultSchema, o.name))
  );

/**
 * PURE verdict: return the declared objects whose (type, schema, name) is NOT in
 * `presentKeys` — i.e. `missing = declared − present`. Each returned item carries
 * its resolved `schema` and its `declaringTask` (Req 20.2). An empty result means
 * the check passes (every declared object exists — Req 20.5).
 *
 * @param {ReadonlyArray<{type:string,name:string,schema?:string,declaringTask:string}>} declared
 * @param {ReadonlySet<string>} presentKeys - keys produced by {@link objectKey}.
 * @param {string} [defaultSchema]
 * @returns {{type:string,name:string,schema:string,declaringTask:string}[]}
 */
export const findMissingObjects = (
  declared,
  presentKeys,
  defaultSchema = DEFAULT_SCHEMA
) =>
  declared
    .filter(
      (obj) =>
        !presentKeys.has(
          objectKey(obj.type, obj.schema || defaultSchema, obj.name)
        )
    )
    .map((obj) => ({
      type: obj.type,
      name: obj.name,
      schema: obj.schema || defaultSchema,
      declaringTask: obj.declaringTask,
    }));
