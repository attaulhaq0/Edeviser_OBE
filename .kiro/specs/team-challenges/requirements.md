# Requirements Document — Team Challenges & Social Quests

## Introduction

The Team Challenges feature introduces collaborative and competitive social learning to Edeviser. Currently, the gamification engine operates entirely at the individual level: students earn XP, maintain streaks, collect badges, and compete on individual leaderboards. This feature adds: (1) Teams — named groups of 2–6 students within a course, with collective XP pools, team streaks, and team badges; (2) Social Challenges (Quests) — time-bounded competitive events where teams or individuals work toward defined goals (academic, habit, XP race, Bloom's Climb) with tracked progress and rewards; (3) a Team Leaderboard — a separate leaderboard tab ranking teams by collective XP, scoped to course or program level, with real-time updates via Supabase Realtime; (4) Themed Quest Worlds (Phase 2) — narrative-arc quest collections organized by academic theme; (5) Contribution Accountability — a minimum contribution threshold system that detects and flags free-riding team members, with warnings, team-visible status indicators, and teacher oversight; (6) Cooperative Challenge Mode — a default cooperative challenge type where teams collectively reach goals, balanced with optional competitive XP Races, plus a Cooperation Score rewarding equitable participation; (7) Peer Teaching Moments — a peer instruction mechanism where students who master a CLO can create explanations for teammates, with ratings, XP rewards for both parties, and Teaching Impact tracking; and (8) AI-Powered Team Health Monitoring — automated analysis of team participation patterns using Gini coefficient on XP contributions, engagement trends, and activity overlap, with weekly teacher reports and restructuring recommendations. The feature integrates with the existing Supabase backend (PostgreSQL + RLS, Edge Functions, Realtime), TanStack Query hooks, and the existing XP/level/streak/badge/leaderboard subsystems.

## Glossary

- **Team**: A named group of 2–6 students within a single course, created by a Teacher (teacher-assigned mode) or by Students (student-formed mode, configurable per course), with a collective XP pool, team streak, and team badge collection
- **Team_Member**: A record linking a student to a Team, stored in the `team_members` table with a role indicator (captain or member) and join timestamp
- **Team_XP**: The collective XP pool for a Team, computed as the SUM of individual `xp_transactions.xp_amount` earned by Team_Members during active team membership periods, scoped to XP earned within the Team's course
- **Team_Streak**: The count of consecutive calendar days (UTC) on which at least one Team_Member completed at least one daily habit (Login, Submit, Journal, or Read), tracked in the `teams` table
- **Team_Badge**: A badge earned collectively by a Team when the Team meets a defined milestone (e.g., team streak of 14 days, all members submit an assignment on the same day), stored in the `team_badges` table
- **Team_Profile**: The student-facing page displaying a Team's name, avatar, member list, collective stats (Team_XP, Team_Streak, member count), and earned Team_Badges
- **Social_Challenge**: A time-bounded competitive event created by a Teacher for a course, defining a goal, challenge type, participation mode (team or individual), start and end dates, and reward configuration
- **Challenge_Type**: The category of a Social_Challenge — one of: Academic (complete N assignments), Habit (maintain a streak for N days), XP_Race (first to earn N XP), or Blooms_Climb (complete assignments at every Bloom's Taxonomy level)
- **Challenge_Progress**: A record tracking a participant's (team or individual) cumulative progress toward a Social_Challenge goal, stored in the `challenge_progress` table and updated in real-time
- **Challenge_Reward**: The prize awarded to participants who complete or win a Social_Challenge — includes XP bonus amount, optional exclusive Badge, and optional Marketplace_Item (if XP Marketplace feature is active)
- **Challenge_Leaderboard**: A ranking of participants within a Social_Challenge, ordered by Challenge_Progress percentage or completion time, displayed on the challenge detail page
- **Team_Leaderboard**: A separate tab on the existing leaderboard page ranking Teams by Team_XP, scoped to course or program level, with real-time updates via Supabase Realtime
- **Team_Formation_Mode**: A per-course setting controlling how Teams are created — "teacher_assigned" (only the Teacher can create and assign teams) or "student_formed" (students can create teams and invite peers, subject to size limits)
- **Quest_World**: (Phase 2) A themed collection of Social_Challenges organized into a narrative arc (e.g., "Enchanted Forest" for Literature, "Tech Tower" for Computer Science), with progressive difficulty and a world-completion badge
- **Contribution_Threshold**: The minimum percentage of a Team's weekly XP that each Team_Member must contribute to remain classified as "active" — default 20%, configurable per institution
- **Contribution_Status**: A per-member status indicator — "active" (meeting threshold), "warning" (below threshold for 3+ days), or "inactive" (below threshold for 5+ days), visible on the Team_Profile and to the Teacher
- **Cooperation_Score**: A team-level metric (0–100) that measures how equitably all Team_Members contribute above the Contribution_Threshold, rewarding teams where every member participates rather than relying on top performers
- **Cooperative_Challenge**: A Social_Challenge where the team collectively works toward a shared goal (e.g., "Team earns 1000 XP together") without racing against other teams — the default challenge type
- **Peer_Teaching_Moment**: A short explanation (text, audio link, or video link) created by a Team_Member who has mastered a CLO (≥85% attainment), shared with teammates to help them understand the concept
- **Teaching_Impact**: A metric tracking how much a teammate's CLO attainment improves after viewing a Peer_Teaching_Moment, computed as the delta between pre-view and post-view attainment scores
- **Team_Health_Score**: An AI-computed composite score (0–100) for a Team, derived from XP contribution distribution (Gini coefficient), engagement trend (rising/stable/declining), challenge participation rate, and activity timing overlap among members
- **Gini_Coefficient**: A statistical measure of inequality in XP contributions within a Team, ranging from 0 (perfect equality) to 1 (maximum inequality) — teams with Gini > 0.6 are flagged as high-inequality
- **Team_Health_Report**: A weekly automated report generated for Teachers summarizing each Team's health indicators, flagging at-risk teams, and providing specific recommendations (e.g., member reassignment, intervention)

## Requirements

### SECTION A: Team Management

#### Requirement 1: Team Creation — Teacher-Assigned Mode

**User Story:** As a Teacher, I want to create and assign student teams for my course, so that I can organize collaborative learning groups.

##### Acceptance Criteria

1. THE Teacher SHALL be able to create a Team by specifying: team name (unique within the course), and an initial list of 2–6 student members selected from the course enrollment roster.
2. WHEN a Teacher creates a Team, THE Platform SHALL insert a `teams` record and corresponding `team_members` records, designating the first listed student as captain by default.
3. THE Teacher SHALL be able to edit a Team's name and membership (add or remove students) at any time during the course.
4. WHEN a Teacher removes a student from a Team, THE Platform SHALL preserve the student's historical Team_XP contributions in `xp_transactions` but exclude future XP from the Team_XP calculation for that Team.
5. IF a Teacher attempts to add a student who is already a member of another Team in the same course, THEN THE Platform SHALL reject the addition and display a message identifying the student's existing Team.
6. THE Teacher SHALL be able to delete a Team that has no active Social_Challenge participation; deletion soft-deletes the `teams` record (sets `deleted_at` timestamp) and preserves historical data.

---

#### Requirement 2: Team Creation — Student-Formed Mode

**User Story:** As a Student, I want to form my own team with classmates, so that I can collaborate with peers I work well with.

##### Acceptance Criteria

1. WHILE the course Team_Formation_Mode is set to "student_formed", THE Platform SHALL allow any enrolled student who is not already on a Team to create a new Team by specifying a team name.
2. WHEN a Student creates a Team, THE Platform SHALL designate that student as the team captain.
3. THE team captain SHALL be able to invite other enrolled students (who are not already on a Team in the same course) by selecting from the course roster.
4. WHEN an invited student accepts the invitation, THE Platform SHALL add the student as a Team_Member.
5. WHEN an invited student declines the invitation, THE Platform SHALL remove the pending invitation record.
6. IF a Team's member count would exceed 6 after an invitation acceptance, THEN THE Platform SHALL reject the acceptance and display a message indicating the Team is full.
7. THE team captain SHALL be able to remove members from the Team; removed members become eligible to join or form another Team.
8. WHILE the course Team_Formation_Mode is set to "teacher_assigned", THE Platform SHALL hide the team creation and invitation UI from students.

---

#### Requirement 3: Team Formation Mode Configuration

**User Story:** As a Teacher, I want to configure whether teams are teacher-assigned or student-formed for my course, so that I can choose the collaboration model that fits my pedagogy.

##### Acceptance Criteria

1. THE Teacher SHALL be able to set the Team_Formation_Mode for each course via the course settings page, choosing between "teacher_assigned" and "student_formed".
2. THE Platform SHALL default Team_Formation_Mode to "teacher_assigned" for new courses.
3. WHEN a Teacher changes Team_Formation_Mode from "student_formed" to "teacher_assigned", THE Platform SHALL preserve existing student-formed Teams but prevent students from creating new Teams or sending invitations.
4. WHEN a Teacher changes Team_Formation_Mode from "teacher_assigned" to "student_formed", THE Platform SHALL preserve existing teacher-assigned Teams and allow students without a Team to form new ones.

---

#### Requirement 4: Team Profile Page

**User Story:** As a Student, I want to view my team's profile page, so that I can see our collective stats, members, and earned badges.

##### Acceptance Criteria

1. THE Team_Profile page SHALL display: team name, team avatar (auto-generated from team name initials), member list with each member's name and role (captain or member), Team_XP total, Team_Streak count, member count, and earned Team_Badges.
2. THE Team_Profile page SHALL display a Team_XP breakdown showing each member's XP contribution to the team pool.
3. THE Team_Profile page SHALL display active Social_Challenges the Team is participating in, with current Challenge_Progress for each.
4. WHEN a student is not a member of any Team, THE Platform SHALL display a prompt to join or create a Team (based on Team_Formation_Mode).
5. THE Team_Profile page SHALL be accessible to all enrolled students in the course (not restricted to team members), enabling cross-team visibility.

---

### SECTION B: Team XP and Streaks

#### Requirement 5: Team XP Computation

**User Story:** As a Student, I want to see my team's collective XP, so that I can track our team's progress and compare with other teams.

##### Acceptance Criteria

1. THE Platform SHALL compute Team_XP as the SUM of `xp_transactions.xp_amount` for all active Team_Members, scoped to XP earned within the Team's course (transactions where the `course_id` or related assignment belongs to the Team's course) during each member's active membership period.
2. WHEN a new XP transaction is recorded for a Team_Member within the Team's course, THE Platform SHALL update the Team_XP total within 2 seconds via Supabase Realtime subscription and TanStack Query invalidation.
3. THE Team_Profile page SHALL display the Team_XP total prominently alongside individual member contributions.
4. THE Team_XP computation SHALL exclude XP earned by a student before joining the Team or after being removed from the Team.

---

#### Requirement 6: Team Streak

**User Story:** As a Student, I want my team to maintain a collective streak, so that we are motivated to support each other's daily engagement.

##### Acceptance Criteria

1. THE Platform SHALL compute Team_Streak as the count of consecutive calendar days (UTC) on which at least one Team_Member completed at least one academic habit (Login, Submit, Journal, or Read).
2. WHEN a calendar day passes with no Team_Member completing any academic habit, THE Platform SHALL reset the Team_Streak to 0.
3. THE Team_Streak SHALL be updated by a pg_cron job that runs daily at midnight UTC, checking the previous day's `habit_logs` for each active Team.
4. WHEN a Team_Streak reaches a milestone (7, 14, 30 days), THE Platform SHALL award a Team_Badge and notify all Team_Members via in-app notification.
5. THE Team_Profile page SHALL display the current Team_Streak with the streak flame icon, consistent with the individual streak display design.

---

#### Requirement 7: Team Badges

**User Story:** As a Student, I want my team to earn badges for collective achievements, so that we have shared goals to work toward.

##### Acceptance Criteria

1. THE Platform SHALL define the following Team_Badges: "Team Spirit" (all members submit an assignment on the same calendar day), "Streak Squad" (Team_Streak reaches 7 days), "Streak Champions" (Team_Streak reaches 14 days), "Streak Legends" (Team_Streak reaches 30 days), "Full House" (Team reaches maximum 6 members), "Quest Conquerors" (Team completes 3 Social_Challenges).
2. WHEN a Team earns a Team_Badge, THE Platform SHALL insert a `team_badges` record and notify all Team_Members via in-app notification with the `badge-pop` animation.
3. THE Team_Badge check logic SHALL be idempotent — a Team cannot earn the same badge twice.
4. THE Team_Profile page SHALL display all earned Team_Badges in a badge collection grid.
5. THE Team_Badge definitions SHALL be stored in a configuration file at `src/lib/teamBadgeDefinitions.ts`, following the same pattern as the existing `badgeDefinitions.ts`.

---

### SECTION C: Social Challenges (Quests)

#### Requirement 8: Challenge Creation

**User Story:** As a Teacher, I want to create social challenges for my course, so that I can drive engagement through competitive and collaborative goals.

##### Acceptance Criteria

1. THE Teacher SHALL be able to create a Social_Challenge by specifying: title, description, Challenge_Type (Academic, Habit, XP_Race, or Blooms_Climb), participation mode (team or individual), goal target (numeric value appropriate to the Challenge_Type), start date, end date, and Challenge_Reward configuration.
2. WHEN Challenge_Type is "Academic", THE Teacher SHALL specify the target number of assignments to complete (e.g., "Complete 10 assignments").
3. WHEN Challenge_Type is "Habit", THE Teacher SHALL specify the target streak duration in days (e.g., "Maintain a streak for 14 days").
4. WHEN Challenge_Type is "XP_Race", THE Teacher SHALL specify the target XP amount (e.g., "First to earn 500 XP").
5. WHEN Challenge_Type is "Blooms_Climb", THE goal SHALL be fixed: complete at least one assignment at each of the 6 Bloom's Taxonomy levels (Remembering through Creating).
6. THE Teacher SHALL configure the Challenge_Reward: XP bonus amount (required, range 50–500), optional exclusive badge (selected from a predefined set of challenge badges), and optional note.
7. THE start date SHALL be at least 1 hour in the future at the time of creation.
8. THE end date SHALL be after the start date, with a minimum challenge duration of 24 hours and a maximum of 90 days.

---

#### Requirement 9: Challenge Participation and Enrollment

**User Story:** As a Student, I want to join social challenges with my team or individually, so that I can compete and earn rewards.

##### Acceptance Criteria

1. WHEN a Social_Challenge has participation mode "team", THE Platform SHALL automatically enroll all active Teams in the course as participants when the challenge starts.
2. WHEN a Social_Challenge has participation mode "individual", THE Platform SHALL automatically enroll all enrolled students in the course as participants when the challenge starts.
3. THE Platform SHALL create a `challenge_progress` record for each participant (team or individual) when the challenge starts, initialized with progress value 0.
4. WHEN a Social_Challenge has participation mode "team" and a student is not a member of any Team, THE Platform SHALL display a message on the challenge detail page indicating the student must join a Team to participate.
5. THE challenge list page SHALL display all active, upcoming, and recently completed challenges for the student's enrolled courses.

---

#### Requirement 10: Challenge Progress Tracking

**User Story:** As a Student, I want to see real-time progress toward challenge goals, so that I know how close my team or I am to completing the challenge.

##### Acceptance Criteria

1. WHEN Challenge_Type is "Academic", THE Platform SHALL increment the participant's Challenge_Progress by 1 each time a qualifying assignment submission is graded within the challenge's course and date range.
2. WHEN Challenge_Type is "Habit", THE Platform SHALL update the participant's Challenge_Progress to reflect the current consecutive streak days maintained during the challenge period.
3. WHEN Challenge_Type is "XP_Race", THE Platform SHALL update the participant's Challenge_Progress to reflect the total XP earned within the challenge's course during the challenge period.
4. WHEN Challenge_Type is "Blooms_Climb", THE Platform SHALL track which Bloom's levels have been completed (via graded assignments) and update Challenge_Progress as the count of distinct levels achieved (0–6).
5. THE challenge detail page SHALL display a progress bar for the current participant showing: current progress value, goal target, and percentage complete.
6. THE Challenge_Progress SHALL be updated within 5 seconds of the triggering event (grade submission, habit log, XP award) via an Edge Function that listens to relevant database events.
7. WHEN a participant's Challenge_Progress reaches or exceeds the goal target, THE Platform SHALL mark the participant as "completed" and award the Challenge_Reward.

---

#### Requirement 11: Challenge Leaderboard

**User Story:** As a Student, I want to see how my team or I rank against other participants in a challenge, so that the competition motivates me to engage more.

##### Acceptance Criteria

1. THE challenge detail page SHALL display a Challenge_Leaderboard ranking all participants by Challenge_Progress (descending), with ties broken by earlier completion time.
2. Each Challenge_Leaderboard entry SHALL display: rank, participant name (team name or student name), current progress value, progress percentage, and completion status (in progress or completed with timestamp).
3. WHEN a participant has opted into anonymous leaderboard mode (individual challenges), THE Challenge_Leaderboard SHALL display "Anonymous" for that participant's name.
4. THE Challenge_Leaderboard SHALL update in real-time via Supabase Realtime subscription on the `challenge_progress` table.
5. THE current participant's entry SHALL be highlighted on the Challenge_Leaderboard, consistent with the existing individual leaderboard highlight pattern.

---

#### Requirement 12: Challenge Completion and Rewards

**User Story:** As a Student, I want to receive rewards when my team or I complete a challenge, so that the effort feels worthwhile.

##### Acceptance Criteria

1. WHEN a participant completes a Social_Challenge (Challenge_Progress reaches the goal target), THE Platform SHALL award the configured XP bonus to each team member (for team challenges) or to the individual student (for individual challenges) via the existing `award-xp` Edge Function with source `challenge_reward`.
2. WHEN a Social_Challenge has an exclusive badge reward, THE Platform SHALL award the badge to each team member (for team challenges) or to the individual student (for individual challenges) via the existing `check-badges` pipeline.
3. WHEN a Social_Challenge end date is reached, THE Platform SHALL mark the challenge as "ended" and prevent further progress updates.
4. WHEN a Social_Challenge ends, THE Platform SHALL display final rankings on the challenge detail page with a "Challenge Complete" banner.
5. THE Platform SHALL award rewards only once per participant per challenge, enforced by a unique constraint on (challenge_id, participant_id) in the reward tracking.
6. WHEN a Social_Challenge has participation mode "team", THE XP reward SHALL be awarded to each individual team member (not split among members).

---

### SECTION D: Team Leaderboard

#### Requirement 13: Team Leaderboard Display

**User Story:** As a Student, I want to see a team leaderboard ranking teams by collective XP, so that I can see how my team compares to others.

##### Acceptance Criteria

1. THE existing leaderboard page SHALL include a "Teams" tab alongside the existing individual leaderboard tabs.
2. THE Team_Leaderboard SHALL display teams ranked by Team_XP in descending order, showing: rank, team name, Team_XP total, Team_Streak count, and member count.
3. THE Team_Leaderboard SHALL support scoping by course (showing teams within a selected course) and by program (showing teams across all courses in a program).
4. THE Team_Leaderboard SHALL display the current student's Team entry highlighted, consistent with the existing individual leaderboard highlight pattern (ring-2 ring-blue-400).
5. WHEN a student is not a member of any Team, THE Team_Leaderboard SHALL display the rankings without a highlighted entry and show a prompt to join a Team.
6. THE Team_Leaderboard SHALL display medal icons (gold, silver, bronze) for the top 3 teams, consistent with the existing individual leaderboard medal styling.

---

#### Requirement 14: Team Leaderboard Real-Time Updates

**User Story:** As a Student, I want the team leaderboard to update in real-time, so that I can see ranking changes as they happen.

##### Acceptance Criteria

1. THE Team_Leaderboard SHALL subscribe to Supabase Realtime changes on the `teams` table (for Team_XP and Team_Streak updates) and invalidate TanStack Query caches to trigger a refetch.
2. WHEN a Team's XP total changes, THE Team_Leaderboard SHALL reflect the updated ranking within 5 seconds.
3. IF the Supabase Realtime connection fails, THEN THE Team_Leaderboard SHALL fall back to polling with a 30-second refetch interval and display a "Live updates paused" indicator.
4. THE Realtime subscription SHALL be scoped to the student's institution to avoid receiving irrelevant change events.

---

### SECTION E: Data Model and Security

#### Requirement 15: Team and Challenge Data Model

**User Story:** As the system, I want a well-structured data model for teams, challenges, and progress tracking, so that collaborative features are stored efficiently with proper access control.

##### Acceptance Criteria

1. THE Platform SHALL create a `teams` table with columns: `id` (uuid PK), `course_id` (FK to courses), `institution_id` (FK to institutions), `name` (text, unique within course), `captain_id` (FK to profiles), `xp_total` (integer, default 0), `streak_count` (integer, default 0), `streak_last_active_date` (date, nullable), `created_by` (FK to profiles), `created_at` (timestamptz), `updated_at` (timestamptz), `deleted_at` (timestamptz, nullable).
2. THE Platform SHALL create a `team_members` table with columns: `id` (uuid PK), `team_id` (FK to teams), `student_id` (FK to profiles), `role` (enum: captain, member), `joined_at` (timestamptz), `left_at` (timestamptz, nullable), with a unique constraint on (team_id, student_id) where `left_at IS NULL` to enforce one active team per student per course.
3. THE Platform SHALL create a `team_invitations` table with columns: `id` (uuid PK), `team_id` (FK to teams), `invited_student_id` (FK to profiles), `invited_by` (FK to profiles), `status` (enum: pending, accepted, declined, expired), `created_at` (timestamptz), `responded_at` (timestamptz, nullable).
4. THE Platform SHALL create a `social_challenges` table with columns: `id` (uuid PK), `course_id` (FK to courses), `institution_id` (FK to institutions), `title` (text), `description` (text), `challenge_type` (enum: academic, habit, xp_race, blooms_climb), `participation_mode` (enum: team, individual), `goal_target` (integer), `start_date` (timestamptz), `end_date` (timestamptz), `reward_xp` (integer), `reward_badge_id` (text, nullable), `status` (enum: draft, active, ended, cancelled), `created_by` (FK to profiles), `created_at` (timestamptz), `updated_at` (timestamptz).
5. THE Platform SHALL create a `challenge_progress` table with columns: `id` (uuid PK), `challenge_id` (FK to social_challenges), `participant_type` (enum: team, individual), `participant_id` (uuid — references teams.id or profiles.id depending on participant_type), `current_progress` (integer, default 0), `completed_at` (timestamptz, nullable), `reward_granted` (boolean, default false), `updated_at` (timestamptz).
6. THE Platform SHALL create a `team_badges` table with columns: `id` (uuid PK), `team_id` (FK to teams), `badge_key` (text), `earned_at` (timestamptz), with a unique constraint on (team_id, badge_key) to enforce idempotent badge awards.
7. THE Platform SHALL add a `team_formation_mode` column (enum: teacher_assigned, student_formed, default teacher_assigned) to the `courses` table or a `course_settings` table.

---

#### Requirement 16: Row-Level Security Policies

**User Story:** As the system, I want RLS policies on all team and challenge tables, so that data access is properly scoped by role and institution.

##### Acceptance Criteria

1. RLS policies on `teams` SHALL ensure: Students can SELECT teams within their enrolled courses; Teachers can perform all CRUD operations on teams within their courses; Admins can perform all CRUD operations within their institution; Coordinators can SELECT teams within their program's courses.
2. RLS policies on `team_members` SHALL ensure: Students can SELECT team members for teams in their enrolled courses; the team captain can INSERT and DELETE members (in student-formed mode); Teachers can INSERT and DELETE members (in teacher-assigned mode); no role can UPDATE the `joined_at` timestamp.
3. RLS policies on `team_invitations` SHALL ensure: Students can SELECT invitations addressed to them; the team captain can INSERT invitations; the invited student can UPDATE invitation status (accept/decline); Teachers can SELECT all invitations within their courses.
4. RLS policies on `social_challenges` SHALL ensure: Students can SELECT active and ended challenges for their enrolled courses; Teachers can perform all CRUD operations on challenges within their courses; Admins can SELECT all challenges within their institution.
5. RLS policies on `challenge_progress` SHALL ensure: Students can SELECT progress records for challenges they participate in; the progress update Edge Function accesses records via service role key; Teachers can SELECT all progress records for challenges in their courses.
6. RLS policies on `team_badges` SHALL ensure: Students can SELECT badges for teams in their enrolled courses; badge award logic runs via service role key.
7. THE Parent role SHALL be able to SELECT `team_members` and `challenge_progress` for linked students (via `parent_student_links` where `verified = true`).

---

### SECTION F: Integration with Existing Systems

#### Requirement 17: Award-XP Edge Function Integration

**User Story:** As the system, I want the award-xp Edge Function to recognize challenge reward XP, so that challenge completions flow through the unified XP pipeline.

##### Acceptance Criteria

1. THE `award-xp` Edge Function SHALL accept `challenge_reward` as a valid XP source.
2. WHEN the `award-xp` Edge Function processes a `challenge_reward` source, THE function SHALL apply existing XP multipliers (admin Bonus XP Events, student XP Boosts if the XP Marketplace feature is active) to the challenge reward XP amount.
3. THE `xp_transactions` record for a challenge reward SHALL include metadata referencing the `challenge_id` and `participant_type` (team or individual).
4. WHEN a team challenge reward is processed, THE `award-xp` Edge Function SHALL be called once per team member, awarding the full reward XP to each individual member.

---

#### Requirement 18: Team XP Update on Individual XP Award

**User Story:** As the system, I want team XP totals to update when individual members earn XP, so that the team leaderboard stays current.

##### Acceptance Criteria

1. WHEN the `award-xp` Edge Function awards XP to a student who is an active Team_Member, THE function SHALL update the Team's `xp_total` in the `teams` table by adding the awarded XP amount, scoped to XP earned within the Team's course.
2. THE team XP update SHALL occur within the same Edge Function invocation as the individual XP award to maintain consistency.
3. IF the XP transaction is not associated with the Team's course (e.g., login XP, journal XP with no course scope), THEN THE `award-xp` Edge Function SHALL skip the team XP update.
4. THE team XP update SHALL use an atomic increment operation (`xp_total = xp_total + amount`) to prevent race conditions from concurrent XP awards to different team members.

---

#### Requirement 19: Challenge Progress Update Edge Function

**User Story:** As the system, I want an Edge Function that updates challenge progress when relevant events occur, so that progress tracking is automated and real-time.

##### Acceptance Criteria

1. THE Platform SHALL create an `update-challenge-progress` Edge Function that is invoked after relevant events: grade submission (for Academic and Blooms_Climb challenges), habit log insertion (for Habit challenges), and XP award (for XP_Race challenges).
2. THE Edge Function SHALL query all active Social_Challenges for the relevant course and update `challenge_progress` records for affected participants.
3. WHEN a participant's `current_progress` reaches or exceeds the `goal_target`, THE Edge Function SHALL set `completed_at` to the current timestamp and trigger the reward distribution via the `award-xp` Edge Function.
4. THE Edge Function SHALL use the service role key to bypass RLS for progress updates.
5. THE Edge Function SHALL be idempotent — processing the same event twice SHALL NOT double-count progress.

---

#### Requirement 20: Existing Leaderboard Page Integration

**User Story:** As a Student, I want to access the team leaderboard from the same leaderboard page I already use, so that the experience is unified.

##### Acceptance Criteria

1. THE existing LeaderboardPage component SHALL add a "Teams" tab to the existing filter tabs (All Students, My Course, My Program).
2. WHEN the "Teams" tab is selected, THE leaderboard SHALL render the Team_Leaderboard view instead of the individual leaderboard.
3. THE "Teams" tab SHALL support the same course and program scope selectors as the existing individual leaderboard.
4. THE URL query parameter for the team tab SHALL be persisted via nuqs (e.g., `?filter=teams`), consistent with the existing filter state management.
5. THE Team_Leaderboard view SHALL reuse the existing leaderboard card layout (gradient header, medal icons, highlight pattern) with team-specific data fields.

---

#### Requirement 21: Badge System Integration

**User Story:** As the system, I want challenge-exclusive badges to integrate with the existing badge system, so that earned badges appear on student profiles.

##### Acceptance Criteria

1. THE Platform SHALL define challenge-exclusive badges in the existing `badgeDefinitions.ts` configuration, marked with a `source: 'challenge'` property.
2. WHEN a student earns a challenge-exclusive badge, THE badge SHALL appear in the student's personal badge collection on their profile page, alongside individually earned badges.
3. THE badge award for challenge completion SHALL flow through the existing `check-badges` Edge Function pipeline, triggering the `badge-pop` animation and peer milestone notification (if the badge is rare).
4. Challenge-exclusive badges SHALL display a "Challenge" label on the badge detail to distinguish them from individually earned badges.

---

### SECTION G: Team Streak Maintenance

#### Requirement 22: Team Streak Cron Job

**User Story:** As the system, I want a scheduled job that maintains team streaks daily, so that team streaks are accurate and consistent.

##### Acceptance Criteria

1. THE Platform SHALL create a pg_cron job that runs daily at 00:05 UTC to process Team_Streak updates for all active Teams.
2. FOR each active Team, THE cron job SHALL check if at least one Team_Member has a `habit_logs` entry for the previous calendar day (UTC).
3. WHEN at least one Team_Member completed a habit on the previous day, THE cron job SHALL increment the Team's `streak_count` by 1 and update `streak_last_active_date` to the previous day.
4. WHEN no Team_Member completed a habit on the previous day, THE cron job SHALL reset the Team's `streak_count` to 0.
5. WHEN a Team_Streak reaches a milestone (7, 14, 30 days), THE cron job SHALL trigger the team badge award logic and send notifications to all Team_Members.

---

### SECTION H: Themed Quest Worlds (Phase 2)

#### Requirement 23: Quest World Structure (Phase 2)

**User Story:** As a Teacher, I want to organize challenges into themed quest worlds, so that students experience a narrative-driven progression through course content.

##### Acceptance Criteria

1. WHERE the Quest Worlds feature is enabled, THE Teacher SHALL be able to create a Quest_World by specifying: world name, theme description, narrative arc text, associated course, and an ordered list of Social_Challenges that form the world's quest sequence.
2. WHERE the Quest Worlds feature is enabled, THE Platform SHALL display Quest_Worlds on the student's challenge page as themed cards with progress indicators showing how many quests in the world the student (or team) has completed.
3. WHERE the Quest Worlds feature is enabled, WHEN a student (or team) completes all Social_Challenges in a Quest_World, THE Platform SHALL award a world-completion badge unique to that Quest_World.
4. WHERE the Quest Worlds feature is enabled, THE Platform SHALL enforce sequential quest ordering within a world — a student (or team) must complete quest N before quest N+1 becomes active.

---

### SECTION I: Non-Functional Requirements

#### Requirement 24: Performance

**User Story:** As a user, I want team and challenge features to load quickly and update in real-time, so that the collaborative experience is smooth.

##### Acceptance Criteria

1. THE Team_Profile page SHALL load and render within 1 second, including team stats, member list, and badge collection.
2. THE Team_Leaderboard SHALL load and render the top 50 teams within 1 second.
3. THE challenge detail page SHALL load and render within 1 second, including the Challenge_Leaderboard and progress bar.
4. THE Challenge_Progress update (from triggering event to UI reflection) SHALL complete within 5 seconds.
5. THE Team_XP update (from individual XP award to team total reflection) SHALL complete within 2 seconds.

---

#### Requirement 25: Atomicity and Consistency

**User Story:** As the system, I want team and challenge operations to be atomic, so that data remains consistent under concurrent access.

##### Acceptance Criteria

1. THE team XP increment operation SHALL use atomic database operations (e.g., `xp_total = xp_total + amount`) to prevent lost updates from concurrent XP awards to different team members.
2. THE challenge reward distribution SHALL execute within a single transaction to ensure all team members receive rewards or none do.
3. THE team member addition SHALL verify the student's eligibility (not already on a team, team not full) within a transaction to prevent race conditions from concurrent join requests.
4. IF any step in the challenge reward distribution fails, THEN THE Platform SHALL roll back the entire transaction and log the error for admin review.

---

#### Requirement 26: Accessibility

**User Story:** As a Student using assistive technology, I want team and challenge features to be accessible, so that I can participate regardless of ability.

##### Acceptance Criteria

1. THE Team_Profile page SHALL include ARIA labels on all interactive elements and semantic heading structure.
2. THE Challenge_Progress bar SHALL include an ARIA `progressbar` role with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` attributes.
3. THE Challenge_Leaderboard SHALL be keyboard-navigable and include ARIA labels describing each entry's rank and progress.
4. THE team invitation accept/decline actions SHALL be operable via keyboard and announced by screen readers.
5. All team and challenge animations (badge-pop, progress updates) SHALL honor the `prefers-reduced-motion` media query.

---

### SECTION J: Contribution Accountability (Ghost Group Prevention)

#### Requirement 27: Minimum Contribution Threshold

**User Story:** As a Teacher, I want each team member to contribute a minimum share of the team's weekly XP, so that free-riding is detected and discouraged.

##### Acceptance Criteria

1. THE Platform SHALL compute each Team_Member's weekly XP contribution percentage as (member's XP earned this week within the team's course) / (Team's total XP earned this week) × 100.
2. THE Platform SHALL define a Contribution_Threshold of 20% as the default minimum weekly contribution percentage, configurable per institution via `institution_settings`.
3. WHEN a Team_Member's weekly contribution percentage falls below the Contribution_Threshold for 3 consecutive days, THE Platform SHALL set the member's Contribution_Status to "warning" and send an in-app notification to the member.
4. WHEN a Team_Member's weekly contribution percentage remains below the Contribution_Threshold for 5 consecutive days, THE Platform SHALL set the member's Contribution_Status to "inactive" and display an "Inactive" badge on the member's entry in the Team_Profile member list.
5. WHEN a Team_Member's weekly contribution percentage meets or exceeds the Contribution_Threshold, THE Platform SHALL set the member's Contribution_Status to "active".
6. THE Team_Profile page SHALL display each member's Contribution_Status indicator (active, warning, inactive) alongside their XP contribution.

---

#### Requirement 28: Individual Accountability Metrics

**User Story:** As a Teacher, I want to see individual accountability metrics for each team, so that I can identify and intervene with free-riding students.

##### Acceptance Criteria

1. THE Teacher's Team Management page SHALL display an accountability summary for each Team, showing: each member's weekly XP contribution percentage, Contribution_Status, days since last XP-earning activity, and total contribution percentage over the team's lifetime.
2. THE Teacher SHALL be able to filter teams by "has inactive members" to quickly identify teams with free-riding issues.
3. WHEN a Team has one or more members with Contribution_Status "inactive", THE Platform SHALL display a warning icon on the team's row in the Teacher's team list.
4. THE Platform SHALL compute accountability metrics via a pg_cron job that runs daily at 01:00 UTC, updating `team_members` with the latest Contribution_Status.

---

#### Requirement 29: Team Member Replacement Vote

**User Story:** As a Team captain, I want to initiate a vote to replace an inactive member, so that the team can maintain productivity.

##### Acceptance Criteria

1. WHILE a Team_Member has Contribution_Status "inactive", THE team captain SHALL be able to initiate a replacement vote for that member.
2. WHEN a replacement vote is initiated, THE Platform SHALL notify all active Team_Members (excluding the inactive member) and require a simple majority (>50% of active members) to approve the replacement.
3. WHEN a replacement vote passes, THE Platform SHALL remove the inactive member from the Team (set `left_at` timestamp) and allow the captain to invite a replacement.
4. WHEN a replacement vote fails (does not reach majority within 48 hours), THE Platform SHALL close the vote and prevent a new vote for the same member for 7 days.
5. THE Teacher SHALL be able to override a replacement vote result — approving or denying the replacement regardless of the vote outcome.
6. THE Platform SHALL log all replacement votes and outcomes in the audit log for teacher review.

---

#### Requirement 30: Team Player Badge Eligibility

**User Story:** As a Student, I want to earn a "Team Player" badge only when I consistently contribute to my team, so that the badge reflects genuine collaboration.

##### Acceptance Criteria

1. THE Platform SHALL award the "Team Player" badge only to Team_Members who have maintained Contribution_Status "active" for at least 14 consecutive days.
2. THE "Team Player" badge definition SHALL be added to `src/lib/teamBadgeDefinitions.ts` with the condition: `contribution_status === 'active' for 14+ consecutive days`.
3. THE "Team Player" badge check SHALL run as part of the daily contribution status cron job, after status updates are computed.
4. THE "Team Player" badge SHALL be an individual badge (not a team badge), appearing in the student's personal badge collection.

---

### SECTION K: Cooperative Challenge Mode (Toxic Competition Prevention)

#### Requirement 31: Cooperative Challenge Type

**User Story:** As a Teacher, I want to create cooperative challenges where teams work toward a shared goal without racing against other teams, so that collaboration is prioritized over competition.

##### Acceptance Criteria

1. THE Platform SHALL add "cooperative" as a valid Challenge_Type alongside the existing types (academic, habit, xp_race, blooms_climb).
2. WHEN Challenge_Type is "cooperative", THE Teacher SHALL specify a collective goal target (e.g., "Team earns 1000 XP together" or "All members submit 5 assignments").
3. WHEN Challenge_Type is "cooperative", THE Platform SHALL track progress as the team's collective achievement toward the goal, not as a race against other teams.
4. WHEN Challenge_Type is "cooperative", THE challenge detail page SHALL display only the team's own progress toward the goal, without a competitive leaderboard ranking against other teams.
5. THE Platform SHALL set "cooperative" as the default Challenge_Type when a Teacher creates a new Social_Challenge.

---

#### Requirement 32: Cooperation Score

**User Story:** As a Student, I want my team to earn a Cooperation Score that rewards equitable participation, so that every member is motivated to contribute.

##### Acceptance Criteria

1. THE Platform SHALL compute a Cooperation_Score (0–100) for each Team, defined as: 100 × (1 − Gini_Coefficient of member XP contributions) × (percentage of members meeting the Contribution_Threshold).
2. THE Cooperation_Score SHALL be updated daily by the contribution status cron job and stored on the `teams` table.
3. THE Team_Profile page SHALL display the Cooperation_Score prominently alongside Team_XP and Team_Streak.
4. WHEN a Team's Cooperation_Score is above 80, THE Platform SHALL award a 10% XP bonus multiplier to all cooperative challenge rewards earned by that Team.
5. THE Team_Leaderboard SHALL support an optional "sort by Cooperation Score" mode, allowing students to see which teams collaborate most equitably.

---

#### Requirement 33: XP Race Opt-In and Limits

**User Story:** As a Teacher, I want XP Race challenges to be opt-in and limited in frequency, so that competitive pressure does not harm low-achieving students.

##### Acceptance Criteria

1. WHEN Challenge_Type is "xp_race", THE Platform SHALL require the Teacher to explicitly confirm that the challenge is competitive by checking an acknowledgment checkbox.
2. THE Platform SHALL limit each course to a maximum of 2 active XP Race challenges at any time.
3. WHEN a Teacher attempts to create a third concurrent XP Race challenge, THE Platform SHALL reject the creation and display a message indicating the limit.
4. THE challenge creation form SHALL display a recommendation banner stating "Cooperative challenges are recommended for most learning objectives" when the Teacher selects "xp_race" as the Challenge_Type.

---

### SECTION L: Peer Teaching Moments

#### Requirement 34: Peer Teaching Moment Creation

**User Story:** As a Student who has mastered a CLO, I want to create a short explanation for my teammates, so that I can help them understand the concept and earn XP for teaching.

##### Acceptance Criteria

1. WHEN a Team_Member's CLO attainment reaches 85% or higher, THE Platform SHALL enable a "Create Teaching Moment" action on the Team_Profile page for that CLO.
2. THE Student SHALL be able to create a Peer_Teaching_Moment by providing: a title, explanation text (50–500 characters), an optional link to an audio or video resource, and the associated CLO ID.
3. THE Platform SHALL store Peer_Teaching_Moments in a `peer_teaching_moments` table with columns: `id`, `team_id`, `author_id`, `clo_id`, `title`, `explanation_text`, `media_url` (nullable), `created_at`, `status` (active, archived).
4. THE Platform SHALL award 30 XP to the author when a Peer_Teaching_Moment is created, via the existing `award-xp` Edge Function with source `peer_teaching`.
5. THE Platform SHALL limit each Student to a maximum of 3 Peer_Teaching_Moments per CLO to prevent spam.

---

#### Requirement 35: Peer Teaching Moment Consumption and Rating

**User Story:** As a Student, I want to view and rate my teammate's teaching moments, so that I can learn from peers and provide feedback on explanation quality.

##### Acceptance Criteria

1. THE Team_Profile page SHALL display a "Teaching Moments" section listing all active Peer_Teaching_Moments for the Team, grouped by CLO.
2. WHEN a Team_Member views a Peer_Teaching_Moment, THE Platform SHALL record a view event in a `teaching_moment_views` table with columns: `id`, `teaching_moment_id`, `viewer_id`, `viewed_at`.
3. AFTER viewing a Peer_Teaching_Moment, THE Student SHALL be able to rate the explanation on clarity (1–5 stars) and helpfulness (1–5 stars), stored in a `teaching_moment_ratings` table.
4. THE Platform SHALL award 10 XP to the viewer when the viewer submits a rating for a Peer_Teaching_Moment, via the existing `award-xp` Edge Function with source `peer_learning`.
5. THE Platform SHALL display the average clarity and helpfulness ratings on each Peer_Teaching_Moment card.
6. EACH Student SHALL be able to rate a given Peer_Teaching_Moment only once, enforced by a unique constraint on (teaching_moment_id, viewer_id) in the ratings table.

---

#### Requirement 36: Teaching Impact Tracking

**User Story:** As a Teacher, I want to see how peer teaching moments impact teammate attainment, so that I can identify effective peer teachers and encourage the practice.

##### Acceptance Criteria

1. THE Platform SHALL compute Teaching_Impact for each Peer_Teaching_Moment as the average CLO attainment improvement of teammates who viewed the moment, measured as (post-view attainment − pre-view attainment) for the associated CLO.
2. THE pre-view attainment SHALL be the viewer's CLO attainment at the time of viewing; the post-view attainment SHALL be the viewer's CLO attainment 7 days after viewing.
3. THE Teacher's Team Management page SHALL display a "Peer Teaching" tab showing: top peer teachers by Teaching_Impact, most-viewed teaching moments, and average rating scores.
4. WHEN a Student's cumulative Teaching_Impact across all their Peer_Teaching_Moments exceeds a threshold of 10 percentage points of average attainment improvement, THE Platform SHALL award a "Mentor" badge to that Student.
5. THE "Mentor" badge SHALL be an individual badge appearing in the student's personal badge collection, defined in `badgeDefinitions.ts` with `source: 'peer_teaching'`.

---

### SECTION M: AI-Powered Team Health Monitoring

#### Requirement 37: Team Health Score Computation

**User Story:** As the system, I want to compute a Team Health Score for each team, so that teachers can quickly identify teams that need intervention.

##### Acceptance Criteria

1. THE Platform SHALL compute a Team_Health_Score (0–100) for each active Team, derived from four weighted indicators: XP contribution equality (30% weight, based on inverse Gini_Coefficient), engagement trend (25% weight, based on 7-day XP trend direction), challenge participation rate (25% weight, percentage of available challenges the team has joined), and activity timing overlap (20% weight, percentage of days where 2+ members were active on the same day).
2. THE Platform SHALL compute the Gini_Coefficient of XP contributions within a Team as: G = (Σᵢ Σⱼ |xᵢ − xⱼ|) / (2n² × x̄), where xᵢ is member i's weekly XP contribution, n is the member count, and x̄ is the mean contribution.
3. THE Team_Health_Score SHALL be recomputed weekly by a pg_cron job that runs every Monday at 02:00 UTC.
4. THE Platform SHALL store the Team_Health_Score history in a `team_health_snapshots` table with columns: `id`, `team_id`, `health_score`, `gini_coefficient`, `engagement_trend` (enum: rising, stable, declining), `challenge_participation_rate`, `activity_overlap_rate`, `computed_at`.

---

#### Requirement 38: Team Health Flagging

**User Story:** As a Teacher, I want teams with poor health indicators to be automatically flagged, so that I can intervene before problems become critical.

##### Acceptance Criteria

1. WHEN a Team's Gini_Coefficient exceeds 0.6, THE Platform SHALL flag the Team as "high-inequality" and display a warning indicator on the Teacher's Team Management page.
2. WHEN a Team's engagement trend is "declining" for 2 consecutive weeks, THE Platform SHALL flag the Team as "declining-engagement" and display a warning indicator.
3. WHEN a Team's Team_Health_Score falls below 40, THE Platform SHALL flag the Team as "at-risk" and send an in-app notification to the Teacher.
4. THE Teacher's Team Management page SHALL support filtering teams by health status: "healthy" (score ≥ 70), "needs attention" (score 40–69), and "at-risk" (score < 40).
5. THE Platform SHALL display the Team_Health_Score as a color-coded badge on each team card: green (≥ 70), yellow (40–69), red (< 40).

---

#### Requirement 39: Weekly Team Health Report

**User Story:** As a Teacher, I want a weekly report summarizing team health across my courses, so that I can efficiently monitor 30+ teams without checking each one manually.

##### Acceptance Criteria

1. THE Platform SHALL generate a Weekly Team_Health_Report for each Teacher, summarizing all teams across the Teacher's courses.
2. THE Weekly Team_Health_Report SHALL include: total teams count, count of healthy/needs-attention/at-risk teams, list of at-risk teams with specific issues (high inequality, declining engagement, inactive members), and recommended actions for each flagged team.
3. THE recommended actions SHALL be generated based on the team's health indicators: "Consider reassigning [member_name]" for teams with inactive members, "Schedule a team check-in" for declining engagement, "Rebalance team composition" for high inequality.
4. THE Weekly Team_Health_Report SHALL be accessible from the Teacher's dashboard and the Team Management page.
5. THE Platform SHALL generate the report via a pg_cron job that runs every Monday at 03:00 UTC (after the health score computation at 02:00 UTC).

---

#### Requirement 40: Team Restructuring Suggestions

**User Story:** As a Teacher, I want the system to suggest team restructuring when health indicators are consistently poor, so that I can take informed action to improve team dynamics.

##### Acceptance Criteria

1. WHEN a Team's Team_Health_Score remains below 40 for 2 consecutive weeks, THE Platform SHALL generate a restructuring suggestion and display it on the Teacher's Team Management page.
2. THE restructuring suggestion SHALL include: the specific health issues identified, a recommended action (e.g., "Move [inactive_member] to [team_with_capacity]", "Split this team into two smaller teams", "Merge with [understaffed_team]"), and the expected impact on team health scores.
3. THE Teacher SHALL be able to accept or dismiss each restructuring suggestion; accepted suggestions SHALL be executed automatically (member transfers, team splits/merges) with audit logging.
4. THE Platform SHALL not execute any restructuring without explicit Teacher approval.
5. WHEN a restructuring is executed, THE Platform SHALL preserve all historical data (XP contributions, challenge progress) and notify affected students via in-app notification.

---

### SECTION N: Data Model Extensions for New Features

#### Requirement 41: Contribution and Health Data Model

**User Story:** As the system, I want data model extensions for contribution tracking, peer teaching, and team health, so that new features are stored efficiently with proper access control.

##### Acceptance Criteria

1. THE Platform SHALL add the following columns to the `team_members` table: `contribution_status` (enum: active, warning, inactive, default active), `contribution_status_since` (timestamptz, nullable), `consecutive_low_days` (integer, default 0).
2. THE Platform SHALL add the following columns to the `teams` table: `cooperation_score` (integer, default 100), `health_score` (integer, default 100), `health_status` (enum: healthy, needs_attention, at_risk, default healthy).
3. THE Platform SHALL create a `peer_teaching_moments` table with columns: `id` (uuid PK), `team_id` (FK to teams), `author_id` (FK to profiles), `clo_id` (FK to clos), `title` (text), `explanation_text` (text, 50–500 chars), `media_url` (text, nullable), `status` (enum: active, archived, default active), `created_at` (timestamptz), with a composite index on (author_id, clo_id) for the per-CLO limit check.
4. THE Platform SHALL create a `teaching_moment_views` table with columns: `id` (uuid PK), `teaching_moment_id` (FK to peer_teaching_moments), `viewer_id` (FK to profiles), `viewed_at` (timestamptz), `pre_view_attainment` (numeric, nullable), with an index on (teaching_moment_id, viewer_id).
5. THE Platform SHALL create a `teaching_moment_ratings` table with columns: `id` (uuid PK), `teaching_moment_id` (FK to peer_teaching_moments), `viewer_id` (FK to profiles), `clarity_rating` (integer, CHECK 1–5), `helpfulness_rating` (integer, CHECK 1–5), `rated_at` (timestamptz), with a unique constraint on (teaching_moment_id, viewer_id).
6. THE Platform SHALL create a `team_health_snapshots` table with columns: `id` (uuid PK), `team_id` (FK to teams), `health_score` (integer), `gini_coefficient` (numeric(4,3)), `engagement_trend` (enum: rising, stable, declining), `challenge_participation_rate` (numeric(5,2)), `activity_overlap_rate` (numeric(5,2)), `computed_at` (timestamptz), with an index on (team_id, computed_at DESC).
7. THE Platform SHALL create a `replacement_votes` table with columns: `id` (uuid PK), `team_id` (FK to teams), `target_member_id` (FK to profiles), `initiated_by` (FK to profiles), `status` (enum: open, approved, rejected, expired), `votes_for` (integer, default 0), `votes_against` (integer, default 0), `created_at` (timestamptz), `resolved_at` (timestamptz, nullable), `teacher_override` (boolean, default false).
8. RLS policies on `peer_teaching_moments` SHALL ensure: Team_Members can SELECT moments for their team; the author can INSERT and UPDATE (archive) their own moments; Teachers can SELECT all moments in their courses.
9. RLS policies on `teaching_moment_ratings` SHALL ensure: the viewer can INSERT their own rating; Team_Members can SELECT ratings for moments in their team; Teachers can SELECT all ratings in their courses.
10. RLS policies on `team_health_snapshots` SHALL ensure: Teachers can SELECT snapshots for teams in their courses; Admins can SELECT all snapshots within their institution; Students cannot access health snapshots.
11. RLS policies on `replacement_votes` SHALL ensure: active Team_Members can SELECT and vote on open votes for their team; the captain can INSERT new votes; Teachers can SELECT and UPDATE (override) votes for teams in their courses.
