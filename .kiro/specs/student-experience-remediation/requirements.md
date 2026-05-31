# Requirements Document

## Introduction

This spec remediates findings from a pre-pilot **student-experience audit** of the Edeviser platform (React 18 + TypeScript strict + Vite + Supabase) — an OBE + Gamification education platform for the Qatar K-12 market with Arabic/English bilingual and RTL support. A founder-led manual UX audit scored the student-facing experience **7.8/10 ("Ready with Minor–Medium Fixes Before Pilot")**. A subsequent code-level root-cause investigation and a deeper code-quality scan confirmed the audit symptoms and surfaced additional defects.

The requirements below are grounded in the **verified root causes** found in the code, not just the observable audit symptoms. This matters because several symptoms have very different fixes: some are genuine code bugs, some are missing implementation, several are empty-data or seed/config artifacts (the feature is built but unseeded), and others are UX-refinement, architecture, internationalization, accessibility, or performance concerns. Each requirement is therefore tagged with an **Issue Type** and a **Priority** so the reader immediately knows whether the fix is code, seed data, config, or design — and how urgent it is.

Because Edeviser's codebase owns both UI behavior and the project's seed migrations and starter content, requirements whose true fix is a **seed migration, starter/suggested content, or a previously-stubbed code path** are written so the remediation **builds the working capability and delivers the data that makes it function**. Only the operational act of running a deployment against production infrastructure or setting a production secret is treated as an out-of-band prerequisite; the seed migrations, starter content, and client/upload code are delivered here.

### Build-Over-Defer Principle

This spec applies a single overriding principle: **build the capability, do not defer it behind a placeholder.**

- WHERE a finding's root cause is incomplete implementation, missing seed/starter content, or a stubbed code path, the remediation SHALL implement the working capability — including delivering seed migrations and starter or suggested content — rather than only rendering a "coming soon" or placeholder state.
- A designed empty state SHALL be provided only as a genuine zero-data fallback that appears **after** the underlying capability is functional, not as the primary deliverable for an incomplete feature.
- A "coming soon" or placeholder state SHALL NOT be treated as the accepted final deliverable for any capability that can be built within this spec's scope. The only acceptable placeholder is a clearly-labeled one for content that genuinely cannot be seeded (for example, a reward catalog with no source data), and even then only after the surrounding capability works.
- This principle does not weaken the requirement for graceful empty states under legitimately empty conditions; it reframes them as the fallback rather than the goal.

### Scope Boundaries

- **In scope:** the student-facing experience (pages under `src/pages/student/`, student navigation, student-facing shared components, the student onboarding/profiling flow, the AI Tutor student surface, and the public student portfolio).
- **Out of scope:** admin/coordinator/teacher/parent surfaces except where a shared component or route fix unavoidably touches them; the operational act of running deployments against production infrastructure and setting production secrets (for example, deploying edge functions to the production project and configuring `OPENAI_API_KEY`). Writing and delivering the seed migrations, starter/demo content, and the client upload code that make features work **is in scope and delivered here**; only the act of running the deploy and setting the production secret remains out-of-band ops.
- **In scope (build, not defer):** for findings whose root cause is unseeded data, missing starter content, or a stubbed code path, this spec delivers the seed migrations, starter/suggested content, and client/upload code needed for the feature to function — with a designed empty state retained only as the genuine zero-data fallback.
- **Non-functional themes** (architecture compliance, i18n coverage, RTL correctness, accessibility, performance) are captured as explicit requirements (Requirements 25–34) so they are not lost during prioritization.

### Issue-Type Classification Legend

Each requirement is tagged with one or more of:

- **BUG** — code produces incorrect behavior; fix is in code.
- **MISSING-IMPL** — a capability or state the product needs is not implemented.
- **EMPTY-DATA-SEED** — the feature is implemented but appears broken/empty because no seed data exists; under the Build-Over-Defer Principle the fix is to **build and deliver a seed migration** (and/or starter content) so the feature works, with a designed empty state retained only as the genuine zero-data fallback.
- **SEED-MIGRATION** — the remediation includes authoring and delivering a SQL seed migration (starter/demo data or per-tenant seed) so a surface provides real value rather than a placeholder.
- **BUILD** — the remediation requires building a previously-stubbed or missing code path (for example, a working file-upload path) so the capability functions end-to-end.
- **CONFIG** — fix is environment/secret/deployment configuration, not application code.
- **UX-REFINEMENT** — implemented and correct, but the experience needs design/flow/copy improvement.
- **ARCH-VIOLATION** — code violates a project steering rule (e.g., direct Supabase calls in components, stale generated types).
- **I18N** — strings are not internationalized (hardcoded English instead of `t()` + locale keys).
- **RTL** — physical CSS properties used where logical properties are required for right-to-left layout.
- **A11Y** — accessibility gap (missing labels, motion not gated on `prefers-reduced-motion`).
- **PERF** — performance/scalability concern (unbounded fetches, missing pagination).
- **SECURITY** — exposure or access-control concern, heightened for K-12 minors.
- **ROBUSTNESS / ERROR-HANDLING / DATA-MODEL-GAP** — secondary tags used alongside the primary type.

### Priority Legend

- **P0 — Genuine bugs.** Broken behavior a piloting student will hit; must fix before pilot.
- **P1 — Missing implementation & security.** Capabilities the pilot needs, plus minor-safety controls.
- **P2 — UX refinement.** Experience-quality improvements that materially affect the 7.8/10 score.
- **P3 — Code-quality, architecture & performance.** Engineering-guardrail compliance and scalability; lower pilot-blocking risk but high long-term cost.

> **Numbering note:** Each requirement number maps 1:1 to its corresponding audit finding for traceability back to the root-cause investigation. Requirements are then grouped by priority rather than by number, so the numeric sequence is intentionally non-sequential (for example, the security requirement — finding 24 — appears in the P1 section ahead of the P2 UX requirements 14–23).

## Glossary

- **Student**: A K-12 learner using the student-facing experience. May be a minor.
- **Founder**: The product owner who performed the manual UX audit and owns the pilot go/no-go decision.
- **Developer**: An engineer implementing remediation under the Edeviser steering rules.
- **Student_Experience**: The composite set of student-facing pages, navigation, shared components, and flows under `src/pages/student/` and related modules. Treated as one logical system where a single system name is needed.
- **AI_Tutor**: The student-facing conversational tutoring surface served at `/student/tutor` and `/student/tutor/:conversationId`, backed by the `chat-with-tutor` edge function and course-material embeddings.
- **Onboarding_Flow**: The student profiling sequence that collects personality, self-efficacy, study strategies, VARK, and baseline data.
- **Progressive_Profiling**: The design (defined in `onboardingConstants.ts` as `MICRO_ASSESSMENT_SCHEDULE`) of spreading non-essential assessments across days 2–14 instead of front-loading them on day 1.
- **EmptyState_Library**: The shared empty-state components in `src/components/shared/EmptyState.tsx` (e.g., `NoChallenges`, `NoTeams`, `NoMarketplaceItems`, `NoTimetable`).
- **Query_Hook**: A TanStack Query hook in `src/hooks/` that is the required data-access layer; components must not call Supabase directly.
- **Leaderboard**: The student ranking surface (`LeaderboardPage.tsx`, `useLeaderboard.ts`) that respects anonymous opt-out.
- **Portfolio**: The student profile that can optionally be made public at `/portfolio/{userId}`, exposing outcome mastery, badges, journal previews, and XP.
- **CLO (Course Learning Outcome)**: A course-level learning outcome with exactly one Bloom's level; the unit of mastery shown to students.
- **Attainment**: The percentage measure of a student's mastery of learning outcomes, classified as Excellent (≥85%), Satisfactory (70–84%), Developing (50–69%), or Not Yet (<50%).
- **XP (Experience Points)**: The append-only gamification currency; `xp_total` is derived from the sum of XP transactions.
- **Perfect Day**: A day on which a student completes all four tracked habits (Login, Submit, Journal, Read).
- **VARK**: A learning-preference model (Visual, Aural, Read/write, Kinesthetic) assessed during onboarding.
- **Self-Efficacy**: A student's belief in their own academic capability, assessed during onboarding via a seeded question bank.
- **Profile_Completeness**: The `student_profiles.profile_completeness` measure, which is independent by design from `xp_total`.

---

## Requirements

## P0 — Genuine Bugs (Theme A)

### Requirement 1: Repair the Dead AI Tutor Route

**Priority:** P0
**Issue Type:** BUG
**Root cause:** Three student components link to `/student/ai-tutor`, but only `/student/tutor` and `/student/tutor/:conversationId` are registered in `src/router/AppRouter.tsx`. Broken links: `PostQuizReview.tsx:409` ("Get Help with this topic"), `FlowCheckInDialog.tsx:165` (the "Stuck" path), `MasteryRecoveryPanel.tsx:286`. Two tests assert the wrong path (`postQuizReviewPage.test.tsx:238-239`, `flowCheckInDialog.test.tsx:159-167`). `TutorEntryButton.tsx:38` already uses the correct path.

**User Story:** As a Student, I want every "get help" link to open the AI Tutor, so that I am never sent to a broken page when I am stuck.

#### Acceptance Criteria

1. WHEN a Student activates the "Get Help with this topic" link in PostQuizReview, THE Student_Experience SHALL navigate to a registered AI_Tutor route and SHALL preserve the originating CLO identifier as a query parameter.
2. WHEN a Student selects the "Stuck" follow-up in the flow check-in dialog, THE Student_Experience SHALL navigate to a registered AI_Tutor route.
3. WHEN a Student activates the AI_Tutor link in the mastery recovery panel, THE Student_Experience SHALL navigate to a registered AI_Tutor route and SHALL preserve the originating CLO identifier as a query parameter.
4. THE Student_Experience SHALL contain no student-facing link, button, or anchor whose target resolves to an unregistered route.
5. THE existing tests in `postQuizReviewPage.test.tsx` and `flowCheckInDialog.test.tsx` SHALL assert the registered AI_Tutor route rather than the unregistered `/student/ai-tutor` path.

---

### Requirement 2: Correct Adaptive Quiz Practice Feedback

**Priority:** P0
**Issue Type:** BUG
**Root cause:** `AdaptiveQuizSession.tsx:206` hardcodes `const wasCorrect = true`, while `practiceFeedback.wasCorrect` (lines 430–450) drives the Correct/Incorrect UI. Practice mode therefore always reports "Correct!" regardless of the submitted answer.

**User Story:** As a Student, I want practice-mode feedback to reflect whether my answer was actually right, so that I can trust the tutor and learn from mistakes.

#### Acceptance Criteria

1. WHEN a Student submits an answer in adaptive quiz practice mode, THE Student_Experience SHALL determine correctness from the evaluated result of the submitted answer rather than from a hardcoded value.
2. IF a submitted practice answer is incorrect, THEN THE Student_Experience SHALL display incorrect-answer feedback and SHALL indicate the correct answer.
3. WHEN a submitted practice answer is correct, THE Student_Experience SHALL display correct-answer feedback.
4. THE correctness value that drives the practice feedback UI SHALL equal the correctness value used to record the practice response.
5. THE Student_Experience SHALL display practice-mode correctness feedback only after a Student submits an answer, and SHALL NOT display correctness feedback before an answer is submitted.
6. THE feedback displayed for a submitted practice answer SHALL match the evaluated correctness of that answer, and THE Student_Experience SHALL NOT display correct-answer feedback for an answer evaluated as incorrect.

---

### Requirement 3: Eliminate the Quiz Timer Stale-Closure Risk

**Priority:** P0
**Issue Type:** BUG / ROBUSTNESS
**Root cause:** The timer effect in `AdaptiveQuizSession.tsx:159-175` omits `finalizeQuiz` from its dependency array via an `eslint-disable`, creating a stale-closure risk that the auto-submit captures outdated session state and finalizes with the wrong score.

**User Story:** As a Student, I want the quiz to auto-submit with my actual current answers when time expires, so that my score is never computed from stale state.

#### Acceptance Criteria

1. WHEN the adaptive quiz timer reaches zero, THE Student_Experience SHALL finalize the quiz using the current session state at the moment of expiry.
2. THE adaptive quiz timer effect SHALL reference the latest finalize routine without relying on an `eslint-disable` to suppress an exhaustive-dependencies warning.
3. WHEN the quiz is finalized by timer expiry, THE recorded score SHALL equal the score computed from the Student's most recently submitted answers.
4. WHILE the quiz session is unmounting or already finalized, THE Student_Experience SHALL NOT trigger a duplicate finalization.

---

### Requirement 4: Make the AI Tutor Operational End-to-End

**Priority:** P0
**Issue Type:** CONFIG + EMPTY-DATA-SEED + MISSING-IMPL + BUILD
**Root cause:** The `chat-with-tutor` edge function exists in source, but the AI_Tutor reports "not working" because one or more deployment/data prerequisites are unmet: the `OPENAI_API_KEY` secret may be absent, course materials may not be embedded (via `embed-course-material`), the function may not be deployed, or the requesting Student may not be enrolled (403). Separately, the file-upload path is stubbed — `ChatPanel` passes empty `imageUrls` and `undefined` `documentUrl`. Under the Build-Over-Defer Principle the stubbed upload path SHALL be built rather than hidden.

**User Story:** As a Student, I want the AI Tutor to answer me or clearly tell me why it cannot, so that I always know whether the feature is available and what to do next.

#### Acceptance Criteria

1. WHEN a Student sends a message and the AI_Tutor backend responds successfully, THE Student_Experience SHALL display the tutor's reply.
2. IF the AI_Tutor backend is unreachable, unconfigured, or undeployed, THEN THE Student_Experience SHALL display an actionable unavailable state instead of a silent failure or indefinite loading indicator.
   2a. IF the Student_Experience cannot detect the AI_Tutor backend status, OR the unavailable state itself fails to render, THEN THE Student_Experience SHALL display a guaranteed fallback error display so the Student is never left without feedback.
3. IF the AI_Tutor request is rejected because the Student is not enrolled in the relevant course, THEN THE Student_Experience SHALL display an enrollment-specific message rather than a generic error.
4. WHILE no course materials are embedded for the Student's course, THE Student_Experience SHALL display a "tutor still learning this course" state rather than implying a system fault.
5. WHEN a Student attaches an image or document in the tutor chat input, THE Student_Experience SHALL upload the file to Supabase Storage and pass the resulting valid reference (URL) to the `chat-with-tutor` backend, rather than passing empty or undefined attachment references.
6. THE deployment of the `chat-with-tutor` edge function, the presence of the `OPENAI_API_KEY` secret, and the embedding of course materials are out-of-band operational dependencies (running the deploy and setting the production secret); the file-upload path, the upload UI, and the Student_Experience states described above are built and delivered within this spec. The acceptance criteria for backend availability (criteria 1–4) govern the Student_Experience UI behavior under each backend condition.

---

## P1 — Missing Implementation & Security (Themes B, C, E)

### Requirement 5: Password Show/Hide Toggle on Auth Forms

**Priority:** P1
**Issue Type:** MISSING-IMPL
**Root cause:** No password visibility toggle exists on any auth form: `LoginPage.tsx`, `auth/SignUpPage.tsx`, `auth/AcceptInvitePage.tsx`, `UpdatePasswordPage.tsx`.

**User Story:** As a Student, I want to reveal my password while typing, so that I can correct typos without being locked out.

#### Acceptance Criteria

1. THE Student_Experience SHALL render a show/hide control on every password input across the login, sign-up, accept-invite, and update-password forms.
2. WHEN a Student activates the show control on a password field, THE Student_Experience SHALL display the entered characters in plain text.
3. WHEN a Student activates the hide control on a password field, THE Student_Experience SHALL mask the entered characters.
4. THE show/hide control SHALL expose an accessible name that reflects its current action and SHALL meet the minimum touch-target size for mobile.
5. WHEN a form contains more than one password field, THE Student_Experience SHALL enforce mutual exclusion of visibility so that at most one password field displays its characters in plain text at a time, masking any other password field when one is revealed.

---

### Requirement 6: Minimum-Cohort Gate for the Leaderboard

**Priority:** P1
**Issue Type:** MISSING-IMPL
**Root cause:** `LeaderboardPage.tsx` / `useLeaderboard.ts` award #1 and medals even when only a single student exists, which is demotivating and misleading.

**User Story:** As a Student, I want the leaderboard to appear only once there are enough classmates to compete with, so that ranking feels meaningful rather than hollow.

#### Acceptance Criteria

1. WHILE the number of eligible (non-opted-out) students in the cohort is below the configured minimum, THE Leaderboard SHALL display a "Leaderboard unlocks when more students join" state instead of rankings or medals.
2. WHEN the number of eligible students reaches or exceeds the configured minimum, THE Leaderboard SHALL display rankings.
   2a. WHILE there is no eligible (non-opted-out) student in the cohort, THE Leaderboard SHALL display the locked state and SHALL NOT display rankings, regardless of whether the configured minimum is technically met.
3. THE minimum-cohort threshold SHALL be a configurable value rather than a hardcoded literal.
4. WHILE the locked state is shown, THE Leaderboard SHALL NOT award a #1 position or any medal to any student.
5. THE locked state SHALL continue to honor the anonymous opt-out invariant by never revealing an opted-out student's name.

---

### Requirement 7: XP and Reward Context on the Habits Heatmap

**Priority:** P1
**Issue Type:** MISSING-IMPL
**Root cause:** `HabitHeatmapPage.tsx` hardcodes `xpEarned={0}` in tooltips and the bottom sheet, and provides only streak statistics — no "best habit" or "completion rate" summary.

**User Story:** As a Student, I want to see the XP and rewards my habits earned, so that I understand the payoff of my daily effort.

#### Acceptance Criteria

1. WHEN a Student views a day in the habits heatmap, THE Student_Experience SHALL display the XP actually earned for that day's habits rather than a hardcoded zero.
2. THE habits heatmap SHALL display a summary that includes the Student's best-performing habit and an overall completion rate.
3. WHERE a day qualifies as a Perfect Day, THE Student_Experience SHALL indicate the Perfect Day reward context in that day's detail.
4. THE XP value shown for a given day SHALL equal the XP recorded for that day's habit completions.

---

### Requirement 8: Explain Attainment Percentages

**Priority:** P1
**Issue Type:** MISSING-IMPL
**Root cause:** Course cards (`StudentCoursesPage.tsx`) and the dashboard KPI show values such as 90%/92% with no tooltip or legend explaining what attainment means or what the threshold colors signify.

**User Story:** As a Student, I want to understand what an attainment percentage means, so that I can interpret my progress instead of guessing.

#### Acceptance Criteria

1. WHERE an attainment percentage is displayed on a course card or dashboard KPI, THE Student_Experience SHALL provide an accessible explanation that attainment reflects mastery of course learning outcomes.
2. THE attainment explanation SHALL describe the threshold classifications Excellent (≥85%), Satisfactory (70–84%), Developing (50–69%), and Not Yet (<50%), where a value of exactly 50% SHALL be classified as Developing and a value strictly below 50% SHALL be classified as Not Yet.
3. THE color applied to a displayed attainment value SHALL correspond to the classification band for that value.
4. THE attainment explanation SHALL be available in both English and Arabic.

---

### Requirement 9: Strengthen Course Card Identity

**Priority:** P1
**Issue Type:** MISSING-IMPL + DATA-MODEL-GAP
**Root cause:** Course cards on `StudentCoursesPage.tsx` show the teacher name but lack a progress bar, a next-assignment indicator, and a course color. Course color and next-assignment are not included in the card query.

**User Story:** As a Student, I want each course card to show my progress and what's due next, so that I can decide where to focus at a glance.

#### Acceptance Criteria

1. THE Student_Experience SHALL display a progress indicator on each course card reflecting the Student's progress in that course.
2. WHERE a course has an upcoming assignment, THE Student_Experience SHALL display the next assignment and its due date on the course card.
   2a. WHERE a course has an upcoming assignment but no due date is available, THE Student_Experience MAY display the assignment name without a due date rather than omitting the assignment.
3. WHERE a course has an assigned course color, THE Student_Experience SHALL apply that color as a visual identifier on the card.
4. THE course-card Query_Hook SHALL retrieve course color and next-assignment data so the card can render without additional per-card requests.
5. IF a course has no upcoming assignment, THEN THE Student_Experience SHALL display a neutral "no upcoming work" indicator rather than an empty or broken element.

---

### Requirement 10: Surface Reflective Journal Prompts

**Priority:** P1
**Issue Type:** MISSING-IMPL (wiring)
**Root cause:** A rich Kolb's-cycle prompt system exists in `JournalEditor.tsx` (`generateJournalPrompt`), but student navigation points to `StudentJournalPage.tsx`, which is a bare textbox. The prompt capability is built but not wired to the surface students actually reach.

**User Story:** As a Student, I want guided reflection prompts when I journal, so that I know what to write and get more from the exercise.

#### Acceptance Criteria

1. WHEN a Student opens the journal from student navigation, THE Student_Experience SHALL present reflection prompt templates such as "What did I learn today?", "What confused me?", and "What am I proud of?".
2. WHEN a Student selects a reflection prompt, THE Student_Experience SHALL seed the journal entry with that prompt.
3. THE journal surface reached from navigation SHALL use the existing prompt-generation capability rather than presenting an unguided empty textbox.
   3a. IF the prompt-generation capability is unavailable, THEN THE Student_Experience SHALL allow the Student to access a basic unguided journal so that journaling remains possible.
4. THE reflection prompts SHALL be available in both English and Arabic.

---

### Requirement 11: Build Per-Institution Self-Efficacy Onboarding Seed

**Priority:** P1
**Issue Type:** SEED-MIGRATION + EMPTY-DATA-SEED + MISSING-IMPL (zero-data fallback)
**Root cause:** The message "No self-efficacy questions available. Please contact your administrator." appears because the seed migration `20260313132537_seed_onboarding_questions.sql` seeds only one institution (`SELECT id FROM institutions LIMIT 1`); other tenants receive empty queries. `SelfEfficacyStep.tsx` then shows an admin-contact message instead of a working assessment. Under the Build-Over-Defer Principle the primary fix is to **build a corrected seed migration that seeds the onboarding questions for every institution** so the assessment actually works for every tenant; the empty state becomes a genuine zero-data fallback only.

**User Story:** As a Student at any institution, I want the self-efficacy assessment to actually present questions, so that onboarding works for me rather than telling me to contact an administrator.

#### Acceptance Criteria

1. THE remediation SHALL provide a corrected seed migration that seeds self-efficacy questions (and the related onboarding question banks) for every institution rather than for a single institution selected by `LIMIT 1`.
2. WHEN self-efficacy questions are available for the Student's institution, THE Onboarding_Flow SHALL present those questions.
3. IF no self-efficacy questions are genuinely available for the Student's institution, THEN THE Onboarding_Flow SHALL display a non-alarming fallback state rather than an administrator-contact error message.
4. WHILE the self-efficacy step has no questions, THE Onboarding_Flow SHALL allow the Student to continue the onboarding sequence without being blocked.
   4a. IF self-efficacy questions should be available but are not being presented because of a system issue, THEN THE Onboarding_Flow SHALL still allow the Student to continue the onboarding sequence without being blocked.
   4b. THE non-alarming "genuinely no questions" fallback copy SHALL be displayed only when there are truly zero self-efficacy questions for the Student's institution, and SHALL NOT be displayed when a system issue prevents available questions from being presented.
5. THE seeded questions and the fallback state SHALL be available in both English and Arabic.

---

### Requirement 12: Build Starter Content for Challenges, My Team, Marketplace, and Timetable

**Priority:** P1
**Issue Type:** SEED-MIGRATION + MISSING-IMPL + EMPTY-DATA-SEED (zero-data fallback)
**Root cause:** Challenges, My Team, Marketplace, and Timetable are fully implemented but appear broken because they lack seed data, and they each reinvent inline empty states even though `NoChallenges`, `NoTeams`, `NoMarketplaceItems`, and `NoTimetable` already exist in `src/components/shared/EmptyState.tsx`. Under the Build-Over-Defer Principle the primary fix is to **build starter/suggested content so these surfaces provide value**, and to standardize the genuine zero-data fallback on the shared EmptyState_Library rather than ad-hoc inline states.

**User Story:** As a Student, I want Challenges, My Team, Marketplace, and Timetable to show real, useful content from the start, so that these surfaces feel alive rather than hollow or broken.

#### Acceptance Criteria

1. THE Challenges surface SHALL present suggested or starter challenges (for example, a 3-day study streak or "complete 2 assignments this week"), seeded or generated, so the page is never hollow when a Student has not yet joined a challenge.
2. THE Marketplace surface SHALL present real or seeded starter reward items; WHERE no reward catalog can be seeded, THE Marketplace SHALL present clearly-labeled coming-soon reward items rather than an empty surface.
3. WHILE a Student is unassigned to any team, THE My Team surface SHALL explain how teams work and SHALL surface a path to join or create a team.
   3a. WHEN a Student assigned to a team visits My Team but there is no team data to display, THE My Team surface SHALL render an empty-state component rather than assuming team data is present.
4. WHERE timetable data exists for the Student, THE Timetable surface SHALL present the current or next class context.
5. THE remediation SHALL provide seed migrations wherever seeding is the path to delivering the starter content described above.
6. WHILE a surface has genuinely zero data after starter content is accounted for, THE Student_Experience SHALL render the corresponding shared EmptyState_Library component rather than an inline ad-hoc empty state, and SHALL NOT duplicate an inline empty-state implementation where an equivalent component exists in the EmptyState_Library.
7. THE starter content and empty-state content SHALL be available in both English and Arabic.
8. IF the seed migrations fail to run, THEN the Challenges, My Team, Marketplace, and Timetable surfaces SHALL still load and render their empty-state components rather than being blocked from loading.

---

### Requirement 13: Build the Timetable Data Path via Section Assignment

**Priority:** P1
**Issue Type:** SEED-MIGRATION + DATA-MODEL-GAP + EMPTY-DATA-SEED (zero-data fallback)
**Root cause:** The timetable is empty in part because enrollments lack a `section_id` — students are enrolled in courses but not assigned to a timetabled section, so there are no scheduled entries to display. Under the Build-Over-Defer Principle the primary fix is to **build the data path so timetables populate**: assign `section_id` to enrollments and seed `timetable_slots` for sections so enrolled students see a real schedule.

**User Story:** As a Student, I want my timetable to show a real class schedule, so that I can see when and where my sections meet rather than an empty page.

#### Acceptance Criteria

1. THE remediation SHALL provide a seed migration and/or an assignment mechanism that assigns `section_id` to enrollments and seeds `timetable_slots` for sections, so that enrolled students have scheduled meetings to display.
2. WHEN a Student is enrolled in a section that has scheduled meetings, THE Student_Experience SHALL display those meetings on the timetable.
3. IF the Student is genuinely enrolled in courses but assigned to no timetabled section, THEN THE Student_Experience SHALL display the shared timetable empty state explaining that no scheduled sections are assigned yet.
4. THE seeded schedule and the timetable empty state SHALL be available in both English and Arabic.
5. IF neither an English nor an Arabic localization is available for the timetable, THEN THE Student_Experience SHALL block timetable display entirely rather than rendering an unlocalized timetable.

---

### Requirement 24: Protect the Public Student Portfolio for Minors

**Priority:** P1
**Issue Type:** SECURITY + UX
**Root cause:** The portfolio defaults to private (safe), but enabling public sharing exposes `/portfolio/{userId}` — a guessable, presumably unauthenticated route revealing CLO mastery, badges, journal previews, and XP. For K-12 minors this requires a permission gate before public sharing and verification of the public route's access control.

**User Story:** As a Founder responsible for K-12 minors, I want public portfolio sharing gated by school permission and properly access-controlled, so that no minor's data is exposed without authorization.

#### Acceptance Criteria

1. WHEN a Student attempts to enable public sharing of the Portfolio, THE Student_Experience SHALL require prior school or administrator permission before the Portfolio becomes publicly accessible.
2. WHILE a Student lacks the required sharing permission, THE Student_Experience SHALL keep the Portfolio private and SHALL explain that school permission is required.
3. WHEN a Portfolio is not authorized for public access, THE public portfolio route SHALL deny access to unauthenticated requests rather than rendering protected content.
   3a. WHEN access to an unauthorized Portfolio is denied, THE public portfolio route SHALL return a 403 Forbidden response rather than a 404 Not Found response.
4. THE public portfolio route's access control SHALL be enforced at the data layer (RLS or signed token), not solely in the client.
5. THE portfolio sharing controls and permission messaging SHALL be available in both English and Arabic.
6. THE portfolio sharing controls SHALL adapt their language display based on the school or user language preference settings rather than presenting English and Arabic simultaneously.

---

## P2 — UX Refinement (Theme D)

### Requirement 14: Default to Progressive Profiling in Onboarding

**Priority:** P2
**Issue Type:** UX-REFINEMENT
**Root cause:** A Day-1 short path and a `MICRO_ASSESSMENT_SCHEDULE` (progressive profiling across days 2–14) already exist in `onboardingConstants.ts`, but the non-Day-1 path runs the full 8-step battery in one sitting (Personality 25, Self-Efficacy 6, Study Strategies 8, VARK 16, Baseline).

**User Story:** As a Student, I want onboarding to ask only a little at a time, so that I am not overwhelmed by a long battery of assessments on my first day.

#### Acceptance Criteria

1. WHEN a Student begins onboarding, THE Onboarding_Flow SHALL present the Day-1 short path and SHALL NOT front-load the full assessment battery in a single sitting.
2. THE Onboarding_Flow SHALL schedule non-essential assessments across subsequent days according to the existing Progressive_Profiling schedule.
3. WHEN a scheduled assessment becomes due on a later day, THE Student_Experience SHALL prompt the Student to complete that assessment.
4. WHILE a Student has incomplete scheduled assessments, THE Student_Experience SHALL allow full use of the platform rather than blocking on assessment completion.

---

### Requirement 15: Distinguish Profile Completeness from Gamification

**Priority:** P2
**Issue Type:** UX-REFINEMENT
**Root cause:** `student_profiles.profile_completeness` and `student_gamification.xp_total` are independent by design, producing confusing displays such as 0% profile completion alongside high XP.

**User Story:** As a Student, I want to understand why my profile completion and my XP differ, so that I am not confused about my standing.

#### Acceptance Criteria

1. WHERE Profile_Completeness is displayed, THE Student_Experience SHALL explain that profile completeness measures profile setup and is separate from XP.
2. WHERE XP is displayed near Profile_Completeness, THE Student_Experience SHALL clarify that XP reflects gamified activity rather than profile setup.
3. WHEN Profile_Completeness is below 100 percent, THE Student_Experience SHALL indicate which profile actions would increase it.
4. THE profile-completeness explanation SHALL be available in both English and Arabic.

---

### Requirement 16: Single Prioritized Dashboard Call-to-Action

**Priority:** P2
**Issue Type:** UX-REFINEMENT
**Root cause:** `StudentDashboard.tsx` stacks roughly 13 competing banners and cards, leaving no clear next action.

**User Story:** As a Student, I want one clear next action on my dashboard, so that I know what to do without scanning a wall of banners.

#### Acceptance Criteria

1. THE Student dashboard SHALL display exactly one dominant primary call-to-action at a time.
2. THE primary call-to-action SHALL be selected by priority among applicable candidate actions such as Complete Profile, Submit Assignment, Continue Course, and Review Feedback, and SHALL exclude candidate actions that are not currently applicable from the priority comparison.
3. WHEN the highest-priority candidate action is completed or no longer applicable, THE Student dashboard SHALL promote the next-highest-priority candidate to the primary call-to-action.
4. THE Student dashboard SHALL present secondary actions in a visually subordinate manner to the primary call-to-action.
5. THE primary call-to-action label SHALL be available in both English and Arabic.

---

### Requirement 17: Benefit-Oriented Assessment Framing

**Priority:** P2
**Issue Type:** UX-REFINEMENT + I18N
**Root cause:** Assessments use clinical labels (e.g., "Personality Traits", "Self-Efficacy") and ask for input before communicating value.

**User Story:** As a Student, I want assessments framed by what I gain, so that I understand why completing them is worth my time.

#### Acceptance Criteria

1. THE Onboarding_Flow SHALL present each assessment with benefit-oriented framing (for example, "Discover How You Learn Best" rather than "Personality Traits", and "Academic Confidence Check" rather than "Self-Efficacy").
2. WHEN a Student opens an assessment, THE Student_Experience SHALL communicate the assessment's benefits and estimated time before requesting responses.
   2a. WHEN a Student opens an assessment, THE Student_Experience SHALL block access to the assessment until both the benefit information and the estimated time are successfully displayed.
3. THE benefit statement SHALL describe concrete outcomes such as personalized study recommendations, AI Tutor customization, and bonus XP.
4. THE benefit-oriented assessment copy SHALL be available in both English and Arabic.

---

### Requirement 18: Consolidate Planner Actions

**Priority:** P2
**Issue Type:** UX-REFINEMENT
**Root cause:** The Today page offers "Quick Add" and "Start Unplanned Session" while the Weekly page offers "Task" and "Session" — overlapping intents with inconsistent labels (`TodayViewPage.tsx`, `WeeklyPlannerPage.tsx`).

**User Story:** As a Student, I want consistent planner actions, so that adding a task or starting a session works the same way everywhere.

#### Acceptance Criteria

1. THE planner surfaces SHALL use one consistent label for adding a task and one consistent label for starting a study session.
2. THE Today and Weekly planner surfaces SHALL NOT present two differently-labeled controls that perform the same action.
3. WHEN a Student adds a task from any planner surface, THE Student_Experience SHALL apply the same creation behavior.
4. THE consolidated planner action labels SHALL be available in both English and Arabic.

---

### Requirement 19: Populate the Empty Weekly Planner

**Priority:** P2
**Issue Type:** UX-REFINEMENT + MISSING-IMPL (derived content)
**Root cause:** The weekly planner shows "No items" across all seven days and visually buries the weekly goals panel (`WeeklyPlannerPage.tsx`, `WeeklyGoalPanel.tsx`). Under the Build-Over-Defer Principle the planner SHALL surface real derived and suggested content rather than placeholder text.

**User Story:** As a Student, I want my weekly planner to surface what's relevant, so that an empty week still helps me plan instead of showing seven blank columns.

#### Acceptance Criteria

1. WHILE a planner day has no Student-created items, THE Student_Experience SHALL surface that day's assignments and upcoming deadlines drawn from the Student's courses.
2. WHERE a day has no scheduled work, THE Student_Experience SHALL offer suggested study sessions rather than a bare "No items" label.
3. THE weekly goals panel SHALL be presented with sufficient visual prominence to be discoverable.
4. WHILE a Student has set no weekly goals, THE Student_Experience SHALL display example goals to guide goal-setting.
5. THE derived and suggested planner content SHALL be available in both English and Arabic.
6. IF either the English or the Arabic language pack fails to load, THEN THE Student_Experience SHALL NOT display planner actions until both languages are available.
7. IF localization fails completely so that neither English nor Arabic is available, THEN THE Student_Experience SHALL hide the planner content entirely.

---

### Requirement 20: Group the Student Navigation

**Priority:** P2
**Issue Type:** UX-REFINEMENT (structural)
**Root cause:** The student navigation is a flat 18-item list (`navItems.ts`) with no grouping mechanism — the `NavItem` interface has no group field and `Sidebar.tsx` renders a flat list.

**User Story:** As a Student, I want navigation grouped into meaningful sections, so that I can find features without scanning 18 flat items.

#### Acceptance Criteria

1. THE student navigation SHALL group items into labeled sections: Learn (Courses, Assignments, AI Tutor), Growth (Habits, Progress, Challenges), Community (Leaderboard, My Team), and Tools (Calendar, Planner, Journal).
2. THE `NavItem` definition SHALL include a group field that assigns each item to a navigation section.
3. THE sidebar SHALL render navigation items grouped under their section labels rather than as a single flat list.
4. THE navigation section labels SHALL be available in both English and Arabic.
5. WHEN a navigation item is the active route, THE sidebar SHALL indicate the active state within its group.
6. THE navigation grouping SHALL be enforced through validation so that a navigation item cannot be assigned to an incorrect group (for example, the AI Tutor item SHALL belong to the Learn group).

---

### Requirement 21: Reduce Time-Management Surface Overlap

**Priority:** P2
**Issue Type:** UX-REFINEMENT
**Root cause:** Planner, Today, Calendar, and Timetable are four overlapping surfaces. The Calendar (`shared/CalendarView.tsx`) is read-only and duplicates deadlines already shown elsewhere.

**User Story:** As a Student, I want each time-management surface to have a distinct purpose, so that I am not managing the same tasks in four places.

#### Acceptance Criteria

1. THE Calendar surface SHALL be presented as a read-only, deadline-focused view.
2. THE Student_Experience SHALL concentrate task creation and editing in fewer surfaces rather than duplicating task management across Planner, Today, Calendar, and Timetable.
3. THE timetable SHALL surface the current or next class and the time remaining until it.
4. WHERE a deadline appears on multiple surfaces, THE Student_Experience SHALL present it consistently across those surfaces.

---

### Requirement 22: Younger-Student Friendliness

**Priority:** P2
**Issue Type:** UX-REFINEMENT
**Root cause:** The habits heatmap is hard for younger students to read, the portfolio's CLO-mastery wording is overly academic, and journal entry lacks approachable templates.

**User Story:** As a younger Student, I want plain-language, easy-to-read displays, so that I can understand my progress without academic jargon.

#### Acceptance Criteria

1. THE habits heatmap SHALL include a plain-language summary that conveys the Student's habit performance without requiring interpretation of the grid alone.
2. THE Portfolio SHALL present CLO mastery using approachable wording such as "Strengths", "Skills mastered", and "Areas improving" alongside or in place of academic terminology.
3. THE journal SHALL offer approachable reflection templates suitable for younger students.
4. THE younger-student-friendly wording SHALL be available in both English and Arabic.
5. THE younger-student-friendly wording SHALL be validated at build or deployment time to require that both the English and Arabic localizations are present, and THE build SHALL fail if either localization is missing.
6. WHEN a Student selects English at runtime but only the Arabic localization resolves, THE Student_Experience SHALL fall back to the available language (Arabic) rather than failing to display the wording.

---

### Requirement 23: Context-Sensitive Student Navigation Items

**Priority:** P2
**Issue Type:** UX-REFINEMENT
**Root cause:** Students can only respond to surveys (correct by design), but the "Surveys" nav item is always shown; and "My Content" reads as teacher-focused in the student view.

**User Story:** As a Student, I want my navigation to show only what's relevant to me, so that I am not distracted by items that don't apply.

#### Acceptance Criteria

1. WHILE a Student has no assigned surveys, THE student navigation SHALL hide the Surveys item.
2. WHEN a Student has at least one assigned survey, THE student navigation SHALL show the Surveys item.
   2a. WHEN the last assigned survey of a Student becomes unassigned, THE student navigation SHALL hide the Surveys item immediately.
3. WHERE the "My Content" item provides student-relevant functions, THE Student_Experience SHALL present it in a position de-emphasized relative to core learning items rather than removing it; THE Student_Experience SHALL remove "My Content" from the student view only where it provides no student-relevant function.
4. WHEN a navigation item is conditionally hidden, THE remaining navigation SHALL render without a gap or placeholder where the hidden item would have been.

---

## P3 — Architecture, Code-Quality, I18n, RTL, A11y & Performance (Themes F, G, H)

> These non-functional requirements are listed explicitly so they are not lost during prioritization. They enforce the project's steering rules (engineering guardrails, Supabase patterns, types regeneration, design system).

### Requirement 25: Route Student Data Access Through Query Hooks

**Priority:** P3
**Issue Type:** ARCH-VIOLATION
**Root cause:** Thirteen student pages call `supabase` directly instead of through TanStack Query hooks, violating the engineering guardrails: `TutorPage.tsx:188`, `StudentDashboard.tsx:63/303`, `StudentProgressPage.tsx:59-109`, `StudentCoursesPage.tsx:30-61`, `PostQuizReview.tsx:85-122`, `AdaptiveQuizSession.tsx:70-95`, `FocusModePage.tsx:31-35`, `BaselineSelectStep.tsx:30-60`, `StudentJournalPage.tsx:50-53`, `ChallengeDetailPage.tsx:52-108`, plus in-page hooks in `CreateTeamPage`, `StudentTeamPage`, and leaderboard.

**User Story:** As a Developer, I want all student data access routed through Query_Hooks, so that the code complies with clean-architecture guardrails and gains consistent caching, error handling, and invalidation.

#### Acceptance Criteria

1. THE student pages SHALL access Supabase data through Query_Hooks in `src/hooks/` rather than calling the `supabase` client directly within components.
2. WHEN a student data-access hook is extracted, THE hook SHALL use the project's standard TanStack Query patterns including query keys and typed responses.
3. THE Student_Experience components SHALL contain no direct `supabase.from(...)` or equivalent direct client calls.
   3a. WHERE a Student_Experience component requires student data, THE component SHALL obtain that data through a Query_Hook, satisfying both the prohibition on direct `supabase` calls and the requirement to use Query_Hooks together.
4. WHEN data access is moved into hooks, THE existing student-facing behavior SHALL remain unchanged.

---

### Requirement 26: Regenerate Database Types and Remove Casts

**Priority:** P3
**Issue Type:** ARCH-VIOLATION / TYPE-SAFETY
**Root cause:** Stale `src/types/database.ts` forces widespread `(supabase as any)` and `as never` casts across `TutorPage`, `useMarketplace`, `useInventory`, `useTransactionHistory`, the tutor and league hooks, `useStreakFreeze`, and others.

**User Story:** As a Developer, I want current generated types and no unsafe casts, so that the compiler catches schema mismatches instead of `any` hiding them.

#### Acceptance Criteria

1. THE database types SHALL be regenerated using the approved regeneration script, never by hand-editing and never via stdout redirection.
2. THE Student_Experience and its hooks SHALL contain no `(supabase as any)` or `as never` casts that exist solely to work around stale types.
3. WHEN types are regenerated, THE type checker SHALL pass with no new errors introduced by the regeneration.
4. THE Student_Experience SHALL contain no `any` types introduced to bypass type errors; unknown values SHALL be narrowed with type guards or proper interfaces.

---

### Requirement 27: Safe Single-Row Query for Social Challenges

**Priority:** P3
**Issue Type:** ROBUSTNESS
**Root cause:** `ChallengeDetailPage.tsx:53` uses `.single()` on `social_challenges` where zero rows are possible, which throws instead of returning a not-found result.

**User Story:** As a Student, I want a missing challenge to show a graceful not-found state, so that the page does not error when a challenge does not exist.

#### Acceptance Criteria

1. WHEN a challenge detail query may match zero rows, THE Query_Hook SHALL use a zero-or-one row query rather than a strict single-row query.
2. IF a requested challenge does not exist, THEN THE Student_Experience SHALL display a not-found state rather than throwing an error.
   2a. WHILE displaying the challenge not-found state, THE Student_Experience SHALL prevent any error from being thrown during this graceful handling.
3. WHEN a requested challenge exists, THE Student_Experience SHALL display the challenge detail.

---

### Requirement 28: Surface Errors Instead of Swallowing Them

**Priority:** P3
**Issue Type:** ERROR-HANDLING
**Root cause:** `TutorPage.tsx:188-197` performs an autonomy update with no `.catch()` or error toast, and `ChallengeDetailPage` has no error UI, so failures are silent.

**User Story:** As a Student, I want to be told when an action fails, so that I am not left believing a failed change succeeded.

#### Acceptance Criteria

1. IF the AI_Tutor autonomy update fails, THEN THE Student_Experience SHALL surface the failure via a toast notification.
2. IF a challenge detail query fails, THEN THE Student_Experience SHALL display an error state.
3. THE Student_Experience SHALL NOT silently discard a failed data operation; at minimum every failure SHALL be logged and user-facing failures SHALL use a toast notification.
   3a. WHEN a user-facing data operation fails (for example, a failed challenge query), THE Student_Experience SHALL trigger both a toast notification and an error state.
4. THE error messages presented to the Student SHALL be available in both English and Arabic.
5. IF neither an English nor an Arabic translation of an error message is available, THEN THE Student_Experience SHALL display a fallback message in the system's default language or a generic error indicator.

---

### Requirement 29: Internationalize Student Pages

**Priority:** P3
**Issue Type:** I18N
**Root cause:** Only about 5 of roughly 50 student pages use i18next; the rest are hardcoded English, including `TutorPage`, `CreateTeamPage`, `SurveyResponsePage`, `TransactionHistoryPage`, `StudentTeamPage`, `AdaptiveQuizSession`, and `PostQuizReview`.

**User Story:** As an Arabic-speaking Student, I want every student page in my language, so that I can use the platform without encountering untranslated English.

#### Acceptance Criteria

1. THE student pages SHALL render user-facing strings through the i18next translation function rather than hardcoded literals.
2. WHEN a student-facing string is internationalized, THE corresponding keys SHALL exist in both the English and Arabic locale resources.
3. WHILE the active language is Arabic, THE Student_Experience SHALL display translated strings for the internationalized pages.
   3a. WHILE the active language is Arabic, IF a translation key is missing or the translation service fails for an internationalized page, THEN THE Student_Experience SHALL surface the failure rather than silently displaying the translation key or English text.
4. THE Student_Experience SHALL contain no hardcoded user-facing English literals on the internationalized student pages outside any documented allowlist.
5. THE internationalized student pages SHALL display translated content through the translation functions, not merely have hardcoded English literals removed.

---

### Requirement 30: Use Logical CSS Properties for RTL

**Priority:** P3
**Issue Type:** RTL
**Root cause:** Physical-property usage breaks RTL layout: `SurveyResponsePage.tsx:88`, `XPHistory.tsx:237`, and `ProfileSummaryStep.tsx:282` use `ml-auto` where `ms-auto` is required.

**User Story:** As an Arabic-speaking Student, I want layouts to mirror correctly, so that elements align to the correct side in right-to-left reading order.

#### Acceptance Criteria

1. THE Student_Experience SHALL use logical CSS properties (for example `ms-*`, `me-*`, `ps-*`, `pe-*`) rather than physical directional properties for layout that must respect reading direction.
2. WHILE the active language is Arabic, THE elements previously using `ml-auto` SHALL align to the correct logical side.
3. THE identified occurrences in the survey response, XP history, and profile summary surfaces SHALL use logical equivalents.
4. THE RTL logical-property migration across the SurveyResponsePage, XPHistory, and ProfileSummaryStep surfaces SHALL be applied as an all-or-nothing change so that all three surfaces are migrated together rather than partially.

---

### Requirement 31: Accessibility for Controls and Motion

**Priority:** P3
**Issue Type:** A11Y
**Root cause:** `CreateTeamPage.tsx:165` has an icon-only back button with no accessible label, and Framer Motion animations are not reliably gated on `prefers-reduced-motion` in JavaScript (only `LeaderboardPage` uses `useReducedMotion`).

**User Story:** As a Student using assistive technology or with motion sensitivity, I want labeled controls and respected motion preferences, so that I can navigate comfortably and safely.

#### Acceptance Criteria

1. THE icon-only controls in the Student_Experience SHALL expose an accessible name, including the back control on the create-team surface.
2. WHILE the operating system or browser signals a reduced-motion preference, THE Student_Experience SHALL suppress or reduce non-essential Framer Motion animations.
   2a. WHILE a reduced-motion preference is signaled, THE Student_Experience SHALL suppress new animations while allowing any currently-running animation to complete naturally.
3. WHEN a Student-facing animation is added, THE animation SHALL honor the reduced-motion preference in its JavaScript-driven behavior, not only in CSS.

---

### Requirement 32: Paginate and Scope the Leaderboard Query

**Priority:** P3
**Issue Type:** PERF
**Root cause:** The leaderboard hardcodes the top 50, has no pagination, fetches the whole institution then filters client-side, and `getOptOutStudentIds` scans the entire table on each call (`useLeaderboard.ts`).

**User Story:** As a Founder scaling to many students, I want the leaderboard to query efficiently, so that performance holds as the cohort grows.

#### Acceptance Criteria

1. THE Leaderboard Query_Hook SHALL retrieve rankings using server-side pagination rather than fetching the entire institution and filtering on the client.
2. THE Leaderboard SHALL support paging beyond a single fixed page of results rather than a hardcoded top-50 cap.
3. THE opt-out determination SHALL avoid a full-table scan on each leaderboard request.
4. WHEN the leaderboard is paginated, THE displayed rankings SHALL remain correct and SHALL continue to honor the anonymous opt-out invariant.

---

### Requirement 33: Real Pagination for Transaction History

**Priority:** P3
**Issue Type:** PERF
**Root cause:** Transaction history is capped at `.range(0, 200)` with no real source pagination (`useTransactionHistory.ts`).

**User Story:** As a Student with a long XP history, I want to page through all my transactions, so that older entries are not silently truncated.

#### Acceptance Criteria

1. THE transaction-history Query_Hook SHALL retrieve records using source-level pagination rather than a fixed maximum range.
   1a. IF source-level pagination is unsupported or fails, THEN THE transaction-history view SHALL refuse to show transactions rather than falling back to a fixed cap.
2. WHEN more transactions exist beyond the current page, THE Student_Experience SHALL allow the Student to load additional pages.
3. THE transaction-history view SHALL NOT silently truncate records beyond a hardcoded limit.

---

### Requirement 34: Bound Marketplace and Discussion Fetches

**Priority:** P3
**Issue Type:** PERF
**Root cause:** Marketplace and discussions fetch unbounded lists (`useMarketplace.ts`, `useDiscussions.ts`).

**User Story:** As a Founder scaling content volume, I want marketplace and discussion queries bounded, so that large datasets do not degrade performance.

#### Acceptance Criteria

1. THE marketplace Query_Hook SHALL retrieve items using a bounded, paginated query rather than an unbounded list fetch.
2. THE discussions Query_Hook SHALL retrieve entries using a bounded, paginated query rather than an unbounded list fetch.
3. WHEN more items or entries exist beyond the current page, THE Student_Experience SHALL allow the Student to load additional pages.
4. WHEN a page presents both marketplace items and discussion entries, THE Student_Experience SHALL allow the Student to load additional pages if any content type has more items available.

---

## Optional Enhancements (Lower Priority)

### Requirement 35: Mascot Guidance at Key Moments

**Priority:** P3 (optional)
**Issue Type:** ENHANCEMENT
**Root cause:** The mascot currently functions as decoration rather than a coach; there are no guided mascot moments at high-value points in the journey.

**User Story:** As a younger Student, I want the mascot to guide me at key moments, so that the platform feels encouraging and coach-like rather than decorative.

#### Acceptance Criteria

1. WHERE mascot guidance is enabled, THE Student_Experience SHALL present mascot coaching at key moments including the welcome flow, assessment introductions, empty states, the first XP award, and the first enrollment.
2. WHERE mascot guidance is enabled, THE password screen SHALL present a mascot presence consistent with the coaching role so that the coaching experience remains consistent on password screens.
3. THE mascot guidance copy SHALL be available in both English and Arabic.
4. WHERE mascot guidance is disabled, THE Student_Experience SHALL function fully without it.
5. THE Student_Experience SHALL function fully regardless of the mascot-guidance state, including while mascot guidance is enabled but no key moment is currently active.
