# Implementation Tasks — Team Challenges & Social Quests

## Phase 1: Data Model & Configuration

- [ ] 1. Database migrations and configuration files
  - [ ] 1.1 Create migration: add `team_formation_mode` column to `courses` table (text, NOT NULL, DEFAULT 'teacher_assigned', CHECK constraint)
  - [ ] 1.2 Create migration: `teams` table with all columns, indexes (unique name per course, course_id, institution_id)
  - [ ] 1.3 Create migration: `team_members` table with columns, unique partial index on (team_id, student_id) WHERE left_at IS NULL
  - [ ] 1.4 Create migration: `team_invitations` table with columns and indexes
  - [ ] 1.5 Create migration: `social_challenges` table with columns, indexes, and CHECK constraints
  - [ ] 1.6 Create migration: `challenge_progress` table with columns, unique constraint on (challenge_id, participant_id), leaderboard index
  - [ ] 1.7 Create migration: `team_badges` table with columns and unique constraint on (team_id, badge_key)
  - [ ] 1.8 Create migration: RLS policies for all new tables (teams, team_members, team_invitations, social_challenges, challenge_progress, team_badges)
  - [ ] 1.9 Create `src/lib/teamBadgeDefinitions.ts` with all 6 team badge definitions + "Team Player" badge following `badgeDefinitions.ts` pattern
  - [ ] 1.10 Create `src/lib/challengeTypes.ts` with challenge type configuration including "cooperative" type (goal descriptions, validation rules)
  - [ ] 1.11 Create `src/lib/schemas/team.ts` with Zod schemas (createTeamSchema, updateTeamSchema)
  - [ ] 1.12 Create `src/lib/schemas/challenge.ts` with Zod schemas (createChallengeSchema) including date/reward validation, xp_race_acknowledged field, cooperative type
  - [ ] 1.13 Add team challenge query keys to `src/lib/queryKeys.ts` (teams, teamMembers, teamInvitations, teamBadges, teamLeaderboard, socialChallenges, challengeProgress, challengeLeaderboard, contributionStatus, replacementVotes, peerTeachingMoments, teachingMomentRatings, teachingImpact, teamHealth, teamHealthReport)
  - [ ] 1.14 Regenerate TypeScript types from Supabase: `npx supabase gen types --linked > src/types/database.ts`
  - [ ] 1.15 Create migration: add `contribution_status`, `contribution_status_since`, `consecutive_low_days` columns to `team_members` table
  - [ ] 1.16 Create migration: add `cooperation_score`, `health_score`, `health_status` columns to `teams` table
  - [ ] 1.17 Create migration: add `cooperative` to `social_challenges.challenge_type` CHECK constraint
  - [ ] 1.18 Create migration: `peer_teaching_moments` table with columns, indexes, and CHECK constraints
  - [ ] 1.19 Create migration: `teaching_moment_views` table with columns and indexes
  - [ ] 1.20 Create migration: `teaching_moment_ratings` table with columns, unique constraint on (teaching_moment_id, viewer_id)
  - [ ] 1.21 Create migration: `team_health_snapshots` table with columns and indexes
  - [ ] 1.22 Create migration: `replacement_votes` table with columns and indexes
  - [ ] 1.23 Create migration: RLS policies for new tables (peer_teaching_moments, teaching_moment_ratings, team_health_snapshots, replacement_votes)
  - [ ] 1.24 Create `src/lib/contributionThresholds.ts` with default threshold (20%), status transition rules
  - [ ] 1.25 Create `src/lib/teamHealthCalculator.ts` with Gini coefficient computation, health score formula, engagement trend detection
  - [ ] 1.26 Create `src/lib/schemas/peerTeaching.ts` with Zod schemas (createTeachingMomentSchema, rateTeachingMomentSchema)
  - [ ] 1.27 Create `src/lib/schemas/replacementVote.ts` with Zod schema (initiateReplacementVoteSchema)

## Phase 2: Edge Functions

- [ ] 2. Edge Function modifications and new functions
  - [ ] 2.1 Modify `award-xp` Edge Function: accept `challenge_reward`, `peer_teaching`, and `peer_learning` as valid XP sources, include challenge_id and participant_type in metadata
  - [ ] 2.2 Modify `award-xp` Edge Function: after XP insert, check active team membership for student + course, atomically increment `teams.xp_total` for course-scoped XP; apply Cooperation Score bonus multiplier for cooperative challenge rewards
  - [ ] 2.3 Create `update-challenge-progress` Edge Function: accept event_type (grade, habit, xp), student_id, course_id, metadata
  - [ ] 2.4 Implement `update-challenge-progress`: query active challenges for course, compute progress per type (academic: count graded assignments, habit: streak days, xp_race: total XP, blooms_climb: distinct Bloom's levels, cooperative: collective team progress)
  - [ ] 2.5 Implement `update-challenge-progress`: completion detection (progress >= goal_target), set completed_at, trigger reward distribution via award-xp
  - [ ] 2.6 Implement `update-challenge-progress`: idempotency — reprocessing same event does not double-count
  - [ ] 2.7 Create pg_cron job for team streak updates: daily at 00:05 UTC, check habit_logs for each active team, increment or reset streak_count, award streak badges at milestones
  - [ ] 2.8 Create pg_cron job for contribution status updates: daily at 01:00 UTC, compute weekly XP per member, calculate contribution %, update contribution_status (active/warning/inactive), compute Cooperation Score, check Team Player badge eligibility
  - [ ] 2.9 Create pg_cron job for team health score computation: weekly Monday at 02:00 UTC, compute Gini coefficient, engagement trend, challenge participation rate, activity overlap rate, insert team_health_snapshots, update teams.health_score and health_status
  - [ ] 2.10 Create pg_cron job for weekly team health report generation: Monday at 03:00 UTC, aggregate health data per teacher's courses, generate report with recommendations

## Phase 3: TanStack Query Hooks

- [ ] 3. Data fetching and mutation hooks
  - [ ] 3.1 Create `src/hooks/useTeams.ts`: list teams by course, create team, update team, soft-delete team
  - [ ] 3.2 Create `src/hooks/useTeamMembers.ts`: list members with contribution status, add member, remove member (set left_at)
  - [ ] 3.3 Create `src/hooks/useTeamInvitations.ts`: list pending invitations, send invitation, accept/decline invitation
  - [ ] 3.4 Create `src/hooks/useTeamProfile.ts`: fetch team profile data (stats, members, badges, active challenges with progress, teaching moments)
  - [ ] 3.5 Create `src/hooks/useChallenges.ts`: list challenges by course (active/upcoming/ended), create challenge (with cooperative default and XP Race limit check), update challenge
  - [ ] 3.6 Create `src/hooks/useChallengeProgress.ts`: fetch progress for current participant, fetch challenge detail with progress
  - [ ] 3.7 Create `src/hooks/useChallengeLeaderboard.ts`: fetch challenge leaderboard sorted by progress desc, completion time
  - [ ] 3.8 Create `src/hooks/useTeamLeaderboard.ts`: fetch team leaderboard by course/program, sorted by xp_total desc, with Cooperation Score sort option
  - [ ] 3.9 Create `src/hooks/useTeamRealtime.ts`: Supabase Realtime subscription on teams table, scoped by institution, with polling fallback
  - [ ] 3.10 Create `src/hooks/useChallengeRealtime.ts`: Supabase Realtime subscription on challenge_progress table, with polling fallback
  - [ ] 3.11 Create `src/hooks/useContributionStatus.ts`: fetch contribution metrics for team members (teacher view), filter by has-inactive-members
  - [ ] 3.12 Create `src/hooks/useReplacementVotes.ts`: initiate vote, cast vote, resolve vote, teacher override, list votes for team
  - [ ] 3.13 Create `src/hooks/usePeerTeaching.ts`: create teaching moment, list moments by team/CLO, record view, submit rating
  - [ ] 3.14 Create `src/hooks/useTeachingImpact.ts`: fetch teaching impact metrics (top peer teachers, most-viewed moments, average ratings)
  - [ ] 3.15 Create `src/hooks/useTeamHealth.ts`: fetch team health scores, health snapshots history, filter by health status
  - [ ] 3.16 Create `src/hooks/useTeamHealthReport.ts`: fetch weekly team health report with recommendations

## Phase 4: Shared Components

- [ ] 4. Reusable UI components
  - [ ] 4.1 Create `src/components/shared/TeamCard.tsx`: compact team display (name, XP, streak, member count, health score badge) with gradient header
  - [ ] 4.2 Create `src/components/shared/TeamMemberList.tsx`: member list with roles (captain badge), XP contributions, contribution status indicators
  - [ ] 4.3 Create `src/components/shared/TeamBadgeCollection.tsx`: grid of earned team badges with badge-pop animation
  - [ ] 4.4 Create `src/components/shared/ChallengeProgressBar.tsx`: accessible progress bar with ARIA progressbar role, aria-valuenow/min/max
  - [ ] 4.5 Create `src/components/shared/ChallengeLeaderboard.tsx`: per-challenge participant ranking with medals, anonymous support, current user highlight
  - [ ] 4.6 Create `src/components/shared/TeamLeaderboardView.tsx`: team leaderboard tab content with medals, streak display, course/program scope, Cooperation Score sort
  - [ ] 4.7 Create `src/components/shared/TeamInvitationCard.tsx`: invitation accept/decline with keyboard operability
  - [ ] 4.8 Create `src/components/shared/ContributionStatusBadge.tsx`: color-coded badge (green=active, yellow=warning, red=inactive)
  - [ ] 4.9 Create `src/components/shared/CooperationScoreDisplay.tsx`: cooperation score gauge with color coding
  - [ ] 4.10 Create `src/components/shared/PeerTeachingMomentCard.tsx`: teaching moment display with title, text, media link, average ratings
  - [ ] 4.11 Create `src/components/shared/PeerTeachingMomentForm.tsx`: form to create teaching moment (title, text 50-500 chars, optional media URL) with Zod validation
  - [ ] 4.12 Create `src/components/shared/TeachingMomentRating.tsx`: star rating component for clarity (1-5) and helpfulness (1-5)
  - [ ] 4.13 Create `src/components/shared/TeamHealthBadge.tsx`: color-coded health score badge (green ≥70, yellow 40-69, red <40)
  - [ ] 4.14 Create `src/components/shared/TeamHealthChart.tsx`: Recharts line chart showing health score trend over time
  - [ ] 4.15 Create `src/components/shared/ReplacementVoteCard.tsx`: vote initiation (captain only for inactive members), vote casting, expiry countdown, teacher override

## Phase 5: Pages — Team Management

- [ ] 5. Team management pages
  - [ ] 5.1 Create `src/pages/student/teams/TeamProfilePage.tsx`: team name, avatar, members with contribution status, Team_XP, Team_Streak, Cooperation Score, badges, active challenges, XP breakdown, teaching moments section
  - [ ] 5.2 Create `src/pages/student/teams/CreateTeamPage.tsx`: team creation form for student-formed mode (name input, member selection from roster)
  - [ ] 5.3 Create `src/pages/teacher/teams/TeamManagementPage.tsx`: list teams for teacher's courses with health badges, accountability metrics, filter by health status and has-inactive-members, create/edit/delete actions
  - [ ] 5.4 Create `src/pages/teacher/teams/TeamFormPage.tsx`: create/edit team form (name, member selection from enrollment roster)
  - [ ] 5.5 Add team formation mode toggle to course settings (modify CourseForm.tsx to include team_formation_mode select)
  - [ ] 5.6 Add replacement vote UI to TeamProfilePage: captain can initiate vote for inactive members, members can cast votes, display vote status and countdown

## Phase 6: Pages — Social Challenges

- [ ] 6. Challenge pages
  - [ ] 6.1 Create `src/pages/student/challenges/ChallengeListPage.tsx`: list active, upcoming, completed challenges with status badges, progress indicators, cooperative/competitive labels
  - [ ] 6.2 Create `src/pages/student/challenges/ChallengeDetailPage.tsx`: challenge info, progress bar, challenge leaderboard (hidden for cooperative), completion banner
  - [ ] 6.3 Create `src/pages/teacher/challenges/TeacherChallengeListPage.tsx`: teacher's challenge management list with create/edit actions
  - [ ] 6.4 Create `src/pages/teacher/challenges/ChallengeFormPage.tsx`: challenge creation form with cooperative as default type, type-specific goal inputs, XP Race acknowledgment checkbox, XP Race limit warning, date pickers, reward configuration

## Phase 7: Leaderboard Integration

- [ ] 7. Existing leaderboard page integration
  - [ ] 7.1 Modify `LeaderboardPage.tsx`: add "Teams" tab to FILTER_OPTIONS, add 'teams' to valid filters
  - [ ] 7.2 Add TabsContent for "teams" filter that renders TeamLeaderboardView with course/program scope selectors and Cooperation Score sort option
  - [ ] 7.3 Integrate useTeamRealtime hook into LeaderboardPage for real-time team XP updates with polling fallback

## Phase 8: Routing & Navigation

- [ ] 8. Router and layout updates
  - [ ] 8.1 Add student routes to AppRouter: `/student/teams/:teamId`, `/student/teams/new`, `/student/challenges`, `/student/challenges/:id`
  - [ ] 8.2 Add teacher routes to AppRouter: `/teacher/teams`, `/teacher/teams/new`, `/teacher/teams/:id/edit`, `/teacher/challenges`, `/teacher/challenges/new`, `/teacher/challenges/:id/edit`, `/teacher/team-health`
  - [ ] 8.3 Add "My Team" and "Challenges" nav items to StudentLayout sidebar
  - [ ] 8.4 Add "Teams", "Challenges", and "Team Health" nav items to TeacherLayout sidebar
  - [ ] 8.5 Add team health summary widget to TeacherDashboard showing at-risk team count

## Phase 9: Property-Based Tests

- [ ] 9. Property-based tests (fast-check, min 100 iterations)
  - [ ] 9.1 Create `src/__tests__/properties/teamCreation.property.test.ts`: P1 (captain assignment), P2 (one team per student per course), P3 (team size bounds 2-6)
  - [ ] 9.2 Create `src/__tests__/properties/teamXp.property.test.ts`: P4 (Team XP respects membership period and course scope)
  - [ ] 9.3 Create `src/__tests__/properties/teamStreak.property.test.ts`: P5 (streak computation), P6 (milestone badge awards), P7 (badge idempotence)
  - [ ] 9.4 Create `src/__tests__/properties/challengeSchema.property.test.ts`: P8 (date constraint validation)
  - [ ] 9.5 Create `src/__tests__/properties/challengeProgress.property.test.ts`: P10 (progress by type including cooperative), P11 (completion triggers reward), P12 (idempotence)
  - [ ] 9.6 Create `src/__tests__/properties/challengeRewards.property.test.ts`: P13 (full XP to each team member), P14 (reward uniqueness)
  - [ ] 9.7 Create `src/__tests__/properties/challengeLeaderboard.property.test.ts`: P15 (sort order), P16 (anonymous entries), P17 (team leaderboard sort and scope)
  - [ ] 9.8 Create `src/__tests__/properties/teamFormationMode.property.test.ts`: P18 (mode controls student team creation)
  - [ ] 9.9 Create `src/__tests__/properties/challengeLifecycle.property.test.ts`: P9 (auto-enrollment), P19 (ended challenges reject updates), P20 (challenge list filtering)
  - [ ] 9.10 Create `src/__tests__/properties/contributionStatus.property.test.ts`: P21 (contribution status transitions), P22 (institution threshold configuration)
  - [ ] 9.11 Create `src/__tests__/properties/cooperationScore.property.test.ts`: P23 (Cooperation Score formula), P24 (cooperative challenge no leaderboard), P25 (XP Race limit)
  - [ ] 9.12 Create `src/__tests__/properties/peerTeaching.property.test.ts`: P26 (teaching moment eligibility ≥85%), P27 (per-CLO limit of 3), P28 (rating uniqueness)
  - [ ] 9.13 Create `src/__tests__/properties/teamHealth.property.test.ts`: P29 (health score formula), P30 (health status classification), P32 (Gini coefficient bounds)
  - [ ] 9.14 Create `src/__tests__/properties/replacementVote.property.test.ts`: P31 (majority rule, expiry, cooldown)

## Phase 10: Unit Tests

- [ ] 10. Unit and component tests
  - [ ] 10.1 Create `src/__tests__/unit/teamBadgeDefinitions.test.ts`: all 6 badges + Team Player defined, correct keys, structure matches BadgeDef interface
  - [ ] 10.2 Create `src/__tests__/unit/challengeTypes.test.ts`: all 5 types defined including cooperative, Blooms_Climb goal fixed at 6
  - [ ] 10.3 Create `src/__tests__/unit/teamProfilePage.test.tsx`: renders team name, members with contribution status, XP, streak, cooperation score, badges
  - [ ] 10.4 Create `src/__tests__/unit/challengeProgressBar.test.tsx`: ARIA progressbar role, aria-valuenow/min/max attributes
  - [ ] 10.5 Create `src/__tests__/unit/teamLeaderboardView.test.tsx`: renders team rows, medal icons for top 3, highlight current team, cooperation score sort
  - [ ] 10.6 Create `src/__tests__/unit/challengeForm.test.tsx`: form validation errors for invalid dates, reward range, XP Race acknowledgment, cooperative default type
  - [ ] 10.7 Create `src/__tests__/unit/teamInvitationCard.test.tsx`: accept/decline buttons, keyboard operability
  - [ ] 10.8 Create `src/__tests__/unit/leaderboardTeamsTab.test.tsx`: Teams tab renders in LeaderboardPage, switches to team view

## Phase 11: Contribution Accountability Pages & Components

- [ ] 11. Contribution accountability UI
  - [ ] 11.1 Create `src/__tests__/unit/contributionStatusBadge.test.tsx`: renders correct color/label for active (green), warning (yellow), inactive (red) states
  - [ ] 11.2 Create `src/__tests__/unit/contributionThresholds.test.ts`: default threshold is 20%, status transition rules (3 days → warning, 5 days → inactive)
  - [ ] 11.3 Create `src/__tests__/unit/replacementVoteCard.test.tsx`: vote initiation for inactive members only, vote casting, expiry countdown, teacher override button

## Phase 12: Peer Teaching Pages & Components

- [ ] 12. Peer teaching UI
  - [ ] 12.1 Add "Teaching Moments" section to TeamProfilePage: list active moments grouped by CLO, "Create Teaching Moment" button (enabled only for CLOs with ≥85% attainment)
  - [ ] 12.2 Create `src/__tests__/unit/peerTeachingMomentCard.test.tsx`: renders title, text, media link, average ratings, view count
  - [ ] 12.3 Create `src/__tests__/unit/teachingMomentRating.test.tsx`: star rating component renders 1-5 stars for clarity and helpfulness, submit behavior
  - [ ] 12.4 Add "Peer Teaching" tab to Teacher's TeamManagementPage: top peer teachers by Teaching Impact, most-viewed moments, average ratings

## Phase 13: Team Health Monitoring Pages

- [ ] 13. Team health monitoring UI
  - [ ] 13.1 Create `src/pages/teacher/teams/TeamHealthReportPage.tsx`: weekly report with total teams, healthy/needs_attention/at_risk counts, flagged team list with issues and recommendations
  - [ ] 13.2 Create `src/__tests__/unit/teamHealthBadge.test.tsx`: color coding green ≥70, yellow 40-69, red <40
  - [ ] 13.3 Create `src/__tests__/unit/teamHealthCalculator.test.ts`: Gini coefficient computation, health score formula, engagement trend detection (rising/stable/declining)
  - [ ] 13.4 Create `src/__tests__/unit/teamHealthReportPage.test.tsx`: report renders team counts, flagged teams, recommendations
  - [ ] 13.5 Add health score trend chart (TeamHealthChart) to teacher's team detail view using Recharts
