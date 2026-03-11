# Design Document — Team Challenges & Social Quests

## Overview

This design covers the Team Challenges & Social Quests feature for the Edeviser platform — extending the individual gamification engine with collaborative team mechanics and competitive social challenges. The feature adds:

1. A Team Management system where teachers create teams (teacher-assigned mode) or students form their own teams (student-formed mode), with 2–6 members per team, captain roles, and invitation workflows
2. Team XP — a collective XP pool computed as the SUM of member XP within the team's course during active membership, with atomic increments on the `teams.xp_total` column
3. Team Streaks — consecutive days where at least one team member completed an academic habit, maintained by a pg_cron job at 00:05 UTC
4. Team Badges — collective achievements (Team Spirit, Streak Squad/Champions/Legends, Full House, Quest Conquerors) stored in `team_badges` with idempotent award logic
5. Social Challenges (Quests) — teacher-created time-bounded competitive events with 5 types (Academic, Habit, XP_Race, Blooms_Climb, Cooperative), team or individual participation, real-time progress tracking, and XP + badge rewards
6. Challenge Leaderboard — per-challenge ranking of participants by progress, with real-time updates
7. Team Leaderboard — a "Teams" tab on the existing LeaderboardPage, ranking teams by Team_XP with course/program scoping and real-time updates
8. Themed Quest Worlds (Phase 2, design only) — narrative-arc quest collections organized by academic theme
9. Contribution Accountability — minimum contribution threshold (default 20%) with warning/inactive status tracking, replacement votes, and "Team Player" badge eligibility gating
10. Cooperative Challenge Mode — default cooperative challenge type with Cooperation Score (0–100) rewarding equitable participation, XP Race limits (max 2 concurrent per course), and cooperative reward bonuses
11. Peer Teaching Moments — CLO mastery-gated explanations (text + optional media) with view tracking, clarity/helpfulness ratings, XP rewards for both author and viewer, and Teaching Impact metrics
12. AI-Powered Team Health Monitoring — weekly Gini coefficient analysis, engagement trend detection, health scoring (0–100), automatic flagging (high-inequality, declining-engagement, at-risk), weekly teacher reports, and restructuring suggestions

The system integrates with the existing Supabase backend (PostgreSQL + RLS, Edge Functions, Realtime), TanStack Query hooks, and the existing XP/level/streak/badge/leaderboard subsystems. All new tables enforce RLS scoped by institution and role. Team XP updates use atomic increments to prevent race conditions.

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Team XP storage | Denormalized `xp_total` on `teams` table, atomically incremented | Avoids expensive SUM queries on every leaderboard load; atomic increment prevents lost updates |
| Team XP update trigger | Inside `award-xp` Edge Function | Single source of truth for all XP awards; team XP stays consistent with individual XP |
| Team streak maintenance | pg_cron job at 00:05 UTC | Consistent with existing individual streak cron pattern; avoids real-time complexity |
| Challenge progress tracking | Dedicated `update-challenge-progress` Edge Function | Decoupled from award-xp; invoked after grade, habit, or XP events; idempotent |
| Team formation mode | Column on `courses` table | Simple per-course toggle; no separate settings table needed |
| Invitation workflow | `team_invitations` table with status enum | Clean state machine (pending → accepted/declined/expired); RLS-friendly |
| Challenge participant polymorphism | `participant_type` enum + `participant_id` UUID | Avoids separate tables for team vs individual progress; single query for leaderboard |
| Team soft delete | `deleted_at` timestamp on `teams` | Preserves historical data for XP transactions and challenge records |
| Reward distribution | Full XP to each team member (not split) | Per requirement 12.6; incentivizes team participation without penalizing larger teams |
| Real-time updates | Supabase Realtime with polling fallback | Consistent with existing leaderboard pattern; 30s polling on connection failure |
| Contribution threshold | 20% default, configurable per institution | Research-backed (Slavin, 1995); prevents ghost groups without being too restrictive |
| Contribution status cron | Daily at 01:00 UTC (after streak cron) | Sequential scheduling avoids resource contention; status depends on up-to-date XP data |
| Cooperative as default challenge type | "cooperative" is pre-selected in challenge form | Research (Johnson & Johnson, 2009) shows cooperative > competitive for most learners |
| XP Race limit | Max 2 concurrent per course | Limits competitive pressure while still allowing optional competition |
| Cooperation Score formula | 100 × (1 − Gini) × (% members above threshold) | Rewards both equality and participation; penalizes teams with inactive members even if Gini is low |
| Peer Teaching eligibility | CLO attainment ≥ 85% | Ensures only students who have mastered content can teach; aligns with Mazur (1997) |
| Teaching Impact measurement | 7-day post-view attainment delta | Allows time for learning to manifest; avoids noise from immediate post-view checks |
| Team Health Score | Weighted composite of 4 indicators | Multi-dimensional assessment catches different failure modes (inequality, disengagement, isolation) |
| Health computation schedule | Weekly on Monday at 02:00 UTC | Weekly cadence balances freshness with computation cost; Monday timing gives teachers a week to act |
| Restructuring suggestions | Teacher-approved only, never automatic | Preserves teacher authority; avoids disrupting teams without human judgment |

## Architecture

### Team XP Flow

```mermaid
sequenceDiagram
    actor Student
    participant AwardXP as award-xp (Edge Function)
    participant DB as Supabase PostgreSQL
    participant RT as Supabase Realtime
    participant UI as Team Leaderboard (React)

    Student->>AwardXP: Trigger (submission, grade, habit, etc.)
    AwardXP->>DB: INSERT xp_transactions (student_id, xp_amount, course_id)
    AwardXP->>DB: Check active team membership for student + course
    alt Student is on a team in this course
        AwardXP->>DB: UPDATE teams SET xp_total = xp_total + amount WHERE id = team_id
    end
    DB-->>RT: Broadcast teams table change
    RT-->>UI: Realtime event received
    UI->>UI: Invalidate TanStack Query → refetch leaderboard
```

### Challenge Progress Flow

```mermaid
sequenceDiagram
    actor Trigger as Event (Grade/Habit/XP)
    participant UCP as update-challenge-progress (Edge Function)
    participant DB as Supabase PostgreSQL
    participant AwardXP as award-xp (Edge Function)
    participant RT as Supabase Realtime

    Trigger->>UCP: POST { event_type, student_id, course_id, metadata }
    UCP->>DB: Query active challenges for course + matching type
    loop For each matching challenge
        UCP->>DB: Compute current progress for participant
        UCP->>DB: UPDATE challenge_progress SET current_progress = computed_value
        alt Progress >= goal_target AND not yet completed
            UCP->>DB: SET completed_at = NOW(), reward_granted = true
            UCP->>AwardXP: Award challenge_reward XP to participant(s)
        end
    end
    DB-->>RT: Broadcast challenge_progress changes
```

### Team Formation Flow (Student-Formed Mode)

```mermaid
sequenceDiagram
    actor Captain as Student (Captain)
    actor Invitee as Student (Invitee)
    participant UI as Team UI (React)
    participant DB as Supabase PostgreSQL

    Captain->>UI: Create team (name)
    UI->>DB: INSERT teams + INSERT team_members (captain)
    Captain->>UI: Invite student
    UI->>DB: INSERT team_invitations (status: pending)
    DB-->>Invitee: Notification: team invitation
    Invitee->>UI: Accept invitation
    UI->>DB: BEGIN TRANSACTION
    UI->>DB: Verify team not full, student not on another team
    UI->>DB: UPDATE team_invitations SET status = accepted
    UI->>DB: INSERT team_members
    UI->>DB: COMMIT
```

### Team Streak Cron Flow

```mermaid
sequenceDiagram
    participant Cron as pg_cron (00:05 UTC)
    participant DB as Supabase PostgreSQL
    participant Badges as check-team-badges (logic)

    Cron->>DB: SELECT all active teams (deleted_at IS NULL)
    loop For each team
        Cron->>DB: Check habit_logs for any team member yesterday
        alt At least one member had a habit
            Cron->>DB: UPDATE teams SET streak_count = streak_count + 1, streak_last_active_date = yesterday
            alt Streak milestone reached (7, 14, 30)
                Cron->>Badges: Award streak badge + notify members
            end
        else No member had a habit
            Cron->>DB: UPDATE teams SET streak_count = 0
        end
    end
```

### Contribution Status Update Flow

```mermaid
sequenceDiagram
    participant Cron as pg_cron (01:00 UTC)
    participant DB as Supabase PostgreSQL
    participant Badges as check-badges (logic)

    Cron->>DB: SELECT all active teams with members
    loop For each team
        Cron->>DB: Compute weekly XP per member (last 7 days, course-scoped)
        Cron->>DB: Compute team weekly total XP
        loop For each member
            Cron->>DB: Calculate contribution % = member_xp / team_xp × 100
            alt contribution % < threshold (20%)
                Cron->>DB: INCREMENT consecutive_low_days
                alt consecutive_low_days >= 5
                    Cron->>DB: SET contribution_status = 'inactive'
                else consecutive_low_days >= 3
                    Cron->>DB: SET contribution_status = 'warning', send notification
                end
            else contribution % >= threshold
                Cron->>DB: SET contribution_status = 'active', reset consecutive_low_days = 0
            end
        end
        Cron->>DB: Compute Cooperation Score = 100 × (1 − Gini) × (% active members)
        Cron->>DB: UPDATE teams SET cooperation_score = computed_value
        Cron->>Badges: Check "Team Player" badge eligibility for active members (14+ consecutive days)
    end
```

### Peer Teaching Moment Flow

```mermaid
sequenceDiagram
    actor Author as Student (Author, CLO ≥85%)
    actor Viewer as Student (Teammate)
    participant UI as Team Profile (React)
    participant DB as Supabase PostgreSQL
    participant AwardXP as award-xp (Edge Function)

    Author->>UI: Create Teaching Moment (title, text, optional media)
    UI->>DB: INSERT peer_teaching_moments
    UI->>AwardXP: Award 30 XP (source: peer_teaching)
    Viewer->>UI: View Teaching Moment
    UI->>DB: INSERT teaching_moment_views (record pre_view_attainment)
    Viewer->>UI: Rate (clarity 1-5, helpfulness 1-5)
    UI->>DB: INSERT teaching_moment_ratings
    UI->>AwardXP: Award 10 XP to viewer (source: peer_learning)
```

### Team Health Computation Flow

```mermaid
sequenceDiagram
    participant Cron as pg_cron (Monday 02:00 UTC)
    participant DB as Supabase PostgreSQL
    participant Report as pg_cron (Monday 03:00 UTC)

    Cron->>DB: SELECT all active teams
    loop For each team
        Cron->>DB: Compute Gini coefficient of member XP contributions (last 7 days)
        Cron->>DB: Compute engagement trend (compare this week vs last week XP)
        Cron->>DB: Compute challenge participation rate
        Cron->>DB: Compute activity overlap rate (days with 2+ active members / 7)
        Cron->>DB: health_score = 0.30×(1−Gini)×100 + 0.25×trend_score + 0.25×participation×100 + 0.20×overlap×100
        Cron->>DB: INSERT team_health_snapshots
        Cron->>DB: UPDATE teams SET health_score, health_status
        alt health_score < 40
            Cron->>DB: Flag team as at-risk, notify teacher
        end
        alt health_score < 40 for 2+ consecutive weeks
            Cron->>DB: Generate restructuring suggestion
        end
    end
    Report->>DB: Aggregate health data per teacher's courses
    Report->>DB: Generate Weekly Team Health Report
```

## Components and Interfaces

### New Pages

| Page | Route | Role | Description |
|------|-------|------|-------------|
| TeamProfilePage | `/student/teams/:teamId` | Student | Team profile with stats, members, badges, active challenges, teaching moments |
| TeamManagementPage | `/teacher/teams` | Teacher | List/create/edit teams for teacher's courses, accountability metrics, health indicators |
| TeamFormPage | `/teacher/teams/new`, `/teacher/teams/:id/edit` | Teacher | Create/edit team form |
| ChallengeListPage | `/student/challenges` | Student | List active, upcoming, and completed challenges |
| ChallengeDetailPage | `/student/challenges/:id` | Student | Challenge details, progress bar, challenge leaderboard |
| ChallengeFormPage | `/teacher/challenges/new`, `/teacher/challenges/:id/edit` | Teacher | Create/edit social challenge form |
| TeacherChallengeListPage | `/teacher/challenges` | Teacher | Teacher's challenge management list |
| TeamHealthReportPage | `/teacher/team-health` | Teacher | Weekly team health report with flagged teams and recommendations |

### New Shared Components

| Component | Location | Description |
|-----------|----------|-------------|
| TeamCard | `src/components/shared/TeamCard.tsx` | Compact team display (name, XP, streak, member count, health score badge) |
| TeamMemberList | `src/components/shared/TeamMemberList.tsx` | Member list with roles, XP contributions, and contribution status indicators |
| TeamBadgeCollection | `src/components/shared/TeamBadgeCollection.tsx` | Grid of earned team badges |
| ChallengeProgressBar | `src/components/shared/ChallengeProgressBar.tsx` | Accessible progress bar with ARIA attributes |
| ChallengeLeaderboard | `src/components/shared/ChallengeLeaderboard.tsx` | Per-challenge participant ranking |
| TeamLeaderboardView | `src/components/shared/TeamLeaderboardView.tsx` | Team leaderboard tab content for LeaderboardPage |
| TeamInvitationCard | `src/components/shared/TeamInvitationCard.tsx` | Invitation accept/decline card |
| ContributionStatusBadge | `src/components/shared/ContributionStatusBadge.tsx` | Color-coded badge showing active/warning/inactive status |
| CooperationScoreDisplay | `src/components/shared/CooperationScoreDisplay.tsx` | Cooperation score gauge with color coding |
| PeerTeachingMomentCard | `src/components/shared/PeerTeachingMomentCard.tsx` | Teaching moment display with title, text, media link, ratings |
| PeerTeachingMomentForm | `src/components/shared/PeerTeachingMomentForm.tsx` | Form to create a teaching moment (title, text, optional media URL) |
| TeachingMomentRating | `src/components/shared/TeachingMomentRating.tsx` | Star rating component for clarity and helpfulness |
| TeamHealthBadge | `src/components/shared/TeamHealthBadge.tsx` | Color-coded health score badge (green/yellow/red) |
| TeamHealthChart | `src/components/shared/TeamHealthChart.tsx` | Recharts line chart showing health score trend over time |
| ReplacementVoteCard | `src/components/shared/ReplacementVoteCard.tsx` | Vote initiation/participation card for member replacement |

### Modified Existing Components

| Component | Change |
|-----------|--------|
| `LeaderboardPage.tsx` | Add "Teams" tab to filter tabs; render TeamLeaderboardView when selected; add Cooperation Score sort option |
| `StudentLayout.tsx` | Add "My Team" and "Challenges" nav items |
| `TeacherLayout.tsx` | Add "Teams", "Challenges", and "Team Health" nav items |
| `TeacherDashboard.tsx` | Add team health summary widget showing at-risk team count |

### New Hooks

| Hook | File | Description |
|------|------|-------------|
| `useTeams` | `src/hooks/useTeams.ts` | CRUD operations for teams (list, create, update, delete) |
| `useTeamMembers` | `src/hooks/useTeamMembers.ts` | Team member management (add, remove, list) with contribution status |
| `useTeamInvitations` | `src/hooks/useTeamInvitations.ts` | Invitation CRUD (send, accept, decline, list) |
| `useTeamProfile` | `src/hooks/useTeamProfile.ts` | Fetch team profile data (stats, members, badges, challenges, teaching moments) |
| `useChallenges` | `src/hooks/useChallenges.ts` | Challenge CRUD and listing |
| `useChallengeProgress` | `src/hooks/useChallengeProgress.ts` | Fetch challenge progress for current participant |
| `useChallengeLeaderboard` | `src/hooks/useChallengeLeaderboard.ts` | Fetch challenge leaderboard data |
| `useTeamLeaderboard` | `src/hooks/useTeamLeaderboard.ts` | Fetch team leaderboard with real-time subscription, Cooperation Score sort |
| `useTeamRealtime` | `src/hooks/useTeamRealtime.ts` | Realtime subscription for team XP/streak changes |
| `useChallengeRealtime` | `src/hooks/useChallengeRealtime.ts` | Realtime subscription for challenge progress changes |
| `useContributionStatus` | `src/hooks/useContributionStatus.ts` | Fetch contribution metrics for team members (teacher view) |
| `useReplacementVotes` | `src/hooks/useReplacementVotes.ts` | Replacement vote CRUD (initiate, vote, resolve, teacher override) |
| `usePeerTeaching` | `src/hooks/usePeerTeaching.ts` | Peer teaching moment CRUD (create, list, view, rate) |
| `useTeachingImpact` | `src/hooks/useTeachingImpact.ts` | Fetch teaching impact metrics for teacher view |
| `useTeamHealth` | `src/hooks/useTeamHealth.ts` | Fetch team health scores, snapshots, and health report data |
| `useTeamHealthReport` | `src/hooks/useTeamHealthReport.ts` | Fetch weekly team health report with recommendations |

### New Edge Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `update-challenge-progress` | Called after grade submission, habit log, XP award | Computes and updates challenge progress for affected participants; triggers reward on completion; handles cooperative challenge type |

### Modified Edge Functions

| Function | Change |
|----------|--------|
| `award-xp` | Accept `challenge_reward`, `peer_teaching`, and `peer_learning` as valid XP sources; after XP insert, check active team membership and atomically increment `teams.xp_total` for course-scoped XP; apply Cooperation Score bonus multiplier for cooperative challenge rewards |

### New Configuration Files

| File | Description |
|------|-------------|
| `src/lib/teamBadgeDefinitions.ts` | Team badge definitions following the `badgeDefinitions.ts` pattern; includes Team Player badge |
| `src/lib/challengeTypes.ts` | Challenge type configuration (goal descriptions, validation rules, progress computation logic); includes cooperative type |
| `src/lib/contributionThresholds.ts` | Contribution threshold defaults and status transition rules |
| `src/lib/teamHealthCalculator.ts` | Gini coefficient computation, health score formula, engagement trend detection, restructuring suggestion logic |

### Query Keys (additions to `src/lib/queryKeys.ts`)

```typescript
// ─── Team Challenges ─────────────────────────────────────────────────────────
const teams = createKeys('teams')
const teamMembers = createKeys('teamMembers')
const teamInvitations = createKeys('teamInvitations')
const teamBadges = createKeys('teamBadges')
const teamLeaderboard = createKeys('teamLeaderboard')
const socialChallenges = createKeys('socialChallenges')
const challengeProgress = createKeys('challengeProgress')
const challengeLeaderboard = createKeys('challengeLeaderboard')
const contributionStatus = createKeys('contributionStatus')
const replacementVotes = createKeys('replacementVotes')
const peerTeachingMoments = createKeys('peerTeachingMoments')
const teachingMomentRatings = createKeys('teachingMomentRatings')
const teachingImpact = createKeys('teachingImpact')
const teamHealth = createKeys('teamHealth')
const teamHealthReport = createKeys('teamHealthReport')
```

### Zod Schemas (additions to `src/lib/schemas/`)

```typescript
// src/lib/schemas/team.ts
export const createTeamSchema = z.object({
  name: z.string().min(2).max(50),
  course_id: z.string().uuid(),
  member_ids: z.array(z.string().uuid()).min(2).max(6),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  add_member_ids: z.array(z.string().uuid()).optional(),
  remove_member_ids: z.array(z.string().uuid()).optional(),
});

// src/lib/schemas/challenge.ts
export const createChallengeSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500),
  challenge_type: z.enum(['academic', 'habit', 'xp_race', 'blooms_climb', 'cooperative']),
  participation_mode: z.enum(['team', 'individual']),
  goal_target: z.number().int().positive(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  reward_xp: z.number().int().min(50).max(500),
  reward_badge_id: z.string().nullable().optional(),
  xp_race_acknowledged: z.boolean().optional(),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: 'End date must be after start date', path: ['end_date'] }
).refine(
  (data) => {
    const durationMs = new Date(data.end_date).getTime() - new Date(data.start_date).getTime();
    return durationMs >= 24 * 60 * 60 * 1000; // min 24 hours
  },
  { message: 'Challenge must be at least 24 hours long', path: ['end_date'] }
).refine(
  (data) => {
    const durationMs = new Date(data.end_date).getTime() - new Date(data.start_date).getTime();
    return durationMs <= 90 * 24 * 60 * 60 * 1000; // max 90 days
  },
  { message: 'Challenge cannot exceed 90 days', path: ['end_date'] }
).refine(
  (data) => data.challenge_type !== 'xp_race' || data.xp_race_acknowledged === true,
  { message: 'XP Race challenges require explicit acknowledgment', path: ['xp_race_acknowledged'] }
);

// src/lib/schemas/peerTeaching.ts
export const createTeachingMomentSchema = z.object({
  team_id: z.string().uuid(),
  clo_id: z.string().uuid(),
  title: z.string().min(3).max(100),
  explanation_text: z.string().min(50).max(500),
  media_url: z.string().url().nullable().optional(),
});

export const rateTeachingMomentSchema = z.object({
  teaching_moment_id: z.string().uuid(),
  clarity_rating: z.number().int().min(1).max(5),
  helpfulness_rating: z.number().int().min(1).max(5),
});

// src/lib/schemas/replacementVote.ts
export const initiateReplacementVoteSchema = z.object({
  team_id: z.string().uuid(),
  target_member_id: z.string().uuid(),
});
```

## Data Models

### New Tables

#### `teams`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Team identifier |
| `course_id` | uuid | FK → courses(id), NOT NULL | Course this team belongs to |
| `institution_id` | uuid | FK → institutions(id), NOT NULL | Institution scope for RLS |
| `name` | text | NOT NULL | Team name |
| `captain_id` | uuid | FK → profiles(id), NOT NULL | Current team captain |
| `xp_total` | integer | NOT NULL, default 0 | Denormalized team XP total |
| `streak_count` | integer | NOT NULL, default 0 | Current consecutive streak days |
| `streak_last_active_date` | date | nullable | Last date a member completed a habit |
| `cooperation_score` | integer | NOT NULL, default 100 | Cooperation score (0–100) |
| `health_score` | integer | NOT NULL, default 100 | AI-computed team health score (0–100) |
| `health_status` | text | NOT NULL, default 'healthy', CHECK(health_status IN ('healthy', 'needs_attention', 'at_risk')) | Health classification |
| `created_by` | uuid | FK → profiles(id), NOT NULL | Creator (teacher or student) |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update timestamp |
| `deleted_at` | timestamptz | nullable | Soft delete timestamp |

Indexes:
- UNIQUE(course_id, name) WHERE deleted_at IS NULL
- INDEX(course_id) WHERE deleted_at IS NULL
- INDEX(institution_id)

#### `team_members`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Record identifier |
| `team_id` | uuid | FK → teams(id), NOT NULL | Team reference |
| `student_id` | uuid | FK → profiles(id), NOT NULL | Student reference |
| `role` | text | NOT NULL, CHECK(role IN ('captain', 'member')) | Member role |
| `joined_at` | timestamptz | NOT NULL, default now() | Join timestamp |
| `left_at` | timestamptz | nullable | Leave timestamp (null = active) |
| `contribution_status` | text | NOT NULL, default 'active', CHECK(contribution_status IN ('active', 'warning', 'inactive')) | Contribution accountability status |
| `contribution_status_since` | timestamptz | nullable | When current contribution status was set |
| `consecutive_low_days` | integer | NOT NULL, default 0 | Days below contribution threshold |

Indexes:
- UNIQUE(team_id, student_id) WHERE left_at IS NULL — one active membership per team
- INDEX on (student_id) WHERE left_at IS NULL — fast lookup for "is student on a team?"

Constraint: A student can only be on one active team per course. Enforced via a unique partial index on (student_id, course_id_from_team) or checked in application logic during insert.

#### `team_invitations`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Invitation identifier |
| `team_id` | uuid | FK → teams(id), NOT NULL | Team reference |
| `invited_student_id` | uuid | FK → profiles(id), NOT NULL | Invited student |
| `invited_by` | uuid | FK → profiles(id), NOT NULL | Captain who sent invite |
| `status` | text | NOT NULL, CHECK(status IN ('pending', 'accepted', 'declined', 'expired')), default 'pending' | Invitation status |
| `created_at` | timestamptz | NOT NULL, default now() | Sent timestamp |
| `responded_at` | timestamptz | nullable | Response timestamp |

Indexes:
- INDEX(invited_student_id, status) — fast lookup for pending invitations
- INDEX(team_id, status) — fast lookup for team's pending invitations

#### `social_challenges`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Challenge identifier |
| `course_id` | uuid | FK → courses(id), NOT NULL | Course scope |
| `institution_id` | uuid | FK → institutions(id), NOT NULL | Institution scope for RLS |
| `title` | text | NOT NULL | Challenge title |
| `description` | text | NOT NULL | Challenge description |
| `challenge_type` | text | NOT NULL, CHECK(challenge_type IN ('academic', 'habit', 'xp_race', 'blooms_climb', 'cooperative')) | Challenge category |
| `participation_mode` | text | NOT NULL, CHECK(participation_mode IN ('team', 'individual')) | Team or individual |
| `goal_target` | integer | NOT NULL, CHECK(goal_target > 0) | Numeric goal |
| `start_date` | timestamptz | NOT NULL | Challenge start |
| `end_date` | timestamptz | NOT NULL | Challenge end |
| `reward_xp` | integer | NOT NULL, CHECK(reward_xp BETWEEN 50 AND 500) | XP reward amount |
| `reward_badge_id` | text | nullable | Optional badge reward key |
| `status` | text | NOT NULL, CHECK(status IN ('draft', 'active', 'ended', 'cancelled')), default 'draft' | Challenge lifecycle status |
| `created_by` | uuid | FK → profiles(id), NOT NULL | Teacher who created |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update timestamp |

Indexes:
- INDEX(course_id, status) — fast lookup for active challenges per course
- INDEX(institution_id)

#### `challenge_progress`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Record identifier |
| `challenge_id` | uuid | FK → social_challenges(id), NOT NULL | Challenge reference |
| `participant_type` | text | NOT NULL, CHECK(participant_type IN ('team', 'individual')) | Participant kind |
| `participant_id` | uuid | NOT NULL | References teams.id or profiles.id |
| `current_progress` | integer | NOT NULL, default 0 | Current progress toward goal |
| `completed_at` | timestamptz | nullable | Completion timestamp |
| `reward_granted` | boolean | NOT NULL, default false | Whether reward has been distributed |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update timestamp |

Indexes:
- UNIQUE(challenge_id, participant_id) — one progress record per participant per challenge
- INDEX(challenge_id, current_progress DESC) — fast leaderboard query

#### `team_badges`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Record identifier |
| `team_id` | uuid | FK → teams(id), NOT NULL | Team reference |
| `badge_key` | text | NOT NULL | Badge definition key |
| `earned_at` | timestamptz | NOT NULL, default now() | Award timestamp |

Indexes:
- UNIQUE(team_id, badge_key) — idempotent badge awards

#### `courses` table modification

Add column:
- `team_formation_mode` text NOT NULL DEFAULT 'teacher_assigned' CHECK(team_formation_mode IN ('teacher_assigned', 'student_formed'))

#### `peer_teaching_moments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Record identifier |
| `team_id` | uuid | FK → teams(id), NOT NULL | Team reference |
| `author_id` | uuid | FK → profiles(id), NOT NULL | Student who created the moment |
| `clo_id` | uuid | FK → clos(id), NOT NULL | Associated CLO |
| `title` | text | NOT NULL | Teaching moment title |
| `explanation_text` | text | NOT NULL, CHECK(length(explanation_text) BETWEEN 50 AND 500) | Explanation content |
| `media_url` | text | nullable | Optional audio/video link |
| `status` | text | NOT NULL, default 'active', CHECK(status IN ('active', 'archived')) | Moment status |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |

Indexes:
- INDEX(author_id, clo_id) — for per-CLO limit check (max 3 per student per CLO)
- INDEX(team_id, status) — for listing active moments per team

#### `teaching_moment_views`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Record identifier |
| `teaching_moment_id` | uuid | FK → peer_teaching_moments(id), NOT NULL | Teaching moment reference |
| `viewer_id` | uuid | FK → profiles(id), NOT NULL | Student who viewed |
| `viewed_at` | timestamptz | NOT NULL, default now() | View timestamp |
| `pre_view_attainment` | numeric | nullable | Viewer's CLO attainment at time of viewing |

Indexes:
- INDEX(teaching_moment_id, viewer_id) — for view tracking

#### `teaching_moment_ratings`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Record identifier |
| `teaching_moment_id` | uuid | FK → peer_teaching_moments(id), NOT NULL | Teaching moment reference |
| `viewer_id` | uuid | FK → profiles(id), NOT NULL | Student who rated |
| `clarity_rating` | integer | NOT NULL, CHECK(clarity_rating BETWEEN 1 AND 5) | Clarity score |
| `helpfulness_rating` | integer | NOT NULL, CHECK(helpfulness_rating BETWEEN 1 AND 5) | Helpfulness score |
| `rated_at` | timestamptz | NOT NULL, default now() | Rating timestamp |

Indexes:
- UNIQUE(teaching_moment_id, viewer_id) — one rating per viewer per moment

#### `team_health_snapshots`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Record identifier |
| `team_id` | uuid | FK → teams(id), NOT NULL | Team reference |
| `health_score` | integer | NOT NULL | Computed health score (0–100) |
| `gini_coefficient` | numeric(4,3) | NOT NULL | XP contribution inequality measure |
| `engagement_trend` | text | NOT NULL, CHECK(engagement_trend IN ('rising', 'stable', 'declining')) | 7-day trend direction |
| `challenge_participation_rate` | numeric(5,2) | NOT NULL | % of available challenges joined |
| `activity_overlap_rate` | numeric(5,2) | NOT NULL | % of days with 2+ active members |
| `computed_at` | timestamptz | NOT NULL, default now() | Computation timestamp |

Indexes:
- INDEX(team_id, computed_at DESC) — for trend queries

#### `replacement_votes`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Record identifier |
| `team_id` | uuid | FK → teams(id), NOT NULL | Team reference |
| `target_member_id` | uuid | FK → profiles(id), NOT NULL | Member being voted on |
| `initiated_by` | uuid | FK → profiles(id), NOT NULL | Captain who initiated |
| `status` | text | NOT NULL, default 'open', CHECK(status IN ('open', 'approved', 'rejected', 'expired')) | Vote status |
| `votes_for` | integer | NOT NULL, default 0 | Approval votes |
| `votes_against` | integer | NOT NULL, default 0 | Rejection votes |
| `created_at` | timestamptz | NOT NULL, default now() | Initiation timestamp |
| `resolved_at` | timestamptz | nullable | Resolution timestamp |
| `teacher_override` | boolean | NOT NULL, default false | Whether teacher overrode the result |

Indexes:
- INDEX(team_id, status) — for active vote lookup
- INDEX(target_member_id) — for cooldown check (7-day re-vote prevention)

### RLS Policies

#### `teams` table

```sql
-- Teachers: full CRUD on teams in their courses
CREATE POLICY "teacher_all_teams" ON teams
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
    AND institution_id = auth_institution_id()
  );

-- Students: SELECT teams in enrolled courses
CREATE POLICY "student_select_teams" ON teams
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND course_id IN (SELECT course_id FROM student_courses WHERE student_id = auth.uid())
    AND institution_id = auth_institution_id()
  );

-- Students: INSERT teams (student-formed mode only)
CREATE POLICY "student_create_team" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() = 'student'
    AND institution_id = auth_institution_id()
    AND course_id IN (
      SELECT c.id FROM courses c
      JOIN student_courses sc ON sc.course_id = c.id
      WHERE sc.student_id = auth.uid() AND c.team_formation_mode = 'student_formed'
    )
  );

-- Admins: full access within institution
CREATE POLICY "admin_all_teams" ON teams
  FOR ALL TO authenticated
  USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

-- Coordinators: SELECT teams in their program's courses
CREATE POLICY "coordinator_select_teams" ON teams
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'coordinator'
    AND institution_id = auth_institution_id()
    AND course_id IN (
      SELECT c.id FROM courses c
      JOIN programs p ON c.program_id = p.id
      WHERE p.coordinator_id = auth.uid()
    )
  );
```

#### `team_members` table

```sql
-- Students: SELECT members for teams in enrolled courses
CREATE POLICY "student_select_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() IN ('student', 'teacher', 'coordinator', 'admin')
    AND team_id IN (
      SELECT id FROM teams
      WHERE institution_id = auth_institution_id() AND deleted_at IS NULL
    )
  );

-- Captain: INSERT/DELETE members (student-formed mode)
CREATE POLICY "captain_manage_members" ON team_members
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'student'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON t.course_id = c.id
      WHERE t.captain_id = auth.uid()
        AND c.team_formation_mode = 'student_formed'
        AND t.deleted_at IS NULL
    )
  );

-- Teachers: INSERT/DELETE members
CREATE POLICY "teacher_manage_members" ON team_members
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON t.course_id = c.id
      WHERE c.teacher_id = auth.uid() AND t.deleted_at IS NULL
    )
  );

-- Parents: SELECT for linked students
CREATE POLICY "parent_select_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = auth.uid() AND verified = true
    )
  );
```

#### `team_invitations` table

```sql
-- Invited student: SELECT own invitations
CREATE POLICY "student_select_own_invitations" ON team_invitations
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND invited_student_id = auth.uid()
  );

-- Captain: INSERT invitations
CREATE POLICY "captain_insert_invitations" ON team_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() = 'student'
    AND invited_by = auth.uid()
    AND team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Invited student: UPDATE status (accept/decline)
CREATE POLICY "student_respond_invitation" ON team_invitations
  FOR UPDATE TO authenticated
  USING (
    auth_user_role() = 'student'
    AND invited_student_id = auth.uid()
    AND status = 'pending'
  );

-- Teachers: SELECT all invitations in their courses
CREATE POLICY "teacher_select_invitations" ON team_invitations
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON t.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );
```

#### `social_challenges` table

```sql
-- Students: SELECT active/ended challenges in enrolled courses
CREATE POLICY "student_select_challenges" ON social_challenges
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND status IN ('active', 'ended')
    AND course_id IN (SELECT course_id FROM student_courses WHERE student_id = auth.uid())
    AND institution_id = auth_institution_id()
  );

-- Teachers: full CRUD on challenges in their courses
CREATE POLICY "teacher_all_challenges" ON social_challenges
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
    AND institution_id = auth_institution_id()
  );

-- Admins: SELECT all challenges within institution
CREATE POLICY "admin_select_challenges" ON social_challenges
  FOR SELECT TO authenticated
  USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());
```

#### `challenge_progress` table

```sql
-- Students: SELECT own progress and challenge leaderboard
CREATE POLICY "student_select_progress" ON challenge_progress
  FOR SELECT TO authenticated
  USING (
    challenge_id IN (
      SELECT id FROM social_challenges
      WHERE course_id IN (SELECT course_id FROM student_courses WHERE student_id = auth.uid())
        AND institution_id = auth_institution_id()
    )
  );

-- Teachers: SELECT all progress for their course challenges
CREATE POLICY "teacher_select_progress" ON challenge_progress
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND challenge_id IN (
      SELECT sc.id FROM social_challenges sc
      JOIN courses c ON sc.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Parents: SELECT progress for linked students
CREATE POLICY "parent_select_progress" ON challenge_progress
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND participant_type = 'individual'
    AND participant_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = auth.uid() AND verified = true
    )
  );
```

#### `team_badges` table

```sql
-- All authenticated users in institution: SELECT
CREATE POLICY "select_team_badges" ON team_badges
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE institution_id = auth_institution_id()
    )
  );
-- INSERT/UPDATE via service role key only (Edge Functions)
```

#### `peer_teaching_moments` table

```sql
-- Team members: SELECT moments for their team
CREATE POLICY "team_select_teaching_moments" ON peer_teaching_moments
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.student_id = auth.uid() AND tm.left_at IS NULL
    )
  );

-- Author: INSERT own moments
CREATE POLICY "author_insert_teaching_moment" ON peer_teaching_moments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() = 'student'
    AND author_id = auth.uid()
    AND team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.student_id = auth.uid() AND tm.left_at IS NULL
    )
  );

-- Author: UPDATE (archive) own moments
CREATE POLICY "author_update_teaching_moment" ON peer_teaching_moments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

-- Teachers: SELECT all moments in their courses
CREATE POLICY "teacher_select_teaching_moments" ON peer_teaching_moments
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON t.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );
```

#### `teaching_moment_ratings` table

```sql
-- Viewer: INSERT own rating
CREATE POLICY "viewer_insert_rating" ON teaching_moment_ratings
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- Team members: SELECT ratings for their team's moments
CREATE POLICY "team_select_ratings" ON teaching_moment_ratings
  FOR SELECT TO authenticated
  USING (
    teaching_moment_id IN (
      SELECT ptm.id FROM peer_teaching_moments ptm
      WHERE ptm.team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.student_id = auth.uid() AND tm.left_at IS NULL
      )
    )
  );

-- Teachers: SELECT all ratings in their courses
CREATE POLICY "teacher_select_ratings" ON teaching_moment_ratings
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND teaching_moment_id IN (
      SELECT ptm.id FROM peer_teaching_moments ptm
      JOIN teams t ON ptm.team_id = t.id
      JOIN courses c ON t.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );
```

#### `team_health_snapshots` table

```sql
-- Teachers: SELECT snapshots for teams in their courses
CREATE POLICY "teacher_select_health_snapshots" ON team_health_snapshots
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON t.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Admins: SELECT all snapshots within institution
CREATE POLICY "admin_select_health_snapshots" ON team_health_snapshots
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND team_id IN (
      SELECT id FROM teams WHERE institution_id = auth_institution_id()
    )
  );
-- INSERT via service role key only (pg_cron)
-- Students cannot access health snapshots (no SELECT policy)
```

#### `replacement_votes` table

```sql
-- Active team members: SELECT and vote on open votes for their team
CREATE POLICY "member_select_votes" ON replacement_votes
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.student_id = auth.uid() AND tm.left_at IS NULL
    )
  );

-- Captain: INSERT new votes
CREATE POLICY "captain_insert_vote" ON replacement_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    initiated_by = auth.uid()
    AND team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Team members: UPDATE (cast vote) on open votes
CREATE POLICY "member_cast_vote" ON replacement_votes
  FOR UPDATE TO authenticated
  USING (
    status = 'open'
    AND team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.student_id = auth.uid() AND tm.left_at IS NULL
    )
  );

-- Teachers: SELECT and UPDATE (override) votes for teams in their courses
CREATE POLICY "teacher_manage_votes" ON replacement_votes
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON t.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );
```

### pg_cron Job: Team Streak Update

```sql
-- Runs daily at 00:05 UTC
SELECT cron.schedule(
  'update-team-streaks',
  '5 0 * * *',
  $$
  DO $$
  DECLARE
    team_rec RECORD;
    yesterday DATE := (CURRENT_DATE - INTERVAL '1 day')::DATE;
    has_habit BOOLEAN;
  BEGIN
    FOR team_rec IN
      SELECT t.id, t.streak_count
      FROM teams t
      WHERE t.deleted_at IS NULL
    LOOP
      SELECT EXISTS(
        SELECT 1 FROM habit_logs hl
        JOIN team_members tm ON tm.student_id = hl.student_id
        WHERE tm.team_id = team_rec.id
          AND tm.left_at IS NULL
          AND hl.log_date = yesterday
      ) INTO has_habit;

      IF has_habit THEN
        UPDATE teams
        SET streak_count = streak_count + 1,
            streak_last_active_date = yesterday,
            updated_at = NOW()
        WHERE id = team_rec.id;

        -- Check streak milestones (7, 14, 30)
        IF (team_rec.streak_count + 1) IN (7, 14, 30) THEN
          -- Award streak badge via team_badges insert (idempotent)
          INSERT INTO team_badges (team_id, badge_key, earned_at)
          VALUES (
            team_rec.id,
            CASE team_rec.streak_count + 1
              WHEN 7 THEN 'streak_squad'
              WHEN 14 THEN 'streak_champions'
              WHEN 30 THEN 'streak_legends'
            END,
            NOW()
          )
          ON CONFLICT (team_id, badge_key) DO NOTHING;

          -- Notify team members (via pg_net HTTP call to notification endpoint)
        END IF;
      ELSE
        UPDATE teams
        SET streak_count = 0, updated_at = NOW()
        WHERE id = team_rec.id;
      END IF;
    END LOOP;
  END $$;
  $$
);
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

> **Additional pg_cron Jobs (Gap Analysis Additions)**
>
> **Contribution Status Update** — Runs daily at 01:00 UTC. For each active team: computes weekly XP per member, calculates contribution percentage against threshold (default 20%), updates `contribution_status` (active → warning at 3 days, → inactive at 5 days below threshold), computes Cooperation Score, and checks Team Player badge eligibility (14+ consecutive active days).
>
> **Team Health Score Computation** — Runs every Monday at 02:00 UTC. For each active team: computes Gini coefficient of member XP contributions (last 7 days), engagement trend (rising/stable/declining based on ±10% week-over-week XP change), challenge participation rate, activity overlap rate (days with 2+ active members / 7). Formula: health = 0.30×(1−Gini)×100 + 0.25×trend_score + 0.25×participation×100 + 0.20×overlap×100. Inserts `team_health_snapshots`, updates `teams.health_score` and `health_status`. Flags at-risk teams (score < 40), generates restructuring suggestions if < 40 for 2+ consecutive weeks.
>
> **Weekly Team Health Report** — Runs every Monday at 03:00 UTC (after health computation). Aggregates health data per teacher's courses. Generates report: total teams, healthy/needs_attention/at_risk counts, at-risk team details with issues, recommended actions (reassign inactive members, schedule check-ins, rebalance composition).

### Property 1: Team creation assigns captain

*For any* team creation (teacher-assigned or student-formed), the creator or first-listed student shall have role `captain` in the resulting `team_members` records, and the `teams.captain_id` shall match that student's ID.

**Validates: Requirements 1.2, 2.2**

### Property 2: One active team per student per course

*For any* student and any course, the student shall be an active member (left_at IS NULL) of at most one team. Attempting to add a student who is already on an active team in the same course shall be rejected.

**Validates: Requirements 1.5, 2.3**

### Property 3: Team size bounds

*For any* team, the count of active members (left_at IS NULL) shall be between 2 and 6 inclusive. Accepting an invitation that would push the count above 6 shall be rejected.

**Validates: Requirements 1.1, 2.6**

### Property 4: Team XP computation respects membership and course scope

*For any* team and any set of XP transactions for its members, the team's `xp_total` shall equal the sum of XP amounts from transactions that are (a) earned by currently active members during their active membership period (between joined_at and left_at or now), and (b) scoped to the team's course. XP earned before joining, after leaving, or in a different course shall be excluded.

**Validates: Requirements 5.1, 5.4, 1.4, 18.1, 18.3**

### Property 5: Team streak computation

*For any* team and any sequence of daily habit logs for its members, the team's `streak_count` shall equal the count of consecutive calendar days (ending at the most recent active day) on which at least one active member completed at least one habit. A day with no member habits resets the streak to 0.

**Validates: Requirements 6.1, 6.2**

### Property 6: Team streak milestone triggers badge award

*For any* team whose streak_count reaches a milestone value (7, 14, or 30), the corresponding team badge (streak_squad, streak_champions, streak_legends) shall exist in `team_badges` for that team.

**Validates: Requirements 6.4**

### Property 7: Team badge idempotence

*For any* team and any badge_key, awarding the same badge twice shall result in exactly one `team_badges` record (enforced by the unique constraint on team_id, badge_key).

**Validates: Requirements 7.3**

### Property 8: Challenge schema validation — date constraints

*For any* challenge creation input, the schema shall reject inputs where: (a) start_date is not in the future, (b) end_date is not after start_date, (c) duration is less than 24 hours, or (d) duration exceeds 90 days. Valid date ranges shall be accepted.

**Validates: Requirements 8.7, 8.8**

### Property 9: Challenge auto-enrollment creates progress records

*For any* active challenge, when the challenge starts: if participation_mode is "team", every active team in the course shall have a `challenge_progress` record with current_progress = 0; if participation_mode is "individual", every enrolled student shall have a `challenge_progress` record with current_progress = 0.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 10: Challenge progress computation by type

*For any* active challenge and participant, the `current_progress` value shall be computed correctly according to the challenge type: for "academic", it equals the count of graded assignments within the challenge period; for "habit", it equals the current consecutive streak days during the challenge period; for "xp_race", it equals total XP earned in the course during the challenge period; for "blooms_climb", it equals the count of distinct Bloom's levels with at least one graded assignment.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 11: Challenge completion triggers reward

*For any* participant whose `current_progress` reaches or exceeds the challenge's `goal_target`, the participant shall be marked as completed (completed_at is set) and the reward shall be granted (reward_granted = true).

**Validates: Requirements 10.7, 19.3**

### Property 12: Challenge progress idempotence

*For any* triggering event processed by the update-challenge-progress Edge Function, processing the same event twice shall not double-count progress — the `current_progress` value shall be the same after the second processing.

**Validates: Requirements 19.5**

### Property 13: Challenge reward distribution — full XP to each team member

*For any* completed team challenge, every active member of the completing team shall receive the full `reward_xp` amount (not split). The total XP distributed equals `reward_xp × team_member_count`.

**Validates: Requirements 12.1, 12.6, 17.4**

### Property 14: Challenge reward uniqueness

*For any* participant and challenge, the reward shall be granted at most once, enforced by the unique constraint on (challenge_id, participant_id) and the `reward_granted` flag.

**Validates: Requirements 12.5**

### Property 15: Challenge leaderboard sort order

*For any* challenge leaderboard, participants shall be sorted by `current_progress` descending, with ties broken by earlier `completed_at` timestamp (completed participants rank above in-progress participants with the same progress).

**Validates: Requirements 11.1**

### Property 16: Anonymous leaderboard entries

*For any* individual challenge leaderboard entry where the participant has opted into anonymous mode, the displayed name shall be "Anonymous" and shall not reveal the student's identity.

**Validates: Requirements 11.3**

### Property 17: Team leaderboard sort and scope

*For any* team leaderboard query scoped to a course, the results shall contain only teams belonging to that course, sorted by `xp_total` descending. When scoped to a program, results shall contain teams from all courses in that program.

**Validates: Requirements 13.2, 13.3**

### Property 18: Team formation mode controls student team creation

*For any* course in "teacher_assigned" mode, students shall not be able to create teams or send invitations. For any course in "student_formed" mode, teamless enrolled students shall be able to create teams. Changing mode shall preserve existing teams.

**Validates: Requirements 2.1, 2.8, 3.3, 3.4**

### Property 19: Ended challenges reject progress updates

*For any* challenge with status "ended", attempts to update `challenge_progress` records shall be rejected — no progress changes after the end date.

**Validates: Requirements 12.3**

### Property 20: Challenge list filtering by enrollment

*For any* student, the challenge list shall return only challenges belonging to courses the student is enrolled in, with statuses active, upcoming (draft with future start_date), or recently ended.

**Validates: Requirements 9.5**

### Property 21: Contribution status transitions

*For any* team member and any sequence of daily contribution computations, the member's `contribution_status` shall transition as follows: "active" → "warning" after 3 consecutive days below the Contribution_Threshold, "warning" → "inactive" after 5 consecutive days below threshold, and back to "active" when the member's contribution meets or exceeds the threshold (resetting `consecutive_low_days` to 0).

**Validates: Requirements 27.3, 27.4, 27.5**

### Property 22: Contribution threshold respects institution configuration

*For any* institution with a custom `contribution_threshold` setting, the contribution status computation shall use that custom threshold instead of the default 20%. For institutions without a custom setting, the default 20% shall be used.

**Validates: Requirements 27.2**

### Property 23: Cooperation Score formula correctness

*For any* team with N active members, the Cooperation_Score shall equal 100 × (1 − Gini_Coefficient) × (count of members above threshold / N). The score shall be between 0 and 100 inclusive. A team where all members contribute equally and above threshold shall have a score of 100. A team where one member does all the work shall have a score near 0.

**Validates: Requirements 32.1**

### Property 24: Cooperative challenge has no competitive leaderboard

*For any* challenge with Challenge_Type "cooperative", the challenge detail page shall not display a competitive leaderboard ranking against other teams. Only the team's own progress toward the goal shall be shown.

**Validates: Requirements 31.4**

### Property 25: XP Race concurrent limit

*For any* course, the count of active Social_Challenges with Challenge_Type "xp_race" shall not exceed 2. Attempting to create a third concurrent XP Race shall be rejected.

**Validates: Requirements 33.2, 33.3**

### Property 26: Peer Teaching Moment eligibility gate

*For any* student and CLO, the "Create Teaching Moment" action shall be enabled only when the student's CLO attainment is ≥ 85%. Students below 85% attainment shall not be able to create teaching moments for that CLO.

**Validates: Requirements 34.1**

### Property 27: Peer Teaching Moment per-CLO limit

*For any* student and CLO, the count of active Peer_Teaching_Moments created by that student for that CLO shall not exceed 3. Attempting to create a 4th shall be rejected.

**Validates: Requirements 34.5**

### Property 28: Teaching moment rating uniqueness

*For any* teaching moment and viewer, the viewer shall be able to submit at most one rating, enforced by the unique constraint on (teaching_moment_id, viewer_id). Attempting to rate the same moment twice shall be rejected.

**Validates: Requirements 35.6**

### Property 29: Team Health Score formula correctness

*For any* team, the Team_Health_Score shall equal 0.30×(1−Gini)×100 + 0.25×trend_score + 0.25×participation_rate + 0.20×overlap_rate, where trend_score is 100 (rising), 75 (stable), or 25 (declining). The score shall be between 0 and 100 inclusive.

**Validates: Requirements 37.1**

### Property 30: Team health status classification

*For any* team, the `health_status` shall be "healthy" when `health_score` ≥ 70, "needs_attention" when 40 ≤ `health_score` < 70, and "at_risk" when `health_score` < 40. The classification shall be consistent with the score at all times.

**Validates: Requirements 38.4**

### Property 31: Replacement vote majority rule

*For any* replacement vote, the vote shall be approved only when `votes_for` > 50% of active team members (excluding the target member). The vote shall expire if not resolved within 48 hours. A new vote for the same member shall be blocked for 7 days after a failed vote.

**Validates: Requirements 29.2, 29.4**

### Property 32: Gini coefficient bounds

*For any* team with N ≥ 2 members, the computed Gini_Coefficient shall be between 0 (perfect equality) and 1 (maximum inequality) inclusive. For a team where all members have equal XP contributions, Gini shall be 0. For a team where one member has all XP, Gini shall approach (N−1)/N.

**Validates: Requirements 37.2**

## Error Handling

### Team Operations

| Error Scenario | Handling | User Feedback |
|----------------|----------|---------------|
| Team name already exists in course | Reject with 409 Conflict | Sonner toast: "A team with this name already exists in this course" |
| Student already on a team in course | Reject with 409 Conflict | Sonner toast: "Student is already a member of team [team_name]" |
| Team at max capacity (6 members) | Reject with 422 Unprocessable | Sonner toast: "This team is full (maximum 6 members)" |
| Team has fewer than 2 members after removal | Reject with 422 Unprocessable | Sonner toast: "A team must have at least 2 members" |
| Delete team with active challenge participation | Reject with 409 Conflict | Sonner toast: "Cannot delete a team with active challenge participation" |
| Student-formed team creation in teacher-assigned mode | Reject with 403 Forbidden | UI hides creation controls; API returns 403 |
| Invitation to student not enrolled in course | Reject with 422 Unprocessable | Sonner toast: "Student is not enrolled in this course" |
| Accept expired invitation | Reject with 410 Gone | Sonner toast: "This invitation has expired" |
| Replacement vote for non-inactive member | Reject with 422 Unprocessable | Sonner toast: "Only inactive members can be voted for replacement" |
| Replacement vote cooldown active | Reject with 429 Too Many Requests | Sonner toast: "A vote for this member was recently resolved. Please wait 7 days" |
| Teaching moment for CLO below 85% | Reject with 403 Forbidden | Sonner toast: "You need ≥85% attainment on this CLO to create a teaching moment" |
| Teaching moment per-CLO limit exceeded | Reject with 422 Unprocessable | Sonner toast: "Maximum 3 teaching moments per CLO reached" |
| Duplicate teaching moment rating | Reject with 409 Conflict | Sonner toast: "You have already rated this teaching moment" |
| Third concurrent XP Race creation | Reject with 422 Unprocessable | Sonner toast: "Maximum 2 active XP Race challenges per course" |
| XP Race without acknowledgment | Reject with 422 Unprocessable | Form validation error on acknowledgment checkbox |

### Challenge Operations

| Error Scenario | Handling | User Feedback |
|----------------|----------|---------------|
| Start date not in future | Reject with 422 Unprocessable | Form validation error on start_date field |
| Duration < 24 hours or > 90 days | Reject with 422 Unprocessable | Form validation error on end_date field |
| Reward XP outside 50–500 range | Reject with 422 Unprocessable | Form validation error on reward_xp field |
| Progress update on ended challenge | Silently skip (idempotent) | No user feedback needed (background process) |
| Reward distribution partial failure | Roll back entire transaction, log error | Admin audit log entry; retry via admin action |
| Challenge progress Edge Function timeout | Log error, retry with exponential backoff | Progress updates may be delayed; UI shows stale data |

### Real-Time Subscription Failures

| Error Scenario | Handling | User Feedback |
|----------------|----------|---------------|
| Realtime connection lost | Fall back to 30-second polling | Banner: "Live updates paused" |
| Realtime reconnection successful | Resume subscription, cancel polling | Banner removed |
| Excessive reconnection failures | Stop retrying after 5 attempts, polling only | Banner persists |

## Testing Strategy

### Property-Based Tests (fast-check, minimum 100 iterations each)

Each property test references its design document property and uses the tag format:
`// Feature: team-challenges, Property N: [property text]`

| Test File | Properties Covered | Description |
|-----------|-------------------|-------------|
| `src/__tests__/properties/teamCreation.property.test.ts` | P1, P2, P3 | Team creation assigns captain, one team per student per course, team size bounds |
| `src/__tests__/properties/teamXp.property.test.ts` | P4 | Team XP computation respects membership period and course scope |
| `src/__tests__/properties/teamStreak.property.test.ts` | P5, P6, P7 | Team streak computation, milestone badge awards, badge idempotence |
| `src/__tests__/properties/challengeSchema.property.test.ts` | P8 | Challenge creation schema date validation |
| `src/__tests__/properties/challengeProgress.property.test.ts` | P10, P11, P12 | Progress computation by type, completion triggers reward, idempotence |
| `src/__tests__/properties/challengeRewards.property.test.ts` | P13, P14 | Full XP to each team member, reward uniqueness |
| `src/__tests__/properties/challengeLeaderboard.property.test.ts` | P15, P16, P17 | Challenge leaderboard sort, anonymous entries, team leaderboard sort and scope |
| `src/__tests__/properties/teamFormationMode.property.test.ts` | P18 | Formation mode controls student team creation |
| `src/__tests__/properties/challengeLifecycle.property.test.ts` | P9, P19, P20 | Auto-enrollment, ended challenges reject updates, challenge list filtering |
| `src/__tests__/properties/contributionStatus.property.test.ts` | P21, P22 | Contribution status transitions, institution threshold configuration |
| `src/__tests__/properties/cooperationScore.property.test.ts` | P23, P24, P25 | Cooperation Score formula, cooperative challenge no leaderboard, XP Race limit |
| `src/__tests__/properties/peerTeaching.property.test.ts` | P26, P27, P28 | Teaching moment eligibility, per-CLO limit, rating uniqueness |
| `src/__tests__/properties/teamHealth.property.test.ts` | P29, P30, P32 | Health score formula, health status classification, Gini coefficient bounds |
| `src/__tests__/properties/replacementVote.property.test.ts` | P31 | Replacement vote majority rule, expiry, cooldown |

### Unit Tests

| Test File | Description |
|-----------|-------------|
| `src/__tests__/unit/teamBadgeDefinitions.test.ts` | All 6 team badges + Team Player badge defined, correct keys and structure |
| `src/__tests__/unit/challengeTypes.test.ts` | Challenge type configuration including cooperative, Blooms_Climb goal fixed at 6 |
| `src/__tests__/unit/teamProfilePage.test.tsx` | Team profile renders all required data fields including contribution status and cooperation score |
| `src/__tests__/unit/challengeProgressBar.test.tsx` | ARIA progressbar attributes present |
| `src/__tests__/unit/teamLeaderboardView.test.tsx` | Teams tab renders, medal icons for top 3, cooperation score sort option |
| `src/__tests__/unit/challengeForm.test.tsx` | Form validation, date constraints, reward range, XP Race acknowledgment, cooperative default |
| `src/__tests__/unit/teamInvitationCard.test.tsx` | Accept/decline keyboard operability |
| `src/__tests__/unit/leaderboardTeamsTab.test.tsx` | Teams tab integration with existing LeaderboardPage |
| `src/__tests__/unit/contributionStatusBadge.test.tsx` | Renders correct color/label for active, warning, inactive states |
| `src/__tests__/unit/contributionThresholds.test.ts` | Default threshold is 20%, status transition rules correct |
| `src/__tests__/unit/peerTeachingMomentCard.test.tsx` | Renders title, text, ratings, media link; view tracking |
| `src/__tests__/unit/teachingMomentRating.test.tsx` | Star rating component, 1-5 range, submit behavior |
| `src/__tests__/unit/teamHealthBadge.test.tsx` | Color coding: green ≥70, yellow 40-69, red <40 |
| `src/__tests__/unit/teamHealthCalculator.test.ts` | Gini coefficient computation, health score formula, trend detection |
| `src/__tests__/unit/replacementVoteCard.test.tsx` | Vote initiation, casting, expiry display, teacher override |
| `src/__tests__/unit/teamHealthReportPage.test.tsx` | Report renders team counts, flagged teams, recommendations |

### Testing Library

- Property-based testing: `fast-check` (already in project dependencies)
- Unit/component testing: `vitest` + `@testing-library/react`
- Minimum 100 iterations per property test
- Each property test tagged with: `// Feature: team-challenges, Property N: [title]`
