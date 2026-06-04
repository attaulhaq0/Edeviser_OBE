/**
 * Feature: qa-partner-review-remediation — Req 19 (RLS_Smoke_Test), task 5.2
 *
 * Table-driven runner for the RLS / insert integration smoke suite.
 *
 * The whole suite is RLS-conformance-by-example: each {@link RLSCase} declares a
 * table, the role to act as, a real mutation/RPC, and whether the table's RLS
 * policy should let it through. {@link runRlsCases} wires those declarations
 * into a Vitest suite that:
 *
 *   1. Is wrapped in `describe.skipIf(!shouldRunRls())` so that, with no preview
 *      secrets, the entire block (including the seed/teardown hooks) is skipped
 *      and `npm run test:rls` exits green (Req 19.7 / skip-safety). No secrets ⇒
 *      no client is ever constructed.
 *   2. Seeds the real fixture graph ONCE in `beforeAll` (Req 19.1) and tears it
 *      down in `afterAll` (idempotent/best-effort).
 *   3. For each case: signs in a FRESH anon client as the case's role (Req 19.2),
 *      awaits the real action, and asserts `success` (no error) or `rejected`
 *      (error present — and, when identifiable, an RLS/permission error)
 *      (Req 19.3 / 19.4).
 *
 * Extensibility (Req 19.6): adding coverage is a single {@link RLSCase} array
 * entry — see task 5.3 (`inserts.rls.test.ts`). This module intentionally ships
 * NO real cases; it only exports the runner + types.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { shouldRunRls } from "./guard";
import {
  seedRlsFixtures,
  teardownRlsFixtures,
  type RlsRole,
  type SeededCtx,
} from "./seed";
import { signInAs, type RoleClient } from "./signIn";

/** The shape every real mutation/RPC action resolves to (Supabase style). */
export interface ActionResult {
  /** Postgres/PostgREST error, or null/undefined on success. */
  error: unknown;
}

/**
 * One declarative RLS expectation. `action` performs a REAL insert/update/RPC as
 * the signed-in `asRole` client and returns the Supabase `{ error }` result.
 */
export interface RLSCase {
  /** The RLS-protected table (or `notifications` via the nudge RPC) under test. */
  table: string;
  /** Human-readable description of the case (used as the test title). */
  description: string;
  /** Which seeded role performs the action. */
  asRole: RlsRole;
  /**
   * The real mutation/RPC. Receives the seeded context (for ids) and a fresh
   * client already authenticated as {@link asRole}. MUST resolve to the Supabase
   * result so the runner can inspect `error`.
   */
  action: (ctx: SeededCtx, client: RoleClient) => Promise<ActionResult>;
  /** Whether the table's RLS policy should permit (`success`) or block it. */
  expect: "success" | "rejected";
}

/** Accessor handing the seeded context to case actions at run time. */
export type CtxAccessor = () => SeededCtx;

/**
 * Options for {@link runRlsCases}. Defaults wire the real preview seed/teardown;
 * `seed`/`teardown` are injectable for unit-testing the runner without a DB.
 */
export interface RlsRunnerOptions {
  /** Suite label shown in the test output. */
  suiteName?: string;
  /** Seeds the fixtures. Defaults to {@link seedRlsFixtures}. */
  seed?: () => Promise<SeededCtx>;
  /** Tears down the fixtures. Defaults to {@link teardownRlsFixtures}. */
  teardown?: (ctx: SeededCtx) => Promise<void>;
}

/**
 * Postgres error codes that unambiguously indicate an RLS/permission rejection.
 * Used only to make a `rejected` assertion's failure message more useful — the
 * hard assertion is simply "an error was returned".
 */
const RLS_REJECTION_CODES = new Set<string>([
  "42501", // insufficient_privilege (RLS WITH CHECK / GRANT failure, RAISE 42501)
  "PGRST301", // PostgREST: JWT/permission related
]);

/** True when an error clearly looks like an RLS/permission rejection. */
export const isRlsRejection = (error: unknown): boolean => {
  if (error === null || error === undefined) return false;
  if (typeof error === "object") {
    const e = error as { code?: unknown; message?: unknown };
    if (typeof e.code === "string" && RLS_REJECTION_CODES.has(e.code))
      return true;
    if (typeof e.message === "string") {
      return /row-level security|permission denied|not authorized|violates row-level/i.test(
        e.message
      );
    }
  }
  return false;
};

/**
 * Registers a table-driven RLS smoke suite from `cases`.
 *
 * The suite seeds once (`beforeAll`), runs each case against a fresh per-role
 * client, and tears down (`afterAll`). The whole block is skipped when preview
 * secrets are absent, so it is safe to import and call with NO secrets (the
 * normal local / unit-CI situation) — nothing connects and the run stays green.
 *
 * @param cases Declarative RLS expectations (may be empty — still skip-safe).
 * @param options Suite label + injectable seed/teardown (DI for runner tests).
 */
export const runRlsCases = (
  cases: readonly RLSCase[],
  options: RlsRunnerOptions = {}
): void => {
  const {
    suiteName = "RLS smoke cases",
    seed = seedRlsFixtures,
    teardown = teardownRlsFixtures,
  } = options;

  // `describe.skipIf(true)` skips the block AND its hooks, so no seed runs and
  // no client is built when secrets are absent — the skip-safety guarantee.
  describe.skipIf(!shouldRunRls())(suiteName, () => {
    // Populated in beforeAll; read by each case via getCtx().
    let ctx: SeededCtx | null = null;
    const getCtx: CtxAccessor = () => {
      if (ctx === null) {
        throw new Error(
          "[rls-smoke runner] seeded context is not available — beforeAll seeding did not complete."
        );
      }
      return ctx;
    };

    beforeAll(async () => {
      ctx = await seed();
    });

    afterAll(async () => {
      if (ctx !== null) {
        await teardown(ctx);
        ctx = null;
      }
    });

    // A meta test so an empty `cases` array (task 5.2 placeholder) is still a
    // non-empty, descriptive, passing suite rather than a "no tests" error.
    it("is seeded and ready to run RLS cases", () => {
      expect(getCtx().institutionId).toEqual(expect.any(String));
    });

    for (const rlsCase of cases) {
      const title = `[${rlsCase.table}] ${rlsCase.description} → ${rlsCase.expect} as ${rlsCase.asRole}`;
      it(title, async () => {
        const ctx = getCtx();
        // Fresh anon client per case, signed in as the case's role (Req 19.2).
        const client = await signInAs(ctx.emails[rlsCase.asRole], ctx.password);
        try {
          const { error } = await rlsCase.action(ctx, client);
          if (rlsCase.expect === "success") {
            expect(
              error,
              `expected ${rlsCase.asRole} to be allowed on "${
                rlsCase.table
              }" but got: ${JSON.stringify(error)}`
            ).toBeFalsy();
          } else {
            expect(
              error,
              `expected ${rlsCase.asRole} to be REJECTED on "${rlsCase.table}" but the action succeeded`
            ).toBeTruthy();
            // Soft, informative check: surface non-RLS errors (e.g. NOT NULL)
            // in the message without failing — the hard contract is "rejected".
            if (!isRlsRejection(error)) {
              console.warn(
                `[rls-smoke] "${title}" was rejected by a non-RLS error: ${JSON.stringify(
                  error
                )}`
              );
            }
          }
        } finally {
          // Drop the per-role session so it cannot leak into the next case.
          await client.auth.signOut();
        }
      });
    }
  });
};
