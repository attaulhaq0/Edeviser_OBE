# UI/UX Prototype Fidelity Audit

Date: 2026-07-28

This audit tracks the current prototype-fidelity work in `F:\Edeviser-Kiro`.
The approved prototype remains the single source of truth for visual design and
chrome behavior.

## What I verified

- The shared app shell is the main place where the current chrome is assembled:
  `src/app/RoleAppShell.tsx`, `src/components/shared/GlobalHeader.tsx`,
  `src/components/shared/Sidebar.tsx`, and `src/components/shared/MobileTabBar.tsx`.
- The student sidebar was one of the clearest mismatches with the prototype.
  It now uses the prototype sidebar width token and the student-only upgrade card
  / bottom “MORE” section structure.
- Parent progress and parent profile screens still had old card wrappers and
  were updated to use the prototype-oriented `PCard` / `SectionHeader`
  composition.
- The student dashboard’s timeline, weekly summary, and study-time chart still
  used legacy `Card` shells. They were moved to the same prototype-oriented
  `PCard` / `SectionHeader` composition in this pass.
- The weekly goals panel on the student planner still used the old gradient
  card header; it now also uses the prototype `PCard` / `SectionHeader`
  composition.
- The student XP history screen still mixed `card-elevated` and old `Card`
  shells; it now uses the prototype `PCard` surface for both summary and list
  panels.
- The student portfolio screen still leaned on the older `card-elevated` stack;
  it now uses the prototype `PCard` surface for the major sections.
- The starter-week planner still used plain `Card` wrappers for its session and
  empty-state surfaces; it now uses the prototype `PCard` surface there too.
- The student marketplace quest tab still used a plain `Card` wrapper for each
  quest tile; it now uses the prototype `PCard` surface.
- The student course study breakdown chart still used the old `Card` shell; it
  now uses the prototype `PCard` / `SectionHeader` composition.
- The shared streak widget still used the old `Card` shell; it now uses the
  prototype `PCard` surface.
- The team card family still used the old `Card` shell; it now uses the
  prototype `PCard` surface.
- The badge collection widget still used the old `Card` shell; it now uses the
  prototype `PCard` surface in both legacy and tiered modes.
- The team invitation card still used the old `Card` shell; it now uses the
  prototype `PCard` surface.
- The team dashboard card still used the old `Card` shell; it now uses the
  prototype `PCard` surface.
- The parent-student card still used the old `Card` shell; it now uses the
  prototype `PCard` surface.
- The micro-assessment card still used the old `Card` shell; it now uses the
  prototype `PCard` surface.
- The wellness-tip card still used the old `Card` shell; it now uses the
  prototype `PCard` surface.
- The reflection digest card still used the old `Card` shell; it now uses the
  prototype `PCard` surface.
- The teacher/admin/coordinator profile pages still used the legacy Card shell;
  they now use the prototype `PCard` / `SectionHeader` composition.
- The notification-preferences and session-management settings pages still used
  the legacy Card shell; they now use the prototype `PCard` / `SectionHeader`
  composition.

## Root causes still visible in the codebase

1. Shared chrome is still the primary source of layout drift.

   The header, sidebar, and bottom-bar are now much closer to the prototype, but
   they remain the top place where spacing, width, and active-state differences
   can reappear if a child page uses older utility classes.

2. Many screens still use legacy card surfaces directly.

   A large number of pages still render cards with variations of:
   `bg-white border-0 shadow-md rounded-xl`, `card-elevated`, or manually padded
   `Card` wrappers. These are visually close in some places, but they are not a
   single prototype-driven composition.

   The practical root cause is repeated reuse of older shared-card primitives in
   student dashboard widgets and profile surfaces rather than a single
   prototype-native card primitive. We are removing those surfaces one by one.

3. Profile-style screens are especially inconsistent.

   The codebase still has multiple profile/settings surfaces with different card
   wrappers, heading styles, and spacing choices. Those are the highest-risk
   areas for “old system” visual leftovers.

4. Several screens still mix the rebuilt shell with legacy inner sections.

   This creates a hybrid feel: the outer chrome is prototype-aligned, but some
   page bodies still read as the old system.

## Files changed in this pass

- `src/components/shared/Sidebar.tsx`
- `src/components/shared/StudentSidebarExtras.tsx`
- `src/components/shared/TodayTimeline.tsx`
- `src/components/shared/DailyProgressSummary.tsx`
- `src/components/shared/ProgressSummaryPanel.tsx`
- `src/components/shared/StudyTimeChart.tsx`
- `src/components/shared/WeeklyGoalPanel.tsx`
- `src/pages/student/progress/XPHistoryNew.tsx`
- `src/pages/student/portfolio/StudentPortfolioNew.tsx`
- `src/pages/student/planner/StarterWeekPlanPage.tsx`
- `src/pages/student/marketplace/KnowledgeQuestsTab.tsx`
- `src/components/shared/CourseStudyBreakdown.tsx`
- `src/components/shared/StreakDisplay.tsx`
- `src/components/shared/TeamCard.tsx`
- `src/components/shared/BadgeCollection.tsx`
- `src/components/shared/TeamInvitationCard.tsx`
- `src/components/shared/TeamDashboardCard.tsx`
- `src/components/shared/ParentStudentCard.tsx`
- `src/components/shared/MicroAssessmentCard.tsx`
- `src/components/shared/WellnessTipCard.tsx`
- `src/components/shared/ReflectionDigestCard.tsx`
- `src/pages/teacher/settings/TeacherProfilePage.tsx`
- `src/pages/admin/settings/AdminProfilePage.tsx`
- `src/pages/coordinator/settings/CoordinatorProfilePage.tsx`
- `src/pages/shared/NotificationPreferences.tsx`
- `src/pages/shared/SessionManagement.tsx`
- `src/design-system/tokens.css`
- `src/pages/parent/ParentProgressPage.tsx`
- `src/pages/parent/settings/ParentProfilePage.tsx`

## Remaining high-priority legacy hotspots

These were surfaced by code search and still deserve migration attention:

- `src/pages/shared/ProfilePage.tsx`
- `src/pages/admin/**` screens that still render raw `Card` surfaces
- `src/pages/teacher/**` analytics and handoff screens with old card spacing
- `src/pages/student/**` challenge/content/course/assignment screens that still
  contain old `bg-white shadow-md rounded-xl` wrappers
- `src/components/shared/**` cards and widgets that are still using the legacy
  visual vocabulary instead of the prototype primitives

## Current status

- Student left sidebar: substantially corrected toward the prototype.
- Parent progress/profile: moved closer to the prototype card system.
- Shell/header: still a live audit area, but the largest structural mismatch
  called out by the brief is now addressed much more directly.

## Next recommended work

1. Continue converting profile pages and shared profile surfaces to the
   prototype card system.
2. Keep replacing raw `Card` / `shadow-md` blocks in visible dashboards with
   prototype primitives.
3. Re-run browser verification against the local app after each visible shell
   change.

This document is intentionally an audit note, not a claim that the full rebuild
is complete.
