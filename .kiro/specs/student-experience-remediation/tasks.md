# Implementation Plan: Student Experience Remediation

## Overview

This plan remediates the 35 requirements from `requirements.md` per the layered design in `design.md`. Implementation language is **TypeScript** (React 18 + Vite, Supabase, Deno edge runtime) — the design specifies concrete TS/SQL, so no language selection is required.

The plan follows the design's mandatory **Sequence & Risk** rule: schema migrations → seed migrations → type regeneration (R26) → hook refactors/cast removal (R25/R26.2). Pure business logic in `src/lib/` is built early (it is independent of the database) so its property tests catch errors before the UI wiring depends on them. Each later task builds on earlier ones and ends by wiring the new capability into the surface a student actually reaches, with no orphaned code.

Property-based tests (fast-check, min 100 iterations) implement the 13 design **Correctness Properties** and are placed next to the pure functions they validate. Test sub-tasks are marked optional with `*`.

## Tasks

- [x] 1. Database schema migrations (DDL via Supabase MCP)

  - [x] 1.1 Add `courses.color` column

    - Author and apply migration adding nullable `courses.color text` with `CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')`
    - Confirm existing `courses` RLS covers the new column (no new policy needed)
    - _Requirements: 9.3, 9.4_

  - [x] 1.2 Add `institution_settings` leaderboard config columns

    - Add `leaderboard_min_cohort_size integer NOT NULL DEFAULT 5 CHECK (>= 0)` and `leaderboard_page_size integer NOT NULL DEFAULT 50 CHECK (BETWEEN 1 AND 200)`
    - Confirm read access via existing `institution_settings` read policy (`institution_id = auth_institution_id()`)
    - _Requirements: 6.3, 32.1, 32.2_

  - [x] 1.3 Add `profiles.portfolio_sharing_permitted` column and protect it
    - Add `portfolio_sharing_permitted boolean NOT NULL DEFAULT false`
    - Extend the privileged-column preservation trigger so non-admin updates cannot self-grant this column
    - _Requirements: 24.1, 24.2_

- [x] 2. Read-only RPCs and public-portfolio data-layer access control (via Supabase MCP)

  - [x] 2.1 Create `get_leaderboard_page` RPC

    - `SECURITY DEFINER`, institution-scoped (raise on `auth_institution_id()` mismatch), set-based exclusion of `leaderboard_anonymous = true`, returns one ranked page plus `eligible_count`
    - Replaces whole-institution fetch + client slice and the full-table opt-out scan
    - _Requirements: 6.5, 32.1, 32.3, 32.4_

  - [x] 2.2 Create `get_xp_transactions_page` RPC

    - `STABLE` SQL UNION of `xp_transactions` (earnings) and non-refunded `xp_purchases` (spending) ordered by `occurred_at DESC`, returning a page plus exact `total_count`; supports `all|earnings|spending` filter
    - _Requirements: 33.1, 33.2, 33.3_

  - [x] 2.3 Create `portfolio_public_access` RPC and gate public-portfolio reads with RLS
    - `SECURITY DEFINER` discriminator returning `authorized | forbidden | not_found` without leaking content
    - Add/adjust RLS so unauthenticated read requires both `portfolio_public = true` AND `portfolio_sharing_permitted = true`; content queries always run under RLS
    - _Requirements: 24.3, 24.3a, 24.4_

- [x] 3. Seed migrations and storage (Build-Over-Defer; via Supabase MCP)

  - [x] 3.1 Seed onboarding question banks for every institution

    - Replace the `LIMIT 1` CTE with `INSERT ... SELECT FROM institutions CROSS JOIN (VALUES ...)` for personality (25), VARK/learning_style (16), self_efficacy (6), study_strategy (8); `ON CONFLICT DO NOTHING` for idempotency
    - Pair seeded content with en/ar i18n keys (or `*_ar` columns where supported)
    - _Requirements: 11.1, 11.5_

  - [x] 3.2 Seed starter challenges and marketplace items

    - Seed starter `social_challenges` per course (e.g., 3-day study streak; valid `challenge_type`, `goal_target > 0`, `status='active'`, valid `created_by`) and starter `marketplace_items` per institution (valid enum category, `xp_price > 0`); clearly-labeled coming-soon items only where no catalog can be seeded
    - Pair all seeded content with en/ar i18n keys
    - _Requirements: 12.1, 12.2, 12.5, 12.7_

  - [x] 3.3 Seed section assignment and timetable slots

    - Assign `student_courses.section_id` for enrolled students and seed `timetable_slots(section_id, day_of_week, start_time, end_time, room, slot_type)` for those sections
    - Pair schedule labels with en/ar i18n keys
    - _Requirements: 13.1, 13.4_

  - [x] 3.4 Create `tutor-attachments` Storage bucket and access policy
    - Private bucket; RLS path-prefixed by `auth.uid()` so a student can only write/read under their own folder; validate the bucket exists for the upload hook
    - _Requirements: 4.5_

- [x] 4. Regenerate database types (after all DDL/RPC/seed migrations land)

  - [x] 4.1 Run `scripts/regen-types.ps1` and verify the type checker
    - Regenerate `src/types/database.ts` via the approved script only (never hand-edit, never stdout redirect)
    - Run `npx tsc --noEmit` immediately to isolate regeneration fallout from later refactors; introduce no new `any`
    - _Requirements: 26.1, 26.3, 26.4_

- [x] 5. Checkpoint - data layer and types

  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Pure business logic and property tests (`src/lib/`)

  - [x] 6.1 Extend/confirm `attainmentClassifier` banding and color helpers

    - Reuse existing classifier with inclusive `>=` boundaries (50 → Developing, <50 → Not Yet, 70 → Satisfactory, 85 → Excellent); ensure color/text/badge helpers map to the same band
    - _Requirements: 8.2, 8.3_

  - [x]\* 6.2 Write property test for attainment classification

    - **Property 1: Attainment classification banding and color agree, with the 50% boundary as Developing**
    - **Validates: Requirements 8.2, 8.3**

  - [x] 6.3 Implement `leaderboardGate.ts`

    - Pure `leaderboardState(eligibleCount, minCohort)` returning `locked|unlocked`; zero eligible ⇒ always locked
    - _Requirements: 6.1, 6.2, 6.2a, 6.4_

  - [x]\* 6.4 Write property test for the leaderboard gate

    - **Property 2: Leaderboard locked exactly when ineligible cohort**
    - **Validates: Requirements 6.1, 6.2, 6.4**

  - [x] 6.5 Implement `pagination.ts` helpers

    - `toRange(page, pageSize)`, `hasMore(page, pageSize, total)`, page-count helpers shared by leaderboard, transactions, marketplace, discussions
    - _Requirements: 32.2, 33.2, 33.3, 34.3_

  - [x]\* 6.6 Write property test for pagination completeness

    - **Property 4: Pagination is complete and never truncates**
    - **Validates: Requirements 32.2, 33.2, 33.3, 34.3**

  - [x] 6.7 Implement `passwordVisibility.ts` reducer

    - Pure mutual-exclusion reducer over N password fields (reveal hides all others; hide clears only the matching field)
    - _Requirements: 5.5_

  - [x]\* 6.8 Write property test for password mutual-exclusion

    - **Property 5: At most one password field is revealed at a time**
    - **Validates: Requirements 5.5**

  - [x] 6.9 Implement `primaryCtaSelector.ts`

    - `selectPrimary` (highest-precedence applicable candidate or null) and `orderSecondary` (subordinate applicable candidates ordered)
    - _Requirements: 16.1, 16.2, 16.3_

  - [x]\* 6.10 Write property test for primary CTA selection

    - **Property 6: Primary CTA is the highest-priority applicable candidate**
    - **Validates: Requirements 16.1, 16.2, 16.3**

  - [x] 6.11 Implement `quizScore.ts` and `quizCorrectness.ts`

    - `computeScore(totalCorrect, totalQuestions)` (rounded percentage) and `deriveCorrectness` (server-evaluated when present, else equality against correct answer, never constant `true`)
    - _Requirements: 2.1, 2.4, 2.6, 3.1, 3.3_

  - [x]\* 6.12 Write property test for quiz score computation

    - **Property 7: Quiz score is computed from the latest submitted answers**
    - **Validates: Requirements 3.1, 3.3**

  - [x]\* 6.13 Write property test for practice correctness derivation

    - **Property 9: Practice feedback correctness matches the evaluation and the recorded value**
    - **Validates: Requirements 2.1, 2.4, 2.6**

  - [x] 6.14 Implement `tutorStatus.ts` mapper

    - Total `mapTutorError(signal)` over a discriminated `TutorUiState` union (`ready | unavailable | not_enrolled | no_embeddings | rate_limited | error`) defaulting to `error`
    - _Requirements: 4.2, 4.2a, 4.3_

  - [x]\* 6.15 Write property test for tutor status mapping

    - **Property 10: Tutor status mapping is total and correct**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 6.16 Implement `navGroups.ts`

    - Group metadata (`learn | growth | community | tools`) and `assertNavGroup(item)` enforcing required placements (AI Tutor ∈ Learn)
    - _Requirements: 20.6_

  - [x]\* 6.17 Write property test for navigation group assignment

    - **Property 11: Navigation group assignment is valid**
    - **Validates: Requirements 20.6**

  - [x] 6.18 Implement `portfolioAccess.ts` route status mapping

    - Pure mapping `authorized → render`, `forbidden → 403`, `not_found → 404` (and a model of the discriminator's authorization rule)
    - _Requirements: 24.3_

  - [x]\* 6.19 Write property test for the public-portfolio access discriminator
    - **Property 12: Public portfolio access discriminator distinguishes forbidden from not-found**
    - **Validates: Requirements 24.3**

- [x] 7. Data-access hooks (`src/hooks/`, TanStack Query)

  - [x] 7.1 Build `useStudentCourses` (extended, single batched query)

    - Return progress, next assignment + due date, `color`, attainment, assignment count in one query (no per-card N+1); relocate the in-page enrolled-courses logic into the hook
    - _Requirements: 9.1, 9.2, 9.2a, 9.4, 9.5_

  - [x] 7.2 Rewrite `useLeaderboard` to use `get_leaderboard_page` + gate

    - Read `leaderboard_min_cohort_size`/`leaderboard_page_size` from `institution_settings`; drive locked/unlocked via `leaderboardState`; paginate via `pagination.ts`; remove whole-institution fetch and `getOptOutStudentIds` full scan
    - _Requirements: 6.1, 6.3, 6.5, 32.1, 32.2, 32.3_

  - [x]\* 7.3 Write property test for the leaderboard opt-out invariant on the query path

    - **Property 3: Leaderboard never reveals opted-out students**
    - **Validates: Requirements 6.5, 32.4**

  - [x] 7.4 Rewrite `useTransactionHistory` to use `get_xp_transactions_page`

    - Return `{ entries, totalCount, hasMore }` from source-level pagination; on RPC failure surface an error and refuse to show transactions (no `.range(0,200)` fallback)
    - _Requirements: 33.1, 33.1a, 33.2, 33.3_

  - [x] 7.5 Build `useTutorAttachmentUpload`

    - Upload image/document to `tutor-attachments` under the user folder, return a signed URL; throw on failure so the send can abort
    - _Requirements: 4.5_

  - [x] 7.6 Build `useUpdateConversationAutonomy` mutation

    - Typed update of `tutor_conversations.autonomy_override`; invalidate conversation queries; `onError` Sonner toast (replaces raw `(supabase as any)` update)
    - _Requirements: 28.1, 28.3_

  - [x] 7.7 Build/relocate `useChallengeDetail` with `.maybeSingle()`

    - Zero-or-one row query; distinguish `null` (not-found) from query error (error state)
    - _Requirements: 27.1, 27.2, 28.2_

  - [x] 7.8 Build `useSurveyAssignmentsCount`

    - Returns the student's assigned-survey count to drive the conditional Surveys nav item
    - _Requirements: 23.1, 23.2, 23.2a_

  - [x] 7.9 Build `usePortfolioSharingPermission` and extend `useTogglePortfolioPublic`

    - Read `portfolio_sharing_permitted`; make public toggle effective only when permission is granted
    - _Requirements: 24.1, 24.2_

  - [x] 7.10 Bound and paginate `useMarketplace` and `useDiscussions`
    - Replace unbounded fetches with bounded, paginated queries using `pagination.ts`; expose load-more capability
    - _Requirements: 34.1, 34.2, 34.3, 34.4_

- [x] 8. Shared presentational components (`src/components/shared/`)

  - [x] 8.1 Build `PasswordInput` and `PasswordVisibilityGroup`

    - Shadcn `Input` + eye toggle, accessible name reflecting current action, 44px touch target; group provider uses `passwordVisibility` reducer for mutual exclusion
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.2 Build `AttainmentInfo`

    - Accessible Popover/Tooltip explaining mastery and the four threshold bands with their colors; consumes `attainmentClassifier`; bilingual
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 8.3 Build `PrimaryCTA`
    - Renders the single dominant CTA from `primaryCtaSelector` plus a subordinate secondary-actions row
    - _Requirements: 16.1, 16.4, 16.5_

- [x] 9. Checkpoint - logic, hooks, and shared components

  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. P0 - Repair the dead AI Tutor route (R1)

  - [x] 10.1 Fix the three broken `/student/ai-tutor` links

    - Point `PostQuizReview`, `FlowCheckInDialog` ("Stuck"), and `MasteryRecoveryPanel` to `/student/tutor`; preserve CLO id as `?cloIds=` where applicable
    - _Requirements: 1.1, 1.2, 1.3_

  - [x]\* 10.2 Update existing route-link assertions

    - Update `postQuizReviewPage.test.tsx` and `flowCheckInDialog.test.tsx` to assert the registered `/student/tutor` route
    - _Requirements: 1.5_

  - [x]\* 10.3 Write property test for the student-facing route guard
    - **Property 13: No student-facing link targets an unregistered route**
    - **Validates: Requirements 1.4**

- [x] 11. P0 - Adaptive quiz correctness and timer (R2, R3)

  - [x] 11.1 Wire `deriveCorrectness` into `AdaptiveQuizSession` practice feedback

    - Drive `practiceFeedback.wasCorrect`, the recorded `previous_answer_correct`, and the correct-count increment from the same derived value; render feedback only after submission
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 11.2 Fix the timer stale-closure and double-finalize risk

    - Use a latest-ref pattern for the finalize routine (remove the `eslint-disable`); add a `finalizedRef` guard and `clearInterval` on unmount; finalize from current session state via `computeScore`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x]\* 11.3 Write property test for finalization idempotence

    - **Property 8: Finalization is idempotent (no double-submit)**
    - **Validates: Requirements 3.4**

  - [x]\* 11.4 Write unit tests for practice feedback rendering
    - Verify correct/incorrect panels, correct-answer reveal on incorrect, and no feedback before submission
    - _Requirements: 2.2, 2.3, 2.5_

- [x] 12. P0 - Make the AI Tutor operational end-to-end (R4, R28)

  - [x] 12.1 Build real attachment upload in `ChatPanel`

    - On send with attachments, await `useTutorAttachmentUpload` and pass real URLs to `chat-with-tutor`; on upload failure toast and abort the send (no empty/undefined references)
    - _Requirements: 4.5_

  - [x] 12.2 Implement the tutor UI state machine in `TutorPage`/`ChatPanel`

    - Render distinct panels per `TutorUiState` from `mapTutorError`; wrap the chat area in an `ErrorBoundary` so the guaranteed fallback renders even if state detection fails
    - _Requirements: 4.1, 4.2, 4.2a, 4.3, 4.4_

  - [x] 12.3 Wire `useUpdateConversationAutonomy` into `TutorPage`

    - Replace the raw autonomy update; surface failures via toast
    - _Requirements: 28.1, 28.3_

  - [x]\* 12.4 Write unit tests for tutor states and autonomy error handling
    - Cover unavailable/not-enrolled/no-embeddings/fallback panels and the autonomy-failure toast
    - _Requirements: 4.2, 4.3, 4.4, 28.1_

- [x] 13. Checkpoint - P0 bug fixes complete

  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Password show/hide on auth forms (R5)

  - [x] 14.1 Adopt `PasswordInput` across the auth forms

    - Replace password fields in `LoginPage`, `auth/SignUpPage`, `auth/AcceptInvitePage`, `UpdatePasswordPage`; wrap multi-field forms in a `PasswordVisibilityGroup`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x]\* 14.2 Write unit tests for reveal/mask and mutual exclusion
    - Verify plain/masked toggling, accessible name changes, and at-most-one-revealed across multiple fields
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 15. Leaderboard and transaction-history pages (R6, R32, R33)

  - [x] 15.1 Render leaderboard locked/unlocked states with pagination

    - Show the "unlocks when more students join" state when locked (no rank/medal); render paginated rankings when unlocked; honor opt-out in the locked state
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 32.2_

  - [x] 15.2 Render transaction history with real pagination and failure refusal

    - Page through all entries via the hook; on failure show an error (with toast) and refuse to display transactions
    - _Requirements: 33.1a, 33.2, 33.3_

  - [x]\* 15.3 Write unit tests for leaderboard locked state and transaction refusal
    - Verify no medals when locked and that a failed page query shows error rather than a truncated list
    - _Requirements: 6.4, 33.1a_

- [x] 16. Course-card identity and habits heatmap context (R7, R8, R9)

  - [x] 16.1 Enrich course cards on `StudentCoursesPage`

    - Show progress bar, next assignment + due date (name-only when no due date), course color (deterministic fallback when null), neutral "no upcoming work" indicator, and the `AttainmentInfo` explanation/colors
    - _Requirements: 8.1, 8.3, 9.1, 9.2, 9.2a, 9.3, 9.5_

  - [x] 16.2 Add XP and reward context to the habits heatmap

    - Replace hardcoded `xpEarned={0}` with the day's recorded XP; add a best-habit + completion-rate summary; surface Perfect Day reward context
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x]\* 16.3 Write unit tests for course-card variants and heatmap XP
    - Cover due/no-due cards, null-color fallback, and per-day XP display
    - _Requirements: 7.1, 9.2, 9.2a, 9.5_

- [x] 17. Surface reflective journal prompts (R10)

  - [x] 17.1 Wire the prompt generator into `StudentJournalPage`

    - Present reflection templates ("What did I learn today?", "What confused me?", "What am I proud of?") using the existing generator; selecting a prompt seeds the entry; fall back to a basic unguided journal if the generator is unavailable
    - _Requirements: 10.1, 10.2, 10.3, 10.3a, 10.4_

  - [x]\* 17.2 Write unit tests for prompt seeding and fallback
    - Verify a selected prompt seeds the entry and the unguided fallback remains usable
    - _Requirements: 10.2, 10.3a_

- [x] 18. Onboarding seed wiring, progressive profiling, and framing (R11, R14, R17)

  - [x] 18.1 Replace the admin-contact error in `SelfEfficacyStep`

    - Present seeded questions when available; show a non-alarming zero-data fallback only when there are genuinely zero questions; surface system issues distinctly; never block the sequence
    - _Requirements: 11.2, 11.3, 11.4, 11.4a, 11.4b, 11.5_

  - [x] 18.2 Default to the Day-1 short path with progressive scheduling

    - Use `DAY1_STEPS` by default; schedule days 2–14 via `MICRO_ASSESSMENT_SCHEDULE`; prompt due assessments on later days without blocking platform use
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.3 Apply benefit-oriented assessment framing

    - Use benefit titles (e.g., "Discover How You Learn Best", "Academic Confidence Check"); show benefits + estimated time before requesting responses and gate the assessment body until both display
    - _Requirements: 17.1, 17.2, 17.2a, 17.3, 17.4_

  - [x]\* 18.4 Write unit tests for onboarding short path, fallback, and framing gate
    - Verify short-path default, non-blocking fallback, and that the body is gated until benefit + time render
    - _Requirements: 14.1, 11.4, 17.2a_

- [x] 19. Starter-content empty states and timetable context (R12, R13, R21.3)

  - [x] 19.1 Standardize empty states on Challenges, Marketplace, and Timetable

    - Replace ad-hoc inline empty states with shared `NoChallenges`, `NoMarketplaceItems`, `NoTimetable`; ensure surfaces still load if seeds fail
    - _Requirements: 12.1, 12.2, 12.6, 12.8, 13.3_

  - [x] 19.2 Add the My Team join/create path and empty state

    - Explain how teams work and surface a join/create path when unassigned; render `NoTeams` when an assigned student has no team data
    - _Requirements: 12.3, 12.3a, 12.6_

  - [x] 19.3 Show current/next class context on the timetable

    - Display scheduled meetings for the student's section and the current/next class with time remaining; use `NoTimetable` when no section is assigned
    - _Requirements: 12.4, 13.2, 21.3_

  - [x]\* 19.4 Write unit tests for empty-state fallbacks and seed-failure resilience
    - Verify shared components render on zero data and surfaces load even when seeds are absent
    - _Requirements: 12.6, 12.8, 13.3_

- [x] 20. Checkpoint - core student surfaces functional

  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Single prioritized dashboard CTA (R16)

  - [x] 21.1 Replace stacked banners with one `PrimaryCTA`

    - Wire candidate actions (Complete Profile, Submit Assignment, Continue Course, Review Feedback) through `primaryCtaSelector`; render secondaries subordinate; promote the next candidate when the top one is no longer applicable
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x]\* 21.2 Write unit tests for CTA promotion behavior
    - Verify the highest-priority applicable candidate is dominant and promotion occurs on completion
    - _Requirements: 16.2, 16.3_

- [x] 22. Group and contextualize student navigation (R20, R23)

  - [x] 22.1 Add a `group` field to `NavItem` and assign all items

    - Extend the interface and assign Learn/Growth/Community/Tools groups in `navItems.ts`
    - _Requirements: 20.1, 20.2_

  - [x] 22.2 Render the grouped sidebar

    - Render items under bilingual section labels with active-state indication within the group
    - _Requirements: 20.3, 20.4, 20.5_

  - [x] 22.3 Make Surveys conditional and de-emphasize My Content

    - Show Surveys only when `useSurveyAssignmentsCount() > 0` (hide immediately when the last survey is unassigned); de-emphasize My Content where it has student value, remove only where it has none; leave no gap for hidden items
    - _Requirements: 23.1, 23.2, 23.2a, 23.3, 23.4_

  - [x]\* 22.4 Write unit tests for grouped sidebar and conditional items
    - Verify grouping, active state, conditional Surveys visibility, and no-gap rendering
    - _Requirements: 20.3, 20.5, 23.1, 23.4_

- [x] 23. Planner and time-management consolidation (R18, R19, R21)

  - [x] 23.1 Consolidate planner action labels and creation behavior

    - One "Add task" and one "Start session" label across Today and Weekly surfaces, sharing one creation mutation
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 23.2 Populate the weekly planner with derived and suggested content

    - Surface per-day assignments/deadlines from the student's courses and suggested study sessions instead of "No items"; make the weekly goals panel prominent with example goals when empty
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 23.3 Make the calendar read-only and dedupe deadlines

    - Present the calendar as a read-only deadline view; concentrate task creation in fewer surfaces; present shared deadlines consistently across surfaces
    - _Requirements: 21.1, 21.2, 21.4_

  - [x]\* 23.4 Write unit tests for planner labels and derived content
    - Verify single labels, derived per-day items, and example goals when empty
    - _Requirements: 18.2, 19.1, 19.4_

- [x] 24. Portfolio protection and younger-student wording (R22, R24)

  - [x] 24.1 Gate public portfolio sharing on permission

    - Require granted permission before public sharing via `usePortfolioSharingPermission`; otherwise keep private with an explanatory message; adapt controls to the school/user language (single language at a time)
    - _Requirements: 24.1, 24.2, 24.5, 24.6_

  - [x] 24.2 Enforce 403/404 on the public portfolio route

    - Call `portfolio_public_access` and map via `portfolioAccess` (`forbidden → 403`, `not_found → 404`, `authorized → render`); rely on RLS for content
    - _Requirements: 24.3, 24.3a, 24.4_

  - [x] 24.3 Apply approachable younger-student wording

    - Use "Strengths", "Skills mastered", "Areas improving" on the portfolio; add a plain-language heatmap summary and approachable journal templates; runtime fallback to the available language
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.6_

  - [x]\* 24.4 Write unit tests for sharing gate, 403/404 mapping, and wording fallback
    - Verify private-without-permission, status mapping, and single-language fallback
    - _Requirements: 24.2, 24.3, 24.3a, 22.6_

- [x] 25. Architecture, type-safety, i18n, RTL, and accessibility (R25, R26, R28, R29, R30, R31)

  - [x] 25.1 Relocate remaining in-page Supabase calls into hooks

    - Extract direct `supabase` calls from `StudentDashboard`, `StudentProgressPage`, `PostQuizReview`, `AdaptiveQuizSession`, `FocusModePage`, `BaselineSelectStep`, `CreateTeamPage`, `StudentTeamPage`, and leaderboard into `src/hooks/` query hooks with standard keys + typed responses, preserving behavior
    - _Requirements: 25.1, 25.2, 25.3, 25.3a, 25.4_

  - [x] 25.2 Remove `(supabase as any)` / `as never` casts after regeneration

    - Delete the stale-type casts in `useMarketplace`, `useInventory`, `useTransactionHistory`, tutor/league hooks, `useStreakFreeze`, `TutorPage`; narrow any `unknown` with type guards
    - _Requirements: 26.2, 26.4_

  - [x] 25.3 Internationalize the student pages

    - Route user-facing strings through i18next with en + ar keys (TutorPage, CreateTeamPage, SurveyResponsePage, TransactionHistoryPage, StudentTeamPage, AdaptiveQuizSession, PostQuizReview, and the other identified pages); surface missing-key/translation-service failures in Arabic rather than silently showing the key/English
    - _Requirements: 29.1, 29.2, 29.3, 29.3a, 29.4, 29.5_

  - [x] 25.4 Migrate physical to logical CSS properties (all-or-nothing)

    - Replace `ml-auto`→`ms-auto` in `SurveyResponsePage`, `XPHistory`, and `ProfileSummaryStep` together
    - _Requirements: 30.1, 30.2, 30.3, 30.4_

  - [x] 25.5 Add accessible labels and gate motion on reduced-motion

    - Add aria-labels to icon-only controls (including the CreateTeamPage back button); gate Framer Motion via `useReducedMotion` so new animations are suppressed while running ones complete
    - _Requirements: 31.1, 31.2, 31.2a, 31.3_

  - [x] 25.6 Add the `resolveLocalizedOrFail` localization-policy helper

    - Centralize the i18n hard-fail vs fallback vs surface-gate decisions; wire it into error messages, timetable, and planner-action gating
    - _Requirements: 28.4, 28.5, 13.5, 19.6, 19.7_

  - [x]\* 25.7 Add static and integration guard checks
    - Lint (zero warnings, confirms no `eslint-disable` on the quiz timer), `tsc --noEmit`, grep assertions that no `supabase.from` remains in student components and no stale casts remain, and en/ar key-presence checks (including build-time presence for younger-student wording)
    - _Requirements: 25.3, 26.2, 26.3, 29.2, 22.5_

- [x] 26. Optional - mascot guidance at key moments (R35)

  - [x] 26.1 Add mascot coaching at key journey moments
    - Present mascot guidance at welcome, assessment intros, empty states, first XP award, first enrollment, and password screens; ensure full function when disabled or when no moment is active; bilingual copy
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5_

- [x] 27. Final checkpoint - full remediation verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- The data-layer sequence is mandatory: schema (1) → RPCs/RLS (2) → seeds (3) → type regeneration (4) → hook refactors and cast removal (25). Doing R25/R26.2 before R26 (task 4) would force re-introducing casts.
- `src/types/database.ts` is regenerated only via `scripts/regen-types.ps1` — never hand-edited or written via stdout redirection.
- Property-based tests (fast-check, min 100 iterations) validate the 13 universal correctness properties over pure `src/lib/` functions; seed migrations, RLS, edge-function I/O, i18n coverage, and layout are validated by integration/example/smoke tests instead.
- Each task references granular requirement clauses for traceability; checkpoints provide incremental validation breaks.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": [
        "1.1",
        "1.2",
        "1.3",
        "3.1",
        "3.2",
        "3.3",
        "3.4",
        "6.1",
        "6.3",
        "6.5",
        "6.7",
        "6.9",
        "6.11",
        "6.14",
        "6.16",
        "6.18"
      ]
    },
    {
      "id": 1,
      "tasks": [
        "2.1",
        "2.2",
        "2.3",
        "6.2",
        "6.4",
        "6.6",
        "6.8",
        "6.10",
        "6.12",
        "6.13",
        "6.15",
        "6.17",
        "6.19",
        "8.1",
        "8.2",
        "8.3"
      ]
    },
    { "id": 2, "tasks": ["4.1"] },
    {
      "id": 3,
      "tasks": ["7.1", "7.2", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9", "7.10"]
    },
    {
      "id": 4,
      "tasks": [
        "7.3",
        "10.1",
        "11.1",
        "12.1",
        "14.1",
        "16.2",
        "17.1",
        "18.1",
        "22.1"
      ]
    },
    {
      "id": 5,
      "tasks": [
        "10.2",
        "10.3",
        "11.2",
        "12.2",
        "14.2",
        "15.1",
        "15.2",
        "16.1",
        "17.2",
        "18.2",
        "19.1",
        "19.2",
        "22.2"
      ]
    },
    {
      "id": 6,
      "tasks": [
        "11.3",
        "11.4",
        "12.3",
        "15.3",
        "16.3",
        "18.3",
        "19.3",
        "21.1",
        "22.3",
        "23.1",
        "24.1"
      ]
    },
    {
      "id": 7,
      "tasks": [
        "12.4",
        "18.4",
        "19.4",
        "21.2",
        "22.4",
        "23.2",
        "23.3",
        "24.2",
        "24.3"
      ]
    },
    { "id": 8, "tasks": ["23.4", "24.4", "25.1"] },
    { "id": 9, "tasks": ["25.2"] },
    { "id": 10, "tasks": ["25.3"] },
    { "id": 11, "tasks": ["25.4", "25.5", "25.6", "26.1"] },
    { "id": 12, "tasks": ["25.7"] }
  ]
}
```
