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
- **Semester**: A time-bounded academic period (e.g., Fall 2024) with start/end dates, used to scope all courses, reports, and analytics for accreditation compliance
- **Course_Section**: A distinct section (A, B, C) of a course sharing the same CLOs but with a different teacher and enrolled student cohort
- **Survey_Module**: The subsystem for creating and distributing indirect assessment surveys (course exit, graduate exit, employer satisfaction) linked to PLOs/ILOs
- **CQI_Action_Plan**: A Continuous Quality Improvement action plan documenting gap identification, corrective actions, and measured results for accreditation "closing the loop" evidence
- **Course_File**: An auto-generated accreditation artifact per course per semester containing syllabus, CLO-PLO mapping, assessment instruments, sample student work, attainment analysis, teacher reflection, and CQI recommendations
- **Announcement**: A teacher-authored notification posted to a course feed, visible to all enrolled students across all sections
- **Course_Module**: An organizational unit within a course (e.g., Week 1, Module 3) containing ordered course materials (files, links, videos, text)
- **Discussion_Forum**: A per-course threaded discussion board where students post questions and answers, with teacher-resolvable threads
- **Attendance_Tracker**: The subsystem that records per-session student attendance (present/absent/late/excused) and calculates attendance percentages per course
- **Quiz_Module**: The subsystem for creating and auto-grading online quizzes (MCQ, true/false, short answer, fill-in-blank) linked to CLOs
- **Gradebook**: The weighted grade calculation subsystem that aggregates assessment scores across categories (assignments, quizzes, midterm, final) into a final course grade
- **Calendar_View**: A unified calendar aggregating due dates, exam dates, class sessions, and academic events across all enrolled/taught courses
- **Timetable**: A weekly class schedule view auto-generated from enrolled/assigned course sections with day, time, and room information
- **Department**: An organizational unit within an institution grouping related academic programs under a head of department
- **Academic_Calendar**: The institution-level calendar defining semester dates, exam periods, holidays, and registration deadlines
- **Transcript_Generator**: The subsystem (Edge Function) that produces per-student per-semester grade report PDFs with GPA, grades, and CLO attainment summaries
- **Parent_Portal**: A read-only dashboard for parents/guardians showing linked student grades, attendance, CLO progress, and habit tracker data
- **Fee_Manager**: The subsystem for managing fee structures per program per semester and tracking student payment status
- **LanguageProvider**: The React context provider that manages language preference (English/Urdu/Arabic) and applies RTL layout direction accordingly
- **SearchCommand**: The global search component accessible via Cmd+K / Ctrl+K that searches across courses, assignments, students, announcements, and materials using full-text search
- **ImpersonationProvider**: The React context provider that manages admin impersonation sessions with read-only enforcement and 30-minute auto-expiry
- **RateLimiter**: The shared Edge Function middleware that enforces per-user request rate limits (100 read/min, 30 write/min)
- **Sub_CLO**: A granular sub-outcome beneath a CLO, representing a specific skill or knowledge component that contributes to the parent CLO attainment
- **Graduate_Attribute**: An institution-wide competency (e.g., Critical Thinking, Communication, Ethical Reasoning) mapped from ILOs, used for accreditation reporting at the graduate profile level
- **Competency_Framework**: A structured hierarchy of competencies (domains → competencies → indicators) that can be mapped to existing ILO/PLO/CLO chains for standards-based reporting
- **Sankey_Diagram**: An interactive flow visualization showing weighted relationships between outcome levels (ILO → PLO → CLO) with proportional link widths
- **Coverage_Heatmap**: A matrix visualization showing the degree of CLO coverage across courses or assessments, with color intensity representing attainment or mapping density
- **Gap_Analysis_View**: A visual report highlighting unmapped or under-assessed outcomes across the ILO → PLO → CLO chain
- **Cohort_Comparison**: An analytics view comparing attainment metrics between different student cohorts (by semester, section, or program year)
- **Semester_Trend_Engine**: The subsystem that calculates and visualizes semester-over-semester attainment trends for CLOs, PLOs, and ILOs
- **Collaborate_Habit**: A daily habit type tracking meaningful discussion forum participation (posting or answering)
- **Practice_Habit**: A daily habit type tracking quiz attempt completion
- **Review_Habit**: A daily habit type tracking peer review submissions
- **Mentor_Habit**: A daily habit type tracking help-others actions (answers marked correct by teachers, or peer assistance events)
- **Social_Challenge**: A time-bounded competitive event where groups of students work toward shared goals with collective rewards
- **Team**: A named group of students (2–6 members) within a course that shares a collective XP pool, team streak, and team badges
- **Team_Leaderboard**: A leaderboard ranking Teams by collective XP within a course or program scope
- **Adaptive_XP_Engine**: The subsystem that dynamically adjusts XP award amounts based on student level, task difficulty, time investment, and diminishing returns rules
- **XP_Multiplier**: A scaling factor applied to base XP amounts, calculated from student level, task difficulty, and contextual bonuses
- **Diminishing_Returns_Rule**: A rule that reduces XP awarded for repeated identical actions within a rolling 24-hour window

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

1. WHEN a Coordinator creates a course, THE Platform SHALL insert a record into the `courses` table with `name`, `code`, `semester_id` (FK to `semesters` table), `program_id`, and `teacher_id`.
2. Coordinators SHALL only manage courses within programs they are assigned to.
3. Teachers SHALL only see courses assigned to them.
4. Courses SHALL have an `is_active` flag for semester-based activation/deactivation.
5. WHEN a course has multiple sections (see Requirement 69), THE Platform SHALL scope submissions, grades, and enrollments to the section level while sharing CLOs at the course level.

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

1. THE XP_Engine SHALL award XP per the defined schedule: Daily Login (10), On-time Submission (50), Late Submission (25), Graded Pass (25), Journal Entry (20), Streak Milestones (100/250/500), Perfect Rubric Score (75), Perfect Day Bonus (50), First-Attempt Bonus (25), Discussion Question (10), Discussion Correct Answer (15), Survey Completion (15), Quiz Completion (50 on-time / 25 late).
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

1. THE Badge_System SHALL award badges per the defined catalog: First Flame, Homework Hero, 7-Day Warrior, 30-Day Legend, Bullseye, Deep Thinker, Level 5 Pioneer, Level 10 Elite, Top 10%, Speed Demon (mystery — submit 3 assignments within 24 hours), Night Owl (mystery — submit between midnight and 5 AM), Perfectionist (mystery — 100% on 3 consecutive rubric-graded assignments), Perfect Attendance Week (present for all sessions in a 7-day period), Quiz Master (pass 10 quizzes with ≥70%), Discussion Helper (5 answers marked correct by teachers), Survey Completer (complete all available course exit surveys).
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
3. Report template SHALL be configurable per accreditation body (ABET, HEC, QQA, NCAAA, AACSB, Generic).
4. Generated reports SHALL be stored in Supabase Storage and downloadable.
5. THE Report_Generator SHALL support Course File generation (see Requirement 74) as an additional report type, packaging per-course per-semester accreditation artifacts.

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

1. THE Habit_Tracker SHALL track 4 daily habits: Login (automatic on auth), Submit (on assignment or quiz submission), Journal (on journal entry save), Read (view assignment detail, CLO progress page, course material, or announcement for ≥30 seconds — see Requirement 61 for full definition).
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
3. THE Platform SHALL compute and store at-risk signals: days since last login, CLO attainment trend direction (improving/declining/stagnant), submission timing patterns (early/on-time/late/missed), attendance frequency (from `attendance_records`), and quiz performance trends.
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

1. THE Habit_Tracker SHALL define the "Read" habit as: viewing an assignment detail page, the CLO progress page, a course material page, or an announcement for 30 seconds or more.
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

---

### SECTION P: Semester & Academic Structure

#### Requirement 68: Semester / Academic Year Management

**User Story:** As an Admin, I want to create and manage semesters with defined date ranges, so that all courses, reports, and analytics are scoped by academic period as required by accreditation bodies (10 Pillars: time-bounded attainment rollup and evidence for Pillars 1–3).

##### Acceptance Criteria

1. WHEN an Admin creates a semester, THE Platform SHALL insert a record into the `semesters` table with `name`, `code`, `start_date`, `end_date`, `is_active`, and the Admin's `institution_id`.
2. THE Platform SHALL enforce that only one semester per institution has `is_active = true` at any time.
3. WHEN an Admin deactivates a semester, THE Platform SHALL preserve all associated data as read-only and prevent new submissions, grades, or enrollments for courses in that semester.
4. THE Platform SHALL scope all report generation, analytics dashboards, and attainment rollup queries by `semester_id`.
5. WHEN an Admin creates a semester with overlapping dates to an existing active semester, THE Platform SHALL reject the creation and display a descriptive error.
6. THE `courses` table SHALL reference `semester_id` as a foreign key, replacing the free-text `semester` field.

---

#### Requirement 69: Course Section Support

**User Story:** As a Coordinator, I want to create multiple sections per course with different teachers and student cohorts sharing the same CLOs, so that large courses can be managed across sections while maintaining consistent outcome measurement (10 Pillars: evidence chain traces through section → course → program for Pillar 1; leaderboard filters by section for Pillar 8).

##### Acceptance Criteria

1. WHEN a Coordinator creates a course section, THE Platform SHALL insert a record into the `course_sections` table with `course_id`, `section_code` (A/B/C), `teacher_id`, `capacity`, and `is_active`.
2. THE Platform SHALL scope `student_courses` enrollments to a specific `section_id`.
3. THE Platform SHALL scope `submissions` and `grades` to the section level via the student's enrollment.
4. THE Platform SHALL share CLOs, rubrics, and assignments at the course level across all sections.
5. THE Report_Generator SHALL produce both per-section and aggregated attainment data in accreditation reports.
6. THE Coordinator Dashboard SHALL provide a section comparison view showing side-by-side attainment metrics across sections of the same course.
7. THE Teacher Dashboard SHALL display per-section analytics when a teacher is assigned to multiple sections.

---

#### Requirement 82: Timetable / Class Schedule

**User Story:** As a Student or Teacher, I want a weekly timetable view auto-generated from my enrolled or assigned sections, so that I can see my class schedule at a glance (10 Pillars: reduces cognitive load per Pillar 6 BJ Fogg — increase ability by making schedule visible).

##### Acceptance Criteria

1. THE Platform SHALL store timetable data in a `timetable_slots` table with `section_id`, `day_of_week` (0–6), `start_time`, `end_time`, `room`, and `slot_type` (lecture/lab/tutorial).
2. THE Platform SHALL auto-generate a Student timetable from all sections the Student is enrolled in.
3. THE Platform SHALL auto-generate a Teacher timetable from all sections the Teacher is assigned to.
4. THE Timetable view SHALL display a weekly grid with days as columns and time slots as rows, color-coded by course.
5. THE Timetable SHALL be accessible from the dashboard sidebar for both Students and Teachers.

---

#### Requirement 83: Department Management

**User Story:** As an Admin, I want to create departments within my institution and assign programs to them, so that organizational hierarchy supports department-level analytics and accreditation reporting (10 Pillars: departments scope the Compliance Machine for aggregated PLO/ILO attainment).

##### Acceptance Criteria

1. WHEN an Admin creates a department, THE Platform SHALL insert a record into the `departments` table with `name`, `code`, `head_of_department_id` (FK to `profiles`), and the Admin's `institution_id`.
2. THE `programs` table SHALL reference `department_id` as a foreign key.
3. THE Admin Dashboard SHALL display department-level aggregated PLO and ILO attainment analytics.
4. WHEN an Admin deletes a department, THE Platform SHALL block deletion if active programs exist under the department.
5. WHEN an Admin creates or modifies a department, THE Audit_Logger SHALL record the action with before/after snapshots.

---

#### Requirement 84: Academic Calendar Management

**User Story:** As an Admin, I want to define academic calendar events (exam periods, holidays, registration deadlines), so that the platform enforces scheduling rules and provides institutional-level prompts (10 Pillars: academic calendar provides institutional-level triggers per Pillar 6 BJ Fogg).

##### Acceptance Criteria

1. WHEN an Admin creates an academic calendar event, THE Platform SHALL insert a record into the `academic_calendar_events` table with `institution_id`, `semester_id`, `title`, `event_type` (semester_start/semester_end/exam_period/holiday/registration/custom), `start_date`, `end_date`, and `is_recurring`.
2. THE Calendar_View SHALL display academic calendar events alongside assignment due dates and class sessions.
3. WHEN a Teacher sets an assignment due date that falls on a holiday, THE Platform SHALL display a warning and suggest the next available date.
4. THE Notification_Service SHALL send "Exam period starts in 5 days" notifications to enrolled students when an exam_period event approaches.

---

### SECTION Q: Assessment & Grading

#### Requirement 70: Direct/Indirect Assessment — Survey Module

**User Story:** As an Admin or Coordinator, I want to create and distribute surveys (course exit, graduate exit, employer satisfaction) linked to PLOs/ILOs, so that indirect assessment evidence feeds into accreditation reports alongside direct assessment data (10 Pillars: surveys close the institutional feedback loop extending Pillar 10 Reflection; survey completion awards XP per Pillar 8).

##### Acceptance Criteria

1. WHEN an Admin or Coordinator creates a survey, THE Survey_Module SHALL insert a record into the `surveys` table with `institution_id`, `title`, `type` (course_exit/graduate_exit/employer), `target_outcomes` (jsonb array of outcome_ids), and `is_active`.
2. THE Survey_Module SHALL support question types: Likert scale (1–5), multiple choice, and open text, stored in the `survey_questions` table.
3. WHEN a respondent submits a survey response, THE Platform SHALL insert records into the `survey_responses` table with `survey_id`, `question_id`, `respondent_id`, and `response_value`.
4. THE Report_Generator SHALL include survey results as "indirect assessment evidence" in accreditation reports, aggregated by linked PLO/ILO.
5. WHEN a Student completes a course exit survey, THE XP_Engine SHALL award 15 XP with `source = 'survey_completion'`.
6. THE Survey_Module SHALL enforce that each respondent can submit only one response per survey.

---

#### Requirement 71: Continuous Quality Improvement (CQI) Loop

**User Story:** As a Coordinator, I want to document CQI action plans when PLO/CLO attainment falls below threshold, so that accreditation reports include "closing the loop" evidence (10 Pillars: CQI is the institutional-level equivalent of the student reflection journal per Pillar 10; the AI Co-Pilot per Pillar 4 can suggest CQI actions based on historical attainment patterns).

##### Acceptance Criteria

1. WHEN a Coordinator creates a CQI action plan, THE Platform SHALL insert a record into the `cqi_action_plans` table with `program_id`, `semester_id`, `outcome_id`, `outcome_type`, `baseline_attainment`, `target_attainment`, `action_description`, `responsible_person`, and `status` (planned/in_progress/completed/evaluated).
2. THE CQI workflow SHALL follow the cycle: Identify gap → Document action → Implement → Measure result → Close, tracked via the `status` field.
3. WHEN a CQI action plan status is updated to `evaluated`, THE Platform SHALL require a `result_attainment` value to measure improvement.
4. THE Report_Generator SHALL include CQI action plans as "closing the loop" evidence in accreditation reports.
5. THE Coordinator Dashboard SHALL display a CQI section showing open and closed action plans with baseline vs. result attainment comparison.
6. WHEN a Coordinator creates or modifies a CQI action plan, THE Audit_Logger SHALL record the action.

---

#### Requirement 72: Configurable KPI Thresholds

**User Story:** As an Admin, I want to configure attainment thresholds and success criteria per institution, so that the platform adapts to different accreditation body standards (10 Pillars: configurable thresholds mean the Compliance Machine Pillars 1–3 adapts to any accreditation body; the Human Engine Pillars 4–10 uses the same thresholds for CLO progress bars, at-risk detection, and AI predictions).

##### Acceptance Criteria

1. WHEN an Admin configures institution settings, THE Platform SHALL store attainment thresholds in the `institution_settings` table as a jsonb column: `attainment_thresholds` (e.g., `{excellent: 85, satisfactory: 70, developing: 50}`).
2. THE Platform SHALL store a `success_threshold` (default 70) defining the percentage of students who must achieve Satisfactory or above for a PLO to be considered "met".
3. THE Platform SHALL store an `accreditation_body` field (HEC/QQA/ABET/NCAAA/AACSB/Generic) in `institution_settings`.
4. ALL attainment level calculations across dashboards, reports, and AI predictions SHALL use the institution-specific configurable thresholds instead of hardcoded values.
5. WHEN an Admin modifies institution settings, THE Audit_Logger SHALL record the change with before/after values.

---

#### Requirement 73: Multi-Accreditation Body Support

**User Story:** As an Admin, I want programs to be tagged with multiple accreditation bodies, so that the platform generates body-specific reports per program (10 Pillars: the evidence chain per Pillar 1 is body-agnostic — the same evidence serves multiple accreditation reports simultaneously).

##### Acceptance Criteria

1. THE Platform SHALL store program accreditation records in the `program_accreditations` table with `program_id`, `accreditation_body`, `framework_version`, `accreditation_date`, `next_review_date`, and `status` (active/expired/pending).
2. THE Report_Generator SHALL produce body-specific reports per program based on the program's accreditation records.
3. THE Platform SHALL support different PLO naming conventions per accreditation body (e.g., "Student Outcomes" for ABET, "PLOs" for HEC).
4. THE Admin Dashboard SHALL display accreditation status per program with upcoming review date alerts.

---

#### Requirement 74: Course File / Course Portfolio Generation

**User Story:** As a Coordinator, I want to auto-generate a Course File per course per semester containing all accreditation artifacts, so that I have a single downloadable package for accreditation review (10 Pillars: Course File packages Pillar 1 OBE evidence, Pillar 2 rubrics, Pillar 3 Bloom's distribution, and Pillar 10 teacher reflection into one artifact).

##### Acceptance Criteria

1. THE Platform SHALL generate a Course File containing: syllabus (course details + CLOs), CLO-PLO mapping table, all assessment instruments (assignments with rubrics), sample student work (best/average/worst scoring submissions per assignment), CLO attainment analysis with charts, teacher reflection (journal entries tagged to course), and CQI recommendations.
2. THE Course File SHALL be generated as a downloadable PDF or ZIP via the `generate-course-file` Edge Function.
3. THE Course File generation SHALL complete within 30 seconds.
4. THE Coordinator SHALL be able to trigger Course File generation from the course detail page for any course in their program.
5. Generated Course Files SHALL be stored in Supabase Storage and downloadable.

---

#### Requirement 79: Quiz/Exam Module

**User Story:** As a Teacher, I want to create online quizzes linked to CLOs with auto-grading for objective questions, so that formative assessments generate evidence for the Compliance Machine while reducing ability barriers for students (10 Pillars: quizzes generate evidence for Pillar 1; ideal for Remember/Apply Bloom's levels per Pillar 3; reduce ability barriers per Pillar 6 BJ Fogg; feed Learning Path per Pillar 9 Flow).

##### Acceptance Criteria

1. WHEN a Teacher creates a quiz, THE Quiz_Module SHALL insert a record into the `quizzes` table with `course_id`, `title`, `description`, `clo_ids` (jsonb), `time_limit_minutes`, `max_attempts`, `is_published`, and `due_date`.
2. THE Quiz_Module SHALL support question types: MCQ (single/multi-select), true/false, short answer, and fill-in-the-blank, stored in the `quiz_questions` table with `question_text`, `question_type`, `options` (jsonb), `correct_answer` (jsonb), `points`, and `sort_order`.
3. WHEN a Student submits a quiz attempt, THE Platform SHALL insert a record into the `quiz_attempts` table with `quiz_id`, `student_id`, `answers` (jsonb), `score`, `started_at`, `submitted_at`, and `attempt_number`.
4. THE Quiz_Module SHALL auto-grade MCQ, true/false, and fill-in-the-blank questions immediately on submission; short answer questions SHALL require manual teacher grading.
5. Quiz scores SHALL feed into CLO attainment calculations using the same evidence generation pipeline as assignment grades.
6. WHEN a Student completes a quiz, THE XP_Engine SHALL award XP using the same schedule as assignments (50 XP on-time, 25 XP if late).
7. THE Quiz_Module SHALL enforce `max_attempts` per student per quiz.

---

#### Requirement 80: Gradebook with Weighted Categories

**User Story:** As a Teacher, I want to define weighted grade categories and see a gradebook matrix of students × assessments, so that traditional transcript grades coexist with OBE attainment data (10 Pillars: gradebook is the traditional compliance artifact coexisting with CLO attainment per Pillar 1 — one shows "what the student can do" and the other shows "what grade they earned").

##### Acceptance Criteria

1. WHEN a Teacher defines grade categories, THE Gradebook SHALL insert records into the `grade_categories` table with `course_id`, `name` (e.g., Assignments, Quizzes, Midterm, Final), `weight_percent`, and `sort_order`.
2. THE Gradebook SHALL enforce that the sum of `weight_percent` across all categories for a course equals 100%.
3. THE Gradebook SHALL display a students × assessments matrix with category subtotals and a final weighted grade per student.
4. THE Platform SHALL calculate the final grade as the weighted sum across categories.
5. THE Platform SHALL support configurable letter grade mapping per institution via a `grade_scales` jsonb array in `institution_settings` containing `{letter, min_percent, max_percent, gpa_points}` entries.
6. THE Gradebook view SHALL be accessible to Teachers from the course detail page.

---

#### Requirement 85: Student Transcript / Grade Report

**User Story:** As a Student or Admin, I want to generate a per-student per-semester grade report PDF with GPA and CLO attainment summary, so that transcripts combine traditional grades with OBE evidence (10 Pillars: transcript combines traditional grades from the gradebook with OBE evidence from CLO attainment per Pillar 1).

##### Acceptance Criteria

1. THE Transcript_Generator SHALL produce a PDF containing: student info, courses taken in the semester, grades per category, final grade, letter grade, semester GPA, and CLO attainment summary per course.
2. THE Transcript_Generator SHALL calculate cumulative GPA across all completed semesters.
3. THE transcript PDF SHALL be generated via the `generate-transcript` Edge Function within 10 seconds.
4. THE transcript SHALL be downloadable by the Student from their profile page and by the Admin from the user detail page.
5. Generated transcripts SHALL be stored in Supabase Storage.

---

### SECTION R: LMS Core Features

#### Requirement 75: Announcements / Course Feed

**User Story:** As a Teacher, I want to post announcements to my course visible to all enrolled students, so that important information reaches students promptly (10 Pillars: announcements are external triggers per Pillar 7 Hooked Model Phase 1; reading an announcement counts toward the Read habit per Pillar 6 BJ Fogg if the student spends 30+ seconds).

##### Acceptance Criteria

1. WHEN a Teacher posts an announcement, THE Platform SHALL insert a record into the `announcements` table with `course_id`, `author_id`, `title`, `content` (markdown), and `is_pinned`.
2. THE Platform SHALL display announcements on the Student Dashboard and the course detail page, ordered by `is_pinned` DESC then `created_at` DESC.
3. WHEN a new announcement is posted, THE Notification_Service SHALL create an in-app notification for all students enrolled in the course.
4. THE Platform SHALL support rich text content via markdown rendering.
5. WHEN a Student views an announcement for 30+ seconds, THE Habit_Tracker SHALL count the view toward the "Read" habit completion for that day.

---

#### Requirement 76: Course Content / Materials Module

**User Story:** As a Teacher, I want to organize course materials into modules/weeks with file uploads and links, so that students have structured access to learning resources (10 Pillars: materials are the content that the Read habit per Pillar 6 tracks engagement with; viewing materials for 30+ seconds completes the Read habit; materials linked to CLOs feed the Learning Path per Pillar 9 Flow; the AI Co-Pilot per Pillar 4 can suggest specific materials for CLO gaps).

##### Acceptance Criteria

1. WHEN a Teacher creates a course module, THE Platform SHALL insert a record into the `course_modules` table with `course_id`, `title`, `description`, `sort_order`, and `is_published`.
2. WHEN a Teacher adds a material to a module, THE Platform SHALL insert a record into the `course_materials` table with `module_id`, `title`, `type` (file/link/video/text), `content_url`, `file_path` (Supabase Storage), `description`, `sort_order`, and `is_published`.
3. THE Platform SHALL support file types: PDF, DOCX, PPTX, images, and video links (YouTube/Vimeo embed).
4. THE Platform SHALL allow materials to be linked to CLOs for traceability.
5. THE Student course detail page SHALL display materials organized by module.
6. WHEN a Student views a course material for 30+ seconds, THE Habit_Tracker SHALL count the view toward the "Read" habit completion for that day.

---

#### Requirement 77: Discussion Forum / Q&A

**User Story:** As a Student, I want per-course discussion threads where I can ask questions and post answers, so that I engage in social learning and earn XP for participation (10 Pillars: discussion is social learning per Pillar 8 Octalysis Drive 5 Social Influence; posting is a form of reflection per Pillar 10; XP for participation feeds the gamification loop per Pillar 8).

##### Acceptance Criteria

1. WHEN a Student or Teacher creates a discussion thread, THE Discussion_Forum SHALL insert a record into the `discussion_threads` table with `course_id`, `author_id`, `title`, `content`, `is_pinned`, and `is_resolved`.
2. WHEN a user replies to a thread, THE Discussion_Forum SHALL insert a record into the `discussion_replies` table with `thread_id`, `author_id`, `content`, and `is_answer`.
3. WHEN a Teacher marks a reply as "answer", THE Platform SHALL set `is_answer = true` on the reply and `is_resolved = true` on the thread.
4. WHEN a Student posts a question (creates a thread), THE XP_Engine SHALL award 10 XP with `source = 'discussion_question'`.
5. WHEN a Student posts an answer that is marked as correct by the Teacher, THE XP_Engine SHALL award 15 XP with `source = 'discussion_answer'`.
6. THE Discussion_Forum SHALL display threads ordered by `is_pinned` DESC then `created_at` DESC, with resolved threads visually distinguished.

---

#### Requirement 78: Attendance Tracking

**User Story:** As a Teacher, I want to mark attendance per class session per section, so that attendance data feeds into at-risk prediction and accreditation compliance (10 Pillars: attendance is a behavioral signal for the AI Co-Pilot per Pillar 4; low attendance correlates with at-risk status; "Perfect Attendance Week" badge per Pillar 8; attendance data enriches the student_activity_log for AI training).

##### Acceptance Criteria

1. WHEN a Teacher creates a class session, THE Attendance_Tracker SHALL insert a record into the `class_sessions` table with `section_id`, `session_date`, `session_type` (lecture/lab/tutorial), and `topic`.
2. WHEN a Teacher marks attendance, THE Attendance_Tracker SHALL insert records into the `attendance_records` table with `session_id`, `student_id`, `status` (present/absent/late/excused), and `marked_by`.
3. THE Attendance_Tracker SHALL calculate attendance percentage per student per course as: (present + late sessions) / total sessions × 100.
4. WHEN a Student's attendance percentage drops below 75%, THE Platform SHALL flag the student on the Teacher Dashboard and send an in-app notification to the student.
5. THE Student Dashboard SHALL display attendance percentage per enrolled course.
6. THE AI Co-Pilot at-risk prediction (Requirement 47) SHALL include attendance frequency as a contributing signal.
7. THE Badge_System SHALL award a "Perfect Attendance Week" badge when a Student is marked present for all sessions in a 7-day period.

---

#### Requirement 81: Calendar View

**User Story:** As a Student or Teacher, I want a unified calendar showing all due dates, exam dates, class sessions, and events, so that I can plan my work and reduce anxiety (10 Pillars: calendar is a planning tool per Pillar 5 SRL Planning Zone; calendar items are prompts per Pillar 6 BJ Fogg external triggers at the right time).

##### Acceptance Criteria

1. THE Calendar_View SHALL aggregate events from: assignments (due dates), quizzes (due dates), class_sessions (session dates), academic_calendar_events, and announcements.
2. THE Calendar_View SHALL color-code events by course.
3. THE Student Calendar_View SHALL display events from all enrolled courses; THE Teacher Calendar_View SHALL display events from all taught courses.
4. THE Calendar_View SHALL integrate with the deadline widget on the Student Dashboard (red <24h, yellow <72h, green >72h).
5. THE Calendar_View SHALL be accessible from the dashboard sidebar for both Students and Teachers.

---

### SECTION S: Stakeholder Access

#### Requirement 86: Parent/Guardian Portal

**User Story:** As a Parent or Guardian, I want read-only access to my child's grades, attendance, CLO progress, and habit tracker, so that I can monitor their academic engagement (10 Pillars: parents are external accountability partners per Pillar 8 Octalysis Drive 5 Social Influence; parent notifications are external triggers per Pillar 7 Hooked Model).

##### Acceptance Criteria

1. THE Platform SHALL support a `parent` role with read-only access enforced via RLS policies.
2. THE Platform SHALL store parent-student relationships in a `parent_student_links` table with `parent_id`, `student_id`, `relationship` (parent/guardian), `verified`, and `created_at`.
3. THE Parent_Portal Dashboard SHALL display: linked student's grades, attendance percentage, CLO progress bars, habit tracker (read-only), and XP/level/streak summary.
4. THE Notification_Service SHALL send email notifications to parents for: grade released, attendance alert (below 75%), and at-risk warning.
5. THE Admin SHALL be able to invite parents via bulk import or individual invite, creating a `parent` role profile and a `parent_student_links` record.
6. THE RBAC_Engine SHALL enforce that parents can only view data for students linked to them via verified `parent_student_links` records.
7. THE AppRouter SHALL include a `/parent/*` route group with a ParentLayout and ParentDashboard.

---

#### Requirement 87: Fee Management / Payment Tracking

**User Story:** As an Admin, I want to manage fee structures per program per semester and track student payment status, so that the platform serves as a single institutional management system (10 Pillars: fee management is institutional infrastructure that eliminates the need for a separate school management system).

##### Acceptance Criteria

1. WHEN an Admin creates a fee structure, THE Fee_Manager SHALL insert a record into the `fee_structures` table with `program_id`, `semester_id`, `fee_type` (tuition/lab/library/exam), `amount`, `currency`, and `due_date`.
2. WHEN an Admin records a payment, THE Fee_Manager SHALL insert a record into the `fee_payments` table with `student_id`, `fee_structure_id`, `amount_paid`, `payment_date`, `payment_method`, `receipt_number`, and `status` (pending/paid/overdue/waived).
3. THE Student Profile page SHALL display fee status showing outstanding and paid fees.
4. THE Admin Dashboard SHALL include a fee collection summary showing total collected, total outstanding, and overdue count.
5. WHEN a fee payment is overdue (current date > `due_date` and status is `pending`), THE Platform SHALL flag the payment as `overdue` and display an alert on the Admin fee dashboard.
6. THE Platform SHALL generate fee receipts as downloadable PDFs.
7. WHEN an Admin creates or modifies a fee structure or records a payment, THE Audit_Logger SHALL record the action.


---

### SECTION T: Production Readiness & Infrastructure

#### Requirement 88: Multi-Language / RTL Support (Urdu + Arabic)

**User Story:** As a user at an institution where Urdu or Arabic is the primary language, I want the platform to display in my language with correct right-to-left layout, so that I can use the platform comfortably in my native language (extends Requirement 52.6 i18n architecture).

##### Acceptance Criteria

1. WHEN a user selects Urdu or Arabic as their language preference, THE Platform SHALL switch the layout direction to RTL by setting `dir="rtl"` on the `<html>` element and load the corresponding translation file.
2. THE Platform SHALL provide translation file stubs for Urdu (`/public/locales/ur/translation.json`) and Arabic (`/public/locales/ar/translation.json`) alongside the existing English translations.
3. THE Platform SHALL include RTL-aware CSS utilities that mirror horizontal padding, margins, flexbox directions, and border-radius for RTL layouts.
4. THE Platform SHALL provide a language selector in the Profile Settings page allowing users to choose between English, Urdu, and Arabic.
5. THE Platform SHALL store the selected language preference in a `language_preference` text column on the `profiles` table (default 'en', allowed values: 'en', 'ur', 'ar').
6. WHEN the Platform loads, THE Platform SHALL read the user's `language_preference` from the profile and apply the corresponding language and layout direction without requiring a page refresh.

---

#### Requirement 89: Progressive Web App (PWA)

**User Story:** As a mobile user, I want to install the platform as an app on my device with offline shell caching, so that I get an app-like experience without downloading from an app store (extends Requirement 50 performance).

##### Acceptance Criteria

1. THE Platform SHALL include a web app manifest (`public/manifest.json`) with Edeviser branding (name, short_name, icons, theme_color, background_color, display: standalone).
2. THE Platform SHALL register a service worker that caches the app shell (HTML, CSS, JS bundles) for offline access using a cache-first strategy.
3. THE Platform SHALL display an install prompt component for mobile users when the browser's `beforeinstallprompt` event fires.
4. THE Platform SHALL include meta tags for iOS home screen icons (`apple-touch-icon`) and Android PWA support.
5. THE service worker SHALL NOT cache API data or Supabase responses — only static app shell assets.
6. WHEN a user opens the installed PWA without network connectivity, THE Platform SHALL display the cached app shell with an "You are offline" message instead of a browser error.

---

#### Requirement 90: Backup & Disaster Recovery Procedures

**User Story:** As an institution, I want documented and verified backup and disaster recovery procedures, so that data can be restored within defined time objectives in case of a catastrophic failure (extends Requirement 53 reliability).

##### Acceptance Criteria

1. THE Platform SHALL document Supabase Point-in-Time Recovery (PITR) configuration in `/docs/disaster-recovery.md`.
2. THE disaster recovery runbook SHALL define procedures for achieving Recovery Time Objective (RTO) of less than 4 hours and Recovery Point Objective (RPO) of less than 1 hour.
3. THE Platform SHALL include a monthly database backup verification task in the runbook that validates backup restoration to a staging environment.
4. THE disaster recovery runbook SHALL document rollback procedures for failed Edge Function deployments and database migrations.
5. THE disaster recovery runbook SHALL include contact escalation paths and communication templates for stakeholder notification during outages.

---

#### Requirement 91: Edge Function Rate Limiting

**User Story:** As the system, I want all Edge Functions to enforce per-user rate limits, so that the platform is protected from abuse and resource exhaustion (extends Requirement 51 security).

##### Acceptance Criteria

1. THE Platform SHALL enforce per-user rate limits on all Edge Functions: 100 requests per minute for read operations and 30 requests per minute for write operations.
2. WHEN a user exceeds the rate limit, THE Edge Function SHALL return HTTP 429 (Too Many Requests) with a `Retry-After` header indicating the number of seconds until the limit resets.
3. THE Platform SHALL implement rate limiting via a shared middleware module (`supabase/functions/_shared/rateLimiter.ts`) that all Edge Functions import.
4. WHEN a rate limit violation occurs, THE Audit_Logger SHALL log the event with `actor_id`, `action = 'rate_limit_exceeded'`, `target_type = 'edge_function'`, and the function name.

---

#### Requirement 92: Security Headers (CSP, HSTS)

**User Story:** As an institution, I want the platform to serve all responses with industry-standard security headers, so that common web vulnerabilities are mitigated (extends Requirement 51 security).

##### Acceptance Criteria

1. THE Platform SHALL serve a Content-Security-Policy header restricting script sources to self and trusted CDNs (Google Fonts, Supabase).
2. THE Platform SHALL serve a Strict-Transport-Security header with `max-age=31536000; includeSubDomains`.
3. THE Platform SHALL serve an X-Frame-Options header with value `DENY`.
4. THE Platform SHALL serve an X-Content-Type-Options header with value `nosniff`.
5. THE Platform SHALL serve a Referrer-Policy header with value `strict-origin-when-cross-origin`.
6. THE security headers SHALL be configured via Vercel configuration (`vercel.json` headers section).

---

#### Requirement 93: Cookie Consent / Privacy Banner

**User Story:** As a user, I want to be informed about cookie usage and control my consent preferences, so that my privacy is respected in compliance with GDPR and ePrivacy regulations.

##### Acceptance Criteria

1. WHEN a user visits the Platform for the first time, THE Platform SHALL display a cookie consent banner with options: "Accept All", "Reject Non-Essential", and "Manage Preferences".
2. THE Platform SHALL store the user's consent status in localStorage under the key `edeviser_cookie_consent`.
3. WHILE a user has not given consent for analytics tracking, THE Platform SHALL block all analytics and tracking scripts from loading.
4. WHEN a user selects "Manage Preferences", THE Platform SHALL display a preferences dialog allowing granular control over: essential cookies (always on, non-toggleable), analytics cookies, and performance cookies.
5. THE Platform SHALL provide a "Cookie Settings" link in the footer of all pages allowing users to update their consent preferences at any time.

---

#### Requirement 94: Terms of Service & Privacy Policy Pages

**User Story:** As a user, I want to read the Terms of Service and Privacy Policy before using the platform, so that I understand my rights and obligations.

##### Acceptance Criteria

1. THE Platform SHALL provide public routes at `/terms` and `/privacy` accessible without authentication.
2. THE Platform SHALL render Terms of Service and Privacy Policy content from markdown files.
3. THE Platform SHALL display footer links to Terms of Service and Privacy Policy on all pages.
4. WHEN a user logs in for the first time and has not accepted the Terms of Service, THE Platform SHALL display a ToS acceptance dialog with a checkbox before granting access to the platform.
5. THE Platform SHALL store the ToS acceptance timestamp in a `tos_accepted_at` timestamptz column on the `profiles` table (default null).
6. WHILE a user has `tos_accepted_at = null`, THE Platform SHALL block navigation to any protected route and redirect to the ToS acceptance dialog.

---

#### Requirement 95: Admin Impersonation / Support Mode

**User Story:** As an Admin, I want to view the platform as another user within my institution for support purposes, so that I can diagnose issues without asking the user to share their screen.

##### Acceptance Criteria

1. THE Platform SHALL provide a "View as User" button on the Admin user detail page for users within the Admin's institution.
2. THE Platform SHALL implement impersonation via a separate JWT claim (`impersonating_user_id`) that overrides the current user context for display purposes.
3. WHILE an Admin is impersonating another user, THE Platform SHALL display a prominent banner: "You are viewing as [user_name] — [role]. Click to exit." at the top of every page.
4. THE Audit_Logger SHALL log all impersonation sessions with `action = 'impersonation_start'` and `action = 'impersonation_end'`, including `actor_id` (admin) and `target_id` (impersonated user).
5. THE Platform SHALL restrict impersonation to users with the `admin` role only, enforced via RLS and client-side route guards.
6. THE Platform SHALL auto-expire impersonation sessions after 30 minutes, returning the Admin to their own dashboard.
7. WHILE impersonating, THE Admin SHALL have read-only access — all mutation operations SHALL be blocked.

---

#### Requirement 96: Bulk Data Operations

**User Story:** As a Teacher or Coordinator, I want to perform bulk data operations (grade export, enrollment import/export, semester transition), so that I can manage large datasets efficiently without repetitive manual work.

##### Acceptance Criteria

1. THE Platform SHALL allow Teachers to export grades as CSV per course or per section, including student name, assessment scores, category subtotals, final grade, and letter grade.
2. THE Platform SHALL allow Coordinators to import student enrollments via CSV upload with columns (`student_email`, `course_code`, `section_code`) and export current enrollments as CSV.
3. THE Platform SHALL provide a semester transition tool that bulk-copies courses, CLOs, rubrics, and grade categories from a source semester to a target semester within the same program.
4. THE Platform SHALL provide a bulk data cleanup tool for Admins to archive or purge data from deactivated semesters older than a configurable retention period.
5. WHEN a bulk import contains invalid rows, THE Platform SHALL reject those rows and display a list of errors with row numbers and descriptions, processing only valid rows.

---

#### Requirement 97: Database Connection Pooling Configuration

**User Story:** As the operations team, I want database connections to be pooled and documented for different deployment tiers, so that the platform handles concurrent connections efficiently without exhausting database limits.

##### Acceptance Criteria

1. THE Platform SHALL document Supabase connection pooler (PgBouncer) configuration in `/docs/connection-pooling.md` with pool size recommendations for free (15 connections), pro (50 connections), and team (100 connections) tiers.
2. THE Platform SHALL configure the `supabase-js` client in Edge Functions to use the pooler connection URL instead of the direct database URL.
3. THE Platform SHALL include connection pool utilization in the health check endpoint response as a `pool_status` field.
4. THE connection pooling documentation SHALL include troubleshooting steps for common connection exhaustion scenarios.

---

#### Requirement 98: Image/Asset Optimization

**User Story:** As a user, I want images to load quickly and uploads to be optimized, so that the platform feels fast even on slow connections.

##### Acceptance Criteria

1. THE Platform SHALL compress avatar images client-side before upload to a maximum of 500KB and 256×256 pixels.
2. THE Platform SHALL implement lazy loading via the `loading="lazy"` attribute for all images including avatars, badge icons, and material thumbnails.
3. THE Platform SHALL configure Supabase Storage image transformations to serve avatar thumbnails at 64×64 and 128×128 sizes.
4. THE Platform SHALL configure Vercel CDN caching headers for static assets with `Cache-Control: public, max-age=31536000, immutable` for hashed assets.

---

#### Requirement 99: Global Search

**User Story:** As a user, I want to search across all platform content using a keyboard shortcut, so that I can quickly find courses, assignments, students, announcements, and materials.

##### Acceptance Criteria

1. THE Platform SHALL provide a SearchCommand component accessible via `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) keyboard shortcut from any page.
2. THE Platform SHALL search across: courses, assignments, students (visible to admin and teacher roles only), announcements, and course materials using Supabase full-text search (tsvector).
3. THE Platform SHALL debounce search input by 300 milliseconds before executing the search query.
4. THE Platform SHALL display search results grouped by category (Courses, Assignments, Students, Announcements, Materials) with keyboard navigation (arrow keys + Enter to select).
5. THE Platform SHALL create GIN indexes on searchable text columns (`courses.name`, `assignments.title`, `announcements.title`, `course_materials.title`, `profiles.full_name`) for full-text search performance.
6. THE Platform SHALL scope search results by the user's role and institution — students see only their enrolled courses and related content.

---

#### Requirement 100: Plagiarism Awareness Placeholder

**User Story:** As a Teacher, I want placeholder infrastructure for plagiarism detection on student submissions, so that the platform is ready for future integration with plagiarism detection services.

##### Acceptance Criteria

1. THE Platform SHALL add a `plagiarism_score` nullable numeric column to the `submissions` table.
2. THE Platform SHALL display a placeholder UI in the Grading Interface showing "Plagiarism check: Not configured" when `plagiarism_score` is null.
3. THE Platform SHALL document integration points for Turnitin or Copyleaks API in code comments within the Grading Interface and submission processing logic.
4. THE Platform SHALL define a `PLAGIARISM_API_KEY` environment variable placeholder in `.env.example`.

---

#### Requirement 101: Granular In-App Notification Preferences

**User Story:** As a user, I want fine-grained control over my in-app notifications including per-course muting and quiet hours, so that I am not overwhelmed by notifications during off-hours (extends Requirement 65 notification batching).

##### Acceptance Criteria

1. THE Platform SHALL allow users to mute in-app notifications per course via a toggle in notification preferences.
2. THE Platform SHALL allow users to set quiet hours (start time and end time, e.g., 10 PM to 7 AM) during which non-critical notifications are held and delivered after quiet hours end.
3. THE Platform SHALL store notification preferences in a `notification_preferences` jsonb column on the `profiles` table, including `muted_courses` (array of course_ids) and `quiet_hours` (object with `start` and `end` time strings).
4. WHILE quiet hours are active, THE Notification_Service SHALL hold all non-critical notifications and deliver them when quiet hours end. Critical notifications (grade released, at-risk alert) SHALL be delivered immediately regardless of quiet hours.
5. THE Platform SHALL provide a notification preferences page accessible from the Profile Settings page.

---

#### Requirement 102: Session Management UI

**User Story:** As a user, I want to view my active sessions and remotely sign out other devices, so that I can maintain control over my account security.

##### Acceptance Criteria

1. THE Platform SHALL provide an Active Sessions page in Profile Settings displaying all active sessions for the current user.
2. Each session entry SHALL display: device type (desktop/mobile/tablet), browser name, masked IP address (e.g., 192.168.x.x), and last active timestamp.
3. THE Platform SHALL provide a "Sign out other sessions" button that terminates all sessions except the current one.
4. THE Platform SHALL provide a "Sign out all sessions" button that terminates all sessions including the current one, redirecting to the login page.
5. THE Platform SHALL use the Supabase Auth admin API for session enumeration and termination.
6. WHEN a user signs out other sessions, THE Audit_Logger SHALL log the action with the count of terminated sessions.


---

### SECTION U: OBE Engine Enhancements

#### Requirement 103: Sub-CLO Management

**User Story:** As a Teacher, I want to define Sub-CLOs beneath each CLO, so that I can track granular skill components and provide more detailed attainment feedback to students.

##### Acceptance Criteria

1. WHEN a Teacher creates a Sub-CLO, THE Outcome_Manager SHALL insert a record into the `learning_outcomes` table with `type = 'SUB_CLO'`, a `parent_outcome_id` referencing the parent CLO, and a `weight` (0.0–1.0) representing contribution to the parent CLO.
2. THE Outcome_Manager SHALL enforce that the sum of Sub-CLO weights under a single CLO equals 1.0 before allowing assignment linkage.
3. WHEN a CLO has Sub-CLOs defined, THE Rubric_Builder SHALL allow rubric criteria to be linked to individual Sub-CLOs instead of the parent CLO.
4. THE Rollup_Engine SHALL calculate parent CLO attainment as the weighted average of Sub-CLO attainments when Sub-CLOs exist.
5. WHEN a Teacher deletes a Sub-CLO that has linked evidence records, THE Outcome_Manager SHALL block the deletion and display the count of dependent evidence records.
6. THE Platform SHALL display Sub-CLOs as expandable children beneath their parent CLO in all outcome list views.

---

#### Requirement 104: Graduate Attribute Management

**User Story:** As an Admin, I want to define Graduate Attributes for my institution and map them to ILOs, so that accreditation reports can demonstrate graduate profile alignment.

##### Acceptance Criteria

1. WHEN an Admin creates a Graduate Attribute, THE Outcome_Manager SHALL insert a record into a `graduate_attributes` table with `title`, `description`, `code`, and `institution_id`.
2. THE Mapping_Engine SHALL allow mapping of Graduate Attributes to one or more ILOs via a `graduate_attribute_mappings` table with a `weight` (0.0–1.0).
3. THE Rollup_Engine SHALL calculate Graduate Attribute attainment as the weighted average of mapped ILO attainments.
4. THE Report_Generator SHALL include a Graduate Attribute attainment summary section in accreditation PDF reports.
5. THE Admin Dashboard SHALL display a Graduate Attribute attainment overview card showing institution-wide attainment percentages per attribute.
6. WHEN an Admin modifies or deletes a Graduate Attribute, THE Audit_Logger SHALL record the action with before/after snapshots.

---

#### Requirement 105: Competency Framework Management

**User Story:** As an Admin, I want to import and manage external competency frameworks (e.g., ABET, NCAAA) and map them to existing outcome chains, so that the platform supports standards-based accreditation reporting.

##### Acceptance Criteria

1. THE Platform SHALL support a three-level competency hierarchy: Domain → Competency → Indicator, stored in a `competency_frameworks` table and a `competency_items` table with `parent_id` self-referencing.
2. WHEN an Admin creates a competency framework, THE Platform SHALL require a `name`, `version`, `source` (e.g., "ABET EAC 2024"), and `institution_id`.
3. THE Mapping_Engine SHALL allow mapping of Competency Indicators to ILOs, PLOs, or CLOs via a `competency_outcome_mappings` table.
4. THE Platform SHALL provide a CSV import for competency frameworks with columns (`domain_code`, `domain_title`, `competency_code`, `competency_title`, `indicator_code`, `indicator_title`).
5. THE Report_Generator SHALL produce a competency-to-outcome alignment matrix report showing mapping coverage and attainment per indicator.
6. IF a competency indicator has no mapped outcomes, THEN THE Platform SHALL flag the indicator as "Unmapped" in the alignment matrix with a visual warning.

---

#### Requirement 106: Interactive Sankey Diagram for Outcome Chains

**User Story:** As a Coordinator or Admin, I want to visualize the ILO → PLO → CLO mapping chain as an interactive Sankey diagram, so that I can understand outcome flow and identify mapping gaps at a glance.

##### Acceptance Criteria

1. THE Platform SHALL render an interactive Sankey_Diagram on the Coordinator and Admin dashboards showing ILO → PLO → CLO relationships with link widths proportional to mapping weights.
2. WHEN a user hovers over a Sankey link, THE Platform SHALL display a tooltip showing the source outcome, target outcome, weight, and current attainment percentage.
3. WHEN a user clicks on a Sankey node (ILO, PLO, or CLO), THE Platform SHALL open a detail panel showing the outcome's full details, mapped children/parents, and attainment breakdown.
4. THE Sankey_Diagram SHALL color-code nodes by attainment level: Excellent (green), Satisfactory (blue), Developing (yellow), Not_Yet (red), and Unmapped (gray).
5. THE Platform SHALL allow filtering the Sankey diagram by program, course, or semester scope.
6. THE Sankey_Diagram SHALL render within 2 seconds for institutions with up to 30 ILOs, 100 PLOs, and 500 CLOs.

---

#### Requirement 107: Visual Gap Analysis

**User Story:** As a Coordinator, I want a visual gap analysis view that highlights unmapped or under-assessed outcomes, so that I can identify and address curriculum gaps before accreditation reviews.

##### Acceptance Criteria

1. THE Gap_Analysis_View SHALL display all ILOs, PLOs, and CLOs in a hierarchical tree with status indicators: Fully Mapped (green), Partially Mapped (yellow), Unmapped (red), and No Evidence (gray).
2. WHEN a PLO has fewer than 2 mapped CLOs, THE Gap_Analysis_View SHALL flag the PLO as "Under-Mapped" with a warning icon.
3. WHEN a CLO has zero linked assessments in the current semester, THE Gap_Analysis_View SHALL flag the CLO as "Unassessed" with a warning icon.
4. THE Gap_Analysis_View SHALL provide a summary statistics bar showing: total outcomes, percentage fully mapped, percentage with evidence, and percentage meeting attainment targets.
5. WHEN a user clicks on a flagged outcome in the Gap_Analysis_View, THE Platform SHALL display recommended actions (e.g., "Add CLO mapping to PLO-3", "Create assessment for CLO-7").
6. THE Gap_Analysis_View SHALL be exportable as a PDF summary for accreditation documentation.

---

#### Requirement 108: Coverage Heatmap with Drill-Down

**User Story:** As a Coordinator, I want a coverage heatmap showing CLO assessment coverage across courses, so that I can verify that all outcomes are adequately assessed.

##### Acceptance Criteria

1. THE Coverage_Heatmap SHALL display a matrix with CLOs as rows and courses (or assessments) as columns, with cell color intensity representing the number of evidence records or attainment percentage.
2. THE Coverage_Heatmap SHALL use a sequential color scale: white (0 evidence) → light blue (1–5 evidence records) → dark blue (6+ evidence records), with an overlay toggle to switch to attainment percentage coloring.
3. WHEN a user clicks on a heatmap cell, THE Platform SHALL drill down to show individual student attainment records for that CLO × course intersection.
4. THE Coverage_Heatmap SHALL be filterable by semester, program, and attainment level threshold.
5. THE Coverage_Heatmap SHALL highlight empty cells (zero coverage) with a distinct border pattern to draw attention to assessment gaps.
6. THE Coverage_Heatmap SHALL render within 3 seconds for programs with up to 200 CLOs and 50 courses.

---

#### Requirement 109: Semester-Over-Semester Attainment Trends

**User Story:** As a Coordinator or Admin, I want to view attainment trends across semesters for CLOs, PLOs, and ILOs, so that I can track program improvement over time for accreditation evidence.

##### Acceptance Criteria

1. THE Semester_Trend_Engine SHALL calculate and store semester-level attainment snapshots for each CLO, PLO, and ILO at semester close.
2. THE Platform SHALL display a line chart showing attainment percentage over semesters (up to 8 semesters) for any selected outcome, with data points labeled by semester name.
3. WHEN a trend line shows a decline of 10 percentage points or more between consecutive semesters, THE Platform SHALL flag the outcome with a "Declining Trend" warning badge.
4. THE Platform SHALL allow side-by-side comparison of up to 4 outcomes on the same trend chart.
5. THE Platform SHALL provide a tabular view alongside the chart showing semester, attainment percentage, student count, and evidence count per data point.
6. THE Semester_Trend_Engine SHALL recalculate trend data within 5 minutes of semester close via a scheduled pg_cron job.

---

#### Requirement 110: Cohort Comparison Analytics

**User Story:** As a Coordinator, I want to compare attainment metrics between different student cohorts (by semester, section, or program year), so that I can identify which cohorts need additional support and measure intervention effectiveness.

##### Acceptance Criteria

1. THE Platform SHALL provide a Cohort_Comparison view allowing selection of two or more cohorts defined by: semester, course section, or program enrollment year.
2. THE Platform SHALL display a grouped bar chart comparing average attainment percentages per CLO or PLO across selected cohorts.
3. THE Platform SHALL calculate and display statistical significance indicators (effect size using Cohen's d) when comparing two cohorts with sample sizes of 20 or more students each.
4. THE Platform SHALL allow exporting cohort comparison data as CSV with columns: outcome_code, outcome_title, cohort_label, average_attainment, student_count, and standard_deviation.
5. WHEN a cohort's average attainment for an outcome is 15 percentage points or more below the comparison cohort, THE Platform SHALL highlight the cell in red with a "Significant Gap" label.
6. THE Cohort_Comparison view SHALL be accessible from the Coordinator and Admin dashboards.

---

#### Requirement 111: Historical Evidence Analysis

**User Story:** As an Admin, I want to analyze historical evidence data across multiple semesters, so that I can produce longitudinal accreditation reports showing continuous improvement.

##### Acceptance Criteria

1. THE Platform SHALL provide a Historical Evidence dashboard showing aggregated evidence statistics across all completed semesters: total evidence records, average attainment by outcome level (CLO/PLO/ILO), and distribution of attainment levels.
2. THE Platform SHALL display a stacked area chart showing the proportion of Excellent, Satisfactory, Developing, and Not_Yet evidence records per semester over time.
3. THE Platform SHALL allow filtering historical evidence by program, course, outcome, and Bloom's level.
4. THE Report_Generator SHALL produce a "Continuous Improvement Report" PDF containing trend charts, cohort comparisons, gap analysis summaries, and CQI action plan status for a selected date range.
5. THE Platform SHALL retain evidence data indefinitely (no automatic purging) to support longitudinal accreditation analysis.
6. THE Historical Evidence dashboard SHALL load within 4 seconds for institutions with up to 500,000 evidence records, using materialized views for aggregation.

---

### SECTION V: Habit Engine Enhancements

#### Requirement 112: Extended Habit Types

**User Story:** As a Student, I want additional daily habit types beyond Login, Submit, Journal, and Read, so that more of my learning activities are tracked and rewarded.

##### Acceptance Criteria

1. THE Habit_Tracker SHALL support 8 habit types: Login, Submit, Journal, Read, Collaborate, Practice, Review, and Mentor.
2. THE Collaborate_Habit SHALL be marked complete when a student posts a discussion question or answer in any enrolled course forum during the current day.
3. THE Practice_Habit SHALL be marked complete when a student completes at least one quiz attempt in any enrolled course during the current day.
4. THE Review_Habit SHALL be marked complete when a student submits a peer review for a classmate's work during the current day.
5. THE Mentor_Habit SHALL be marked complete when a student's discussion answer is marked as correct by a teacher, or when the student provides a documented help action during the current day.
6. THE XP_Engine SHALL award 15 XP for each newly completed extended habit type (Collaborate, Practice, Review, Mentor) per day.
7. THE Habit_Tracker SHALL display all 8 habits in the 7-day grid on the Student Dashboard, with completed habits shown as filled icons and incomplete habits as outlined icons.
8. THE Perfect_Day_Nudge logic SHALL be updated to consider all 8 habits: a Perfect Day requires completing at least 6 of 8 habits.

---

#### Requirement 113: Social Challenges — Team-Based Challenges

**User Story:** As a Teacher, I want to create team-based challenges where groups of students compete toward shared goals, so that students are motivated through collaboration and friendly competition.

##### Acceptance Criteria

1. WHEN a Teacher creates a Social_Challenge, THE Platform SHALL require: title, description, challenge type (team or course-wide), start date, end date, goal metric (total XP earned, habits completed, assignments submitted, or quiz score average), goal target value, and reward (XP bonus or badge).
2. THE Platform SHALL allow Teachers to assign existing Teams (see Requirement 115) to a team-based challenge, with a minimum of 2 teams and a maximum of 20 teams per challenge.
3. WHILE a Social_Challenge is active, THE Platform SHALL display a live progress bar for each participating team showing current progress toward the goal target.
4. WHEN a Social_Challenge ends, THE Platform SHALL determine the winning team(s) and distribute the reward to all members of the winning team(s) atomically.
5. THE Platform SHALL display active and completed challenges on the Student Dashboard in a dedicated "Challenges" tab.
6. IF a Social_Challenge has fewer than 2 participating teams at the start date, THEN THE Platform SHALL auto-cancel the challenge and notify the creating Teacher.

---

#### Requirement 114: Social Challenges — Course-Wide Challenges

**User Story:** As a Teacher, I want to create course-wide challenges with shared goals where all enrolled students contribute collectively, so that the entire class works together toward a common objective.

##### Acceptance Criteria

1. WHEN a Teacher creates a course-wide Social_Challenge, THE Platform SHALL set the participation scope to all enrolled students in the course (across all sections).
2. THE Platform SHALL aggregate individual student contributions toward the shared goal target and display a single course-wide progress bar.
3. WHEN the course-wide goal is achieved, THE Platform SHALL distribute the reward to all enrolled students who contributed at least one qualifying action during the challenge period.
4. THE Platform SHALL display a contribution leaderboard within the course-wide challenge showing each student's individual contribution to the shared goal.
5. THE Platform SHALL limit active course-wide challenges to a maximum of 3 per course at any time.
6. WHEN a course-wide challenge reaches 90% of the goal target, THE Notification_Service SHALL send a push notification to all enrolled students: "Almost there — [X]% of the goal reached."

---

#### Requirement 115: Team Management

**User Story:** As a Teacher, I want to create and manage student teams within my course, so that teams can participate in team-based challenges and earn collective rewards.

##### Acceptance Criteria

1. WHEN a Teacher creates a Team, THE Platform SHALL insert a record into a `teams` table with `name`, `course_id`, `created_by` (teacher_id), and auto-generate a team avatar using the first letter of the team name.
2. THE Platform SHALL enforce team size limits: minimum 2 members and maximum 6 members per team.
3. THE Platform SHALL prevent a student from being a member of more than one team within the same course.
4. THE Platform SHALL allow Teachers to auto-generate balanced teams by randomly distributing enrolled students into teams of a specified size.
5. WHEN a student is removed from a team, THE Platform SHALL retain the student's historical contribution to team XP and challenge progress.
6. THE Platform SHALL display team membership on the Student Dashboard course card with the team name and member avatars.

---

#### Requirement 116: Team-Based Gamification — Shared XP Pool

**User Story:** As a Student on a team, I want my individual XP contributions to also feed into a shared team XP pool, so that my team progresses together.

##### Acceptance Criteria

1. WHEN a student who is a team member earns XP from any action, THE XP_Engine SHALL credit 100% of the XP to the student's individual balance AND credit 50% of the XP (rounded down) to the team's shared XP pool.
2. THE Platform SHALL store team XP in a `team_gamification` table with `team_id`, `xp_total`, `xp_this_week`, and `streak_current`.
3. THE Platform SHALL display the team XP pool on the Team Dashboard card alongside individual XP.
4. THE XP_Engine SHALL log team XP contributions as separate `xp_transactions` records with `scope = 'team'` and `team_id`.
5. THE Platform SHALL NOT allow direct transfer of individual XP to team XP or vice versa outside the automatic 50% contribution.

---

#### Requirement 117: Team Leaderboard

**User Story:** As a Student, I want to see how my team ranks against other teams, so that team competition motivates collaborative engagement.

##### Acceptance Criteria

1. THE Team_Leaderboard SHALL display all teams within a course ranked by team XP (weekly and all-time views).
2. THE Team_Leaderboard SHALL show for each team: rank, team name, team avatar, member count, total team XP, and weekly team XP.
3. THE Team_Leaderboard SHALL highlight the current student's team with a distinct visual indicator.
4. THE Team_Leaderboard SHALL update in real time via Supabase Realtime subscriptions.
5. THE Platform SHALL display the top 3 teams with Gold, Silver, and Bronze styling consistent with the individual leaderboard design.
6. THE Team_Leaderboard SHALL be accessible from the Student Dashboard and the course detail page.

---

#### Requirement 118: Team Badges

**User Story:** As a team member, I want my team to earn collective badges for team milestones, so that we have shared achievements to celebrate.

##### Acceptance Criteria

1. THE Badge_System SHALL support a `team` badge scope in addition to the existing `individual` scope, stored as `scope = 'team'` in the `badges` table.
2. THE Badge_System SHALL award team badges for defined milestones: Team Spirit (team earns 500 XP), Unstoppable (team wins 3 challenges), Dream Team (all members complete a Perfect Day on the same day), Study Squad (team maintains a 7-day team streak).
3. WHEN a team badge is awarded, THE Platform SHALL display an animated notification to all online team members simultaneously.
4. Team badges SHALL be displayed on the Team Dashboard card and on each team member's profile under a "Team Badges" section.
5. Team badge awards SHALL be atomic and idempotent (cannot be awarded twice for the same trigger and team).

---

#### Requirement 119: Team Streaks

**User Story:** As a team member, I want my team to maintain a collective streak when all members are active daily, so that we motivate each other to stay consistent.

##### Acceptance Criteria

1. THE Streak_Tracker SHALL calculate a team streak: the team streak increments when ALL team members log in on the same calendar day.
2. WHEN any team member misses a day, THE team streak SHALL reset to 0.
3. THE Platform SHALL store team streak data in the `team_gamification` table with `streak_current` and `streak_longest`.
4. THE Platform SHALL display the team streak on the Team Dashboard card with a flame icon consistent with individual streak styling.
5. Team streak milestones (7, 14, 30 days) SHALL trigger team badge awards and bonus XP to the team pool (100, 250, 500 XP respectively).
6. THE Platform SHALL send a notification to all team members at 8 PM (institution timezone) if any team member has not logged in that day: "Your team streak is at risk — [member_name] hasn't logged in today."

---

#### Requirement 120: Adaptive XP Scaling — Level-Based Adjustment

**User Story:** As the system, I want XP awards to scale based on student level, so that higher-level students are not over-rewarded for trivial actions and lower-level students receive encouragement.

##### Acceptance Criteria

1. THE Adaptive_XP_Engine SHALL apply an XP_Multiplier based on student level: Levels 1–5 receive a 1.2x multiplier (encouragement bonus), Levels 6–10 receive 1.0x (baseline), Levels 11–15 receive 0.9x, and Levels 16–20 receive 0.8x.
2. THE XP_Engine SHALL calculate final XP as: `floor(base_xp × level_multiplier × difficulty_multiplier)`.
3. THE `xp_transactions` table SHALL store both `base_xp` and `final_xp` fields, along with the applied `multiplier` value for auditability.
4. WHEN a student levels up, THE Adaptive_XP_Engine SHALL recalculate the level multiplier immediately for subsequent XP awards.
5. THE Platform SHALL display the current XP multiplier on the Student Dashboard gamification card.

---

#### Requirement 121: Adaptive XP Scaling — Difficulty-Based Adjustment

**User Story:** As the system, I want XP awards to scale based on task difficulty, so that students are rewarded proportionally to the cognitive effort required.

##### Acceptance Criteria

1. THE Adaptive_XP_Engine SHALL assign a difficulty multiplier based on the Bloom's Taxonomy level of the linked CLO: Remembering (1.0x), Understanding (1.1x), Applying (1.2x), Analyzing (1.3x), Evaluating (1.4x), Creating (1.5x).
2. WHEN a student submits an assignment linked to multiple CLOs, THE Adaptive_XP_Engine SHALL use the highest Bloom's level among the linked CLOs for the difficulty multiplier.
3. THE Platform SHALL display the difficulty multiplier on the assignment detail page as a "Difficulty Bonus" indicator with the Bloom's level badge.
4. THE XP_Engine SHALL log the `difficulty_multiplier` in the `xp_transactions` record for each XP award.

---

#### Requirement 122: Adaptive XP Scaling — Diminishing Returns

**User Story:** As the system, I want to apply diminishing returns for repetitive actions within a short window, so that XP farming is discouraged and diverse learning behaviors are rewarded.

##### Acceptance Criteria

1. THE Adaptive_XP_Engine SHALL apply a Diminishing_Returns_Rule: for each repeated action type (e.g., multiple quiz completions) within a rolling 24-hour window, the XP multiplier decreases by 0.2x per repetition after the first (1.0x → 0.8x → 0.6x → 0.4x → 0.2x minimum).
2. THE Adaptive_XP_Engine SHALL track action counts per student per action type in a rolling 24-hour window using the `xp_transactions` table timestamps.
3. THE Platform SHALL display a "Diminishing Returns" indicator on the Student Dashboard when a student's next action of a given type would receive reduced XP.
4. THE Diminishing_Returns_Rule SHALL reset for each action type independently after 24 hours from the first action in the window.
5. THE Diminishing_Returns_Rule SHALL NOT apply to one-time milestone rewards (streak milestones, badge awards, level-up bonuses).

---

#### Requirement 123: Adaptive XP Scaling — Improvement Bonus

**User Story:** As the system, I want to award bonus XP to struggling students who show measurable improvement, so that the gamification system encourages growth rather than only rewarding high performers.

##### Acceptance Criteria

1. WHEN a student's attainment for a CLO improves by 15 percentage points or more compared to their previous assessment on the same CLO, THE Adaptive_XP_Engine SHALL award an "Improvement Bonus" of 50 XP in addition to the standard XP award.
2. THE Adaptive_XP_Engine SHALL calculate improvement by comparing the current evidence score percentage to the student's previous evidence score percentage for the same CLO.
3. WHEN an Improvement Bonus is awarded, THE Platform SHALL display a celebratory animation with the message "Great improvement on [CLO title]" and the bonus XP amount.
4. THE Badge_System SHALL award a "Comeback Kid" badge when a student earns 3 Improvement Bonuses within a single semester.
5. THE `xp_transactions` record for an Improvement Bonus SHALL include `action_type = 'improvement_bonus'` and a reference to the CLO and previous/current scores.

