# EDEVISER — COMPLETE QA & SYSTEM VERIFICATION MANUAL

**Version:** 1.0 · **Generated:** 2026-09-01 · **Repository:** `Edeviser-Kiro` (branch `fix/migration-grants-replay-integrity`)
**Live backend verified against:** Supabase project `cdlgtbvxlxjpcddjazzx` ("Edeviser-Kiro", ap-northeast-1, PostgreSQL 17, status ACTIVE_HEALTHY) via MCP introspection — table list, RLS policy counts, triggers, function definitions, pg_cron jobs, and deployed Edge Function inventory were all read from the **live** project, not just local files.

**Audience:** A non-developer QA tester (frontend/UI only) **plus** developers who need to know what each test proves behind the scenes.

---

## 0. WHAT THIS SYSTEM IS (plain English)

Edeviser is a web platform for schools/universities that combines:

1. **OBE (Outcome-Based Education)** — institutions define learning outcomes in a hierarchy: **ILO** (institution-level, owned by Admin) → **PLO** (program-level, owned by Coordinator) → **CLO** (course-level, owned by Teacher) → **Sub-CLO** (teacher). Graded work produces "evidence" that rolls up into attainment percentages at each level.
2. **Gamification** — students earn XP, levels, badges, streaks; spend XP in a marketplace; join teams, challenges, leaderboards.
3. **Habit Engine** — daily study sessions, wellness habits, streaks, "perfect days", planner, journal.
4. **AI Layer** — an AI Tutor chat (RAG over course materials, DeepSeek only), AI feedback drafts for grading, AI quiz question generation, at-risk predictions, and a safety-gated "agent" system (proposals that need human approval).
5. **Five roles** — `admin`, `coordinator`, `teacher`, `student`, `parent`. Every screen is role-gated; data is isolated per institution (multi-tenant).

**Implementation-status labels used throughout:**

| Label                 | Meaning                                                     |
| --------------------- | ----------------------------------------------------------- |
| IMPLEMENTED           | Code + live schema + data confirm it works end-to-end       |
| PARTIALLY IMPLEMENTED | Pieces exist; the full workflow has known or suspected gaps |
| UI ONLY               | Screen exists; backend behavior missing/unproven            |
| BACKEND ONLY          | Server logic exists; no UI path found                       |
| PLACEHOLDER           | Mock/static/demo behavior                                   |
| BROKEN                | Evidence shows the workflow cannot complete                 |
| UNVERIFIABLE          | Not enough evidence; must be tested live                    |
| NOT FOUND             | Expected feature absent from implementation                 |

---

## 1. HOW TO USE THIS DOCUMENT

**What you are doing:** opening the Edeviser web app in a browser, performing the numbered steps, and comparing what you see with the "Expected Result".

**Recording results** — for every Test ID record exactly one of:

| Result         | When to use                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| **PASS**       | Every expected result happened, exactly as written                                                                 |
| **FAIL**       | Any expected result did not happen (file a bug — §18)                                                              |
| **BLOCKED**    | You cannot perform the steps (missing account, missing data, broken login, feature flag off). Note what is missing |
| **NOT TESTED** | You did not run this test in this cycle                                                                            |

**Capturing evidence:** For every FAIL and for every P0 test (PASS or FAIL), capture: (1) screenshot, (2) the URL in the address bar, (3) the account you were logged in as, (4) date/time, (5) for cross-user tests, both accounts. Screen-record multi-step flows where possible.

**Golden rules for the tester:**

- Never test with your personal account. Use only the test accounts in §2.
- When a test says "should NOT be visible/allowed", a PASS means you truly could not see/do it — a button that errors politely is still a PASS; data actually changing is a FAIL.
- If a page shows an endless spinner for >30 seconds, record FAIL with a screenshot.
- Do not create real-looking data with offensive content; use the prefix `QA-` in every name you create (e.g. `QA-Test Assignment 1`) so cleanup is easy.

---

## 2. TEST ENVIRONMENT

| Item                        | Value                                                                                                              | Status                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Production URL              | `https://e-deviser.vercel.app`                                                                                     | From `docs/QA-Demo-Credentials-and-Testing-Guide.md` — **NEEDS CONFIRMATION** it is current |
| Local dev URL               | `http://localhost:5173` (`npm run dev`)                                                                            | For developers                                                                              |
| Supabase project            | `cdlgtbvxlxjpcddjazzx`                                                                                             | CONFIRMED live & healthy                                                                    |
| Test institution 1          | **Gulf Academy of Excellence** (`@gulf-academy.test`)                                                              | CONFIRMED (3 institutions exist live)                                                       |
| Test institution 2          | **Noor International** (`@noor-international.edu`)                                                                 | CONFIRMED                                                                                   |
| Universal demo password     | In gitignored `.env.local` (`VITE_DEMO_PASSWORD`) — ask the project owner                                          | **NEEDS CONFIRMATION**                                                                      |
| Admin account               | `principal@gulf-academy.test`                                                                                      | Per QA guide                                                                                |
| Coordinator accounts        | `curriculum@gulf-academy.test`, `welfare@gulf-academy.test`                                                        | Per QA guide                                                                                |
| Teacher accounts            | `anderson@gulf-academy.test` (Math 7), `patel@gulf-academy.test` (Science 7), `thompson@gulf-academy.test` (ELA 7) | Per QA guide                                                                                |
| Student accounts            | `student01`–`student30@gulf-academy.test` (30 students, classes 7A/7B/7C)                                          | Per QA guide                                                                                |
| Parent accounts             | 15 linked parents at Gulf Academy, 20 at Noor                                                                      | Per QA guide — **NEEDS CONFIRMATION** of specific emails                                    |
| Second-institution accounts | `principal@noor-international.edu`, `kim@noor-international.edu`, `student01@noor-international.edu`               | Per QA guide                                                                                |
| Quick Demo panel            | Visible on login page only when `VITE_DEMO_PASSWORD` is set; should be **hidden in production**                    | Verify per test AUTH-08                                                                     |

**Required sample data (verify before starting — ask a developer to confirm or seed):** at least one Program, one Course with enrolled students, one CLO mapped to a PLO mapped to an ILO, one Assignment with a rubric and CLO weights, one submitted assignment awaiting grading, one published announcement. Live DB currently has: 74 profiles, 4 courses, 21 assignments, 552 submissions, 550 grades, 1,650 evidence rows, 19 learning outcomes, 24 outcome mappings, 13 rubrics, 38 marketplace items, 0 quizzes, 0 teams, 0 tutor embeddings.

---

## 3. ROLE TESTING MATRIX

Five roles exist (confirmed in code `src/types/app.ts`, `src/router/RouteGuard.tsx`, and the live `handle_new_user` trigger which forces self-signups to `student`).

| #   | Feature area                                               | Student  | Teacher                 | Coordinator | Admin                            | Parent               |
| --- | ---------------------------------------------------------- | -------- | ----------------------- | ----------- | -------------------------------- | -------------------- |
| 1   | Own dashboard                                              | ✔        | ✔                       | ✔           | ✔                                | ✔                    |
| 2   | Manage users / invitations                                 | ✘        | ✘                       | ✘           | ✔                                | ✘                    |
| 3   | Manage ILOs (institution outcomes)                         | ✘        | ✘                       | ✘           | ✔                                | ✘                    |
| 4   | Manage PLOs + PLO→ILO mapping                              | ✘        | ✘                       | ✔           | ✔ (read)                         | ✘                    |
| 5   | Manage CLOs/Sub-CLOs + CLO→PLO mapping                     | ✘        | ✔ (own courses)         | read        | read                             | ✘                    |
| 6   | Create assignments/rubrics/quizzes                         | ✘        | ✔                       | ✘           | ✘                                | ✘                    |
| 7   | Submit assignments / take quizzes                          | ✔        | ✘                       | ✘           | ✘                                | ✘                    |
| 8   | Grade submissions / release grades                         | ✘        | ✔                       | ✘           | ✘                                | ✘                    |
| 9   | View any student's progress in-institution                 | own only | own courses             | ✔           | ✔                                | linked children only |
| 10  | Attendance marking                                         | ✘        | ✔                       | ✘           | ✘                                | ✘                    |
| 11  | CQI action plans / accreditation                           | ✘        | ✘                       | ✔           | ✔                                | ✘                    |
| 12  | Gamification (XP, streaks, marketplace, challenges, teams) | ✔        | manage challenges/teams | view        | manage badges/marketplace/events | view child           |
| 13  | AI Tutor chat                                              | ✔        | ✔ (analytics)           | —           | governance                       | ✘                    |
| 14  | Announcements                                              | read     | create                  | create      | create                           | read                 |
| 15  | Fees                                                       | view own | ✘                       | ✘           | manage                           | view child           |
| 16  | AI Governance console                                      | ✘        | ✘                       | ✘           | ✔                                | ✘                    |
| 17  | Security console (blocked IPs, login attempts)             | ✘        | ✘                       | ✘           | ✔                                | ✘                    |

> Fill PASS/FAIL per cell during the cycle. "✘" cells are **negative tests** — verify the action is genuinely impossible, not merely hidden (see §11).

---

## 4. ROUTE-BY-ROUTE TESTING

Route inventory below is derived from `src/router/AppRouter.tsx` (the single route registry) and `src/lib/navItems.ts` (sidebar). Every role tree is wrapped in one `RouteGuard`; wrong-role access redirects to the user's own dashboard (not an error page) — tests must check the final URL.

**Standard test block (used for key routes; apply the same pattern to any route in the tables):** TEST ID · ROUTE · ROLE · PRIORITY · PRECONDITIONS · STEPS (numbered, UI-only) · EXPECTED RESULT · DATA THAT SHOULD CHANGE · NEGATIVE TEST · RESULT / EVIDENCE.

### 4.1 Public routes (no login)

| Route                    | Purpose                          | Quick check                                                                       |
| ------------------------ | -------------------------------- | --------------------------------------------------------------------------------- |
| `/login`                 | Login + register tabs            | Loads; wrong password shows error; "Quick Demo Access" panel hidden in production |
| `/signup`                | Self-registration                | Creates **student** accounts only (server-enforced)                               |
| `/accept-invite/:token`  | Accept staff/parent invitation   | Invalid token → friendly error, no account created                                |
| `/reset-password`        | Request reset email              | Confirmation shown even for unknown email — **UNVERIFIABLE from repo; test live** |
| `/update-password`       | Set new password from email link | Works only with a valid reset link                                                |
| `/portfolio/:student_id` | Public student portfolio         | Visible only if that student enabled public portfolio                             |
| `/terms`, `/privacy`     | Legal pages                      | Load without login                                                                |
| `*` (anything else)      | 404 page                         | Friendly "not found", no crash                                                    |
| `/`                      | Redirect                         | Goes to `/login`                                                                  |

#### TEST AUTH-01 (P0) — Login and role routing

1. Open `/login`. 2. Sign in as `student01@gulf-academy.test`. 3. Sign out; repeat as teacher, coordinator, admin, parent.

- **Expected:** Student → `/student/dashboard`; teacher → `/teacher/dashboard`; coordinator → `/coordinator/dashboard`; admin → `/admin/dashboard`; parent → `/parent/dashboard`. No endless spinners.
- **Negative:** wrong password → clear error, stays on login; after several failures a lockout/rate-limit message appears.
- **INTERNAL QA / DEVELOPER VERIFICATION:** Role is read from the `profiles` table only (never JWT claims/localStorage). Server-side login rate limiting exists (`check-login-rate`, `login_attempts` table); each login writes a `student_activity_log` entry and runs perfect-day evaluation.

#### TEST AUTH-02 (P0) — Self-signup is student-only

1. Open `/signup` (or the register tab on `/login`). 2. Register with a throwaway email, picking any role the UI offers. 3. Verify email if required. 4. Log in.

- **Expected:** You land in the **student** area regardless of the role chosen. Note: the Login register tab offers admin/teacher/coordinator/parent — **known misleading-UX issue (Risk L-1)**; the server always assigns `student`. Record what the UI implies vs. what happens.
- **INTERNAL:** `handle_new_user` trigger forces `student` unless a valid `invitation_id` is present. Institution join modes: `invite_only` rejects non-invited signups; `domain_restricted` enforces email domain; `open` → account created with `pending_verification` status.

#### TEST AUTH-03 (P0) — Staff invitation acceptance

1. As admin: Users → Invite Users → invite a new teacher email. 2. Open the emailed link (or copy it from the admin UI if email is disabled). 3. Set a password on `/accept-invite/:token`. 4. Log in.

- **Expected:** Invitee lands on `/teacher/dashboard` (teacher area), not student. 5. Reuse the same link → friendly "invalid/used" error.
- **Known risk (Risk L-2, SUSPECTED):** the accept-invite page may not forward `invitation_id`, so invited staff might be provisioned as `student`. If the invitee lands on the student dashboard → **FAIL, critical**.
- **INTERNAL:** `accept-invitation` edge function (deployed, ACTIVE, verify_jwt=false by design), `invitations` table, `handle_new_user` invitation branch, audit row.

#### TEST AUTH-04 (P1) — Password reset round trip

1. `/reset-password` → submit a test email. 2. Open the emailed link → `/update-password`. 3. Set a new password. 4. Log in with it. 5. Old password must fail.

- **BLOCKED condition:** if email delivery is disabled (`EMAIL_MODE=disabled` is the documented default), mark BLOCKED and note it.

#### TEST AUTH-05 (P1) — Sign-out and Back button

1. Log in, go to a deep page (e.g. `/student/progress`). 2. Sign out via the profile menu. 3. Press browser Back.

- **Expected:** Redirected to `/login`; no private data renders after sign-out.
- **INTERNAL:** `signOut()` clears cached profile/dashboard; RouteGuard re-checks `user` on navigation.

#### TEST AUTH-06 (P2) — Email verification banner

- **Expected:** A fresh unverified account sees a banner prompting verification; it disappears after verification. Mark NOT TESTED if email is disabled.

#### TEST AUTH-07 (P1) — First-login onboarding gate (student)

1. Log in as a brand-new student.

- **Expected:** The Onboarding Wizard appears instead of the dashboard; after completing it, the dashboard unlocks.
- **INTERNAL:** `StudentLayout` renders `OnboardingWizard` when `profiles.onboarding_completed = false`; completion flows through `process-onboarding` + `onboarding_*` tables; `award-xp` supports `onboarding_*` XP sources.

#### TEST AUTH-08 (P1) — Demo panel must not ship to production

1. On the production URL login page, look for "Quick Demo Access" or pre-filled credentials.

- **Expected:** None. If present in production → FAIL (P0 security hygiene).
- **INTERNAL:** Panel is gated by `VITE_DEMO_PASSWORD` + localhost-only check; must be absent from deployed builds.

### 4.2 Admin route inventory (`/admin/*`, role `admin` only)

| Route                                                                                                                 | Page                               | What to verify (P2 each unless noted)                      |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| `/admin/dashboard`                                                                                                    | Admin Dashboard (P0)               | KPIs load; numbers match detail pages; no errors           |
| `/admin/analytics`                                                                                                    | Analytics                          | Charts render with institution data only                   |
| `/admin/accreditation-reports`                                                                                        | Accreditation reports (P1)         | Generate → download; see Risk OBE-H3                       |
| `/admin/notifications`                                                                                                | Notifications feed                 | Bell count matches list                                    |
| `/admin/announcements`                                                                                                | Announcement manager               | Create/edit/publish; appears for students (see RT-02)      |
| `/admin/users`, `/users/new`, `/users/:id/edit`                                                                       | User CRUD (P0)                     | Create/edit/deactivate users in own institution only       |
| `/admin/users/import`                                                                                                 | Bulk import (P1)                   | CSV import; invalid rows reported, valid rows created      |
| `/admin/users/invite`, `/users/invite-parent`                                                                         | Invitations (P0)                   | See AUTH-03; parent invite links a parent to a student     |
| `/admin/programs`, `/programs/new`, `/programs/:id/edit`                                                              | Program CRUD (P1)                  | Create program; assign coordinator                         |
| `/admin/outcomes`, `/outcomes/new`, `/outcomes/:id/edit`                                                              | ILO manager (P0)                   | See OBE-01                                                 |
| `/admin/audit-log`                                                                                                    | Audit log (P1)                     | Recent actions appear with actor + timestamp               |
| `/admin/governance`                                                                                                   | AI Governance (P1)                 | Loads; shows policies; see §7                              |
| `/admin/security`                                                                                                     | Security console (P1)              | Login attempts / blocked IPs / rate-limit events           |
| `/admin/bonus-events`                                                                                                 | Bonus XP events (P2)               | Create event → students get multiplied XP during window    |
| `/admin/courses`, `/courses/new`, `/courses/:id/edit`                                                                 | Course CRUD (P0)                   | Create course, assign teacher, program, semester           |
| `/admin/courses/:courseId/enrollment`                                                                                 | Enrollment (P0)                    | Enroll/unenroll students; visible to student after refresh |
| `/admin/semesters`                                                                                                    | Semester manager                   | Create/activate semesters                                  |
| `/admin/departments` (also `/settings/institution`, `/structure`)                                                     | Departments                        | Create/rename; delete blocked when in use                  |
| `/admin/onboarding/pending`                                                                                           | Pending approvals                  | Approve/reject pending accounts                            |
| `/admin/reports`                                                                                                      | Report generator                   | Generate report for own institution                        |
| `/admin/calendar`, `/admin/timetable`                                                                                 | Academic calendar / timetable      | CRUD events/slots; visible to students (CONSIST-04)        |
| `/admin/fees`                                                                                                         | Fee manager (P1)                   | Structures, invoices, payments; receipt generation         |
| `/admin/import`                                                                                                       | Data import                        | Historical data import wizard                              |
| `/admin/surveys`, `/surveys/results`                                                                                  | Surveys                            | Create, publish, view aggregated results                   |
| `/admin/graduate-attributes`                                                                                          | Graduate attributes                | CRUD; map to ILOs (mappings currently 0 live)              |
| `/admin/competency-frameworks`                                                                                        | Competency frameworks              | Import CSV / manage items                                  |
| `/admin/historical-evidence`                                                                                          | Historical evidence                | Aggregated attainment history view                         |
| `/admin/outcome-chain`                                                                                                | Outcome chain view                 | ILO→PLO→CLO tree renders                                   |
| `/admin/badges`, `/badges/spotlight`                                                                                  | Badge definitions + spotlight (P1) | See GAM-07 / Risk GAM-B1                                   |
| `/admin/marketplace`, `/marketplace/sales`, `/marketplace/analytics`, `/marketplace/quests`, `/marketplace/economist` | Marketplace admin (P1)             | Items CRUD, sale events, XP economy dashboard              |
| `/admin/settings/profile`, `/profile`                                                                                 | Profile                            | Edit own profile                                           |
| `/admin/settings/configuration`                                                                                       | Institution settings (P1)          | Thresholds/grading/language/gamification settings persist  |

### 4.3 Coordinator route inventory (`/coordinator/*`, role `coordinator`)

| Route                    | Page           | What to verify                      |
| ------------------------ | -------------- | ----------------------------------- |
| `/coordinator/dashboard` | Dashboard (P0) | Program KPIs; attainment aggregates |

### 4.4 Teacher route inventory (`/teacher/*`, role `teacher`)

| Route                                                                                                         | Page                           | What to verify                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------- |
| `/teacher/dashboard`                                                                                          | Dashboard (P0)                 | Classes, to-grade count, at-risk students    |
| `/teacher/students`                                                                                           | Students list (P1)             | Only students from own courses/institution   |
| `/teacher/clos`, `/clos/new`, `/clos/:id/edit`, `/clos/:id`                                                   | CLO manager (P0)               | See OBE-03                                   |
| `/teacher/clos/:cloId/sub-clos`, `/outcomes/sub-clos`                                                         | Sub-CLO manager (P2)           | Same component on two routes; CRUD + weights |
| `/teacher/rubrics`, `/rubrics/new`, `/rubrics/:id/edit`                                                       | Rubric builder (P0)            | See OBE-04                                   |
| `/teacher/assignments`, `/assignments/new`, `/assignments/:id/edit`                                           | Assignment manager (P0)        | See OBE-05                                   |
| `/teacher/grading`, `/grading/:submissionId`                                                                  | Grading queue + interface (P0) | See OBE-06                                   |
| `/teacher/gradebook`                                                                                          | Gradebook (P1)                 | Per-course grades grid; export               |
| `/teacher/baseline`, `/baseline/:courseId`, `/baseline/:courseId/config`, `/baseline/:courseId/questions/new` | Baseline tests (P2)            | Config + results                             |
| `/teacher/courses/:courseId/quizzes/new`, `/courses/:courseId/quizzes/:id/edit`                               | Quiz form (P1)                 | Create quiz; NO quiz data exists live yet    |
| `/teacher/courses/:courseId/generate-questions`                                                               | AI question generation (P1)    | See AI-05                                    |
| `/teacher/courses/:courseId/review-queue`                                                                     | Question review queue          | Approve/reject AI questions                  |
| `/teacher/courses/:courseId/question-bank`                                                                    | Question bank                  | CRUD                                         |
| `/teacher/questions`, `/teacher/discussions`                                                                  | Redirect helpers               | Redirect into a course-scoped tool           |
| `/teacher/courses/:courseId/question-analytics`                                                               | Question analytics             | Charts; empty until quizzes taken            |
| `/teacher/courses/:courseId/quiz-clo-correlation/:quizId`                                                     | Quiz-CLO correlation           | Renders after attempts                       |
| `/teacher/courses/:courseId/explanation-review`                                                               | Explanation review             | Verified-explanations workflow               |
| `/teacher/announcements`                                                                                      | Announcement editor            | Create for own courses                       |
| `/teacher/modules`                                                                                            | Module manager                 | Course modules/materials CRUD                |
| `/teacher/courses/:courseId/discussions`, `/courses/:courseId/discussions/:threadId`                          | Discussion moderation          | Moderate own course threads                  |
| `/teacher/attendance`, `/attendance/report`                                                                   | Attendance (P1)                | Mark session; report matches                 |
| `/teacher/teams`, `/teams/manage`, `/teams/new`, `/teams/:id/edit`                                            | Team management (P1)           | Create teams; NO teams exist live (NO-DATA)  |
| `/teacher/challenges`, `/challenges/new`, `/challenges/:id/edit`                                              | Challenge manager (P2)         | Create social challenges                     |
| `/teacher/team-health`                                                                                        | Team health report             | Loads; NO-DATA acceptable                    |
| `/teacher/tutor-analytics`                                                                                    | Tutor analytics (P2)           | Usage stats after students use tutor         |
| `/teacher/content-review`                                                                                     | Content review                 | Review student-authored content              |
| `/teacher/tutor-handoffs`                                                                                     | Tutor handoff requests         | Requests raised by tutor escalation          |
| `/teacher/calendar`, `/timetable`, `/settings/profile`, `/notifications`                                      | Shared                         | Load correctly                               |

### 4.5 Student route inventory (`/student/*`, role `student`)

| Route                                                                                                                                                                                     | Page                           | What to verify                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `/student/dashboard`                                                                                                                                                                      | Dashboard (P0)                 | Streak, XP, level, today card; numbers match detail pages     |
| `/student/assignments`, `/assignments/:id`                                                                                                                                                | Assignments (P0)               | List + detail + submission flow (OBE-05)                      |
| `/student/courses`, `/courses/:courseId`                                                                                                                                                  | Courses (P0)                   | Enrolled courses only; materials, modules                     |
| `/student/courses/:courseId/materials/:materialId`                                                                                                                                        | Material view                  | Opens material                                                |
| `/student/courses/:courseId/discussions`, `/discussions/:threadId`                                                                                                                        | Discussions                    | Post/reply in enrolled courses                                |
| `/student/progress`, `/progress/clos`                                                                                                                                                     | Progress / CLO progress (P0)   | Attainment % match teacher/admin views (CONSIST-01)           |
| `/student/learning-path`                                                                                                                                                                  | Learning path                  | Nodes render                                                  |
| `/student/xp-history`                                                                                                                                                                     | XP history (P1)                | Every XP event listed; matches dashboard total                |
| `/student/leaderboard`                                                                                                                                                                    | Leaderboard (P1)               | Institution peers only; see Risk GAM-L2 (weekly rank)         |
| `/student/badges`                                                                                                                                                                         | Badges (P1)                    | See GAM-07 / Risk GAM-B1                                      |
| `/student/challenges`, `/challenges/list`, `/challenges/:id`                                                                                                                              | Challenges (P2)                | Join, progress, complete                                      |
| `/student/team`, `/teams/:teamId`, `/teams/new`                                                                                                                                           | Teams (P2)                     | Create/join team; NO-DATA live                                |
| `/student/marketplace`, `/marketplace/my-items`, `/marketplace/history`                                                                                                                   | Marketplace (P1)               | See GAM-08                                                    |
| `/student/habits`, `/habits/analytics`                                                                                                                                                    | Habit heatmap + analytics (P1) | See §6                                                        |
| `/student/planner`, `/planner/starter-week`, `/today`                                                                                                                                     | Planner (P1)                   | Tasks CRUD; starter-week plan                                 |
| `/student/focus/:sessionId`                                                                                                                                                               | Focus mode (full-screen)       | Timer session; completion awards XP (HABIT-04)                |
| `/student/journal`, `/journal/new`, `/journal/:id`                                                                                                                                        | Journal (P2)                   | Private entries; XP for journaling                            |
| `/student/tutor`, `/tutor/:conversationId`                                                                                                                                                | AI Tutor (P1)                  | See §7                                                        |
| `/student/quizzes/:quizId/adaptive`, `/quizzes/:quizId/review/:attemptId`                                                                                                                 | Adaptive quiz + review         | UNVERIFIABLE live (quizzes=0); BLOCKED until quiz data exists |
| `/student/courses/:courseId/recovery/:cloId`                                                                                                                                              | Mastery recovery               | Recovery path for low CLO attainment                          |
| `/student/portfolio`                                                                                                                                                                      | Portfolio (P2)                 | Public toggle controls `/portfolio/:id` page                  |
| `/student/transcript`                                                                                                                                                                     | Transcript                     | Generates/downloads                                           |
| `/student/fees`                                                                                                                                                                           | Fees                           | Own invoices/receipts                                         |
| `/student/surveys`                                                                                                                                                                        | Surveys                        | Respond to assigned surveys                                   |
| `/student/announcements/:announcementId`                                                                                                                                                  | Announcement detail            | Loads published announcement                                  |
| `/student/onboarding`, `/onboarding/complete-profile`                                                                                                                                     | Onboarding                     | See AUTH-07                                                   |
| `/student/settings/profile`, `/settings/reassessment`, `/notification-preferences`, `/sessions`, `/calendar`, `/timetable`, `/notifications`, `/profile`, `/learning-profile`, `/content` | Settings/shared                | Load; edits persist; notification prefs honored               |

### 4.6 Parent route inventory (`/parent/*`, role `parent`)

| Route                | Page           | What to verify                           |
| -------------------- | -------------- | ---------------------------------------- |
| `/parent/dashboard`  | Dashboard (P0) | Shows **verified linked children only**  |
| `/parent/children`   | Children list  | Linked children; pending states          |
| `/parent/progress`   | Child progress | Outcome/grade summaries per linked child |
| `/parent/attendance` | Attendance     | Child attendance records                 |
| `/parent/fees`       | Fees           | Child invoices/receipts                  |

---

## 5. OBE ENGINE TEST SUITE

**How the engine actually works (verified against live DB trigger `trigger_attainment_rollup` on the `grades` table):**

1. Teacher creates CLOs for a course and maps them upward: **CLO→PLO** and **PLO→ILO** mappings carry weights. Direction is always `parent → child` (ILO→PLO, PLO→CLO, CLO→Sub-CLO). A live DB trigger blocks invalid hierarchy pairs and another enforces mapping weight-sum rules.
2. Teacher builds a **rubric** (criteria + levels), creates an **assignment** with CLO weights, publishes it.
3. Student **submits** work.
4. Teacher **grades** in the Grading Interface: picks a level per rubric criterion → total score + percentage.
5. On grade save, the database automatically: creates immutable **evidence** rows (one per weighted CLO, stamped with the score % and a level: Excellent ≥85, Satisfactory ≥70, Developing ≥50, Not Yet <50); recomputes the **CLO attainment** (average of that student's evidence for the CLO); rolls up **PLO** (weighted average of CLO attainments using mapping weights) and **ILO** (same rule up one more level); awards **15 XP** ("Grade released"); flips the submission to **Graded**; sends the student a **notification**. CLOs with no complete PLO/ILO mapping path are **skipped silently** (a server warning only).
6. Evidence is immutable — re-grading updates the grade and cascades a recalculation rather than editing history.

#### TEST OBE-01 (P0) — Admin manages ILOs

- **Role:** Admin · **Start:** `/admin/outcomes`
- **Steps:** 1. Open Outcomes. 2. Create "QA-ILO-1" (title, description, Bloom's level). 3. Edit it. 4. Try to delete an ILO that has PLOs mapped to it. 5. Delete "QA-ILO-1" (unmapped).
- **Expected:** Create/edit/delete succeed for unmapped ILO; deleting a **mapped** ILO is blocked with a clear message; reordering (drag) persists after refresh.
- **Data that should change:** ILO appears in coordinator PLO mapping pickers; audit log records each action.
- **Negative:** As coordinator/teacher/student, open `/admin/outcomes` → redirected away.
- **INTERNAL:** `learning_outcomes` (type=ILO); live trigger `trg_guard_mapped_outcome_delete`; `reorder_learning_outcomes` RPC; scope enforcement trigger `trg_enforce_learning_outcome_scope`; audit via `audit_logs`.

#### TEST OBE-02 (P0) — Coordinator manages PLOs + ILO mapping

- **Role:** Coordinator · **Start:** `/coordinator/plos`
- **Steps:** 1. Create "QA-PLO-1" under a program. 2. Open its mapping editor; map it to an ILO with a weight. 3. Add a second ILO mapping; set weights so they **exceed** the allowed total. 4. Save.
- **Expected:** Valid mapping saves; over-total weights are rejected with a visible validation error (live DB enforces weight-sum). Mapping direction shown as ILO→PLO.
- **INTERNAL:** `outcome_mappings` rows `source=ILO, target=PLO`; live trigger `trg_outcome_mapping_weight_sum`. Historical Risk OBE-H1 (weight scale 0–1 vs 0–100 inconsistency) — watch the UI's expected scale and record exactly what happens.

#### TEST OBE-03 (P0) — Teacher manages CLOs + PLO mapping + Sub-CLOs

- **Role:** Teacher · **Start:** `/teacher/clos`
- **Steps:** 1. Create "QA-CLO-1" for your course. 2. Map it to a PLO with a weight. 3. Open Sub-CLO manager; add two Sub-CLOs with weights summing correctly; try making them sum wrong.
- **Expected:** CRUD works; invalid weights rejected; Sub-CLOs listed under the CLO; unmapped CLO shows a visible "not mapped" indication.
- **Negative:** Teacher B (different course, same institution) must not edit Teacher A's CLOs.

#### TEST OBE-04 (P0) — Rubric builder

- **Role:** Teacher · **Start:** `/teacher/rubrics`
- **Steps:** 1. Create rubric "QA-Rubric-1" with 3 criteria, each with 3–4 levels and point values. 2. Save; reopen; edit a level; save. 3. Try saving with an empty criterion.
- **Expected:** Persists exactly; empty/invalid entries blocked with messages.
- **INTERNAL:** `rubrics` + `rubric_criteria` tables; owner-write policies confirmed live (`rubric_criteria_owner_write`).

#### TEST OBE-05 (P0) — Assignment lifecycle: create → student sees → submits

- **Roles:** Teacher + Student A · **Start:** `/teacher/assignments/new`
- **Steps:** 1. Teacher: create "QA-Assign-1" for the course, attach the QA rubric, set CLO weights, set a due date, publish. 2. Student A: open `/student/assignments` → assignment appears. 3. Open it; attach/enter an answer; Submit. 4. Re-open → status shows Submitted.
- **Expected:** Student sees it only after publish; after submit the student cannot silently edit past the deadline (record actual behavior); teacher's Grading queue count increases by 1.
- **Data:** submission row with status `submitted`; student XP for `submission` (self-award allow-list includes submission) may appear in XP history.
- **Negative:** Student B in a **different course** must not see QA-Assign-1. Student submitting twice → second submit either replaces (draft semantics) or is blocked — record which; it must not create two separate gradable submissions.
- **INTERNAL:** `assignments.clo_weights` (jsonb `{clo_id, weight}`), `submissions` RLS `submissions_student_own`; `trg_new_assignment_notify` creates notifications on publish.

| `/parent/planner`, `/planner/:studentId` | Planner view | Read-only child planner |
| `/parent/communications`, `/notifications` | Announcements/messages | Institution announcements |
| `/parent/support` | Support actions | Encouragements/reminders to child |
| `/parent/profile`, `/settings/profile` | Profile | Edit own profile |

---

## 5. OBE ENGINE TEST SUITE

**How the engine actually works (verified against live DB trigger `trigger_attainment_rollup` on the `grades` table):**

1. Teacher creates CLOs for a course; mappings run **parent→child**: ILO→PLO (coordinator), PLO→CLO (teacher), CLO→Sub-CLO. Live DB triggers block invalid hierarchy pairs and enforce mapping weight-sum rules.
2. Teacher builds a **rubric** (criteria + levels), creates an **assignment** with CLO weights, publishes it.
3. Student **submits** work.
4. Teacher **grades**: picks a level per rubric criterion → total score + percentage.
5. On grade save, the database automatically: creates immutable **evidence** rows (one per weighted CLO, stamped with score % and level: Excellent ≥85, Satisfactory ≥70, Developing ≥50, Not Yet <50); recomputes **CLO attainment** (average of the student's evidence for that CLO); rolls up **PLO** and **ILO** as weighted averages via mapping weights; awards **15 XP** ("Grade released"); flips the submission to **Graded**; sends the student a **notification**. CLOs with no complete PLO/ILO mapping path are **skipped silently**.
6. Evidence is immutable — re-grading recalculates rather than editing history.

#### TEST OBE-01 (P0) — Admin manages ILOs

- **Role:** Admin · **Start:** `/admin/outcomes`
- **Steps:** 1. Create "QA-ILO-1". 2. Edit it. 3. Try to delete an ILO that has PLOs mapped to it. 4. Delete "QA-ILO-1" (unmapped). 5. Reorder via drag; refresh.
- **Expected:** Create/edit/delete succeed for unmapped ILO; deleting a **mapped** ILO is blocked with a clear message; reorder persists.
- **INTERNAL:** `learning_outcomes` (type=ILO); live triggers `trg_guard_mapped_outcome_delete`, `trg_enforce_learning_outcome_scope`; `reorder_learning_outcomes` RPC; audit rows in `audit_logs`.

#### TEST OBE-02 (P0) — Coordinator manages PLOs + ILO mapping

- **Role:** Coordinator · **Start:** `/coordinator/plos`
- **Steps:** 1. Create "QA-PLO-1" under a program. 2. Map it to an ILO with a weight. 3. Add a second ILO mapping with weights that **exceed** the allowed total. 4. Save.
- **Expected:** Valid mapping saves; over-total weights rejected with a visible error; direction shown as ILO→PLO.
- **INTERNAL:** `outcome_mappings` (source=ILO, target=PLO); live trigger `trg_outcome_mapping_weight_sum`. Watch for historical Risk OBE-H1 (0–1 vs 0–100 weight scale inconsistency) — record exactly what the UI accepts.

#### TEST OBE-03 (P0) — Teacher manages CLOs + PLO mapping + Sub-CLOs

- **Role:** Teacher · **Start:** `/teacher/clos`
- **Steps:** 1. Create "QA-CLO-1" for your course. 2. Map to a PLO with a weight. 3. Add two Sub-CLOs with valid weights; then try invalid weights.
- **Expected:** CRUD works; invalid weights rejected; unmapped CLO visibly flagged.
- **Negative:** A teacher of a different course must not edit this CLO.

#### TEST OBE-04 (P0) — Rubric builder

- **Role:** Teacher · **Start:** `/teacher/rubrics`
- **Steps:** 1. Create "QA-Rubric-1": 3 criteria × 3–4 levels with points. 2. Save; reopen; edit; save. 3. Try saving with an empty criterion.
- **Expected:** Persists exactly; invalid entries blocked with messages.
- **INTERNAL:** `rubrics` + `rubric_criteria`; owner-write RLS confirmed live.

#### TEST OBE-05 (P0) — Assignment lifecycle: create → student sees → submits

- **Roles:** Teacher + Student A · **Start:** `/teacher/assignments/new`
- **Steps:** 1. Teacher: create "QA-Assign-1" with the QA rubric, CLO weights, due date; publish. 2. Student A: `/student/assignments` → it appears. 3. Open, answer, Submit. 4. Re-open → status Submitted.
- **Expected:** Visible only after publish; teacher's grading queue count +1.
- **Data:** submission `status=submitted`; submission XP may appear in XP history.
- **Negative:** Student in a different course must not see it. Double-submit → must not create two gradable submissions (record actual replace-vs-block behavior).
- **INTERNAL:** `assignments.clo_weights` jsonb; `submissions_student_own` RLS; `trg_new_assignment_notify` creates notifications on publish.

#### TEST OBE-06 (P0) — GRADE → EVIDENCE → ATTAINMENT CASCADE (the core chain)

- **Roles:** Teacher + Student A · **Traceability:** grade insert → evidence → CLO/PLO/ILO attainment → XP → notification → dashboards
- **Steps:**
  1. Student A: open `/student/progress/clos`; **write down** the attainment % for QA-CLO-1 (or "no data").
  2. Student A: open `/student/xp-history`; note the XP total. Note the notification-bell unread count.
  3. Teacher: `/teacher/grading` → open Student A's submission for QA-Assign-1.
  4. Select a level for **every** rubric criterion (verify Submit stays disabled until all are selected). Submit.
  5. Teacher: submission leaves the queue, shows Graded.
  6. Student A (refresh): assignment shows grade + feedback; `/student/progress/clos` shows changed attainment; `/student/xp-history` shows a "Grade released" XP entry (~15 XP, possibly multiplied); bell shows a "Grade Released" notification.
  7. Coordinator: dashboard/coverage views reflect the new evidence for the mapped PLO.
  8. Admin: outcome-chain / outcomes views reflect the ILO rollup.
- **PASS condition:** all eight observations occur; the student's displayed % equals the rubric math.
- **FAIL suspects:** PLO/ILO aggregate views grey/zero while student-level values are correct (Risk OBE-H2 scope mismatch).
- **Evidence:** before/after screenshots of attainment, XP history, notification.
- **INTERNAL:** Live trigger `trigger_attainment_rollup` on `grades` inserts `evidence` per `assignments.clo_weights` (`ON CONFLICT DO NOTHING`), recomputes `outcome_attainment` (CLO student-course scope; PLO weighted via `outcome_mappings`; ILO one level up), inserts idempotent 15-XP `grade` transaction keyed to grade id, updates `student_gamification.xp_total` + level, sets `submissions.status='graded'`, emits `grade_released` notification. The `calculate-attainment-rollup` Edge Function exists but the active path is this trigger (Risk OBE-M1: dormant duplicate).

#### TEST OBE-07 (P0) — Attainment thresholds (85 / 70 / 50)

- **Steps:** Grade QA submissions so a CLO's averages land at ≥85, 70–84, 50–69, <50 (four students or sequential grades).
- **Expected:** Labels **Excellent / Satisfactory / Developing / Not Yet** with green/blue/yellow/red. Boundaries: exactly 85 = Excellent; exactly 70 = Satisfactory; exactly 50 = Developing; 49.9 = Not Yet.
- **INTERNAL:** thresholds hardcoded identically in the DB trigger and `attainmentClassifier.ts`. Whether Institution Settings can change them end-to-end is UNVERIFIABLE — test if a threshold setting exists in `/admin/settings/configuration`.

#### TEST OBE-08 (P1) — Re-grade / grade correction

1. Teacher re-opens the graded submission. 2. Change a criterion level; resubmit.

- **Expected:** New score shown; attainment recalculated; **no duplicate** "Grade released" XP; history intact.
- **INTERNAL:** trigger fires on UPDATE; XP idempotent via `reference_id = grade_id`.

#### TEST OBE-09 (P1) — Unmapped CLO excluded from rollups

1. Teacher: create "QA-CLO-Unmapped" with **no** PLO mapping. 2. Assignment weighted only to it. 3. Student submits; teacher grades.

- **Expected:** Grade/feedback/XP/notification still work; no CLO/PLO/ILO rollup appears; no error banners.
- **INTERNAL:** trigger skips CLOs lacking a complete PLO/ILO path (server WARNING only).

#### TEST OBE-10 (P1) — Mapping hierarchy validation

- Attempt invalid mappings (ILO→CLO skipping PLO, PLO→PLO, CLO→ILO).
- **Expected:** blocked by UI or a save error. **INTERNAL:** live trigger `trg_validate_outcome_mapping_hierarchy` allows only ILO→PLO, PLO→CLO, CLO→SUB_CLO.

#### TEST OBE-11 (P2) — Delete guards and reorder

- Delete a PLO with mapped CLOs → blocked with explanation. Reorder ILOs → persists for all roles.

#### TEST OBE-12 (P1) — Outcome chain visualization

- Admin `/admin/outcome-chain`, Coordinator `/coordinator/outcome-chain` → ILO→PLO→CLO tree renders with real data; empty branches show a friendly empty state.

#### TEST OBE-13 (P1) — Curriculum matrix

- Coordinator `/coordinator/matrix` → PLO×CLO grid matches mappings from OBE-02/03; CSV export matches screen.

#### TEST OBE-14 (P1) — Quizzes & adaptive quizzes — **BLOCKED by data**

- **State:** `quizzes`/`quiz_questions`/`quiz_attempts` = 0 rows live. The pipeline (auto-grade, adaptive engine, Bloom's progression, review schedule) is implemented but has never run with real data.
- **Once a quiz exists:** create quiz (MCQ/TF/fill-blank + one short-answer) → student takes it → auto-score instant; short-answer "pending manual" until teacher grades; review page shows per-question correctness; retry rules per quiz settings.
- **INTERNAL:** `quizGrader.ts` + `auto-grade-quiz` edge fn; quiz evidence path `quizEvidence.ts` is CLO-only (Risk OBE-M1).

#### TEST OBE-15 (P1) — Accreditation report & course file — **SUSPECTED BROKEN (Risk OBE-H3/H4)**

- Admin `/admin/accreditation-reports`; Coordinator `/coordinator/course-file`. Generate for a program/course with real grades; open the PDF.

---

## 6. HABIT ENGINE + GAMIFICATION TEST SUITE

**Verified rules (from `streakCalculator.ts`, `xpLevelCalculator.ts`, `award-xp`, live triggers):**

- **Streak:** daily activity increments; same-day repeat = no change; missing exactly 1 day consumes a **streak freeze** if available; missing more → reset to 1. Milestones at 7/14/30/60/100 days award 100/100/250/250/500 XP. "Streak Sabbatical" (if enabled) excludes weekend days from gaps. **Comeback Challenge:** when a streak >1 breaks, a 3-day challenge can restore `floor(lostStreak/2)`; missing a day during it cancels the challenge.
- **Levels:** L1 = 0 XP, L2 = 100, L3 = 250, L≥4 = floor(50 × N^1.5); max 50. Adaptive multipliers (low levels up to ×1.2, high ×0.8); per-transaction cap 9,999 XP.
- **XP idempotency:** XP tied to a unique reference (grade, session, etc.) can never be awarded twice.
- **Marketplace:** balance = earned − spent; purchases are atomic; sale events can discount; purchase history immutable (DB triggers).
- **Known structural risks:** two habit tables (`habit_tracking` 1,737 rows vs newer `habit_logs` 18 rows) — screens may disagree (Risk HABIT-H1); **no per-login streak increment caller found** — only a midnight reset cron (Risk HABIT-H2, SUSPECTED); badge awarding fragmented (Risk GAM-B1).

#### TEST HABIT-01 (P0) — Daily streak increments once

1. Student A logs in; note the streak number. 2. Log out/in same day → unchanged. 3. Log in next day → +1.

- **FAIL signal:** streak **never** increments across days → confirms Risk HABIT-H2 (no login-time driver). Mark FAIL (P0).
- **INTERNAL:** `student_gamification.streak_current/last_login_date`; `process-streak` edge fn; Vercel cron `/api/cron/streak-reset` (00:00) handles resets only; no live pg_cron per-student increment job.

#### TEST HABIT-02 (P1) — Streak freeze consumption

- Precondition: student owns ≥1 freeze (marketplace). Skip exactly 1 day → streak preserved, freeze −1, "freeze used" indicated. Skip 2+ days with 1 freeze → reset to 1.

#### TEST HABIT-03 (P1) — Streak milestones

- Reach day 7 → +100 XP "streak milestone" entry, once; same for 14/30/60/100 per table.

#### TEST HABIT-04 (P0) — Study session completion → XP

1. `/student/planner` → start a focus session. 2. Complete it; add a note. 3. XP history shows a "study session" entry. 4. `/student/habits` heatmap shows today filled.

- **FAIL signal (SUSPECTED):** session completes but **no XP arrives** — an earlier audit found self-awarded XP for `study_session`/planner/wellness sources was server-rejected (403, silently swallowed). This test adjudicates Risk GAM-X1.
- **Negative:** double-click Complete / refresh mid-completion → exactly one XP entry, one session record.
- **INTERNAL:** `useSessionCompletion` → `study_sessions` → `session_evidence` → `award-xp(source=study_session, reference_id=sessionId)` → `check-badges(trigger=study_session)` → weekly-goal XP → review-session XP. Dedup via unique `(student_id, reference_id)`.

#### TEST HABIT-05 (P1) — Perfect day

- Complete all daily habits. **Expected:** "Perfect Day" reward/XP + heatmap star. If nothing happens → FAIL (Risk HABIT-PD: audit found the payout path may be inert; a `perfect-day-prompt` cron at 18:00 only nudges).

#### TEST HABIT-06 (P2) — Wellness habits

- `/student/habits`: log a wellness habit → persists after refresh; analytics update; XP per admin wellness config if enabled.

#### TEST HABIT-07 (P1) — Comeback challenge

- Break a >1-day streak (skip 2+ days), log in → Comeback Challenge offered; 3 consecutive habit-completed days restores floor(lost/2); missing a day cancels. BLOCKED if HABIT-01 fails.

#### TEST GAM-01 (P0) — XP math consistency

1. Note dashboard XP + level. 2. Open `/student/xp-history`. 3. Perform one known-XP action (e.g. get graded).

- **Expected:** dashboard increases by the history entry's amount; level matches thresholds (L2=100, L3=250, L4≈400, L5≈500); multipliers shown when applied.
- **INTERNAL:** `xp_total` is updated by `award-xp` (full SUM recompute) **and** the grade trigger (+15 increment) — two mechanisms that can drift (Risk GAM-H1). If total ≠ sum of history, FAIL for developer follow-up.

#### TEST GAM-02 (P1) — Level-up moment

- Cross a level boundary → celebration/notification exactly once.

#### TEST GAM-03 (P1) — Leaderboard scope + weekly rank

- `/student/leaderboard`: only same-institution students; own row highlighted. Switch to "weekly" → verify weekly "my rank" reflects **weekly** XP (Risk GAM-L2: audit found it uses lifetime XP → likely FAIL).
- **Negative:** Noor students must never appear on Gulf's leaderboard.

#### TEST GAM-04 (P1) — Marketplace purchase (atomicity)

1. Note XP balance. 2. Buy an affordable item → balance drops by the (possibly discounted) price; item under My Items; Transaction History lists it. 3. Try an item costing more than the balance → blocked, balance unchanged. 4. Double-click Buy → exactly one purchase/deduction.

- **INTERNAL:** RPC `process_marketplace_purchase` (row lock, balance check, `get_effective_price` incl. sale events); triggers make `xp_purchases` immutable.

#### TEST GAM-05 (P2) — Boosts, equipped items, deadline extensions

- Buy/equip boost → active boost visible; next XP award visibly multiplied; deadline-extension item (if offered) extends only that student's due date.

#### TEST GAM-06 (P1) — Challenges

- Teacher creates challenge → students join → qualifying actions move progress → completion awards challenge XP (50–500) once. Expired challenges unjoinable; a 4th simultaneous active challenge rejected (live trigger `trg_enforce_max_active_challenges`).

#### TEST GAM-07 (P1) — Badges — **PARTIALLY IMPLEMENTED (Risk GAM-B1)**

- **State:** live DB `badge_definitions` = 68, `badges` = 15, but `student_badges` = **0** (the table the badge engine writes). Audit: `award-xp` never triggers badge checks on the core loop (login/submission/grade), and the badge UI reads a different table than the engine writes.
- **Steps:** Perform badge-qualifying actions (7-day streak, first submission, level-up). Open `/student/badges`.
- **Expected (promise):** earned badges appear. **Suspected actual:** none ever appear. Record exact behavior.
- **INTERNAL:** `check-badges` writes `student_badges`; UI reads `badges`; no fan-out from `award-xp`.

#### TEST GAM-08 (P2) — Teams

- **State:** `teams` = 0 live (NO-DATA). Teacher creates team → students accept invites → team XP/streak on team page.
- **Known risk (GAM-H4):** two team-streak engines write two tables (`teams.streak_count` SQL cron vs `team_gamification` edge fn) — numbers may disagree. Record which the UI shows.

#### TEST GAM-09 (P2) — Mystery box & bonus question

- Trigger (level-up mystery reward; quiz bonus question) → reward resolves exactly once; refresh/replay cannot claim twice.

#### TEST GAM-10 (P2) — Admin gamification controls

- Bonus XP event → student actions during window show multiplied XP; marketplace price edit → students see new price; Badge Spotlight rotates weekly (live pg_cron `badge-spotlight-rotate`, Mon 00:00, ACTIVE).

#### TEST HABIT-08 (P2) — Planner tasks

- `/student/planner`: create task → appears in list + Today view → mark done (XP may award) → past-due handling → delete. Statuses must persist (an earlier client/DB status mismatch was fixed — regression-check).

- **Expected:** real attainment numbers, CLO/PLO tables, CQI section.
- **FAIL signals (from static audit):** zeros/empty sections or generation error — schema drift found in `generate-accreditation-report` / `generate-course-file`. Verify live; record precisely.

#### TEST OBE-16 (P2) — CQI action plans

- Coordinator `/coordinator/cqi`: create plan (root cause, due date, target) → advance statuses → attach evidence-of-improvement → close. Persists and surfaces on dashboards.

#### TEST OBE-17 (P2) — Graduate attributes & competency frameworks

- Admin `/admin/graduate-attributes`, `/admin/competency-frameworks`: CRUD + GA→ILO mapping save. Live `graduate_attribute_mappings` = 0; GA rollup/report code has known column drift (Risk OBE-M2) — treat GA attainment numbers as UNVERIFIABLE until proven on screen.

**Universal route negative test (apply to every row above):** log in as a _different_ role, paste the URL directly → you must be redirected to your own dashboard, never see the page. Log out, paste the URL → redirected to `/login`.

| `/coordinator/plos`, `/outcomes`, `/plos/new`, `/plos/:id/edit` | PLO manager + ILO mapping (P0) | See OBE-02 |
| `/coordinator/matrix` | Curriculum matrix (P1) | PLO×CLO grid; export CSV |
| `/coordinator/cqi` | CQI action plans (P1) | Create plan with root cause, due date, evidence-of-improvement; status lifecycle |
| `/coordinator/course-file`, `/accreditation` | Course file generator (P1) | Generate → verify contents; see Risk OBE-H4 |
| `/coordinator/team-health` | Team health (all courses) | Report loads (NO-DATA if no teams) |
| `/coordinator/competencies` | Competency frameworks | Same manager as admin |
| `/coordinator/discussions`, `/courses/:courseId/discussions*` | Discussion moderation | Moderate threads in program courses |
| `/coordinator/sankey`, `/gap-analysis`, `/coverage-heatmap`, `/trends`, `/cohort-comparison` | Analytics views (P2) | Render without errors; numbers consistent with dashboards; see Risk OBE-H2 |
| `/coordinator/outcome-chain` | Outcome chain | Tree renders |
| `/coordinator/timetable`, `/sessions` | Timetable / sessions | CRUD within scope |
| `/coordinator/notifications`, `/settings/profile`, `/profile` | Shared | Load correctly |
