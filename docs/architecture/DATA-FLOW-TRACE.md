# Edeviser Platform — Data Flow Trace

> Generated: 2026-03-28
> Traces how data enters the system, how it is transformed, and where it is stored.
> Highlights missing, broken, or unclear flows.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Entry Points](#2-data-entry-points)
3. [Data Reading Flows](#3-data-reading-flows)
4. [Edge Function Flows](#4-edge-function-flows)
5. [Cron / Scheduled Flows](#5-cron--scheduled-flows)
6. [Auth & Middleware Flows](#6-auth--middleware-flows)
7. [Data Transformation Patterns](#7-data-transformation-patterns)
8. [Real-time Subscriptions](#8-real-time-subscriptions)
9. [Offline & Draft Persistence](#9-offline--draft-persistence)
10. [Broken, Missing, or Unclear Flows](#10-broken-missing-or-unclear-flows)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + TS)                       │
│  Forms → react-hook-form + Zod → useMutation → supabase.from()    │
│  Reads → useQuery (TanStack) → supabase.from().select()           │
│  Auth  → supabase.auth → AuthProvider context → RouteGuard        │
│  Files → supabase.storage.upload()                                 │
│  Edge  → supabase.functions.invoke()                               │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ PostgREST / Auth / Storage / Edge APIs
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│                        SUPABASE BACKEND                            │
│  Auth    → JWT + session management                                │
│  RLS     → auth_user_role(), auth_institution_id()                 │
│  DB      → PostgreSQL (68+ migrations)                             │
│  Edge    → 24 Deno edge functions                                  │
│  Storage → reports bucket (signed URLs)                            │
│  Cron    → pg_cron (streak, at-risk, summaries, perfect-day)       │
│  Extensions → pg_cron, pg_net                                      │
└────────────────────────────────────────────────────────────────────┘
```

### Key Files

| Layer | Path | Purpose |
|-------|------|---------|
| Supabase Client | `src/lib/supabase.ts` | Single client instance, auto-refresh, session persistence |
| Query Keys | `src/lib/queryKeys.ts` | 50+ hierarchical key categories for TanStack Query |
| Auth Provider | `src/providers/AuthProvider.tsx` | Session, profile fetch, role derivation, login lockout |
| Route Guard | `src/router/RouteGuard.tsx` | Role-based route protection |
| Audit Logger | `src/lib/auditLogger.ts` | PII-safe audit logging with field allowlists |
| Activity Logger | `src/lib/activityLogger.ts` | Fire-and-forget student activity logging |
| XP Client | `src/lib/xpClient.ts` | Wrapper for award-xp edge function |
| Sentry | `src/lib/sentry.ts` | Error tracking with PII scrubbing |
| Shared Auth | `supabase/functions/_shared/auth.ts` | JWT validation + cron auth for edge functions |

---

## 2. Data Entry Points

### 2.1 Authentication

| Action | Source File | Method | Target | Data |
|--------|-----------|--------|--------|------|
| Sign In | `src/providers/AuthProvider.tsx` | `supabase.auth.signInWithPassword()` | Supabase Auth | email, password |
| Reset Password | `src/pages/ResetPasswordPage.tsx` | `supabase.auth.resetPasswordForEmail()` | Supabase Auth | email |
| Update Password | `src/pages/UpdatePasswordPage.tsx` | `supabase.auth.updateUser()` | Supabase Auth | password |

**Sign-In Flow Detail:**
```
1. Client lockout check (localStorage)
2. Server lockout check (check-login-rate edge function → login_attempts table)
3. supabase.auth.signInWithPassword()
   ├─ Failure → record attempt (client + server), check lockout threshold (5 max, 15 min)
   └─ Success → fetch profile from profiles table
                → derive role + institution_id
                → set auth context
                → log activity (students only → student_activity_log)
                → redirect to role dashboard
```

### 2.2 Administration Domain

| Hook | File | Method | Table | Data | Audit |
|------|------|--------|-------|------|-------|
| `useCreateUser` | `src/hooks/useUsers.ts` | `.insert()` | `profiles` | full_name, email, role, institution_id | Yes |
| `useUpdateUser` | `src/hooks/useUsers.ts` | `.update()` | `profiles` | full_name, role | Yes |
| `useSoftDeleteUser` | `src/hooks/useUsers.ts` | `.update()` | `profiles` | is_active = false | Yes |
| `useBulkImportUsers` | `src/hooks/useBulkImport.ts` | Edge function | `bulk-import-users` | CSV rows (email, full_name, role, program_id) | Yes |
| `useCreateCourse` | `src/hooks/useCourses.ts` | `.insert()` | `courses` | name, code, program_id, semester_id, teacher_id, is_active | Yes |
| `useUpdateCourse` | `src/hooks/useCourses.ts` | `.update()` | `courses` | name, code, teacher_id, semester_id, is_active | Yes |
| `useSoftDeleteCourse` | `src/hooks/useCourses.ts` | `.update()` | `courses` | is_active = false | Yes |
| `useEnrollStudent` | `src/hooks/useEnrollments.ts` | `.insert()` | `student_courses` | student_id, course_id, section_id | Yes |
| `useUnenrollStudent` | `src/hooks/useEnrollments.ts` | `.update()` | `student_courses` | status = 'dropped' | Yes |

### 2.3 Curriculum & Learning Outcomes Domain

| Hook | File | Method | Table(s) | Data |
|------|------|--------|----------|------|
| `useCreateILO` | `src/hooks/useILOs.ts` | `.insert()` | `learning_outcomes` (type='ILO') | title, description, institution_id |
| `useUpdateILO` | `src/hooks/useILOs.ts` | `.update()` | `learning_outcomes` | title, description |
| `useDeleteILO` | `src/hooks/useILOs.ts` | `.delete()` | `learning_outcomes` | Dependency check on `outcome_mappings` first |
| `useReorderILOs` | `src/hooks/useILOs.ts` | `.upsert()` | `learning_outcomes` | sort_order (batch) |
| `useCreatePLO` | `src/hooks/usePLOs.ts` | `.insert()` | `learning_outcomes` (type='PLO') | title, description, program_id |
| `useUpdatePLOMappings` | `src/hooks/usePLOs.ts` | `.delete()` + `.insert()` | `outcome_mappings` | PLO→ILO mappings with weights |
| `useCreateCLO` | `src/hooks/useCLOs.ts` | `.insert()` + `.insert()` | `learning_outcomes` (type='CLO'), `outcome_mappings` | title, description, course_id, plo_mappings (weights) |
| `useUpdateCLOMappings` | `src/hooks/useCLOs.ts` | `.delete()` + `.insert()` | `outcome_mappings` | CLO→PLO mappings with weights |

### 2.4 Teaching & Assessment Domain

| Hook | File | Method | Table(s) | Data |
|------|------|--------|----------|------|
| `useCreateAssignment` | `src/hooks/useAssignments.ts` | `.insert()` | `assignments` | title, description, course_id, due_date, total_marks, clo_weights, late_window_hours, prerequisites |
| `useCreateSubmission` | `src/hooks/useSubmissions.ts` | `.insert()` | `submissions` | assignment_id, student_id, file_url, is_late, institution_id |
| `useUploadSubmissionFile` | `src/hooks/useSubmissions.ts` | Storage `.upload()` | Storage bucket | File binary + metadata (assignment_id, student_id) |
| `useCreateGrade` | `src/hooks/useGrades.ts` | `.insert()` | `grades` | submission_id, rubric_selections, total_score, score_percent, overall_feedback, graded_by |
| `useCreateRubric` | `src/hooks/useRubrics.ts` | `.insert()` + `.insert()` | `rubrics`, `rubric_criteria` | title, clo_id, is_template, criteria (levels, max_points) |
| `useCreateQuiz` | `src/hooks/useQuizzes.ts` | `.insert()` | `quizzes` | course_id, title, clo_ids, time_limit_minutes, max_attempts, is_adaptive, adaptation_config, practice_mode_enabled |
| `useCreateQuestion` | `src/hooks/useQuestionBank.ts` | `.insert()` | `question_bank` | course_id, clo_id, bloom_level, question_type, question_text, options, correct_answer, difficulty_rating, labels |
| `useUpdateBaselineConfig` | `src/hooks/useBaselineTests.ts` | `.upsert()` | `baseline_test_config` | course_id, time_limit_minutes, is_active |

**Grade → Attainment Cascade:**
```
Teacher submits grade
  → grades table insert
  → Frontend calls calculate-attainment-rollup edge function
    → Inserts evidence into outcome_evidence
    → Computes CLO attainment → outcome_attainment (scope='student_course')
    → Rolls up to PLO attainment → outcome_attainment (scope='student_program')
    → Rolls up to ILO attainment → outcome_attainment (scope='student_institution')
    → Inserts notification if attainment crosses threshold
  → Performance budget: must complete within 500ms
```

### 2.5 Student Domain

| Hook | File | Method | Table(s) | Data |
|------|------|--------|----------|------|
| `useCreateJournalEntry` | `src/hooks/useJournal.ts` | `.insert()` | `journal_entries` | student_id, course_id, content, clo_id, is_shared |
| `useLogWellnessHabit` | `src/hooks/useWellnessHabits.ts` | `.insert()` | `wellness_habit_logs` | student_id, date, wellness_type, value, completed_at |
| `useUpdateWellnessGoal` | `src/hooks/useWellnessGoals.ts` | `.upsert()` | `student_wellness_preferences` | student_id, habit_targets (JSONB) |
| `useSaveResponses` | `src/hooks/useOnboardingResponses.ts` | `.upsert()` | `onboarding_responses` | student_id, question_id, assessment_version, selected_option, score_contribution |
| `useCompleteMicroAssessment` | `src/hooks/useMicroAssessments.ts` | `.update()` | `micro_assessment_schedule`, `student_profiles` | status='completed', profile_completeness recalculation |

**Wellness Habit Logging Chain:**
```
Student logs habit
  → wellness_habit_logs INSERT
  → Edge function: award-xp (source='wellness_habit')
    → xp_transactions INSERT
    → student_gamification UPDATE (xp_total, level)
  → Edge function: check-badges (trigger='habit_log')
    → Evaluate badge conditions
    → student_badges INSERT (if earned)
    → award-xp (source='badge') for badge XP reward
  → Query invalidation: heatmap, wellness logs, badges
```

### 2.6 Gamification Domain

| Hook | File | Method | Table | Data |
|------|------|--------|-------|------|
| `useCreateBonusEvent` | `src/hooks/useBonusEvents.ts` | `.insert()` | `xp_events` | name, description, event_type, xp_multiplier, bonus_xp, starts_at, ends_at, is_active, institution_id |
| `useUpdateBonusEvent` | `src/hooks/useBonusEvents.ts` | `.update()` | `xp_events` | All fields above |
| `useDeleteBonusEvent` | `src/hooks/useBonusEvents.ts` | `.update()` | `xp_events` | is_active = false (soft delete) |

### 2.7 Verified Explanations (QA)

| Hook | File | Method | Table | Data |
|------|------|--------|-------|------|
| `useApproveExplanation` | `src/hooks/useExplanationConfidence.ts` | `.update()` + `.insert()` | `verified_explanations` | question_id, explanation_text, source='teacher_approved', verified_by |
| `useEditExplanation` | `src/hooks/useExplanationConfidence.ts` | `.update()` + `.insert()` | `verified_explanations` | question_id, explanation_text, source='teacher_edited' |

---

## 3. Data Reading Flows

### 3.1 Query Architecture

All reads go through `src/hooks/` (82 hooks) using TanStack Query:

```
Component → useQuery({ queryKey, queryFn, enabled, staleTime })
  → queryFn calls supabase.from('table').select('columns')
  → PostgREST translates to SQL + RLS filters
  → Response cached by TanStack Query (default staleTime: 30s)
  → onSuccess/onError callbacks for side effects
```

### 3.2 Key Read Patterns

| Pattern | Example | Files |
|---------|---------|-------|
| Single row by user | `.eq('student_id', userId).maybeSingle()` | `useStreak.ts`, `useLevel.ts` |
| Join with FK | `.select('*, profiles!fk_name(id, full_name)')` | `useSubmissions.ts` |
| Multi-step fetch | Fetch IDs → fetch related data with `.in()` | `useCLOProgress.ts`, `useStudentDashboard.ts` |
| Paginated | `.range(from, to)` with `{ count: 'exact' }` | `useSubmissions.ts` |
| Ordered + limited | `.order('due_date').limit(5)` | `useStudentDashboard.ts` |
| Complex filter | `.or('condition1,condition2')` | `useBloomsProgression.ts` |

### 3.3 Read Flows by Domain

| Domain | Primary Tables | Key Hooks |
|--------|---------------|-----------|
| Dashboard KPIs | `student_gamification`, `student_courses`, `submissions`, `outcome_attainment` | `useStudentKPIs`, `useTeacherDashboard`, `useParentDashboard` |
| Leaderboard | `student_gamification`, `leaderboard_weekly` (materialized view) | `useLeaderboard`, `useMyRank` |
| OBE/Attainment | `learning_outcomes`, `outcome_attainment`, `outcome_mappings` | `useCLOProgress`, `useOutcomeAttainment`, `useCurriculumMatrix` |
| Assessment | `assignments`, `submissions`, `grades`, `rubrics`, `rubric_criteria` | `useAssignments`, `useSubmissions`, `usePendingSubmissions` |
| Quizzes | `quizzes`, `question_bank`, `quiz_attempts`, `blooms_progression` | `useQuiz`, `useBloomsClimbState`, `useAdaptiveQuiz` |
| Gamification | `student_gamification`, `xp_transactions`, `student_badges` | `useStreak`, `useLevel`, `useXP`, `useBadges` |
| Wellness | `wellness_habit_logs`, `student_wellness_preferences` | `useWellnessHabits`, `useHeatmapData`, `useHabitAnalytics` |
| Portfolio | `outcome_attainment`, `student_badges`, `journal_entries`, `xp_transactions` | `usePortfolio` |
| Notifications | `notifications` | `useNotificationRealtime` |

### 3.4 RPC Calls

| Function | Hook | Purpose |
|----------|------|---------|
| `increment_streak_freezes` | `src/hooks/useStreakFreeze.ts` | Increment user's streak freeze count |
| `health_check_ping` | `supabase/functions/health/index.ts` | DB connectivity check |

---

## 4. Edge Function Flows

### 4.1 User-Triggered Functions

| Function | Trigger | Input | Reads | Writes | External APIs |
|----------|---------|-------|-------|--------|---------------|
| `award-xp` | Frontend mutation | `{ student_id, xp_amount, source, reference_id?, note? }` | `student_gamification`, `xp_events` (active bonuses) | `xp_transactions` INSERT, `student_gamification` UPDATE (xp_total, level) | None |
| `check-badges` | After XP award / mutations | `{ student_id, trigger, context? }` | `student_gamification`, `submissions`, `grades`, `journal_entries`, `wellness_habit_logs`, `blooms_progression` | `student_badges` INSERT, triggers `award-xp` for badge XP | None |
| `process-streak` | On student login | `{ student_id }` | `student_gamification` | `student_gamification` UPDATE (streak_count, last_login_date, freezes) | Invokes `award-xp` at milestones (7/14/30/60/100 days) |
| `process-onboarding` | Onboarding completion | `{ student_id, assessment_version, skipped_sections, baseline_course_ids, is_day1 }` | `onboarding_responses`, `student_courses` | `student_profiles` UPDATE (Big Five, VARK, self-efficacy, study strategy), `micro_assessment_schedule` INSERT, `starter_week_sessions` INSERT | Invokes `award-xp`, `generate-starter-week` |
| `calculate-attainment-rollup` | After grading | `{ grade_id, submission_id, total_score, score_percent, rubric_selections }` | `grades`, `submissions`, `assignments`, `rubric_criteria`, `learning_outcomes`, `outcome_mappings` | `outcome_evidence` INSERT, `outcome_attainment` UPSERT (CLO→PLO→ILO cascade), `notifications` INSERT | None |
| `bulk-import-users` | Admin CSV upload | `{ rows: [{email, full_name, role, program_id?}] }` | `profiles` (check existing) | `auth.admin.createUser()`, `profiles` INSERT | Supabase Auth Admin API |
| `export-student-data` | Student GDPR request | Auth header (student identity) | `profiles`, `grades`, `submissions`, `outcome_attainment`, `xp_transactions`, `journal_entries`, `student_badges`, `habit_logs` | Storage `reports` bucket upload | None |
| `check-login-rate` | Sign-in flow | `{ email, action: 'check'|'record_failure'|'clear' }` | `login_attempts` | `login_attempts` UPSERT/DELETE | None |
| `compute-habit-correlations` | Frontend on-demand | `{ student_id }` | `wellness_habit_logs`, `outcome_attainment`, `quiz_attempts` | None (returns insights) | None |
| `suggest-goals` | Frontend on-demand | `{ student_id, week_start }` | `student_courses`, `courses`, `outcome_attainment`, `assignments` | None (returns suggestions) | None |
| `generate-starter-week` | After onboarding | `{ student_id, self_efficacy_score, enrolled_course_ids }` | `courses`, `assignments` | `starter_week_sessions` INSERT | None |

### 4.2 AI-Powered Functions

| Function | Trigger | Input | Reads | Writes | External APIs |
|----------|---------|-------|-------|--------|---------------|
| `generate-quiz-questions` | Teacher request | `{ course_id, clo_ids, bloom_levels, question_count, question_types }` | `course_material_embeddings` (vector search), `learning_outcomes` | `question_bank` INSERT, `quiz_generation_logs` INSERT | OpenAI API (LLM generation) |
| `select-adaptive-question` | During adaptive quiz | `{ quiz_id, quiz_attempt_id, previous_question_id?, previous_answer_correct? }` | `quiz_attempts`, `question_bank`, `question_analytics` | `quiz_attempts` UPDATE (question_sequence, difficulty_trajectory) | None |
| `ai-at-risk-prediction` | pg_cron (3 AM daily) | None (cron-triggered) | `student_gamification` (at_risk_signals), `assignments`, `outcome_attainment` | `ai_feedback` INSERT (suggestion_type='at_risk_prediction') | None |
| `ai-feedback-draft` | Teacher grading UI | `{ submission_id, rubric_selections }` | `submissions`, `assignments`, `rubric_criteria`, `learning_outcomes`, grades (historical) | None (returns draft) | OpenAI API (LLM drafting) |
| `ai-module-suggestion` | On weak CLO detection | `{ student_id }` | `outcome_attainment`, `learning_outcomes` (prerequisites) | `ai_feedback` INSERT | None |
| `update-question-analytics` | After quiz attempt | `{ quiz_attempt_id }` | `quiz_attempts`, `question_bank`, `question_analytics` | `question_analytics` UPSERT, `question_bank` UPDATE (calibrated difficulty) | None |
| `generate-accreditation-report` | Coordinator/Admin | `{ program_id, semester_id?, template: 'ABET'|'HEC'|'Generic', chart_images? }` | `learning_outcomes`, `outcome_attainment`, `programs`, `courses` | Storage `reports` bucket (PDF upload), optional email via `send-email-notification` | jsPDF generation |

---

## 5. Cron / Scheduled Flows

| Function | Schedule | Purpose | Reads | Writes |
|----------|----------|---------|-------|--------|
| `compute-at-risk-signals` | `0 2 * * *` (2 AM daily) | Compute at-risk signals for all students | `student_gamification` (last_login_date), `outcome_attainment`, `submissions`, `assignments` | `student_gamification` UPDATE (at_risk_signals JSONB) |
| `ai-at-risk-prediction` | `0 3 * * *` (3 AM daily) | Predict CLO failure probability | `student_gamification`, `assignments`, `outcome_attainment` | `ai_feedback` INSERT |
| `perfect-day-prompt` | `0 18 * * *` (6 PM daily) | Nudge students who completed 3/4 habits | `profiles`, `wellness_habit_logs`, `submissions`, `journal_entries`, `student_activity_log` | `notifications` INSERT |
| `streak-risk-cron` | `0 20 * * *` (8 PM daily) | Warn students at risk of losing streaks | `student_gamification` (streak_count, last_login_date) | Invokes `send-email-notification` (streak_risk) |
| `weekly-summary-cron` | `0 8 * * 1` (Mon 8 AM) | Weekly XP/badge/streak summary email | `profiles`, `xp_transactions`, `student_badges`, `student_gamification`, `submissions` | Invokes `send-email-notification` (weekly_summary) |

**Cron Authentication:**
```
All cron functions validate via:
  1. x-cron-secret header (matches CRON_SECRET env var)
  2. OR service role key in Authorization header
  3. Reject if neither present
```

---

## 6. Auth & Middleware Flows

### 6.1 Authentication Flow

```
┌──────────┐    ┌───────────────┐    ┌──────────────┐    ┌────────────┐
│  Login   │───▶│ check-login-  │───▶│ supabase.    │───▶│ fetch      │
│  Form    │    │ rate (check)  │    │ auth.signIn  │    │ profile    │
└──────────┘    └───────────────┘    └──────────────┘    └─────┬──────┘
                                                               │
                              ┌─────────────────────────────────┘
                              ▼
                    ┌──────────────────┐    ┌────────────────┐
                    │ AuthContext set:  │───▶│ RouteGuard     │
                    │ user, role,      │    │ checks role    │
                    │ institutionId    │    │ → redirect     │
                    └──────────────────┘    └────────────────┘
```

### 6.2 RLS Enforcement

```
Every supabase.from() query automatically includes:
  → JWT token in Authorization header
  → PostgreSQL RLS policies evaluate:
    - auth.uid() = current user ID
    - auth_user_role() = role from profiles table
    - auth_institution_id() = institution from profiles table
  → Only matching rows returned/modified
```

**RLS Helper Functions (defined in migration `20260222073710`):**
- `auth_user_role()` → extracts role from profiles WHERE id = auth.uid()
- `auth_institution_id()` → extracts institution_id from profiles WHERE id = auth.uid()

### 6.3 Audit Trail

```
Every mutation hook calls logAuditEvent():
  → audit_logs INSERT
  → Fields: action, entity_type, entity_id, diff (allowlisted), performed_by
  → PII Protection: AUDIT_FIELD_ALLOWLIST per entity type
    - user: [role, is_active, program_id] (no names/emails)
    - grade: [submission_id, score_percent, total_score]
    - assignment: [title, course_id, due_date, status]
  → Unknown entities: keys logged, values → [redacted]
```

### 6.4 Error Tracking (Sentry)

```
PII Scrubbing Pipeline:
  1. beforeSend: strip user.email, .username, .ip_address
  2. scrubPII(): regex replace emails → [email], UUIDs → [uuid]
  3. beforeBreadcrumb: scrub messages, strip query params from URLs
  4. Global: sendDefaultPii = false
```

---

## 7. Data Transformation Patterns

### 7.1 Input Validation

All forms use `react-hook-form` + `Zod` schemas:
- Schema files: `src/lib/schemas/` (user, course, ilo, plo, clo, assignment, rubric, quiz, etc.)
- Validation happens client-side before any Supabase call
- Edge functions have their own `validatePayload()` functions

### 7.2 XP Award Pipeline

```
Action occurs (login, submission, habit, quiz, etc.)
  → xpClient.awardXP({ student_id, xp_amount, source, reference_id })
    → award-xp edge function:
      1. Check for active bonus events (xp_events where is_active=true, now between starts_at/ends_at)
      2. Apply multiplier if bonus active: xp_amount *= xp_multiplier
      3. INSERT into xp_transactions
      4. SELECT current xp_total from student_gamification
      5. Calculate new level using threshold formula: xp = 50 * n^1.5
      6. UPDATE student_gamification (xp_total, level)
      7. Return { new_xp_total, new_level, level_changed }
```

**Level Thresholds:**
| Level | XP Required |
|-------|------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4+ | `floor(50 * n^1.5)` |

### 7.3 Attainment Classification

```
classifyAttainment(percent):
  ≥ 85% → 'Excellent'
  ≥ 70% → 'Satisfactory'
  ≥ 50% → 'Developing'
  < 50% → 'Not_Yet'
```

### 7.4 Onboarding Profile Computation

```
process-onboarding:
  1. Aggregate personality responses → Big Five traits (openness, conscientiousness, extraversion, agreeableness, neuroticism)
  2. Aggregate learning style responses → VARK profile (visual, auditory, read_write, kinesthetic)
     - dominant_style determined by highest score (or 'multimodal' if within threshold of 10)
  3. Aggregate self-efficacy responses → overall, general_academic, course_specific, self_regulated_learning
  4. Aggregate study strategy responses → time_management, elaboration, self_testing, help_seeking
  5. Baseline test results → per-CLO scores
  6. Generate micro-assessment schedule (days 2-14) → micro_assessment_schedule
  7. Award XP per completed section (25 XP each, 50 XP for full completion)
```

### 7.5 Adaptive Question Selection

```
select-adaptive-question:
  1. Read quiz attempt (question_sequence, difficulty_trajectory)
  2. Determine ability level from recent performance:
     - 'high' if >66% correct recent questions
     - 'low' if <33% correct
     - 'medium' otherwise
  3. Select next question from question_bank:
     - Filter by quiz CLO mapping, exclude already-asked
     - Target difficulty based on ability level
     - Prioritize bloom level progression
  4. Update quiz_attempts (question_sequence, difficulty_trajectory)
  5. Return sanitized question (no correct_answer)
```

### 7.6 At-Risk Signal Computation

```
compute-at-risk-signals (nightly 2 AM):
  For each active student:
    1. days_since_last_login = daysBetween(last_login_date, today)
    2. clo_attainment_trend:
       - Compare avg attainment (last 30 days) vs (30-60 days ago)
       - > 5% improvement → 'improving'
       - > 5% decline → 'declining'
       - Otherwise → 'stagnant'
    3. submission_pattern:
       - Based on recent submission timing vs due dates
       - 'early' | 'on_time' | 'late' | 'missed'
    4. Store as JSONB in student_gamification.at_risk_signals

ai-at-risk-prediction (nightly 3 AM):
  Uses weighted formula:
    probability = 0.3 * login_frequency_risk
               + 0.4 * attainment_trend_risk
               + 0.3 * submission_pattern_risk
  If probability ≥ 50% AND assignment due in 7-14 days:
    → INSERT into ai_feedback (suggestion_type='at_risk_prediction')
```

---

## 8. Real-time Subscriptions

| Hook | Table | Event | Filter | Purpose |
|------|-------|-------|--------|---------|
| `useNotificationRealtime` (via `useRealtime`) | `notifications` | INSERT | `user_id=eq.{userId}` | Show toast for new notifications |

**Resilience:**
- Exponential backoff on channel errors: 1s → 2s → 4s → 8s → max 30s
- Fallback to polling (30s interval) if WebSocket unavailable
- Channel deduplication by `table:event:filter` composite key
- Full cleanup on component unmount

---

## 9. Offline & Draft Persistence

### 9.1 Draft Manager (`src/lib/draftManager.ts`)

```
Auto-save to localStorage with prefix 'edeviser_draft_':
  → startAutoSave(key, getContent, intervalMs=30000)
  → Saves every 30 seconds while component mounted
  → Silent failure on quota exceeded
  → Loaded on component mount, cleared on successful submit
```

### 9.2 Offline Queue (`src/lib/offlineQueue.ts`)

```
When offline:
  → enqueue(handlerName, payload) → localStorage queue
When 'online' event fires:
  → flush() → execute queued operations
  → 3 retry max per event
  → Registered handlers called with stored payload
  → Fire-and-forget semantics
```

### 9.3 Notification Batcher (`src/lib/notificationBatcher.ts`)

Minimal/stub implementation (appears to be planned but not yet built).

---

## 10. Broken, Missing, or Unclear Flows

### 10.1 CRITICAL: Table Name Mismatches in export-student-data

The `export-student-data` edge function queries tables that don't match migration-defined names:

| Code Uses | Migration Defines | Impact |
|-----------|------------------|--------|
| `student_badges` | `badges` | Export will return empty array or error |
| `habit_logs` | `wellness_habit_logs` | Export will return empty array or error |
| `journal_entries.title`, `journal_entries.word_count` | Columns not in migration | Columns will be null or query error |

**File:** `supabase/functions/export-student-data/index.ts` (lines 44-50)

### 10.2 CRITICAL: Missing Database Objects

| Object | Type | Referenced By | Impact |
|--------|------|--------------|--------|
| `course_material_embeddings` | Table | `generate-quiz-questions` (vector similarity search) | AI quiz generation will fail completely |
| `health_check_ping` | RPC Function | `supabase/functions/health/index.ts` | Health check falls back to profiles query (degraded but functional) |
| `reports` | Storage Bucket | `export-student-data`, `generate-accreditation-report` | Export/report upload fails; export-student-data has fallback `createBucket()` |
| `increment_streak_freezes` | RPC Function | `src/hooks/useStreakFreeze.ts` | Streak freeze purchase will fail |

### 10.3 CRITICAL: Broken Foreign Key

`blooms_progression.clo_id` references `clos(id)` but the table is actually `learning_outcomes(id)`. This means:
- Bloom's progression queries with joins may fail or return no data
- `useBloomsProgression` hook may silently return empty results

### 10.4 HIGH: Non-Transactional Multi-Table Writes

Several hooks perform multi-step writes without transactions:

| Hook | Steps | Risk |
|------|-------|------|
| `useCreateCLO` | 1. INSERT learning_outcomes 2. INSERT outcome_mappings | CLO created without mappings if step 2 fails |
| `useUpdateCLOMappings` | 1. DELETE old mappings 2. INSERT new mappings | Mappings deleted but new ones not inserted if step 2 fails |
| `useCreateRubric` | 1. INSERT rubrics 2. INSERT rubric_criteria | Rubric exists without criteria if step 2 fails |
| `useDeleteRubric` | 1. DELETE criteria 2. DELETE rubric | Criteria deleted but rubric remains if step 2 fails |

### 10.5 HIGH: 19 Unused Tables (Schema Without Code)

These tables exist in migrations but have zero frontend code:

**LMS Block (completely unimplemented):**
- `announcements`, `course_modules`, `course_materials`, `discussions`, `discussion_replies`
- `attendance`, `timetables`

**Institutional Management (completely unimplemented):**
- `surveys`, `survey_questions`, `survey_responses`
- `cqi_actions`, `accreditation_standards`, `accreditation_evidence`
- `fee_structures`, `fee_payments`

### 10.6 MEDIUM: Fire-and-Forget Edge Function Calls

XP awards, badge checks, and activity logging use fire-and-forget patterns. Errors are caught and logged to console but:
- No retry mechanism for failed XP awards
- No reconciliation if badge check fails after XP was already awarded
- Student could lose earned XP/badges silently

### 10.7 MEDIUM: Notification Batcher Not Implemented

`src/lib/notificationBatcher.ts` appears to be a stub. If the system generates many notifications (e.g., bulk grading), each notification is a separate INSERT — could cause performance issues.

### 10.8 MEDIUM: Offline Queue Handler Registration

`src/lib/offlineQueue.ts` implements queue infrastructure but it's unclear which handlers are actually registered. If no handlers are registered for queued operation types, the queue will flush but operations will be silently dropped.

### 10.9 LOW: Client-Side Multi-Step Queries

`useCLOProgress`, `useStudentDashboard`, and `useLeaderboard` perform 3-5 sequential Supabase queries and join data client-side. This works but:
- More network round-trips than necessary
- No atomicity guarantee (data could change between queries)
- Could be replaced with database views or RPC functions for better performance

### 10.10 LOW: Duplicate Badge Definitions

Badge definitions are duplicated between:
- `src/lib/badgeDefinitions.ts` (frontend)
- `supabase/functions/check-badges/index.ts` (edge function, hardcoded)

If badge XP values or conditions change, both must be updated manually.

---

## Appendix A: Complete Edge Function Catalog

| # | Function | Auth | Trigger | Reads From | Writes To |
|---|----------|------|---------|-----------|-----------|
| 1 | `award-xp` | JWT | Frontend | `student_gamification`, `xp_events` | `xp_transactions`, `student_gamification` |
| 2 | `check-badges` | JWT | Frontend | `student_gamification`, `submissions`, `grades`, `journal_entries`, `wellness_habit_logs`, `blooms_progression` | `student_badges` |
| 3 | `calculate-attainment-rollup` | Service/Teacher/Admin | Frontend | `grades`, `submissions`, `assignments`, `rubric_criteria`, `learning_outcomes`, `outcome_mappings` | `outcome_evidence`, `outcome_attainment`, `notifications` |
| 4 | `process-streak` | JWT | Login | `student_gamification` | `student_gamification` |
| 5 | `process-onboarding` | JWT | Onboarding | `onboarding_responses`, `student_courses` | `student_profiles`, `micro_assessment_schedule` |
| 6 | `bulk-import-users` | Admin JWT | Admin UI | `profiles` | Auth users, `profiles` |
| 7 | `export-student-data` | Student JWT | Student UI | 7 tables | Storage `reports` |
| 8 | `check-login-rate` | Any | Login | `login_attempts` | `login_attempts` |
| 9 | `generate-quiz-questions` | Teacher JWT | Teacher UI | `course_material_embeddings`, `learning_outcomes` | `question_bank`, `quiz_generation_logs` |
| 10 | `select-adaptive-question` | JWT | Quiz attempt | `quiz_attempts`, `question_bank`, `question_analytics` | `quiz_attempts` |
| 11 | `ai-at-risk-prediction` | Cron | pg_cron 3AM | `student_gamification`, `assignments`, `outcome_attainment` | `ai_feedback` |
| 12 | `ai-feedback-draft` | Teacher JWT | Grading UI | `submissions`, `assignments`, `rubric_criteria`, `learning_outcomes`, `grades` | None (returns draft) |
| 13 | `ai-module-suggestion` | JWT | Weak CLO | `outcome_attainment`, `learning_outcomes` | `ai_feedback` |
| 14 | `compute-at-risk-signals` | Cron | pg_cron 2AM | `student_gamification`, `outcome_attainment`, `submissions`, `assignments` | `student_gamification` |
| 15 | `compute-habit-correlations` | JWT | On-demand | `wellness_habit_logs`, `outcome_attainment`, `quiz_attempts` | None |
| 16 | `streak-risk-cron` | Cron | pg_cron 8PM | `student_gamification` | Invokes `send-email-notification` |
| 17 | `weekly-summary-cron` | Cron | pg_cron Mon 8AM | `profiles`, `xp_transactions`, `student_badges`, `student_gamification`, `submissions` | Invokes `send-email-notification` |
| 18 | `send-email-notification` | Service/Cron | Internal | `profiles` (email prefs) | External email API |
| 19 | `suggest-goals` | JWT | On-demand | `student_courses`, `courses`, `outcome_attainment`, `assignments` | None |
| 20 | `generate-starter-week` | JWT | Onboarding | `courses`, `assignments` | `starter_week_sessions` |
| 21 | `perfect-day-prompt` | Cron | pg_cron 6PM | `profiles`, `wellness_habit_logs`, `submissions`, `journal_entries`, `student_activity_log` | `notifications` |
| 22 | `update-question-analytics` | JWT | Post-quiz | `quiz_attempts`, `question_bank`, `question_analytics` | `question_analytics`, `question_bank` |
| 23 | `generate-accreditation-report` | Coordinator/Admin JWT | Admin UI | `learning_outcomes`, `outcome_attainment`, `programs`, `courses` | Storage `reports` (PDF) |
| 24 | `health` | None | Monitoring | `profiles` (fallback) | None |

## Appendix B: Daily Cron Timeline

```
02:00 UTC  compute-at-risk-signals    → student_gamification.at_risk_signals
03:00 UTC  ai-at-risk-prediction      → ai_feedback (at-risk predictions)
18:00 UTC  perfect-day-prompt         → notifications (missing habit nudge)
20:00 UTC  streak-risk-cron           → emails (streak warning)
08:00 MON  weekly-summary-cron        → emails (weekly digest)
```

## Appendix C: Data Flow Diagram — Grade to Attainment

```
Teacher grades submission
       │
       ▼
┌──────────────┐     ┌────────────────────────────────────────┐
│ grades table │────▶│ calculate-attainment-rollup            │
│ INSERT       │     │                                        │
└──────────────┘     │ 1. Fetch rubric_criteria + CLO mapping │
                     │ 2. Calculate per-criterion scores      │
                     │ 3. Insert outcome_evidence              │
                     │ 4. Aggregate CLO attainment (%)         │
                     │ 5. Classify: Excellent/Satisfactory/    │
                     │    Developing/Not_Yet                   │
                     │ 6. UPSERT outcome_attainment            │
                     │    (scope=student_course)               │
                     │ 7. Roll up → PLO attainment             │
                     │    (scope=student_program)              │
                     │ 8. Roll up → ILO attainment             │
                     │    (scope=student_institution)          │
                     │ 9. Insert notification if threshold     │
                     │    crossed                              │
                     └────────────────────────────────────────┘
                              │
                              ▼
                     Dashboard reads via
                     useCLOProgress / useOutcomeAttainment
```
