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
  /**
   * Project ref of the Git-linked Supabase Preview resolved by CI
   * (`SUPABASE_PREVIEW_REF`). Set only in the dedicated rls-smoke job; when
   * present it must match the project ref embedded in SUPABASE_URL so the
   * suite cannot run against an unrelated project that happens to hold valid
   * credentials (deferral ledger #278: configured-but-invalid must fail loudly).
   */
  previewRef?: string;
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
  previewRef: env.SUPABASE_PREVIEW_REF,
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
 * Wrong-target guard, fail-closed. Returns a human-readable blocking reason
 * whenever `SUPABASE_PREVIEW_REF` is set and `SUPABASE_URL` cannot be proven
 * safe to target: unresolvable URL shape, non-HTTPS scheme (cleartext service-
 * role transport), or a resolved project ref that disagrees with the CI-resolved
 * Git-linked preview ref. Absent `SUPABASE_PREVIEW_REF`
 * (local developer machine) never trips this gate — the production hard guard
 * above already covers the dangerous case there.
 *
 * Ledger #278 trigger: without this check, half-valid credentials pointing at
 * an unrelated project would run destructive seed/test traffic against it.
 */
export const previewRefMismatchReason = (
  env: RlsEnv = readRlsEnv()
): string | null => {
  if (!env.previewRef) return null;
  const urlRef = extractProjectRef(env.supabaseUrl);
  if (!urlRef && env.supabaseUrl) {
    return (
      'SUPABASE_URL "' +
      env.supabaseUrl +
      '" is not a resolvable Supabase project URL while SUPABASE_PREVIEW_REF ' +
      "is set - refusing to target it"
    );
  }
  if (!urlRef) return null;
  let httpsOk = false;
  try {
    httpsOk = new URL(env.supabaseUrl ?? "").protocol === "https:";
  } catch {
    httpsOk = false;
  }
  if (!httpsOk) {
    return (
      "SUPABASE_URL must use HTTPS while SUPABASE_PREVIEW_REF is set - " +
      "refusing to send the service-role key over cleartext transport"
    );
  }
  return urlRef.toLowerCase() !== env.previewRef.toLowerCase()
    ? `SUPABASE_URL project ref "${urlRef}" does not match the Git-linked ` +
        `preview ref "${env.previewRef}"`
    : null;
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
  const mismatch = previewRefMismatchReason(env);
  if (mismatch !== null) return mismatch;
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

// ─── Skip-manifest artifact (ledger #278) ────────────────────────────────────

/** Per-file row of the skip manifest emitted by the integration reporter. */
export interface SkipManifestEntry {
  /** Absolute workspace path of the collected test file. */
  readonly file: string;
  /** `skipped` when every case was skipped, else how the runner completed it. */
  readonly status: "skipped" | "pass" | "fail" | "unknown";
}

/** JSON payload written to audit/output/rls-smoke/skip-manifest.json. */
export interface SkipManifest {
  readonly generatedAt: string;
  /** Whether the fail-loud required mode was active for this run. */
  readonly requiredMode: boolean;
  readonly totalFiles: number;
  readonly skippedFiles: number;
  readonly entries: readonly SkipManifestEntry[];
}

/**
 * Structural view of a Vitest `File`. Shape-tolerant on purpose: the reporter
 * feeds raw runner objects whose typings drift between Vitest majors, so every
 * field is treated as `unknown` and narrowed here (repo rule: no `any`).
 */
export interface ReporterFileLike {
  filepath?: unknown;
  result?: { status?: unknown } | undefined;
}

const normalizeStatus = (status: unknown): SkipManifestEntry["status"] =>
  status === "skipped" || status === "pass" || status === "fail"
    ? status
    : "unknown";

/**
 * Pure summarizer for the skip-manifest artifact. Accepts the loosely typed
 * per-file results handed to a Vitest `onFinished` hook and produces the
 * deterministic JSON document posted next to CI evidence. Kept free of Vitest
 * imports so the guard stays unit-testable under the hermetic suite.
 */
export const buildSkipManifest = (
  files: readonly ReporterFileLike[],
  options: { requiredMode: boolean; now?: Date } = { requiredMode: false }
): SkipManifest => {
  const entries: SkipManifestEntry[] = files.map((file) => ({
    file:
      typeof file.filepath === "string"
        ? file.filepath
        : "<unresolved-filepath>",
    status: normalizeStatus(file.result?.status),
  }));
  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    requiredMode: options.requiredMode,
    totalFiles: entries.length,
    skippedFiles: entries.filter((entry) => entry.status === "skipped").length,
    entries,
  };
};
