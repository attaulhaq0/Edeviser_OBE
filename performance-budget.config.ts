/**
 * Edeviser Platform — NFR Performance Budget Configuration
 *
 * Documents the Non-Functional Requirement (NFR) performance targets
 * from Requirements §50 (Performance & Scalability).
 *
 * These targets are enforced via:
 *   - Lighthouse CI (dashboard load) — see lighthouserc.js
 *   - Supabase Edge Function execution logs (rollup latency)
 *   - Supabase dashboard monitoring / k6 load tests (API p95)
 *
 * @see PRODUCT-REQUIREMENTS-DOCUMENT.md — NFR-PERF-01 through NFR-PERF-04
 * @see .kiro/specs/edeviser-platform/requirements.md — Requirement 50
 */

export const performanceBudget = {
  /**
   * NFR-PERF-01: Dashboard initial load ≤ 1.5s on 4G with cold cache.
   * Enforced by Lighthouse CI assertions on FCP and LCP metrics.
   * Validation: `npm run lighthouse` (runs lhci autorun)
   */
  dashboardLoad: {
    target: 1500, // milliseconds
    metric: "First Contentful Paint + Largest Contentful Paint",
    enforcement: "Lighthouse CI (lighthouserc.js)",
    condition: "4G connection, cold cache, desktop preset",
  },

  /**
   * NFR-PERF-02: Evidence rollup recalculation ≤ 500ms.
   * The calculate-attainment-rollup Edge Function must complete the full
   * cascade (evidence → CLO → PLO → ILO) within this budget.
   * Validation: Supabase Edge Function execution logs in dashboard.
   */
  attainmentRollup: {
    target: 500, // milliseconds
    metric: "Edge Function execution time (wall clock)",
    enforcement: "Supabase Edge Function execution logs",
    edgeFunction: "calculate-attainment-rollup",
  },

  /**
   * NFR-PERF-03: API read query response time ≤ 300ms at p95.
   * All Supabase PostgREST read queries should meet this target.
   * Validation: Supabase dashboard monitoring + k6 load tests.
   */
  apiResponseP95: {
    target: 300, // milliseconds
    metric: "p95 response time for read queries",
    enforcement: "Supabase dashboard monitoring, k6 load tests",
    concurrentUsers: 5000,
  },

  /**
   * NFR-PERF-04: Support 5,000 concurrent active users.
   * Validated via k6 load test scripts (see scripts/k6/).
   */
  concurrentUsers: {
    target: 5000,
    metric: "Concurrent active users without degradation",
    enforcement: "k6 load tests before major releases",
  },
} as const;

export type PerformanceBudget = typeof performanceBudget;
