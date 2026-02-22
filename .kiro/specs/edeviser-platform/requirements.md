# Requirements Document — Edeviser Platform (MVP / Phase 1)

## Introduction

Edeviser is a Human-Centric Outcome-Based Education (OBE) + Gamification platform for higher education institutions. The platform fuses accreditation compliance with student engagement through a Dual-Engine Architecture: an OBE Core that automates ILO → PLO → CLO mapping, rubric-based grading, and evidence rollup; and a Habit Core that motivates students via XP, streaks, badges, levels, and leaderboards. The MVP (Phase 1) delivers the core OBE engine, gamification foundation, role-based dashboards, and essential administrative features using React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui, and Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) deployed on Vercel.

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
- **Report_Generator**: The subsystem (Edge Function + Puppeteer) that produces accreditation PDF reports
- **Curriculum_Matrix**: The visual PLO × Course matrix showing CLO coverage and attainment percentages
- **Audit_Logger**: The subsystem that records administrative actions to the immutable `audit_logs` table
- **Bloom's_Level**: One of six cognitive levels (Remembering, Understanding, Applying, Analyzing, Evaluating, Creating) assigned to each CLO
- **Attainment_Level**: A classification of student performance — Excellent (≥85%), Satisfactory (70–84%), Developing (50–69%), Not_Yet (<50%)

## Requirements

### Requirement 1: Email/Password Authentication

**User Story:** As a user (Admin, Coordinator, Teacher, or Student), I want to log in with my institutional email and password, so that I can securely access the platform.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE Auth_Module SHALL authenticate the user and issue a JWT session token within 2 seconds.
2. WHEN a user submits invalid credentials 5 times consecutively from the same IP address, THE Auth_Module SHALL lock the account for 15 minutes and log the lockout event to the Audit_Logger.
3. WHEN a user submits invalid credentials, THE Auth_Module SHALL display a generic error message that does not reveal whether the email or password was incorrect.
4. THE Auth_Module SHALL store passwords using Supabase Auth (GoTrue) with bcrypt hashing and enforce a minimum password length of 8 characters.
5. IF the Supabase Auth service is unreachable, THEN THE Auth_Module SHALL display a descriptive error message and retry the request once after 2 seconds.

---

### Requirement 2: Role-Based Access Control (RBAC)

**User Story:** As an institution, I want each user to have a defined role (admin, coordinator, teacher, student) with enforced data access boundaries, so that sensitive data is isolated per role.

#### Acceptance Criteria

1. THE RBAC_Engine SHALL enforce data isolation via Supabase Row Level Security policies on every database table.
2. WHEN a user with the `student` role attempts to access ILO records, THE RBAC_Engine SHALL deny the request and return an HTTP 403 response.
3. WHEN a user with the `teacher` role queries learning outcomes, THE RBAC_Engine SHALL return only CLOs belonging to courses assigned to that Teacher.
4. WHEN a user with the `coordinator` role queries learning outcomes, THE RBAC_Engine SHALL return only PLOs belonging to programs assigned to that Coordinator, plus all ILOs in the institution.
5. WHEN a user with the `admin` role queries any table, THE RBAC_Engine SHALL return only records belonging to the Admin's institution.

---

### Requirement 3: Role-Aware Post-Login Redirect

**User Story:** As a user, I want to be redirected to my role-specific dashboard after login, so that I immediately see relevant information.

#### Acceptance Criteria

1. WHEN a user successfully authenticates, THE Platform SHALL redirect the user to their role-specific dashboard path (`/admin`, `/coordinator`, `/teacher`, `/student`) within 500 milliseconds.
2. WHEN an authenticated user navigates directly to a dashboard URL for a different role, THE Platform SHALL redirect the user to their own role dashboard and display an "Access Denied" message.
3. WHEN an unauthenticated user navigates to any protected route, THE Platform SHALL redirect the user to the `/login` page.

---

### Requirement 4: Session Persistence and Refresh

**User Story:** As a user, I want my session to persist across browser refreshes and tabs, so that I do not need to re-login frequently.

#### Acceptance Criteria

1. THE Auth_Module SHALL persist user sessions across browser refreshes using Supabase's automatic token refresh mechanism.
2. WHILE a user session is active, THE Auth_Module SHALL automatically refresh the JWT token before expiration without user intervention.
3. WHEN a user session has been idle for 8 hours, THE Auth_Module SHALL expire the session and redirect the user to the login page.
4. THE Auth_Module SHALL maintain active sessions for up to 24 hours of continuous use before requiring re-authentication.

---

### Requirement 5: Admin User Provisioning

**User Story:** As an Admin, I want to create, view, update, and soft-delete user accounts within my institution, so that I can manage platform access.

#### Acceptance Criteria

1. WHEN an Admin creates a new user, THE Platform SHALL insert a record into the `profiles` table with the specified `full_name`, `email`, `role`, and `institution_id`.
2. WHEN an Admin soft-deletes a user, THE Platform SHALL set `is_active` to `false` on the profile record, preventing login while preserving all historical evidence and grade records.
3. WHEN an Admin updates a user's role, THE Platform SHALL log the change to the Audit_Logger with before/after values.
4. THE Platform SHALL prevent an Admin from deleting or modifying their own admin account.
5. WHEN an Admin views the user list, THE Platform SHALL display all users within the Admin's institution with filtering by role and search by name or email.

---

### Requirement 6: Bulk User Import

**User Story:** As an Admin, I want to upload a CSV file to bulk-create user accounts, so that I can onboard large numbers of users efficiently.

#### Acceptance Criteria

1. WHEN an Admin uploads a CSV file with columns (`email`, `full_name`, `role`, `program_id`), THE Platform SHALL validate the file format and content before processing.
2. WHEN the CSV contains invalid rows (missing required fields, invalid email format, invalid role, non-existent program_id), THE Platform SHALL reject those rows and display a list of errors with row numbers and descriptions.
3. WHEN the CSV contains valid rows, THE Platform SHALL create all valid user accounts atomically and send email invitations to each created user.
4. IF the CSV file exceeds 1000 rows, THEN THE Platform SHALL reject the upload and display a message indicating the maximum batch size.

---

### Requirement 7: Institutional Learning Outcomes (ILO) Management

**User Story:** As an Admin, I want to create, read, update, and delete Institutional Learning Outcomes, so that I can define the top-level educational goals for my institution.

#### Acceptance Criteria

1. WHEN an Admin creates an ILO, THE Outcome_Manager SHALL insert a record into the `learning_outcomes` table with `type = 'ILO'`, `title` (max 255 characters), `description`, and the Admin's `institution_id`.
2. WHEN an Admin attempts to delete an ILO that has mapped PLOs, THE Outcome_Manager SHALL block the deletion and display the list of dependent PLOs.
3. WHEN an Admin reorders ILOs, THE Outcome_Manager SHALL update the `sort_order` field for all affected records.
4. THE Outcome_Manager SHALL enforce a configurable soft limit of 30 ILOs per institution, displaying a warning when the limit is reached.
5. WHEN an Admin modifies or deletes an ILO, THE Audit_Logger SHALL record the action with before/after snapshots.
