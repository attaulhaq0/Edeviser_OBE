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
  - [ ] 1.9 Create `src/lib/teamBadgeDefinitions.ts` with all 6 team badge definitions following `badgeDefinitions.ts` pattern
  - [ ] 1.10 Create `src/lib/challengeTypes.ts` with challenge type configuration (goal descriptions, validation rules)
  - [ ] 1.11 Create `src/lib/schemas/team.ts` with Zod schemas (createTeamSchema, updateTeamSchema)
  - [ ] 1.12 Create `src/lib/schemas/challenge.ts` with Zod schemas (createChallengeSchema) including date and reward validation
  - [ ] 1.13 Add team challenge query keys to `src/lib/queryKeys.ts` (teams, teamMembers, teamInvitations, teamBadges, teamLeaderboard, socialChallenges, challengeProgress, challengeLeaderboard)
  - [ ] 1.14 Regenerate TypeScript types from Supabase: `npx supabase gen types --linked > src/types/database.ts`

## Phase 2: Edge Functions

- [ ] 2. Edge Function modifications and new functions
  - [ ] 2.1 Modify `award-xp` Edge Function: accept `challenge_reward` as valid XP source, include challenge_id and participant_type in metadata
  - [ ] 2.2 Modify `award-xp` Edge Function: after XP insert, check active team membership for student + course, atomically increment `teams.xp_total` for course-scoped XP
  - [ ] 2.3 Create `update-challenge-progress` Edge Function: accept event_type (grade, habit, xp), student_id, course_id, metadata
  - [ ] 2.4 Implement `update-challenge-progress`: query active challenges for course, compute progress per type (academic: count graded assignments, habit: streak days, xp_race: total XP, blooms_climb: distinct Bloom's levels)
  - [ ] 2.5 Implement `update-challenge-progress`: completion detection (progress >= goal_target), set completed_at, trigger reward distribution via award-xp
  - [ ] 2.6 Implement `update-challenge-progress`: idempotency — reprocessing same event does not double-count
  - [ ] 2.7 Create pg_cron job for team streak updates: daily at 00:05 UTC, check habit_logs for each active team, increment or reset streak_count, award streak badges at milestones

## Phase 3: TanStack Query Hooks

- [ ] 3. Data fetching and mutation hooks
  - [ ] 3.1 Create `src/hooks/useTeams.ts`: list teams by course, create team, update team, soft-delete team
  - [ ] 3.2 Create `src/hooks/useTeamMembers.ts`: list members, add member, remove member (set left_at)
  - [ ] 3.3 Create `src/hooks/useTeamInvitations.ts`: list pending invitations, send invitation, accept/decline invitation
  - [ ] 3.4 Create `src/hooks/useTeamProfile.ts`: fetch team profile data (stats, members, badges, active challenges with progress)
  - [ ] 3.5 Create `src/hooks/useChallenges.ts`: list challenges by course (active/upcoming/ended), create challenge, update challenge
  - [ ] 3.6 Create `src/hooks/useChallengeProgress.ts`: fetch progress for current participant, fetch challenge detail with progress
  - [ ] 3.7 Create `src/hooks/useChallengeLeaderboard.ts`: fetch challenge leaderboard sorted by progress desc, completion time
  - [ ] 3.8 Create `src/hooks/useTeamLeaderboard.ts`: fetch team leaderboard by course/program, sorted by xp_total desc
  - [ ] 3.9 Create `src/hooks/useTeamRealtime.ts`: Supabase Realtime subscription on teams table, scoped by institution, with polling fallback
  - [ ] 3.10 Create `src/hooks/useChallengeRealtime.ts`: Supabase Realtime subscription on challenge_progress table, with polling fallback

## Phase 4: Shared Components

- [ ] 4. Reusable UI components
  - [ ] 4.1 Create `src/components/shared/TeamCard.tsx`: compact team display (name, XP, streak, member count) with gradient header
  - [ ] 4.2 Create `src/components/shared/TeamMemberList.tsx`: member list with roles (captain badge), XP contributions
  - [ ] 4.3 Create `src/components/shared/TeamBadgeCollection.tsx`: grid of earned team badges with badge-pop animation
  - [ ] 4.4 Create `src/components/shared/ChallengeProgressBar.tsx`: accessible progress bar with ARIA progressbar role, aria-valuenow/min/max
  - [ ] 4.5 Create `src/components/shared/ChallengeLeaderboard.tsx`: per-challenge participant ranking with medals, anonymous support, current user highlight
  - [ ] 4.6 Create `src/components/shared/TeamLeaderboardView.tsx`: team leaderboard tab content with medals, streak display, course/program scope
  - [ ] 4.7 Create `src/components/shared/TeamInvitationCard.tsx`: invitation accept/decline with keyboard operability

## Phase 5: Pages — Team Management

- [ ] 5. Team management pages
  - [ ] 5.1 Create `src/pages/student/teams/TeamProfilePage.tsx`: team name, avatar, members, Team_XP, Team_Streak, badges, active challenges, XP breakdown
  - [ ] 5.2 Create `src/pages/student/teams/CreateTeamPage.tsx`: team creation form for student-formed mode (name input, member selection from roster)
  - [ ] 5.3 Create `src/pages/teacher/teams/TeamManagementPage.tsx`: list teams for teacher's courses, create/edit/delete actions
  - [ ] 5.4 Create `src/pages/teacher/teams/TeamFormPage.tsx`: create/edit team form (name, member selection from enrollment roster)
  - [ ] 5.5 Add team formation mode toggle to course settings (modify CourseForm.tsx to include team_formation_mode select)

## Phase 6: Pages — Social Challenges

- [ ] 6. Challenge pages
  - [ ] 6.1 Create `src/pages/student/challenges/ChallengeListPage.tsx`: list active, upcoming, completed challenges with status badges and progress indicators
  - [ ] 6.2 Create `src/pages/student/challenges/ChallengeDetailPage.tsx`: challenge info, progress bar, challenge leaderboard, completion banner
  - [ ] 6.3 Create `src/pages/teacher/challenges/TeacherChallengeListPage.tsx`: teacher's challenge management list with create/edit actions
  - [ ] 6.4 Create `src/pages/teacher/challenges/ChallengeFormPage.tsx`: challenge creation form with type-specific goal inputs, date pickers, reward configuration

## Phase 7: Leaderboard Integration

- [ ] 7. Existing leaderboard page integration
  - [ ] 7.1 Modify `LeaderboardPage.tsx`: add "Teams" tab to FILTER_OPTIONS, add 'teams' to valid filters
  - [ ] 7.2 Add TabsContent for "teams" filter that renders TeamLeaderboardView with course/program scope selectors
  - [ ] 7.3 Integrate useTeamRealtime hook into LeaderboardPage for real-time team XP updates with polling fallback

## Phase 8: Routing & Navigation

- [ ] 8. Router and layout updates
  - [ ] 8.1 Add student routes to AppRouter: `/student/teams/:teamId`, `/student/teams/new`, `/student/challenges`, `/student/challenges/:id`
  - [ ] 8.2 Add teacher routes to AppRouter: `/teacher/teams`, `/teacher/teams/new`, `/teacher/teams/:id/edit`, `/teacher/challenges`, `/teacher/challenges/new`, `/teacher/challenges/:id/edit`
  - [ ] 8.3 Add "My Team" and "Challenges" nav items to StudentLayout sidebar
  - [ ] 8.4 Add "Teams" and "Challenges" nav items to TeacherLayout sidebar

## Phase 9: Property-Based Tests

- [ ] 9. Property-based tests (fast-check, min 100 iterations)
  - [ ] 9.1 Create `src/__tests__/properties/teamCreation.property.test.ts`: P1 (captain assignment), P2 (one team per student per course), P3 (team size bounds 2-6)
  - [ ] 9.2 Create `src/__tests__/properties/teamXp.property.test.ts`: P4 (Team XP respects membership period and course scope)
  - [ ] 9.3 Create `src/__tests__/properties/teamStreak.property.test.ts`: P5 (streak computation), P6 (milestone badge awards), P7 (badge idempotence)
  - [ ] 9.4 Create `src/__tests__/properties/challengeSchema.property.test.ts`: P8 (date constraint validation)
  - [ ] 9.5 Create `src/__tests__/properties/challengeProgress.property.test.ts`: P10 (progress by type), P11 (completion triggers reward), P12 (idempotence)
  - [ ] 9.6 Create `src/__tests__/properties/challengeRewards.property.test.ts`: P13 (full XP to each team member), P14 (reward uniqueness)
  - [ ] 9.7 Create `src/__tests__/properties/challengeLeaderboard.property.test.ts`: P15 (sort order), P16 (anonymous entries), P17 (team leaderboard sort and scope)
  - [ ] 9.8 Create `src/__tests__/properties/teamFormationMode.property.test.ts`: P18 (mode controls student team creation)
  - [ ] 9.9 Create `src/__tests__/properties/challengeLifecycle.property.test.ts`: P9 (auto-enrollment), P19 (ended challenges reject updates), P20 (challenge list filtering)

## Phase 10: Unit Tests

- [ ] 10. Unit and component tests
  - [ ] 10.1 Create `src/__tests__/unit/teamBadgeDefinitions.test.ts`: all 6 badges defined, correct keys, structure matches BadgeDef interface
  - [ ] 10.2 Create `src/__tests__/unit/challengeTypes.test.ts`: all 4 types defined, Blooms_Climb goal fixed at 6
  - [ ] 10.3 Create `src/__tests__/unit/teamProfilePage.test.tsx`: renders team name, members, XP, streak, badges
  - [ ] 10.4 Create `src/__tests__/unit/challengeProgressBar.test.tsx`: ARIA progressbar role, aria-valuenow/min/max attributes
  - [ ] 10.5 Create `src/__tests__/unit/teamLeaderboardView.test.tsx`: renders team rows, medal icons for top 3, highlight current team
  - [ ] 10.6 Create `src/__tests__/unit/challengeForm.test.tsx`: form validation errors for invalid dates, reward range
  - [ ] 10.7 Create `src/__tests__/unit/teamInvitationCard.test.tsx`: accept/decline buttons, keyboard operability
  - [ ] 10.8 Create `src/__tests__/unit/leaderboardTeamsTab.test.tsx`: Teams tab renders in LeaderboardPage, switches to team view
