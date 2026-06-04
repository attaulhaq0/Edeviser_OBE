import { defineConfig } from "vitest/config";
import path from "path";
import { assertNotProduction } from "./src/__tests__/integration-rls/guard";

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
assertNotProduction();

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
    // Real network round-trips (sign-in + insert) need a generous timeout.
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: "forks",
    css: false,
  },
});
