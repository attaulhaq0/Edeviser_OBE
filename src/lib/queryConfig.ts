// =============================================================================
// Shared TanStack Query timing constants.
// =============================================================================

/**
 * staleTime for dashboard / KPI / section queries.
 *
 * Spec: dashboard-and-ux-performance — Phase 7 Task 22, Appendix B §B.3.4.
 *
 * Dashboards are kept fresh by realtime subscriptions and mutation invalidation
 * (e.g. grading invalidates the teacher dashboard keys; `student_gamification`
 * realtime invalidates the student dashboard keys). A short 30 s staleTime
 * therefore did NOT improve correctness — it only forced a full refetch on every
 * remount/navigation, which is a large part of the per-section "drip" users feel.
 *
 * 2 minutes makes intra-session navigation a cache hit while staying well within
 * acceptable freshness for KPI-style data (and any real change still invalidates
 * immediately via realtime/mutations, so this is not a freshness regression).
 */
export const DASHBOARD_STALE_TIME_MS = 120_000;
