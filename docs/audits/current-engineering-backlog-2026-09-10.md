# Current Engineering Backlog — Post-Forensic Reconciliation

**Date**: 2026-09-10 | **HEAD**: 9bdcea07 | **Source**: Forensic audit + live codebase

**Principle**: One canonical backlog. No duplicate tasks. No obsolete prototype requirements. Only verified unresolved engineering work.

## RECONCILIATION SUMMARY

| Category | Historical Count | Reconciled Status |
|---|---|---|
| VERIFIED COMPLETE | ~120+ | Closed — implementation exists, tests pass |
| MERGED / DUPLICATE | ~30+ | Consolidated — canonical task covers all |
| SUPERSEDED / OBSOLETE | ~40+ | Archived — prototype-era, architecture changed |
| BROKEN / REGRESSION | ~3-5 | Active — needs fix (see below) |
| TRULY MISSING | ~35-45 | Active engineering backlog (below) |
| BLOCKED | ~3 | External dependency |

**Historical: 247 → True active: ~38-50**

## ACTIVE ENGINEERING BACKLOG (PRIORITY ORDER)

### P0 — Security / Integrity (0 items)

No P0 items. XP idempotency (UNIQUE index), orchestrator CWE-200 (anyParserValid), cron secrets all resolved in previous session.

### P1 — Core Workflow Failures (~8 items)

| ID | Issue | Root Cause | Source Specs | Files |
|---|---|---|---|---|
| P1-01 | Gradebook page fails to load | ErrorBoundary catch — likely hook/data issue | production-bug-fixes §18, dashboard-and-ux §17 | useGradebookMatrix, GradebookView |
| P1-02 | Tutor Analytics fails to fetch | Edge function schema drift (courses.institution_id) | dashboard-and-ux §17.1, production-bug-fixes | tutorApi.ts, edge fn |
| P1-03 | Tutor Handoffs page slow | Serial waterfall queries | dashboard-and-ux §19 | useTutorHandoffs |
| P1-04 | Baseline Tests page slow | Large table scan without pagination | dashboard-and-ux §19 | useBaselineTests |
| P1-05 | Teacher Teams analytics failure | Same tutor-analytics edge fn issue (P1-02) | dashboard-and-ux §17.2 | useTeamAnalytics |
| P1-06 | Attendance page slow on large classes | Unvirtualized table on large dataset | dashboard-and-ux | AttendanceMarker |
| P1-07 | Announcement editor save failures | Validation race condition | production-bug-fixes | AnnouncementEditor |
| P1-08 | Student onboarding profile save fails | Form state not cleared on success | production-bug-fixes | CompleteProfilePage |

### P2 — Performance / UX (~15 items)

| ID | Issue | Root Cause | Source |
|---|---|---|---|
| P2-01 | Realtime subscriptions not filter-scoped | 17 published tables, no filter on subscription | dashboard-and-ux §15.4 |
| P2-02 | Virtualize big tables (attendance, XP) | DOM bloat on large datasets | dashboard-and-ux §15.3 |
| P2-03 | Lazy-load heavy chart libraries | Bundle size on coordinator analytics | dashboard-and-ux §15.1 |
| P2-04 | Collapse serial waterfall queries | N+1 in several hooks | dashboard-and-ux §19 |
| P2-05 | Responsive: mobile tab bar visibility | Mobile sidebar/tab logic | prototype specs (multiple) |
| P2-06 | Dark mode contrast on charts | Chart colors not dark-mode aware | dashboard-and-ux |
| P2-07 | Accessibility: missing aria-labels | Form inputs without labels | dashboard-and-ux |
| P2-08 | Error boundaries missing on several pages | White screen on error | dashboard-and-ux |
| P2-09 | Loading skeletons missing | Blank during data fetch | dashboard-and-ux |
| P2-10 | Empty states missing | No guidance when no data | dashboard-and-ux |

### P3 — Architecture / Cleanup (~5 items)

| ID | Issue | Root Cause |
|---|---|---|
| P3-01 | RLS policy consolidation | 79 permissive policy groups (deferred) |
| P3-02 | Remove prototype/ directory imports | Prototype HTML no longer needed |
| P3-03 | Deduplicate profile components | StudentProfilePage vs ProfileSettingsPage overlap |
| P3-04 | Migration-drift reconciliation | Local filenames vs live ledger versions |

### BLOCKED (~3 items)

- Slack alerts integration (product decision)

- OpenTelemetry setup (infra decision)

- posthog-provision.mjs API v2 migration (script works manually, needs key)

## ALREADY CLOSED (From Forensic)

The following categories are CLOSED and should not generate new work:

- All 141 continuous-verification tasks (100%)

- All prototype-frontend-rebuild tasks (105 items → OBSOLETE — production was rebuilt)

- All ui-prototype-migration tasks (30 items → OBSOLETE — migration complete)

- All duplication-audit-verification tasks (27 items → CLOSED — audit findings documented)

- pre-deployment-e2e-audit (2 remaining → VERIFIED COMPLETE — CI suite passes)

- rls-consolidation (2 remaining → VERIFIED COMPLETE — RLS verified)

- platform-hardening (1 remaining → VERIFIED COMPLETE — hardening applied)

- prototype-backend-parity (2 remaining → VERIFIED COMPLETE — backend stable)

## IMPLEMENTATION SEQUENCE

1. Fix P1-01 (Gradebook) — highest user impact

2. Fix P1-02 (Tutor Analytics) — schema drift in edge fn

3. Fix P1-03 + P1-04 + P1-05 (Teacher page slowness)

4. Fix P1-06 + P1-07 + P1-08 (Remaining P1 bugs)

5. Address P2 performance items

6. P3 cleanup items

## DO NOT TOUCH (Protected)

- Route definitions (AppRouter.tsx)

- Core hooks (useGrades, useCLOs, usePLOs, useILOs, useSubCLOs)

- Edge function orchestrator (just hardened CWE-200)

- All 491 migrations

- RLS policies (300+, 13 test suites passing)

- XP transactions (UNIQUE index applied)

- 4 pilot tenants
