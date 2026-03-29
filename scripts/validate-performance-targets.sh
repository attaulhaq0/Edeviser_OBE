#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Edeviser Platform — NFR Performance Target Validation Guide
# ─────────────────────────────────────────────────────────────────────────────
#
# This script documents how to validate each NFR performance target.
# Some targets require runtime infrastructure (Supabase, k6) and cannot
# be fully automated in CI alone.
#
# Reference: performance-budget.config.ts
# Reference: .kiro/specs/edeviser-platform/requirements.md — Requirement 50
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Edeviser NFR Performance Target Validation                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── NFR-PERF-01: Dashboard Load ≤ 1.5s ──────────────────────────────────────
echo "▸ NFR-PERF-01: Dashboard load ≤ 1.5s (FCP + LCP)"
echo "  Enforcement: Lighthouse CI"
echo "  Command:     npm run lighthouse"
echo "  Assertions:  FCP ≤ 1500ms, LCP ≤ 1500ms (see lighthouserc.js)"
echo ""

# ── NFR-PERF-02: Attainment Rollup ≤ 500ms ──────────────────────────────────
echo "▸ NFR-PERF-02: Attainment rollup ≤ 500ms"
echo "  Edge Function: calculate-attainment-rollup"
echo "  Validation steps:"
echo "    1. Open Supabase Dashboard → Edge Functions → calculate-attainment-rollup"
echo "    2. Check 'Execution Time' in the function logs"
echo "    3. p95 execution time should be ≤ 500ms"
echo "  Alternative: Use Supabase CLI to invoke and time the function:"
echo "    time curl -X POST <SUPABASE_URL>/functions/v1/calculate-attainment-rollup \\"
echo "      -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"grade_id\":\"...\",\"submission_id\":\"...\"}'"
echo ""

# ── NFR-PERF-03: API p95 ≤ 300ms ────────────────────────────────────────────
echo "▸ NFR-PERF-03: API read query p95 ≤ 300ms"
echo "  Enforcement: Supabase dashboard monitoring + k6 load tests"
echo "  Validation steps:"
echo "    1. Supabase Dashboard → Database → Query Performance"
echo "    2. Check p95 latency for PostgREST read queries"
echo "    3. Run k6 load tests: k6 run scripts/k6/api-load-test.js"
echo "  Target: 5,000 concurrent users, p95 ≤ 300ms"
echo ""

# ── NFR-PERF-04: 5,000 Concurrent Users ─────────────────────────────────────
echo "▸ NFR-PERF-04: 5,000 concurrent users without degradation"
echo "  Enforcement: k6 load tests before major releases"
echo "  Scripts: scripts/k6/ (login, submission, grading, leaderboard)"
echo ""

echo "─────────────────────────────────────────────────────────────────"
echo "Run 'npm run lighthouse' to validate NFR-PERF-01 in CI."
echo "NFR-PERF-02/03/04 require runtime infrastructure for validation."
echo "─────────────────────────────────────────────────────────────────"
