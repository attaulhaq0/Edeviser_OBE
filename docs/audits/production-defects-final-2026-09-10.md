# Production Defects — Final Register 2026-09-10

## Summary

| Severity | Count |
|---|---|
| P0 (Critical/security/data-loss) | 0 |
| P1 (Major workflow blocker) | 0 |
| P2 (Important user-facing defect) | 1 |
| P3 (Minor issue) | 2 |
| P4 (Polish) | 0 |

---

## Defects

### DEF-001: Non-Student Mobile Navigation Missing

| Field | Value |
|---|---|
| **ID** | DEF-001 |
| **Severity** | P2 |
| **Roles** | Admin, Coordinator, Teacher |
| **Routes** | All role routes |
| **Device** | Mobile web (<640px) |
| **Layer** | App shell / navigation |
| **Description** | Below 640px, the sidebar is hidden via CSS but no MobileTabBar is rendered for admin/coordinator/teacher roles. Users on mobile browser have no primary navigation. |
| **Root Cause** | `MobileTabBar` only serves `student` and `parent` roles. `getMobileTabItems()` returns items only for those roles. |
| **Fix** | Define mobile tab items for admin, coordinator, teacher in `navPresentation.ts` |
| **Verification** | Verify MobileTabBar renders on mobile for all 5 roles |

### DEF-002: E2E Responsive Screenshot Test Stale Assertion

| Field | Value |
|---|---|
| **ID** | DEF-002 |
| **Severity** | P3 |
| **Roles** | Admin |
| **Routes** | /admin/dashboard |
| **Device** | Mobile web (375x667) |
| **Layer** | Test / E2E |
| **Description** | E2E responsive test asserts "sidebar hidden on mobile for admin" but the test log shows sidebar visible at some widths. |
| **Root Cause** | Test assertion may not account for the current breakpoint behavior |
| **Fix** | Update E2E responsive assertion to match current responsive architecture |
| **Verification** | E2E responsive test passes |

### DEF-003: 177 Uncommitted Working-Tree Files

| Field | Value |
|---|---|
| **ID** | DEF-003 |
| **Severity** | P3 |
| **Roles** | All |
| **Routes** | N/A |
| **Device** | N/A |
| **Layer** | Git / release |
| **Description** | 177 modified files + 18 untracked files on branch `feat/show-events-fix` are not committed |
| **Root Cause** | Multiple work sessions left uncommitted changes |
| **Fix** | Group into logical commits, commit, push |
| **Verification** | `git status` shows clean tree |