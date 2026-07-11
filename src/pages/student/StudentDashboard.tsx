// =============================================================================
// StudentDashboard — production student dashboard (redesigned UI)
// =============================================================================
// The dashboard implementation lives in `StudentDashboardNew`. It is re-exported
// here so the route path (`@/pages/student/StudentDashboard`) stays stable.
// The legacy dashboard and its feature-flag wrapper were removed when the
// redesigned UI became the sole production experience (UI-migration cleanup).
// =============================================================================

export { default } from "@/components/shared/StudentDashboardNew";
