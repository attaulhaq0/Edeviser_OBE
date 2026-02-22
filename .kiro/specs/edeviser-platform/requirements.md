# Requirements Document — Edeviser Platform (Full Production)

## Introduction

Edeviser is a Human-Centric Outcome-Based Education (OBE) + Gamification platform for higher education institutions. The platform fuses accreditation compliance with student engagement through a Dual-Engine Architecture: an OBE Core that automates ILO → PLO → CLO mapping, rubric-based grading, and evidence rollup; and a Habit Core that motivates students via XP, streaks, badges, levels, and leaderboards. This document covers the complete production-ready feature set across all user roles using React 18, TypeScript, Vite, Tailwind CSS v4, Shadcn/ui, and Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) deployed on Vercel, including non-functional requirements for performance, security, accessibility, and reliability.

## Glossary

- **Platform**: The Edeviser web application (React SPA) and its supporting backend services (Supabase)
- **Auth_Module**: The authentication and session management subsystem built on Supabase Auth (GoTrue)
- **RBAC_Engine**: The role-based access control subsystem enforced via Supabase Row Level Security (RLS) policies and JWT claims
- **Admin**: A user with the `admin` role — manages institution settings, users, ILOs, and accreditation reports
- **Coordinator**: A user with the `coordinator` role — manages programs, PLOs, and curriculum mapping
- **Teacher**: A user with the `teacher` role — manages courses, CLOs, rubrics, assignments, and grading
- **Student**: A user with the `student` role — submits assignments, earns XP/badges, maintains streaks
- **ILO**: Institutional Learning Outcome — top-level outcome defined by the institution
- **PLO**: Program Learning Outcome — program-level outcome mapped to one or more ILOs
- **CLO**: Course Learning Outcome — course-level outcome mapped to one or more PLOs, tagged with a Bloom's Taxonomy level
- **Outcome_Manager**: The subsystem responsible for CRUD operations on ILOs, PLOs, and CLOs in the `learning_outcomes` table
- **Mapping_Engine**: The subsystem that manages relationships between CLO → PLO → ILO via the `outcome_mappings` table
- **Rubric_Builder**: The subsystem for creating and managing rubrics with criteria rows and performance level columns
- **Grading_Module**: The subsystem that enables rubric-based grading of student submissions
- **Evidence_Generator**: The subsystem (Edge Function) that auto-creates immutable `evidence` records when a grade is submitted
- **Rollup_Engine**: The subsystem (Edge Function) that aggregates evidence into `outcome_attainment` scores at CLO, PLO, and ILO levels
- **XP_Engine**: The subsystem that awards, tracks, and logs experience points via the `xp_transactions` ledger
- **Streak_Tracker**: The subsystem that tracks consecutive-day login streaks in `student_gamification`
- **Badge_System**: The subsystem that awards badges for defined milestones, stored in the `badges` table
- **Level_System**: The subsystem that calculates student level from cumulative XP using defined thresholds
- **Leaderboard_Service**: The subsystem that ranks students by XP within course or program scope
- **Notification_Service**: The subsystem that creates and delivers in-app notifications via the `notifications` table and Supabase Realtime
- **Report_Generator**: The subsystem (Edge Function + lightweight PDF library) that produces accreditation PDF reports
- **Curriculum_Matrix**: The visual PLO × Course matrix showing CLO coverage and attainment percentages
- **Audit_Logger**: The subsystem that records administrative actions to the immutable `audit_logs` table
- **Bloom's_Level**: One of six cognitive levels (Remembering, Understanding, Applying, Analyzing, Evaluating, Creating) assigned to each CLO
- **Attainment_Level**: A classification of student performance — Excellent (≥85%), Satisfactory (70–84%), Developing (50–69%), Not_Yet (<50%)
- **Habit_Tracker**: The subsystem that tracks 4 daily student habits (Login, Submit, Journal, Read) in a 7-day grid on the Student Dashboard
- **Learning_Path**: A sequential visualization of assignments within a course, ordered by Bloom's level, with prerequisite-gated nodes
- **Bloom's_Verb_Guide**: A reference panel in the CLO builder that suggests action verbs aligned to each Bloom's Taxonomy level
- **Activity_Logger**: The subsystem that logs all student behavioral events to the `student_activity_log` table for future AI Co-Pilot training data
- **Resend**: The third-party email delivery service used by Edge Functions for transactional email notifications
- **Kolb's_Cycle**: Kolb's Experiential Learning Cycle — a four-stage reflection model (Concrete Experience → Reflective Observation → Abstract Conceptualization → Active Experimentation) used to generate contextual journal prompts
- **Peer_Milestone_Notification**: An in-app notification sent to course peers when a student achieves a significant milestone (level up, rare badge earned, streak milestone reached)
- **Perfect_Day_Nudge**: A scheduled notification sent at 6 PM (institution timezone) to students who have completed 3 of 4 daily habits, prompting them to complete the final habit before midnight
- **AI_Co-Pilot**: The Agentic AI subsystem (Phase 2) that provides personalized module suggestions, at-risk early warnings, and feedback draft generation based on student behavioral and learning data collected in Phase 1
- **NFR**: Non-Functional Requirement — a quality attribute or constraint on the system (performance, security, accessibility, reliability)
- **Streak_Freeze**: A purchasable item (200 XP) that protects a student's streak for one missed day, stored as `streak_freezes_available` in `student_gamification`
- **DraftManager**: The client-side utility that auto-saves journal and submission drafts to localStorage every 30 seconds
- **OfflineQueue**: The client-side utility that queues activity log events and failed uploads in localStorage when offline, flushing when connectivity is restored
- **NotificationBatcher**: The utility that groups peer milestone notifications within a 1-hour window and enforces a daily limit of 5 per student
- **ThemeProvider**: The React context provider that manages light/dark/system theme preference and applies CSS custom properties accordingly
- **FERPA**: Family Educational Rights and Privacy Act — US federal law protecting student education records
- **GDPR**: General Data Protection Regulation — EU regulation on data protection and privacy
- **WCAG**: Web Content Accessibility Guidelines — international standard for web accessibility

## Requirements

### SECTION A: Authentication & Authorization

#### Requirement 1: Email/Password Authentication

**User Story:** As a user (Admin, Coordinator, Teacher, or Student), I want to log in with my institutional email and password, so that I can securely access the platform.

##### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE Auth_Module SHALL authenticate the user and issue a JWT session token within 2 seconds.
2. WHEN a user submits invalid credentials 5 times consecutively from the same IP address, THE Auth_Module SHALL lock the account for 15 minutes and log the lockout event to the Audit_Logger.
3. WHEN a user submits invalid credentials, THE Auth_Module SHALL display a generic error message that does not reveal whether the email or password was incorrect.
4. THE Auth_Module SHALL store passwords using Supabase Auth (GoTrue) with bcrypt hashing and enforce a minimum password length of 8 characters.
5. IF the Supabase Auth service is unreachable, THEN THE Auth_Module SHALL display a descriptive error message and retry the request once after 2 seconds.

---

#### Requirement 2: Role-Based Access Control (RBAC)

**User Story:** As an institution, I want each user to have a defined role (admin, coordinator, teacher, student) with enforced data access boundaries, so that sensitive data is isolated per role.

##### Acceptance Criteria

1. THE RBAC_Engine SHALL enforce data isolation via Supabase Row Level Security policies on every database table.
2. WHEN a user with the `student` role attempts to access ILO records, THE RBAC_Engine SHALL deny the request and return an HTTP 403 response.
3. WHEN a user with the `teacher` role queries learning outcomes, THE RBAC_Engine SHALL return only CLOs belonging to courses assigned to that Teacher.
4. WHEN a user with the `coordinator` role queries learning outcomes, THE RBAC_Engine SHALL return only PLOs belonging to programs assigned to that Coordinator, plus all ILOs in the institution.
5. WHEN a user with the `admin` role queries any table, THE RBAC_Engine SHALL return only records belonging to the Admin's institution.

---

#### Requirement 3: Role-Aware Post-Login Redirect

**User Story:** As a user, I want to be redirected to my role-specific dashboard after login, so that I immediately see relevant information.

##### Acceptance Criteria

1. WHEN a user successfully authenticates, THE Platform SHALL redirect the user to their role-specific dashboard path (`/admin`, `/coordinator`, `/teacher`, `/student`) within 500 milliseconds.
2. WHEN an authenticated user navigates directly to a dashboard URL for a different role, THE Platform SHALL redirect the user to their own role dashboard and display an "Access Denied" message.
3. WHEN an unauthenticated user navigates to any protected route, THE Platform SHALL redirect the user to the `/login` page.

---

#### Requirement 4: Session Persistence and Refresh

**User Story:** As a user, I want my session to persist across browser refreshes and tabs, so that I do not need to re-login frequently.

##### Acceptance Criteria

1. THE Auth_Module SHALL persist user sessions across browser refreshes using Supabase's automatic token refresh mechanism.
2. WHILE a user session is active, THE Auth_Module SHALL automatically refresh the JWT token before expiration without user intervention.
3. WHEN a user session has been idle for 8 hours, THE Auth_Module SHALL expire the session and redirect the user to the login page.
4. THE Auth_Module SHALL maintain active sessions for up to 24 hours of continuous use before requiring re-authentication.

---

#### Requirement 5: Password Reset Flow

**User Story:** As a user, I want to reset my password via email if I forget it, so that I can regain access to my account.

##### Acceptance Criteria

1. WHEN a user requests a password reset, THE Auth_Module SHALL send a reset link to the registered email within 60 seconds.
2. THE reset link SHALL expire after 1 hour and be single-use.
3. WHEN a user clicks an expired or already-used reset link, THE Platform SHALL display a descriptive error and offer to resend.

---

### SECTION B: User & Profile Management

#### Requirement 6: Admin User Provisioning

**User Story:** As an Admin, I want to create, view, update, and soft-delete user accounts within my institution, so that I can manage platform access.

##### Acceptance Criteria

1. WHEN an Admin creates a new user, THE Platform SHALL insert a record into the `profiles` table with the specified `full_name`, `email`, `role`, and `institution_id`.
2. WHEN an Admin soft-deletes a user, THE Platform SHALL set `is_active` to `false` on the profile record, preventing login while preserving all historical evidence and grade records.
3. WHEN an Admin updates a user's role, THE Platform SHALL log the change to the Audit_Logger with before/after values.
4. THE Platform SHALL prevent an Admin from deleting or modifying their own admin account.
5. WHEN an Admin views the user list, THE Platform SHALL display all users within the Admin's institution with filtering by role and search by name or email.

---

#### Requirement 7: Bulk User Import

**User Story:** As an Admin, I want to upload a CSV file to bulk-create user accounts, so that I can onboard large numbers of users efficiently.

##### Acceptance Criteria

1. WHEN an Admin uploads a CSV file with columns (`email`, `full_name`, `role`, `program_id`), THE Platform SHALL validate the file format and content before processing.
2. WHEN the CSV contains invalid rows (missing required fields, invalid email format, invalid role, non-existent program_id), THE Platform SHALL reject those rows and display a list of errors with row numbers and descriptions.
3. WHEN the CSV contains valid rows, THE Platform SHALL create all valid user accounts atomically and send email invitations to each created user.
4. IF the CSV file exceeds 1000 rows, THEN THE Platform SHALL reject the upload and display a message indicating the maximum batch size.

---

#### Requirement 8: Profile Management

**User Story:** As any user, I want to update my display name, avatar, and notification preferences, so that my profile reflects my identity.

##### Acceptance Criteria

1. ALL users SHALL be able to update their `full_name`, `avatar_url`, and notification preferences.
2. Avatar uploads SHALL be limited to 2MB (JPG/PNG) and stored in Supabase Storage.
3. Profile updates SHALL be reflected immediately without page refresh.

---

### SECTION C: Program & Course Management

#### Requirement 9: Program Management

**User Story:** As an Admin, I want to create and manage academic programs, so that coordinators can be assigned and PLOs can be scoped.

##### Acceptance Criteria

1. WHEN an Admin creates a program, THE Platform SHALL insert a record into the `programs` table with `name`, `code`, `description`, and `institution_id`.
2. THE Admin SHALL assign a Coordinator to each program via `coordinator_id`.
3. Programs SHALL be listable, editable, and soft-deletable by Admins within their institution.
4. WHEN a program is deleted, THE Platform SHALL block deletion if active courses or PLOs exist under it.

---

#### Requirement 10: Course Management

**User Story:** As a Coordinator, I want to create courses within my program and assign teachers, so that CLOs and assignments can be managed per course.

##### Acceptance Criteria

1. WHEN a Coordinator creates a course, THE Platform SHALL insert a record into the `courses` table with `name`, `code`, `semester`, `academic_year`, `program_id`, and `teacher_id`.
2. Coordinators SHALL only manage courses within programs they are assigned to.
3. Teachers SHALL only see courses assigned to them.
4. Courses SHALL have an `is_active` flag for semester-based activation/deactivation.

---

#### Requirement 11: Student Enrollment

**User Story:** As a Teacher, I want to enroll students into my course sections, so that they can submit assignments and earn grades.

##### Acceptance Criteria

1. WHEN a Teacher enrolls a student, THE Platform SHALL insert a record into `student_courses` with `student_id`, `course_id`, and `status = 'active'`.
2. Students SHALL only see courses they are enrolled in.
3. Teachers SHALL only see students enrolled in their courses.
4. Enrollment status SHALL support `active`, `completed`, and `dropped` states.

---

### SECTION D: OBE Engine

#### Requirement 12: Institutional Learning Outcomes (ILO) Management

**User Story:** As an Admin, I want to create, read, update, and delete Institutional Learning Outcomes, so that I can define the top-level educational goals for my institution.

##### Acceptance Criteria

1. WHEN an Admin creates an ILO, THE Outcome_Manager SHALL insert a record into the `learning_outcomes` table with `type = 'ILO'`, `title` (max 255 characters), `description`, and the Admin's `institution_id`.
2. WHEN an Admin attempts to delete an ILO that has mapped PLOs, THE Outcome_Manager SHALL block the deletion and display the list of dependent PLOs.
3. WHEN an Admin reorders ILOs, THE Outcome_Manager SHALL update the `sort_order` field for all affected records.
4. THE Outcome_Manager SHALL enforce a configurable soft limit of 30 ILOs per institution, displaying a warning when the limit is reached.
5. WHEN an Admin modifies or deletes an ILO, THE Audit_Logger SHALL record the action with before/after snapshots.

---

#### Requirement 13: Program Learning Outcomes (PLO) Management

**User Story:** As a Coordinator, I want to manage PLOs for my program and map them to ILOs, so that program-level outcomes are traceable to institutional goals.

##### Acceptance Criteria

1. WHEN a Coordinator creates a PLO, THE Outcome_Manager SHALL insert a record with `type = 'PLO'`, scoped to the Coordinator's program.
2. PLOs SHALL be mappable to one or more ILOs via `outcome_mappings` with a `weight` (0.0–1.0).
3. THE Platform SHALL warn if the sum of weights for a PLO's ILO mappings is less than 0.5.
4. PLO order SHALL be drag-reorderable.
5. PLO deletion SHALL be blocked if mapped CLOs exist.

---

#### Requirement 14: Course Learning Outcomes (CLO) Management

**User Story:** As a Teacher, I want to manage CLOs for my course, tag them with Bloom's levels, and map them to PLOs, so that course-level outcomes feed into program compliance.

##### Acceptance Criteria

1. WHEN a Teacher creates a CLO, THE Outcome_Manager SHALL insert a record with `type = 'CLO'`, scoped to the Teacher's course.
2. Each CLO SHALL have exactly one Bloom's Taxonomy level assigned (Remembering through Creating).
3. CLOs SHALL be mappable to one or more PLOs via `outcome_mappings`.
4. A CLO SHALL require at least one PLO mapping before it can be linked to an assignment.
5. THE Platform SHALL warn if a CLO has no assignment linkage after 7 days of creation.

---

#### Requirement 15: Rubric Builder

**User Story:** As a Teacher, I want to create rubrics with criteria and performance levels linked to CLOs, so that grading is standardized and evidence is auto-generated.

##### Acceptance Criteria

1. WHEN a Teacher creates a rubric, THE Rubric_Builder SHALL require at least 2 criteria rows and 2 performance level columns.
2. Each rubric SHALL be linked to exactly one CLO.
3. Each cell SHALL have a descriptor and point value; point values SHALL auto-sum into a total score.
4. Rubrics SHALL be saveable as reusable templates across assignments.
5. Rubric templates SHALL be copyable and editable independently.

---

#### Requirement 16: Assignment Creation & CLO Linking

**User Story:** As a Teacher, I want to create assignments linked to CLOs with rubrics, so that student work generates evidence for outcome attainment.

##### Acceptance Criteria

1. WHEN a Teacher creates an assignment, THE Platform SHALL require: title, description, due date, total marks, linked CLO(s) (1–3 with weights summing to 100%), and a linked rubric.
2. Due date SHALL be at least 24 hours in the future at creation time.
3. Late submissions SHALL be accepted up to a configurable window (default 24 hours) with an automatic `is_late` flag.
4. Assignments SHALL be visible only to students enrolled in the course.

---

#### Requirement 17: Student Submission

**User Story:** As a Student, I want to submit assignments before the deadline, so that my work is graded and contributes to my learning outcomes.

##### Acceptance Criteria

1. WHEN a Student submits an assignment, THE Platform SHALL upload the file to Supabase Storage and insert a `submissions` record.
2. Submissions after the due date but within the late window SHALL be flagged as `is_late = true`.
3. Submissions after the late window SHALL be rejected.
4. THE Student SHALL receive a confirmation notification with timestamp upon successful submission.
5. Submission SHALL trigger XP award via the XP_Engine (50 XP on-time, 25 XP if late).

---

#### Requirement 18: Rubric-Based Grading

**User Story:** As a Teacher, I want to grade submissions using the linked rubric, so that scores are standardized and evidence is auto-generated.

##### Acceptance Criteria

1. WHEN a Teacher grades a submission, THE Grading_Module SHALL present the rubric with clickable cells for each criterion × performance level.
2. Selecting cells SHALL auto-calculate the total score and score percentage.
3. THE Teacher SHALL be able to add text feedback per criterion and overall feedback.
4. ON grade submission, THE Evidence_Generator SHALL be triggered automatically.
5. THE grade SHALL be visible to the student immediately via Realtime notification.

---

#### Requirement 19: Automatic Evidence Generation

**User Story:** As the system, I want to auto-create immutable evidence records when a grade is submitted, so that the accreditation audit trail is maintained.

##### Acceptance Criteria

1. ON grade insert, THE Evidence_Generator (Edge Function) SHALL create an `evidence` record linking: `submission_id → CLO → PLO → ILO → attainment_level → score_percent`.
2. Evidence records SHALL be immutable (append-only, no UPDATE or DELETE).
3. Attainment levels SHALL be calculated as: ≥85% Excellent, 70–84% Satisfactory, 50–69% Developing, <50% Not_Yet.
4. Evidence creation SHALL complete within 500ms of grade save.

---

#### Requirement 20: Outcome Attainment Rollup

**User Story:** As the system, I want to aggregate evidence into attainment scores at CLO, PLO, and ILO levels, so that dashboards and reports reflect current performance.

##### Acceptance Criteria

1. THE Rollup_Engine SHALL recalculate `outcome_attainment` within 500ms of new evidence insertion.
2. CLO attainment = average of student evidence scores for that CLO.
3. PLO attainment = weighted average of contributing CLO attainments (weights from `outcome_mappings`).
4. ILO attainment = weighted average of contributing PLO attainments.
5. Attainment SHALL be scoped: `student_course`, `course`, `program`, `institution`.

---

### SECTION E: Gamification / Habit Engine

#### Requirement 21: XP Engine

**User Story:** As a Student, I want to earn XP for learning actions, so that I feel rewarded and can track my progress.

##### Acceptance Criteria

1. THE XP_Engine SHALL award XP per the defined schedule: Daily Login (10), On-time Submission (50), Late Submission (25), Graded Pass (25), Journal Entry (20), Streak Milestones (100/250/500), Perfect Rubric Score (75), Perfect Day Bonus (50), First-Attempt Bonus (25).
2. XP SHALL be credited within 1 second of the trigger action.
3. Every XP change SHALL be logged as an `xp_transactions` record (ledger pattern).
4. `student_gamification.xp_total` SHALL be recalculated as the sum of all transactions on each insert.
5. XP SHALL NOT be manually adjustable by teachers (admin only, with audit trail).

---

#### Requirement 22: Streak System

**User Story:** As a Student, I want my consecutive-day login streak tracked, so that I am motivated to engage daily.

##### Acceptance Criteria

1. THE Streak_Tracker SHALL increment `streak_current` when a student logs in on consecutive calendar days.
2. Missing a day SHALL reset `streak_current` to 0.
3. `streak_longest` SHALL always reflect the historical maximum.
4. Streak milestones (7, 30, 100 days) SHALL trigger badge awards and XP bonuses.

---

#### Requirement 23: Badge System

**User Story:** As a Student, I want to earn badges for milestones, so that I have visible achievements on my profile.

##### Acceptance Criteria

1. THE Badge_System SHALL award badges per the defined catalog: First Flame, Homework Hero, 7-Day Warrior, 30-Day Legend, Bullseye, Deep Thinker, Level 5 Pioneer, Level 10 Elite, Top 10%, Speed Demon (mystery — submit 3 assignments within 24 hours), Night Owl (mystery — submit between midnight and 5 AM), Perfectionist (mystery — 100% on 3 consecutive rubric-graded assignments).
2. Badge awards SHALL be atomic and idempotent (cannot be awarded twice for the same trigger).
3. Badge award SHALL trigger an animated modal notification.
4. Badges SHALL be permanently visible on the student's profile.

---

#### Requirement 24: Level System

**User Story:** As a Student, I want to level up as I accumulate XP, so that I can see my long-term progression.

##### Acceptance Criteria

1. THE Level_System SHALL calculate level from cumulative XP using defined thresholds (Level 1: 0 XP through Level 20: Grandmaster).
2. Level-up SHALL trigger a full-screen animation and a badge award.
3. Level SHALL be displayed on the student profile card and leaderboard.

---

#### Requirement 25: Leaderboard

**User Story:** As a Student, I want to see how I rank against peers, so that I am motivated by healthy competition.

##### Acceptance Criteria

1. THE Leaderboard_Service SHALL display weekly and all-time top 50 students by XP.
2. Leaderboard SHALL be filterable by: My Course, My Program, All Students.
3. The student's own rank SHALL always be shown even if outside top 50.
4. Leaderboard SHALL update in real time via Supabase Realtime.
5. Students SHALL be able to opt out of leaderboard visibility (shown as "Anonymous").

---

#### Requirement 26: Reflection Journal

**User Story:** As a Student, I want to write reflection entries linked to my CLO progress, so that I practice metacognitive learning.

##### Acceptance Criteria

1. Students SHALL write journal entries linked to a course and CLO.
2. THE Platform SHALL generate contextual prompts based on the most recently graded CLO.
3. Journal entries SHALL have a minimum of 100 words (client-side enforced).
4. Entries SHALL be private by default; students can opt to share with their teacher.
5. Journal submission SHALL award 20 XP (once per day).

---

### SECTION F: Dashboards & Analytics

#### Requirement 27: Admin Dashboard

**User Story:** As an Admin, I want a comprehensive dashboard showing system health and institution-wide metrics, so that I can monitor the platform.

##### Acceptance Criteria

1. THE Admin Dashboard SHALL display: system health status, total active users by role, institution-wide PLO attainment heatmap, recent activity feed, top-performing programs.
2. Dashboard data SHALL be max 30 seconds stale (cached with auto-refresh).
3. All charts SHALL be drill-down capable.

---

#### Requirement 28: Coordinator Dashboard

**User Story:** As a Coordinator, I want to see program-level compliance and curriculum coverage, so that I can identify gaps.

##### Acceptance Criteria

1. THE Coordinator Dashboard SHALL display: PLO attainment matrix, CLO coverage by course, teacher compliance rate, at-risk student count.
2. THE Curriculum_Matrix SHALL show rows = PLOs, columns = courses, cells = CLO coverage with color coding (Green >70%, Yellow 50–70%, Red <50%, Gray no CLO).
3. Matrix SHALL be click-through to evidence detail and exportable as CSV.

---

#### Requirement 29: Teacher Dashboard

**User Story:** As a Teacher, I want to see my grading queue and student performance, so that I can prioritize my work.

##### Acceptance Criteria

1. THE Teacher Dashboard SHALL display: grading queue (pending submissions), course-level CLO attainment chart, student performance heatmap, Bloom's distribution, at-risk student list.
2. At-risk criteria: student not logged in for 7+ days OR <50% attainment on ≥2 CLOs.
3. Grading queue SHALL update in real time.
4. Teacher SHALL be able to send nudge notifications from the at-risk list.

---

#### Requirement 30: Student Dashboard

**User Story:** As a Student, I want a gamified dashboard showing my progress, streaks, and upcoming work, so that I stay engaged.

##### Acceptance Criteria

1. THE Student Dashboard SHALL display: welcome hero card (XP, Level, Streak), learning path visualization, upcoming deadlines, habit tracker, recent badges, leaderboard position.
2. Dashboard SHALL load in <1.5s on 4G.
3. XP and streak SHALL update in real time.
4. Deadline widget SHALL be color-coded: red <24h, yellow <72h, green >72h.
5. THE Student Dashboard SHALL include a CLO Attainment Progress section showing per-CLO progress bars with Bloom's level badges and attainment percentages for each enrolled course (see Requirement 44).
6. THE Student Dashboard SHALL include an XP Transaction History link/section showing recent XP earnings with source descriptions (see Requirement 45).

---

### SECTION G: Notifications & Realtime

#### Requirement 31: Notification Center

**User Story:** As any user, I want in-app notifications for important events, so that I stay informed.

##### Acceptance Criteria

1. THE Notification_Service SHALL deliver notifications within 5 seconds of trigger event.
2. Notification types: grade released, new assignment, badge earned, streak at risk, at-risk student alert, peer milestone, perfect day nudge.
3. In-app notification bell SHALL show unread count.
4. Mark-all-read action SHALL be available.
5. Notifications SHALL persist for 30 days.

---

#### Requirement 32: Realtime Updates

**User Story:** As a user, I want live updates on dashboards without refreshing, so that I always see current data.

##### Acceptance Criteria

1. THE Platform SHALL use Supabase Realtime subscriptions for: leaderboard changes, new grades, streak status, notification delivery.
2. Realtime updates SHALL be delivered within 2 seconds of the triggering event.
3. Realtime subscriptions SHALL be scoped per user role and institution.

---

### SECTION H: Reporting & Export

#### Requirement 33: Accreditation Report Export

**User Story:** As an Admin, I want to export PDF reports showing PLO/ILO attainment, so that I can submit evidence to accreditation bodies.

##### Acceptance Criteria

1. THE Report_Generator SHALL produce PDF reports including: institution header/logo, program name, semester, per-PLO attainment %, evidence count, Bloom's distribution chart.
2. PDF SHALL be generated within 10 seconds via Edge Function using a lightweight HTML-to-PDF approach (e.g., `jspdf` + `jspdf-autotable` or `@react-pdf/renderer`). Puppeteer SHALL NOT be used due to cold-start constraints in Edge Functions.
3. Report template SHALL be configurable per accreditation body (ABET, HEC, AACSB, Generic).
4. Generated reports SHALL be stored in Supabase Storage and downloadable.

---

### SECTION I: Audit & Compliance

#### Requirement 34: Audit Logging

**User Story:** As an Admin, I want all administrative actions logged immutably, so that the institution has a complete audit trail.

##### Acceptance Criteria

1. ALL admin mutations (create, update, delete) on `profiles`, `learning_outcomes`, `programs`, `courses` SHALL produce an `audit_logs` record.
2. Each log SHALL contain: `actor_id`, `action`, `target_type`, `target_id`, `diff` (before/after JSON), `ip_address`, `created_at`.
3. `audit_logs` SHALL be append-only (no UPDATE or DELETE policies).
4. Only Admins SHALL be able to read audit logs (RLS enforced).

---

#### Requirement 35: Daily Habit Tracker

**User Story:** As a Student, I want a 7-day habit grid tracking 4 daily habits (Login, Submit, Journal, Read), so that I can visualize my self-regulation consistency (Pillar 3 — Fogg Behavior Model, Pillar 6 — Self-Regulated Learning).

##### Acceptance Criteria

1. THE Habit_Tracker SHALL track 4 daily habits: Login (automatic on auth), Submit (on assignment submission), Journal (on journal entry save), Read (view assignment detail or CLO progress page for ≥30 seconds — see Requirement 61 for full definition).
2. WHEN a Student completes all 4 habits in a single calendar day, THE XP_Engine SHALL award a Perfect Day Bonus of 50 XP.
3. THE Habit_Tracker SHALL display a 7-day grid with color-coded cells (green = completed, gray = missed) on the Student Dashboard.
4. THE Habit_Tracker SHALL store habit data in a `habit_logs` table with `student_id`, `date`, `habit_type`, and `completed_at` columns.

---

#### Requirement 36: Variable Rewards & Bonus XP Events

**User Story:** As a Student, I want occasional surprise rewards and bonus events, so that engagement remains unpredictable and exciting (Pillar 4 — Hooked Model, Variable Rewards phase).

##### Acceptance Criteria

1. THE XP_Engine SHALL award a First-Attempt Bonus of 25 XP when a Student passes an assignment on the first submission (score ≥ 50%).
2. THE XP_Engine SHALL award a Perfect Rubric Bonus of 75 XP when a Student scores 100% on all rubric criteria.
3. THE Platform SHALL support admin-configurable "Bonus XP Weekend" events that multiply all XP awards by a configurable factor (default 2×) for a defined time window, stored in a `bonus_xp_events` table.
4. THE Badge_System SHALL support mystery badges with hidden unlock conditions that are not displayed to Students until earned.

---

#### Requirement 37: Learning Path with Bloom's-Gated Nodes

**User Story:** As a Student, I want assignments organized as a learning path where advanced tasks unlock based on my demonstrated competence, so that I stay in the flow zone (Pillar 9 — Flow Theory, Pillar 5 — Octalysis Core Drive 3: Empowerment of Creativity).

##### Acceptance Criteria

1. THE Platform SHALL display assignments within a course as a sequential Learning Path, ordered by Bloom's level (Remembering → Creating).
2. WHEN a Teacher creates or edits an assignment, THE Platform SHALL allow setting prerequisite gates: "Requires CLO-X attainment ≥ Y%" before the assignment becomes visible and submittable to Students.
3. WHILE a Student has not met the prerequisite for a gated assignment, THE Platform SHALL show the assignment as a locked node with a tooltip explaining the prerequisite condition.
4. WHEN a Student meets the prerequisite for a gated assignment, THE Platform SHALL unlock the node with an animation and send an in-app notification.

---

#### Requirement 38: Bloom's Verb Guide in CLO Builder

**User Story:** As a Teacher, I want suggested action verbs when creating CLOs, so that I align my outcomes to the correct Bloom's level (Pillar 1 — Bloom's Taxonomy Integration).

##### Acceptance Criteria

1. WHEN a Teacher selects a Bloom's level in the CLO builder, THE Platform SHALL display a list of suggested action verbs for that level.
2. THE Platform SHALL provide the following verb lists: Remembering (define, list, recall, identify, state, name), Understanding (explain, describe, classify, summarize, paraphrase), Applying (use, implement, execute, solve, demonstrate, construct), Analyzing (compare, differentiate, examine, break down, infer), Evaluating (judge, critique, defend, argue, assess, recommend), Creating (design, develop, compose, build, formulate, produce).
3. WHEN a Teacher clicks a suggested verb, THE Platform SHALL insert the verb into the CLO title field at the cursor position.

---

### SECTION G: Notifications & Realtime (continued)

#### Requirement 39: Email Notifications

**User Story:** As a user, I want email notifications for critical events, so that I stay informed even when not logged in (Pillar 4 — Hooked Model, External Trigger phase).

##### Acceptance Criteria

1. THE Notification_Service SHALL send email notifications via Resend for the following events: streak risk (8 PM if no login that day), weekly summary (Monday 8 AM), new assignment posted, grade released, bulk import invitation.
2. WHEN a Student configures email notification preferences, THE Platform SHALL allow opt-out per notification type in the profile settings page.
3. THE Platform SHALL store email notification preferences in an `email_preferences` jsonb column on the `profiles` table, defaulting to all notifications enabled for new users.
4. THE Platform SHALL handle email delivery via Edge Functions using the Resend API.
5. IF the Resend API is unreachable, THEN THE Notification_Service SHALL retry delivery up to 3 times with exponential backoff and log the failure.

---

#### Requirement 40: Contextual Journal Prompt Generation

**User Story:** As a Student, I want dynamically generated reflection prompts anchored to my most recent graded CLO, so that my reflection is meaningful and specific (Pillar 7 — Kolb's Experiential Learning Cycle, Pillar 6 — Self-Regulated Learning).

##### Acceptance Criteria

1. WHEN a Student opens the Journal Editor after receiving a grade, THE Platform SHALL generate a contextual prompt using: the CLO title, Bloom's level, attainment level achieved, and the teacher's rubric feedback summary.
2. THE generated prompt SHALL include 3–4 reflection questions aligned to Kolb's Experiential Learning Cycle: "What did you understand?", "Where did you struggle?", "What would you do differently?", "How does this connect to real work?".
3. WHEN a Student dismisses the generated prompt, THE Platform SHALL allow the Student to write freely without the prompt.
4. THE Platform SHALL store the generated prompt text alongside the journal entry for future AI training data.

---

### SECTION J: AI Co-Pilot Data Foundation (Phase 2 Prep)

#### Requirement 41: AI Data Collection Foundation

**User Story:** As the system, I want to collect behavioral and learning signals from day one, so that the AI Co-Pilot (Phase 2) has training data when it launches (Pillar 10 — AI Co-Pilot Foundation).

##### Acceptance Criteria

1. THE Activity_Logger SHALL log all student behavioral events to a `student_activity_log` table including: login timestamps, page views, submission timing patterns, journal frequency, and streak breaks.
2. THE Platform SHALL create an `ai_feedback` table schema (with columns: `id`, `student_id`, `suggestion_type`, `suggestion_text`, `feedback` (thumbs_up/thumbs_down), `created_at`) for Phase 2 AI Co-Pilot feedback collection.
3. THE Platform SHALL compute and store at-risk signals: days since last login, CLO attainment trend direction (improving/declining/stagnant), and submission timing patterns (early/on-time/late/missed).
4. THE `student_activity_log` table SHALL be append-only (no UPDATE or DELETE policies) to preserve data integrity for AI training.

---

### SECTION K: Social & Motivational Triggers

#### Requirement 42: Peer Milestone Notifications

**User Story:** As a Student, I want to see when my classmates level up, so that I feel motivated by social influence and healthy competition (Pillar 7/8 — Octalysis Drive 5: Social Influence & Relatedness).

##### Acceptance Criteria

1. WHEN a Student levels up, THE Notification_Service SHALL create an in-app notification for all peers enrolled in the same course(s): "Your classmate [full_name] just hit Level [X]!"
2. WHEN a Student earns a rare badge (30-Day Legend, 100-Day streak, or any mystery badge), THE Notification_Service SHALL create a peer milestone notification for course peers: "[full_name] just earned the [badge_name] badge!"
3. WHEN a Student reaches a streak milestone (7, 30, or 100 days), THE Notification_Service SHALL create a peer milestone notification for course peers: "[full_name] is on a [X]-day streak!"
4. THE notification SHALL be scoped to course-level peers only (students sharing at least one active course enrollment).
5. THE notification SHALL be delivered within 5 seconds of the triggering event via Supabase Realtime.
6. Students who have opted out of leaderboard visibility (anonymous mode) SHALL NOT trigger peer milestone notifications.

---

#### Requirement 43: Perfect Day Prompt Notification

**User Story:** As a Student, I want a nudge at 6 PM if I'm close to completing all 4 daily habits, so that I'm encouraged to finish my Perfect Day (Pillar 6 — BJ Fogg Behavior Model, Ability + Motivation trigger).

##### Acceptance Criteria

1. AT 6 PM daily (institution timezone), THE Notification_Service SHALL check each active student's habit completion for the current day.
2. IF a Student has completed exactly 3 of 4 habits, THEN THE Notification_Service SHALL send an in-app notification: "You're 1 habit away from a Perfect Day! ✨ Complete your [missing_habit] to earn 50 bonus XP."
3. THE notification SHALL identify the specific missing habit (Login, Submit, Journal, or Read) in the message.
4. THE cron job SHALL be implemented via pg_cron scheduled at `0 18 * * *` invoking an Edge Function.
5. Students who have already completed all 4 habits SHALL NOT receive the notification.

---

### SECTION F: Dashboards & Analytics (continued)

#### Requirement 44: Student CLO Progress Dashboard

**User Story:** As a Student, I want to see my per-CLO attainment with Bloom's level color coding, so that I can monitor my learning progress and identify gaps (Pillar 5 — Self-Regulated Learning, Monitoring Zone / Metacognitive Mirror).

##### Acceptance Criteria

1. THE Student Dashboard SHALL display a "CLO Progress" section showing per-CLO attainment bars for each enrolled course.
2. Each CLO entry SHALL display: CLO title, Bloom's level pill (color-coded per design system), attainment percentage bar (color-coded by attainment level), and attainment level label (Excellent/Satisfactory/Developing/Not Yet).
3. CLO attainment data SHALL be sourced from the `outcome_attainment` table scoped to `student_course`.
4. THE CLO Progress section SHALL update in real time when new grades are released.
5. WHEN a Student clicks a CLO entry, THE Platform SHALL expand to show contributing evidence records (assignment name, score, date).

---

#### Requirement 45: XP Transaction History

**User Story:** As a Student, I want to view my XP transaction log, so that I can reflect on what actions earned me XP and when (Pillar 5 — Self-Regulated Learning, Reflection Zone).

##### Acceptance Criteria

1. THE Platform SHALL provide an XP Transaction History view accessible from the Student Dashboard or Profile page.
2. THE view SHALL display each transaction with: source label (e.g., "On-time Submission", "Daily Login", "Streak Milestone"), XP amount (with + prefix), timestamp, and reference description (e.g., assignment title).
3. THE view SHALL be filterable by time period: Today, This Week, This Month, All Time.
4. THE view SHALL show a running total and a summary of XP earned per source category.
5. XP transaction data SHALL be sourced from the `xp_transactions` table filtered by `student_id`.

---

### SECTION L: AI Co-Pilot

#### Requirement 46: AI Co-Pilot — Personalized Module Suggestion

**User Story:** As a Student, I want AI-powered suggestions that identify my CLO gaps and recommend what to focus on next, so that I receive personalized learning guidance (Pillar 4 — AI Co-Pilot, Capability 1).

##### Acceptance Criteria

1. THE AI Co-Pilot SHALL analyze a Student's CLO attainment profile to identify CLOs with attainment below 70% (Developing or Not Yet).
2. THE AI Co-Pilot SHALL surface targeted suggestions on the Student Dashboard: e.g., "Before you tackle CLO-4 (Analyzing), strengthen your CLO-3 (Applying) skills — your attainment is at 55%."
3. THE AI Co-Pilot SHALL use historical cohort data for social proof: e.g., "Students who improved CLO-3 before attempting CLO-4 scored 34% higher."
4. Suggestions SHALL be generated by an Edge Function (`ai-module-suggestion`) that queries `outcome_attainment`, `learning_outcomes`, and historical `evidence` data.
5. Each suggestion SHALL be stored in the `ai_feedback` table with `suggestion_type = 'module_suggestion'`.
6. Students SHALL be able to provide thumbs up/down feedback on each suggestion, stored in the `ai_feedback.feedback` column.

---

#### Requirement 47: AI Co-Pilot — At-Risk Early Warning

**User Story:** As a Teacher, I want AI-powered predictions of which students are likely to fail a CLO, so that I can intervene early (Pillar 4 — AI Co-Pilot, Capability 2).

##### Acceptance Criteria

1. THE AI Co-Pilot SHALL monitor behavioral signals per student: login frequency (from `student_activity_log`), submission timing patterns, CLO attainment trends (from `outcome_attainment`).
2. THE AI Co-Pilot SHALL predict which students are likely to fail a CLO ≥7 days before the next assignment due date for that CLO.
3. Predictions SHALL be surfaced on the Teacher Dashboard in an "AI At-Risk Students" widget showing: student name, at-risk CLO, probability score (0–100%), contributing signals.
4. THE Teacher SHALL be able to send a personalized nudge notification to the at-risk student with one click from the widget.
5. Predictions SHALL be generated by an Edge Function (`ai-at-risk-prediction`) invoked via pg_cron nightly.
6. Each prediction SHALL be stored in the `ai_feedback` table with `suggestion_type = 'at_risk_prediction'` for validation against actual grades.

---

#### Requirement 48: AI Co-Pilot — Feedback Draft Generation

**User Story:** As a Teacher, I want AI-generated draft rubric feedback when grading, so that I can provide detailed feedback faster (Pillar 4 — AI Co-Pilot, Capability 3).

##### Acceptance Criteria

1. WHEN a Teacher opens a graded submission in the Grading Interface, THE AI Co-Pilot SHALL generate draft feedback comments for each rubric criterion.
2. THE draft feedback SHALL be based on: the rubric criteria descriptions, the selected performance level for each criterion, the student's historical feedback patterns, and the CLO context.
3. THE Teacher SHALL be able to edit, accept, or reject each draft comment before it reaches the student.
4. Draft generation SHALL be performed by an Edge Function (`ai-feedback-draft`) invoked on-demand when the teacher clicks "Generate AI Draft".
5. THE Platform SHALL clearly label AI-generated feedback as "AI Draft" until the teacher confirms it.
6. Accepted and rejected drafts SHALL be logged in the `ai_feedback` table with `suggestion_type = 'feedback_draft'` for model improvement.

---

#### Requirement 49: AI Feedback Flywheel

**User Story:** As the system, I want to collect feedback on every AI suggestion and validate predictions against outcomes, so that the AI Co-Pilot improves over time (Pillar 4 — Data Flywheel).

##### Acceptance Criteria

1. Every AI module suggestion (Req 46) SHALL collect thumbs up/down feedback from students.
2. Every at-risk prediction (Req 47) SHALL be validated against actual grades when the assignment is graded — storing `validated_outcome` (correct/incorrect) in the `ai_feedback` record.
3. Every feedback draft (Req 48) SHALL track acceptance rate (accepted/edited/rejected) per teacher.
4. THE `ai_feedback` table SHALL support the following `suggestion_type` values: `module_suggestion`, `at_risk_prediction`, `feedback_draft`.
5. THE Platform SHALL provide an Admin-visible "AI Performance" summary showing: suggestion acceptance rate, prediction accuracy rate, and feedback draft acceptance rate.

---

### SECTION N: Seed Data & Development Infrastructure

#### Requirement 54: Seed Data Generation for AI Co-Pilot

**User Story:** As a developer, I want to seed the database with 50 realistic student profiles and 3–4 months of simulated activity data, so that the AI Co-Pilot has meaningful behavioral data to work with during development and testing.

##### Acceptance Criteria

1. THE Platform SHALL provide a seed data script (Edge Function or SQL) that creates 50 student profiles with realistic names, emails, and enrollments across multiple courses.
2. THE seed script SHALL generate realistic submissions with varying scores and timing patterns (early, on-time, late, missed) spanning 3–4 months of simulated activity.
3. THE seed script SHALL generate realistic grade records with rubric selections, evidence records, and outcome_attainment records at CLO, PLO, and ILO levels.
4. THE seed script SHALL generate realistic XP transactions, streak records, badges, journal entries, and habit_logs with varying completion patterns.
5. THE seed script SHALL generate realistic student_activity_log entries (logins, page views, submissions, journal entries) with timestamps distributed across the 3–4 month window.
6. THE seed data SHALL include at least 10 "at-risk" students (low login frequency, declining attainment), 15 "high performers" (daily logins, high scores, long streaks), and 25 "average" students (mixed patterns).
7. THE seed script SHALL be idempotent — running it twice should not create duplicate data.
8. THE seed data SHALL be scoped to a single institution and use the existing table structure without schema changes.

---

### SECTION M: Non-Functional Requirements

#### Requirement 50: Performance

**User Story:** As a user, I want the platform to respond quickly and handle concurrent usage, so that my experience is never degraded by system load.

##### Acceptance Criteria

1. THE Student Dashboard SHALL load in ≤1.5 seconds on a 4G connection with cold cache.
2. THE Evidence_Generator SHALL complete evidence creation and attainment rollup within 500ms of grade submission.
3. THE Platform SHALL support 5,000 concurrent active users without performance degradation.
4. API read query response time SHALL be ≤300ms at the 95th percentile.
5. THE Leaderboard SHALL update in real time within 2 seconds of XP changes via Supabase Realtime.

---

#### Requirement 51: Security & Compliance

**User Story:** As an institution, I want the platform to meet data protection and security standards, so that student data is protected and we comply with regulations.

##### Acceptance Criteria

1. THE Platform SHALL comply with FERPA and GDPR data protection requirements including data classification, deletion workflows, and DPA agreements.
2. Row Level Security SHALL be enabled and enforced on ALL database tables with no exceptions.
3. ALL user inputs SHALL be validated via Zod schemas on both client and server (Edge Functions).
4. Auth endpoints SHALL be rate-limited to 5 login attempts per 15 minutes per IP address.
5. No Personally Identifiable Information (PII) SHALL appear in server logs.
6. File uploads SHALL be validated for MIME type and limited to 50MB per file.
7. Dependency vulnerability scanning SHALL be automated via GitHub Dependabot.

---

#### Requirement 52: Accessibility & Usability

**User Story:** As a user with disabilities, I want the platform to be accessible, so that I can use all features regardless of my abilities.

##### Acceptance Criteria

1. THE Platform SHALL target WCAG 2.1 AA compliance for all core learning flows.
2. ALL interactive elements SHALL be keyboard navigable.
3. Color contrast ratio SHALL be ≥4.5:1 for all body text.
4. THE Platform SHALL be responsive from 360px to 1440px viewport widths.
5. THE Platform SHALL honor `prefers-reduced-motion` for all animations.
6. THE Platform SHALL support i18n architecture (English first, Urdu/Arabic Phase 2).

---

#### Requirement 53: Reliability & Observability

**User Story:** As an institution, I want the platform to be reliable and monitored, so that issues are detected and resolved quickly.

##### Acceptance Criteria

1. THE Platform SHALL target 99.9% uptime (≤8.7 hours downtime per year).
2. Recovery Time Objective (RTO) SHALL be <4 hours; Recovery Point Objective (RPO) SHALL be <1 hour.
3. Frontend errors SHALL be tracked via Sentry with Slack alerting.
4. AI Co-Pilot features SHALL degrade gracefully — core OBE and grading flows SHALL never be blocked by AI failures.
5. Supabase Realtime connections SHALL auto-reconnect with exponential backoff on disconnection.

---

#### Requirement 55: CI/CD Pipeline

**User Story:** As a development team, I want an automated CI/CD pipeline, so that every code change is validated and deployed consistently.

##### Acceptance Criteria

1. THE Platform SHALL have a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every push to `main` and on every pull request.
2. THE CI pipeline SHALL execute: ESLint linting, TypeScript type checking (`tsc --noEmit`), unit tests (`vitest --run`), and production build (`vite build`).
3. THE pipeline SHALL deploy to Vercel: production deployment on merge to `main`, preview deployment on pull request.
4. THE pipeline SHALL fail and block merge if any step fails.

---

#### Requirement 56: Health Check & Uptime Monitoring

**User Story:** As an operations team, I want a health check endpoint and uptime monitoring, so that service outages are detected and alerted within minutes.

##### Acceptance Criteria

1. THE Platform SHALL expose a health check Edge Function (`/functions/v1/health`) that returns HTTP 200 with a JSON payload including: status, database connectivity, timestamp.
2. THE health check SHALL verify database connectivity by executing a lightweight query.
3. THE Platform SHALL document integration with an uptime monitoring service (BetterUptime or Checkly) for alerting on downtime.

---

#### Requirement 57: Load Testing

**User Story:** As a development team, I want load test scripts for critical paths, so that we can validate performance under realistic concurrent usage.

##### Acceptance Criteria

1. THE Platform SHALL include k6 load test scripts for critical paths: login flow, assignment submission, grading pipeline, and leaderboard queries.
2. Load tests SHALL simulate the target of 5,000 concurrent users (Requirement 50.3).
3. Load test results SHALL validate the p95 response time target of ≤300ms (Requirement 50.4).


---

### SECTION O: Platform Enhancements & Resilience

#### Requirement 58: Student Learning Portfolio Page

**User Story:** As a Student, I want a unified portfolio page that showcases all my learning achievements, so that I can see my cumulative progress and optionally share it publicly (Pillar 7 — Hooked Model, Investment phase).

##### Acceptance Criteria

1. THE Platform SHALL provide a Student Learning Portfolio page at `/student/portfolio` displaying: all CLOs mastered across all courses with attainment levels, complete badge collection with earn dates, journal entry history with CLO links, XP timeline chart (cumulative XP over time), and attainment growth over semesters.
2. THE Portfolio page SHALL display CLO mastery grouped by course, with each CLO showing its Bloom's level pill and attainment level color coding.
3. THE Portfolio page SHALL include a cumulative XP timeline chart (Recharts line chart) showing XP growth over the student's enrollment period.
4. THE Portfolio page SHALL include an attainment growth section comparing semester-over-semester attainment averages.
5. THE Platform SHALL allow students to opt in to a shareable public profile link from the Portfolio page, stored as `portfolio_public` boolean column on the `profiles` table (default false).
6. WHEN a student enables the public profile link, THE Platform SHALL generate a unique shareable URL (`/portfolio/:student_id`) accessible without authentication, displaying only non-sensitive portfolio data (badges, CLO attainment levels, XP total, level).

---

#### Requirement 59: Streak Freeze (Purchasable with XP)

**User Story:** As a Student, I want to purchase a Streak Freeze using my XP, so that I can protect my streak from a single missed day (Octalysis Drive 8 — Loss & Avoidance recovery mechanism).

##### Acceptance Criteria

1. THE Platform SHALL allow students to purchase a Streak Freeze for 200 XP from their XP balance.
2. THE Platform SHALL store Streak Freeze inventory in the `student_gamification` table via a `streak_freezes_available` integer column (default 0).
3. THE Platform SHALL enforce a maximum of 2 Streak Freezes held at once per student.
4. WHEN a student misses a day and has `streak_freezes_available > 0`, THE Streak_Tracker SHALL consume one Streak Freeze instead of resetting the streak, decrementing `streak_freezes_available` by 1.
5. THE Streak Freeze purchase SHALL be logged as an `xp_transactions` record with a negative `xp_amount` of -200 and `source = 'streak_freeze_purchase'`.
6. WHEN a student attempts to purchase a Streak Freeze with insufficient XP balance, THE Platform SHALL reject the purchase and display a descriptive message.

---

#### Requirement 60: Onboarding Flows (All Roles)

**User Story:** As a new user of any role, I want a guided onboarding experience tailored to my role, so that I can quickly understand the platform and start using it effectively.

##### Acceptance Criteria

1. WHEN an Admin logs in for the first time, THE Platform SHALL present a guided setup wizard with a progress stepper: Create ILOs → Create Programs → Invite Coordinators → Invite Teachers.
2. WHEN a Coordinator logs in for the first time, THE Platform SHALL present a welcome tour showing program management, PLO mapping, and the curriculum matrix.
3. WHEN a Teacher logs in for the first time, THE Platform SHALL present a welcome tour showing course setup, CLO creation, rubric builder, and grading queue.
4. WHEN a Student logs in for the first time, THE Platform SHALL present an interactive welcome tour explaining XP, streaks, habits, learning path, and badges, and SHALL award 50 XP "Welcome Bonus" on tour completion.
5. THE Platform SHALL display a "Quick Start" checklist on each role's dashboard that persists until all checklist items are completed.
6. THE Platform SHALL store onboarding completion status in the `profiles` table via an `onboarding_completed` boolean column (default false).
7. WHEN a user completes all onboarding steps, THE Platform SHALL set `onboarding_completed` to true and hide the Quick Start checklist.

---

#### Requirement 61: Read Habit Definition (Achievable from Day One)

**User Story:** As a Student, I want the "Read" habit to be achievable from day one without Phase 2 content engagement, so that I can complete a Perfect Day (4/4 habits) immediately.

##### Acceptance Criteria

1. THE Habit_Tracker SHALL define the "Read" habit as: viewing an assignment detail page OR the CLO progress page for 30 seconds or more.
2. THE Platform SHALL track view duration via a client-side timer that starts when the student opens an assignment detail page or CLO progress page, and logs a `read` habit completion when the timer reaches 30 seconds.
3. THE Activity_Logger SHALL log `assignment_view` and `page_view` events with a `duration_seconds` metadata field.
4. WHEN a student accumulates 30 seconds of viewing time on a qualifying page within a single calendar day, THE Habit_Tracker SHALL mark the "Read" habit as completed for that day.

---

#### Requirement 62: Dark Mode Foundation

**User Story:** As a user, I want to switch between light and dark mode, so that I can use the platform comfortably in different lighting conditions.

##### Acceptance Criteria

1. THE Platform SHALL structure all color tokens as CSS custom properties that support light and dark mode switching.
2. THE Platform SHALL provide a theme toggle in the user profile settings page.
3. THE Platform SHALL store theme preference in the `profiles` table via a `theme_preference` text column (default 'system', allowed values: 'light', 'dark', 'system').
4. WHEN theme preference is set to 'system', THE Platform SHALL respect the `prefers-color-scheme` media query to determine the active theme.
5. THE Platform SHALL define dark mode surface colors: background `slate-950`, card `slate-900`, border `slate-700`, text `slate-100`.
6. THE Platform SHALL apply the selected theme immediately without page refresh.

---

#### Requirement 63: Offline Resilience & Draft Saving

**User Story:** As a Student, I want my work to be preserved when I lose connectivity, so that I do not lose progress on journal entries or submissions.

##### Acceptance Criteria

1. THE Platform SHALL auto-save journal entry drafts to localStorage every 30 seconds while the student is editing.
2. THE Submission form SHALL persist file selection and form state to localStorage until a successful upload completes.
3. WHEN a network error occurs during submission upload, THE Platform SHALL queue the upload and retry automatically when connectivity is restored, with a maximum of 3 retries.
4. THE Platform SHALL use TanStack Query optimistic updates for XP display and streak counter to provide immediate visual feedback.
5. THE Activity_Logger SHALL queue events in localStorage when the browser is offline (detected via `navigator.onLine` and `online`/`offline` events) and flush the queue when connectivity is restored.

---

#### Requirement 64: Student Data Export (GDPR Compliance)

**User Story:** As a Student, I want to export all my personal data as a JSON or CSV download, so that I can exercise my data portability rights under GDPR.

##### Acceptance Criteria

1. THE Platform SHALL provide a "Download My Data" button on the Student Profile page.
2. THE export SHALL include: profile information, grade history, CLO attainment records, XP transaction log, journal entries, badge collection, and habit logs.
3. THE export SHALL be generated via an Edge Function (`export-student-data`) that queries all student-scoped tables and packages the result as JSON or CSV.
4. THE export generation SHALL complete within 30 seconds.
5. THE export SHALL be available in both JSON and CSV formats, selectable by the student before download.

---

#### Requirement 65: Notification Batching & Rate Limiting

**User Story:** As a Student, I want notifications to be grouped and rate-limited, so that I am not overwhelmed by excessive alerts.

##### Acceptance Criteria

1. THE Notification_Service SHALL batch peer milestone notifications: if multiple peers achieve milestones within a 1-hour window, THE Notification_Service SHALL group them into a single notification (e.g., "3 classmates leveled up today!").
2. THE Notification_Service SHALL enforce a maximum of 5 peer milestone notifications per student per 24-hour period.
3. THE Notification Center SHALL group notifications by type when more than 3 of the same type exist (e.g., "5 new grades released" instead of 5 separate notifications).
4. THE Platform SHALL provide a "Notification Digest" option in student notification preferences: receive a single daily summary at 8 PM instead of individual notifications throughout the day.
5. THE Platform SHALL store the digest preference in the `profiles.email_preferences` jsonb column.

---

#### Requirement 66: ErrorState Component & Upload Progress

**User Story:** As a user, I want clear error states and upload progress indicators, so that I understand what went wrong and can recover gracefully.

##### Acceptance Criteria

1. THE Platform SHALL provide a reusable ErrorState component for all error scenarios displaying: an error icon, a descriptive message, a retry button, and optional fallback content.
2. THE Platform SHALL display file upload progress with a progress bar showing percentage complete.
3. WHEN a file upload fails, THE Platform SHALL show the ErrorState component with a "Retry Upload" button that restarts the upload.
4. WHEN a Supabase Realtime connection disconnects, THE Platform SHALL display a "Live updates paused — Reconnecting..." banner until the connection is restored.

---

#### Requirement 67: Teacher Grading Stats

**User Story:** As a Teacher, I want to see my grading statistics, so that I can monitor my grading velocity and maintain a consistent grading cadence.

##### Acceptance Criteria

1. THE Teacher Dashboard SHALL include a "Grading Stats" card displaying: total submissions graded this week, average grading time per submission, pending submissions count, and grading velocity trend (submissions per day over the last 30 days).
2. THE Platform SHALL calculate grading time as the duration from when a teacher opens a submission to when the teacher submits the grade, tracked via the Activity_Logger with `grading_start` and `grading_end` event types.
3. THE Grading Stats card SHALL include a "Grading Streak" counter showing consecutive days with at least 1 graded submission.
4. THE grading velocity trend SHALL be displayed as a Recharts line chart showing daily grading counts over the last 30 days.
