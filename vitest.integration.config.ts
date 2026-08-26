import { defineConfig } from "vitest/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "path";
import {
  assertNotProduction,
  buildSkipManifest,
  readRlsEnv,
  rlsSkipReason,
} from "./src/__tests__/integration-rls/guard";

/**
 * Feature: qa-partner-review-remediation — Req 19 (RLS_Smoke_Test)
 *
 * Isolated Vitest project for the RLS / insert integration smoke suite.
 *
 * This config is deliberately separate from `vite.config.ts` so the fast
 * unit/property suite stays hermetic (happy-dom, mocked Supabase) while these
 * tests run REAL, non-mocked inserts against a Supabase PREVIEW branch in a
 * dedicated CI job (`rls-smoke`).
 *
 * Key differences from the unit config:
 *   - `environment: "node"` (NOT happy-dom/jsdom) — no DOM, real network I/O.
 *   - No global jsdom setup file — the unit `setup.ts` (jest-dom + axe matchers)
 *     is intentionally NOT loaded here.
 *   - Longer `testTimeout` — real sign-in + insert round-trips are slow.
 *   - `include` is scoped to `src/__tests__/integration-rls/**` only, so it
 *     never collects unit/property tests (and the unit config excludes this
 *     folder — see `vite.config.ts`).
 *
 * Run via: `npm run test:rls` (-> `vitest --run --config vitest.integration.config.ts`).
 *
 * Production safety: the guard below runs at config-load time and THROWS before
 * any test file is collected or any seed runs if the suite is asked to run
 * (`SUPABASE_DB_ENV === "preview"`) against the production project ref. When the
 * preview secrets are absent the guard is a no-op and the suite skips itself.
 */
const rlsEnv = readRlsEnv();
assertNotProduction(rlsEnv);
if (process.env.RLS_SMOKE_REQUIRED === "true") {
  const skipReason = rlsSkipReason(rlsEnv);
  if (skipReason !== null) {
    throw new Error(
      `[rls-smoke] RLS_SMOKE_REQUIRED=true but the isolated preview suite is not configured: ${skipReason}`
    );
  }
}

/**
 * Duck-typed Vitest reporter (ledger #278): emits
 * `audit/output/rls-smoke/skip-manifest.json` summarizing which integration
 * files ran vs skipped, so silent-skip outcomes leave evidence even when a run
 * exits green. Artifact IO failure must never break the suite itself.
 */
const SKIP_MANIFEST_DIR = path.resolve(
  __dirname,
  "audit",
  "output",
  "rls-smoke"
);

/** Structural view of the Vitest 4 `TestModule` handed to onTestRunEnd. */
interface TestModuleLike {
  readonly moduleId: string;
  readonly state?: () => unknown;
}

const isTestModuleLike = (value: unknown): value is TestModuleLike =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as TestModuleLike).moduleId === "string";

/** Map Vitest 4 module states onto the guard's neutral entry statuses. */
const moduleStatus = (
  state: unknown
): "skipped" | "pass" | "fail" | "unknown" => {
  if (state === "passed") return "pass";
  if (state === "failed") return "fail";
  // "skipped"/"pending"/"queued" all mean zero evidence for this file.
  return "skipped";
};

const skipManifestReporter = (): {
  onTestRunEnd: (testModules?: readonly unknown[]) => void;
} => ({
  onTestRunEnd: (testModules) => {
    try {
      const files: import("./src/__tests__/integration-rls/guard").ReporterFileLike[] =
        (Array.isArray(testModules) ? testModules : [])
          .filter(isTestModuleLike)
          .map((mod) => ({
            filepath: mod.moduleId,
            result: {
              status:
                typeof mod.state === "function"
                  ? moduleStatus(mod.state())
                  : ("unknown" as const),
            },
          }));
      const manifest = buildSkipManifest(files, {
        requiredMode: process.env.RLS_SMOKE_REQUIRED === "true",
      });
      mkdirSync(SKIP_MANIFEST_DIR, { recursive: true });
      writeFileSync(
        path.join(SKIP_MANIFEST_DIR, "skip-manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`
      );
    } catch (error) {
      console.warn(
        `[rls-smoke] skip-manifest could not be written: ${String(error)}`
      );
    }
  },
});

export default defineConfig({
  resolve: {
    // Reuse the same `@/` path alias as the main config.
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    // Node, not jsdom/happy-dom — these are real DB integration tests.
    environment: "node",
    // No global jsdom setup; keep isolated from the unit config.
    setupFiles: [],
    include: ["src/__tests__/integration-rls/**/*.test.ts"],
    // Ledger #278 — evidence artifact for every run of this suite.
    reporters: ["default", skipManifestReporter()],
    // Real network round-trips (sign-in + insert) need a generous timeout.
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: "forks",
    // Preview Auth rate limits are shared across the real integration files.
    // Keep the full suite enabled, but serialize its files in the required CI
    // path so authorization cases do not stampede the isolated branch.
    fileParallelism: process.env.RLS_SMOKE_REQUIRED !== "true",
    maxWorkers: process.env.RLS_SMOKE_REQUIRED === "true" ? 1 : undefined,
    minWorkers: process.env.RLS_SMOKE_REQUIRED === "true" ? 1 : undefined,
    css: false,
  },
});
