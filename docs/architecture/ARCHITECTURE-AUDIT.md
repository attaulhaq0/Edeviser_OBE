# Architecture Audit Report

**Date:** 2026-03-28
**Scope:** Structural issues only (tight coupling, unclear boundaries, SoC violations, circular dependencies)
**Codebase snapshot:** `chore/update-task-checkmarks` branch

---

## 1. Hub-and-Spoke Auth Dependency (HIGH)

**23 hooks** directly import `useAuth` from `@/hooks/useAuth`, making it the single highest-coupled module in the codebase.

**Affected hooks:**
`useAssignments`, `useAtRiskPredictions`, `useBonusEvents`, `useBulkImport`, `useCLOs`, `useCourses`, `useDepartments`, `useEmailPreferences`, `useEnrollments`, `useGrades`, `useILOs`, `useJournal`, `useNotificationRealtime`, `usePageViewLogger`, `usePLOs`, `usePrograms`, `useReadHabitTimer`, `useRubrics`, `useSemesters`, `useSubmissions`, `useTeacherDashboard`, `useUsers`, `useWellnessXpConfig`

**Problem:** Every hook independently calls `useAuth()` to extract `user.id` or `user.institution_id`. This creates a fan-out dependency where any change to the auth context shape (renaming fields, adding async loading states, changing the provider) requires touching 23+ files. It also makes unit-testing hooks harder since each test must mock the full auth context.

---

## 2. Flat Hook Directory (82 files, no grouping) (HIGH)

All 82 custom hooks live in a single flat directory `src/hooks/` with no subdirectories or domain grouping.

**Domains mixed together at the same level:**

- OBE/Academic: `useAssignments`, `useCLOs`, `useCourses`, `useGrades`, `useILOs`, `usePLOs`, `useRubrics`, `useSubmissions`
- Gamification: `useXP`, `useBadges`, `useStreaks`, `useStreakFreeze`, `useBonusEvents`, `useLeaderboard`
- Wellness: `useWellnessGoals`, `useWellnessPreferences`, `useWellnessReminders`, `useWellnessTips`, `useWellnessXpConfig`
- Habits: `useHabitAnalytics`, `useHabitExport`, `useHeatmapData`, `useReadHabitTimer`
- Dashboard: `useAdminDashboard`, `useStudentDashboard`, `useTeacherDashboard`, `useStudentKPIs`
- AI/Analytics: `useAIPerformance`, `useAISuggestions`, `useAtRiskPredictions`
- Infrastructure: `useRealtime`, `useNotificationRealtime`, `usePageViewLogger`, `useOnlineStatus`
- Admin: `useUsers`, `useBulkImport`, `useAuditLog`, `useDepartments`, `useSemesters`

**Problem:** No structural signal about which hooks belong to which domain. A developer must read file contents to understand relationships. Related hooks (e.g., all five wellness hooks) have no grouping to indicate they form a cohesive unit.

---

## 3. Flat Library Directory (45 files, mixed concerns) (HIGH)

`src/lib/` contains 45 files mixing pure utilities, domain business logic, and infrastructure code at the same level.

**Business logic in lib/:**

- `badgeDefinitions.ts` -- badge catalog and rules
- `bloomsClimb.ts` -- gamification progression logic
- `scoreCalculator.ts` -- onboarding scoring
- `xpLevelCalculator.ts` -- XP/level thresholds
- `habitExport.ts` -- habit data export logic
- `exportCurriculumMatrixCsv.ts` -- curriculum matrix CSV generation

**Infrastructure in lib/:**

- `supabase.ts` -- DB client
- `sentry.ts` -- error tracking
- `offlineQueue.ts` -- offline request queuing
- `draftManager.ts` -- localStorage draft persistence
- `notificationBatcher.ts` -- notification batching
- `loginAttemptTracker.ts` -- rate limiting

**Pure utilities in lib/:**

- `utils.ts` -- general helpers
- `queryKeys.ts` -- React Query key factory

**Problem:** No boundary between "infrastructure that any module can use" and "domain logic that belongs to a specific feature." A developer looking for the XP calculation logic must scan 45 files. Business rules for badges, Bloom's taxonomy, and scoring are siblings of the Supabase client and Sentry config.

---

## 4. Monolithic Schemas Barrel (51 re-exports) (MEDIUM)

`src/lib/schemas/index.ts` re-exports all 51 schema modules via `export *`:

```
export * from "./auth"
export * from "./user"
export * from "./program"
... (48 more)
export * from "./wellnessXpAmount"
```

**Problem:** Any file that imports from `@/lib/schemas` gets the namespace of all 51 modules. This:

- Defeats tree-shaking in development (bundler must parse all 51 modules to resolve a single import)
- Creates implicit coupling: adding a new schema with a conflicting export name breaks unrelated consumers
- Makes it impossible to tell from an import statement which specific schema domain a file depends on

---

## 5. Cross-Page Imports (Horizontal Coupling) (MEDIUM)

Two journal pages import a hook defined inside the leaderboard page directory:

| Consumer                                        | Imports from                                          |
| ----------------------------------------------- | ----------------------------------------------------- |
| `src/pages/student/journal/JournalListPage.tsx` | `@/pages/student/leaderboard/useStudentCourseProgram` |
| `src/pages/student/journal/JournalEditor.tsx`   | `@/pages/student/leaderboard/useStudentCourseProgram` |

**Problem:** `useStudentCourseProgram` is a page-scoped utility inside `pages/student/leaderboard/` but is consumed by an entirely different page domain (`journal/`). This creates a horizontal dependency between sibling page directories. If the leaderboard page is refactored, moved, or deleted, the journal pages break. Shared logic consumed by multiple pages should not live inside a specific page's directory.

---

## 6. Duplicate `ROLE_DASHBOARD_MAP` (3 locations) (MEDIUM)

The role-to-dashboard-path mapping is defined independently in three files:

| File                             | Location                       |
| -------------------------------- | ------------------------------ |
| `src/providers/AuthProvider.tsx` | Used for post-login redirect   |
| `src/router/RouteGuard.tsx`      | Used for unauthorized redirect |
| `SECURITY-AUDIT-REPORT.md`       | Documented as a known pattern  |

**Problem:** Single source of truth violation. If a new role is added or a dashboard path changes, all locations must be updated in sync. There is no compile-time guarantee they stay consistent.

---

## 7. Monolithic Type File (565 lines, all domains) (MEDIUM)

`src/types/app.ts` contains **every shared type** for the entire application in a single 565-line file spanning:

- Core auth types (lines 9-33)
- OBE domain types (lines 35-89)
- Gamification types (lines 95-170)
- AI Co-Pilot types (lines 176-208)
- Portfolio & Enhancement types (lines 214-252)
- Utility types (lines 258-275)
- Institutional Management types (lines 287-503) -- includes 19 interfaces for **unimplemented features** (Survey, CQIPlan, Announcement, CourseModule, CourseMaterial, DiscussionThread, DiscussionReply, ClassSession, AttendanceRecord, GradeCategory, TimetableSlot, AcademicCalendarEvent, Transcript, CourseFile, FeeStructure, FeePayment, CourseSection, InstitutionSettings)
- Production types (lines 509-565)

**Problem:** A change to any type (even an unused institutional management type) triggers recompilation of every file that imports from `app.ts`. Types for unimplemented features (19 interfaces with no consuming code) add dead weight and cognitive load.

---

## 8. Router Monolith (247 lines, 80+ lazy imports) (MEDIUM)

`src/router/AppRouter.tsx` is a single 247-line file containing:

- **80 lazy-loaded component imports** (lines 8-83)
- **66 route definitions** across 5 role groups (lines 106-242)
- An inline `LoadingFallback` component (lines 88-98)

**Problem:** Every new page requires modifying this single file (adding both a lazy import and a route definition). The file mixes route configuration with component loading strategy. There is no route-level code ownership -- all roles' routes are in one file, meaning a change to an admin route touches the same file as a change to a student route.

---

## 9. Flat Shared Components Directory (92 files) (MEDIUM)

`src/components/shared/` contains 92 component files with no subdirectory grouping.

**Domains mixed together:**

- AI widgets: `AIAtRiskWidget`, `AISuggestionCard`, `AIFeedbackThumbs`
- Wellness: `WellnessSettingsPanel`, `WellnessReminderSettings`, `WellnessGoalInput`
- Charts/Data: `CorrelationInsightCard`, `CorrelationConfidenceBadge`, `Shimmer`
- Layout: `SkipToMain`, `ErrorBoundary`
- Forms: various form-related components

**Internal coupling within shared/:**

- `AIAtRiskWidget` imports `Shimmer` and `AtRiskStudentRow`
- `AISuggestionCard` imports `AIFeedbackThumbs`
- `CorrelationInsightCard` imports `CorrelationConfidenceBadge`
- `WellnessSettingsPanel` imports `WellnessReminderSettings` and `WellnessGoalInput`

**Problem:** No distinction between truly shared/generic components and domain-specific components that happen to be used by multiple pages. Components that are tightly coupled to each other (e.g., the 3 AI components, the 3 Wellness components) live at the same level as genuinely reusable components like `Shimmer` and `ErrorBoundary`.

---

## 10. ThemeProvider Depends on Auth Hook (LOW)

`src/providers/ThemeProvider.tsx` imports `useAuth` from `@/hooks/useAuth`:

```typescript
import { useAuth } from "@/hooks/useAuth";
```

**Problem:** ThemeProvider is a presentation-layer concern that depends on the auth layer to read the user's theme preference. This creates a coupling where:

- ThemeProvider cannot be used outside of the AuthProvider tree
- Theme functionality is blocked until auth resolves
- The provider hierarchy is implicitly ordered (AuthProvider must wrap ThemeProvider) but this constraint is not enforced or documented

**Additional note:** ThemeProvider is implemented but **not integrated** into `App.tsx`. It exists as dead code.

---

## 11. Centralized Query Keys, Distributed Queries (LOW)

`src/lib/queryKeys.ts` defines a single centralized object containing all React Query cache keys for the entire application. The hooks that use these keys are spread across 82 files in `src/hooks/`.

**Problem:** No locality of behavior. To understand what cache key a hook uses, you must cross-reference two files. To add a new query, you must modify both the hook file and `queryKeys.ts`. The centralized file becomes a merge-conflict hotspot when multiple developers add features in parallel.

---

## 12. Wellness Hook Chain (Intra-Domain Coupling) (LOW)

Within the wellness domain, three hooks depend on a single preference hook:

```
useWellnessGoals      --> useWellnessPreferences
useWellnessReminders  --> useWellnessPreferences
useWellnessTips       --> useWellnessPreferences
```

**Problem:** While intra-domain coupling is less severe than cross-domain, this creates a chain where `useWellnessPreferences` is a hidden prerequisite. If preferences fail to load, all three dependent hooks silently receive undefined data. There is no explicit dependency graph or error boundary at the domain level.

---

## Summary Table

| #   | Issue                                            | Severity | Scope                             |
| --- | ------------------------------------------------ | -------- | --------------------------------- |
| 1   | Hub-and-spoke `useAuth` dependency (23 hooks)    | HIGH     | `src/hooks/`                      |
| 2   | Flat hook directory (82 files, no grouping)      | HIGH     | `src/hooks/`                      |
| 3   | Flat lib directory (45 files, mixed concerns)    | HIGH     | `src/lib/`                        |
| 4   | Monolithic schemas barrel (51 re-exports)        | MEDIUM   | `src/lib/schemas/index.ts`        |
| 5   | Cross-page imports (journal -> leaderboard)      | MEDIUM   | `src/pages/student/`              |
| 6   | Duplicate `ROLE_DASHBOARD_MAP` (3 locations)     | MEDIUM   | `src/providers/`, `src/router/`   |
| 7   | Monolithic type file (565 lines, all domains)    | MEDIUM   | `src/types/app.ts`                |
| 8   | Router monolith (247 lines, 80+ imports)         | MEDIUM   | `src/router/AppRouter.tsx`        |
| 9   | Flat shared components (92 files)                | MEDIUM   | `src/components/shared/`          |
| 10  | ThemeProvider depends on auth hook (+ dead code) | LOW      | `src/providers/ThemeProvider.tsx` |
| 11  | Centralized query keys, distributed queries      | LOW      | `src/lib/queryKeys.ts`            |
| 12  | Wellness hook chain coupling                     | LOW      | `src/hooks/useWellness*.ts`       |

---

**What is NOT a problem (verified clean):**

- No direct Supabase calls in pages or components (all DB access goes through hooks)
- No circular dependencies detected between modules
- Edge functions (20+) have zero imports from `src/` -- complete isolation
- `src/components/ui/` (shadcn) is clean and properly separated
- No hooks import from pages or components (except issue #5)
- No barrel files in pages or components that could hide cycles
