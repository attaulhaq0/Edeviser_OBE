/**
 * Feature: qa-partner-review-remediation — Req 19 (RLS_Smoke_Test)
 *
 * Production guard + run-gating for the isolated RLS integration smoke suite.
 *
 * The RLS smoke tests perform REAL inserts/updates against a live Supabase
 * database using a service-role key. They must therefore NEVER run against the
 * production project. This module centralises the two safety decisions used by
 * `vitest.integration.config.ts` and by every test file in this folder:
 *
 *   1. `assertNotProduction()` — a HARD guard that throws before any test or
 *      seed runs when the suite is asked to run (`SUPABASE_DB_ENV === "preview"`)
 *      but the configured Supabase URL points at the production project ref.
 *      It is invoked at config load time so the run aborts immediately.
 *
 *   2. `rlsSkipReason()` / `shouldRunRls()` — a SOFT gate used by the test
 *      files. When the required preview secrets are absent (the normal case on
 *      a developer machine or the unit-CI job), the suite marks itself
 *      `describe.skip` instead of failing, so local/unit CI stays green. The
 *      dedicated `rls-smoke` CI job (which sets the secrets) is the only place
 *      the cases actually execute.
 *
 * Required environment variables (set only in the dedicated `rls-smoke` CI job
 * against a Supabase PREVIEW branch — never in production):
 *
 *   - SUPABASE_URL              Preview branch REST URL (https://<ref>.supabase.co)
 *   - SUPABASE_ANON_KEY         Anon/publishable key, used for per-role sign-in
 *   - SUPABASE_SERVICE_ROLE_KEY Service-role key, used for Admin-API seeding
 *   - SUPABASE_DB_ENV           Must equal "preview" for the suite to run
 *
 * Note: these are intentionally the un-prefixed names (not the `VITE_*` app
 * variables) because this suite runs under Node, outside the Vite app bundle.
 */

/**
 * The production Supabase project ref. The smoke suite refuses to run against
 * this ref even if `SUPABASE_DB_ENV` is (mis)set to "preview".
 * Source: requirements.md / tasks.md — project `cdlgtbvxlxjpcddjazzx`.
 */
export const PRODUCTION_PROJECT_REF = "cdlgtbvxlxjpcddjazzx";

/** The value `SUPABASE_DB_ENV` must hold for the suite to run. */
export const REQUIRED_DB_ENV = "preview";

/** Snapshot of the environment variables this suite depends on. */
export interface RlsEnv {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  dbEnv?: string;
}

/**
 * Reads the RLS env vars from a `process.env`-shaped object. Injectable for
 * unit testing; defaults to the real `process.env`.
 */
export const readRlsEnv = (env: NodeJS.ProcessEnv = process.env): RlsEnv => ({
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  dbEnv: env.SUPABASE_DB_ENV,
});

/**
 * Extracts the Supabase project ref from a project URL.
 * `https://abcdefgh.supabase.co` -> `abcdefgh`. Returns `null` when the URL is
 * absent or not in the expected `<ref>.supabase.(co|in|...)` form.
 */
export const extractProjectRef = (url?: string): string | null => {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    const match = /^([a-z0-9]+)\.supabase\.[a-z.]+$/i.exec(hostname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

/** True when the configured URL targets the production project ref. */
export const isProductionRef = (url?: string): boolean =>
  extractProjectRef(url) === PRODUCTION_PROJECT_REF;

/**
 * HARD production guard. Throws when the suite is asked to run
 * (`SUPABASE_DB_ENV === "preview"`) but the configured URL is the production
 * ref. A no-op in every other case (so the config still loads and the suite
 * can skip cleanly when secrets are absent).
 *
 * Invoked at config load time in `vitest.integration.config.ts` so the run
 * aborts before any test file is collected or any seed runs.
 */
export const assertNotProduction = (env: RlsEnv = readRlsEnv()): void => {
  if (env.dbEnv === REQUIRED_DB_ENV && isProductionRef(env.supabaseUrl)) {
    throw new Error(
      `[rls-smoke] Refusing to run: SUPABASE_DB_ENV="${REQUIRED_DB_ENV}" but ` +
        `SUPABASE_URL points at the PRODUCTION project ref ` +
        `"${PRODUCTION_PROJECT_REF}". RLS smoke tests perform real, ` +
        `destructive inserts and must only target a Supabase preview branch.`
    );
  }
};

/**
 * SOFT gate. Returns a human-readable reason the suite should be skipped, or
 * `null` when it is safe and configured to run. Used by test files to choose
 * `describe.skip` vs `describe` so unit/local CI without secrets stays green.
 */
export const rlsSkipReason = (env: RlsEnv = readRlsEnv()): string | null => {
  if (env.dbEnv !== REQUIRED_DB_ENV) {
    return `SUPABASE_DB_ENV is not "${REQUIRED_DB_ENV}" (got "${
      env.dbEnv ?? "unset"
    }")`;
  }
  if (isProductionRef(env.supabaseUrl)) {
    return `SUPABASE_URL targets the production project ref "${PRODUCTION_PROJECT_REF}"`;
  }
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push("SUPABASE_URL");
  if (!env.supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");
  if (!env.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    return `missing required secrets: ${missing.join(", ")}`;
  }
  return null;
};

/** Convenience boolean: true only when the suite is safe and fully configured. */
export const shouldRunRls = (env: RlsEnv = readRlsEnv()): boolean =>
  rlsSkipReason(env) === null;
