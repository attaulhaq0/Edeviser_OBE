# Tasks — Student Onboarding & Profiling

## 1. Database Schema & Migrations

- [ ] 1.1 Create migration: `onboarding_questions` table with indexes on (institution_id, assessment_type) and (course_id)
- [ ] 1.2 Create migration: `onboarding_responses` table with unique constraint on (student_id, question_id, assessment_version)
- [ ] 1.3 Create migration: `onboarding_progress` table with unique constraint on (student_id), including progressive profiling fields (day1_completed, micro_assessment_day, micro_assessment_dismissals, profile_completeness)
- [ ] 1.4 Create migration: `student_profiles` table with unique constraint on (student_id, assessment_version), including self_efficacy JSONB, study_strategies JSONB, and profile_completeness columns
- [ ] 1.5 Create migration: `baseline_attainment` table with unique constraint on (student_id, course_id, clo_id)
- [ ] 1.6 Create migration: `baseline_test_config` table with unique constraint on (course_id)
- [ ] 1.7 Create migration: `micro_assessment_schedule` table with unique constraint on (student_id, scheduled_day) and index on (student_id, status, scheduled_at)
- [ ] 1.8 Create migration: `starter_week_sessions` table with index on (student_id, status)
- [ ] 1.9 Create migration: `goal_suggestions` table with index on (student_id, week_start, status)
- [ ] 1.10 Create migration: RLS policies for all 9 tables (questions, responses, progress, student_profiles, baseline_attainment, baseline_test_config, micro_assessment_schedule, starter_week_sessions, goal_suggestions)
- [ ] 1.11 Create migration: Seed default 25 Big Five personality questions, 16 VARK learning style questions, 6 self-efficacy items, and 8 study strategy items
- [ ] 1.12 Create migration: Update `onboarding_questions` assessment_type CHECK to include 'self_efficacy' and 'study_strategy'

## 2. Shared Library Code

- [ ] 2.1 Create `src/lib/onboardingSchemas.ts` — Zod schemas for likertResponse, varkResponse, baselineResponse, selfEfficacyResponse, studyStrategyResponse, saveResponses, processOnboarding, baselineQuestion, baselineTestConfig, starterWeekSession, goalSuggestion, smartGoalTemplate
- [ ] 2.2 Create `src/lib/scoreCalculator.ts` — calculateBigFiveScores, calculateVARKScores, calculateBaselineScores, calculateSelfEfficacyScores, calculateStudyStrategyScores, calculateProfileCompleteness functions
- [ ] 2.3 Create `src/lib/onboardingConstants.ts` — Step definitions, XP amounts, VARK descriptions, Big Five labels, cooldown config, Day 1 question count, micro-assessment schedule, goal difficulty thresholds, starter session duration tiers, profiling dimensions
- [ ] 2.4 Add onboarding query keys to `src/lib/queryKeys.ts` (onboardingProgress, onboardingQuestions, onboardingResponses, studentProfile, baselineTests, baselineResults, microAssessments, profileCompleteness, starterWeekSessions, goalSuggestions)
- [ ] 2.5 Create `src/lib/profileCompleteness.ts` — Profile completeness calculation logic with partial credit for Day 1 items
- [ ] 2.6 Create `src/lib/goalTemplates.ts` — SMART goal template composition, difficulty classification from cohort rates

## 3. Edge Functions

- [ ] 3.1 Create `supabase/functions/process-onboarding/index.ts` — Profile computation Edge Function
  - [ ] 3.1.1 JWT validation and student_id verification
  - [ ] 3.1.2 Fetch onboarding_responses and validate against active questions
  - [ ] 3.1.3 Calculate Big Five trait scores (weighted average per dimension) — support partial scores for Day 1
  - [ ] 3.1.4 Calculate VARK scores (frequency per modality) and determine dominant style
  - [ ] 3.1.5 Calculate baseline CLO scores (% correct per CLO)
  - [ ] 3.1.6 Calculate self-efficacy scores (mean per domain, normalized 0–100) — support partial scores for Day 1
  - [ ] 3.1.7 Calculate study strategy dimension scores (mean per dimension, normalized 0–100)
  - [ ] 3.1.8 Calculate profile_completeness percentage
  - [ ] 3.1.9 INSERT/UPSERT student_profiles record with personality_traits, learning_style, self_efficacy, study_strategies JSONB, and profile_completeness
  - [ ] 3.1.10 INSERT baseline_attainment records (one per student × course × CLO)
  - [ ] 3.1.11 UPDATE profiles SET onboarding_completed = true
  - [ ] 3.1.12 Generate micro-assessment schedule for Day 1 flow (INSERT into micro_assessment_schedule)
  - [ ] 3.1.13 Invoke award-xp for each completed section + completion bonus (once only)
  - [ ] 3.1.14 Invoke check-badges for "Self-Aware Scholar" and "Thorough Explorer"
  - [ ] 3.1.15 Handle skipped sections (store null for skipped assessment scores)
  - [ ] 3.1.16 If Day 1: invoke generate-starter-week Edge Function
- [ ] 3.2 Create `supabase/functions/generate-starter-week/index.ts` — AI Starter Week Plan Edge Function
  - [ ] 3.2.1 JWT validation and student_id verification
  - [ ] 3.2.2 Fetch enrolled courses with schedules and upcoming deadlines (14 days)
  - [ ] 3.2.3 Fetch historical cohort study patterns for similar courses
  - [ ] 3.2.4 Determine session count and duration based on self-efficacy tier (low: 5×25min, moderate: 4×35min, high: 3×45min)
  - [ ] 3.2.5 Distribute sessions across 7-day window, assign session types based on deadline proximity
  - [ ] 3.2.6 INSERT sessions into starter_week_sessions table
  - [ ] 3.2.7 Handle edge case: no enrolled courses → generate generic study habit sessions
- [ ] 3.3 Create `supabase/functions/suggest-goals/index.ts` — AI Goal Suggestion Edge Function
  - [ ] 3.3.1 JWT validation and student_id verification
  - [ ] 3.3.2 Fetch student's enrolled courses, attainment levels, self-efficacy score
  - [ ] 3.3.3 Fetch upcoming deadlines for the week
  - [ ] 3.3.4 Fetch historical cohort goal completion rates
  - [ ] 3.3.5 Generate 3 goal suggestions (Easy ≥80%, Moderate 50–79%, Ambitious <50% cohort completion)
  - [ ] 3.3.6 Format each goal using SMART structure
  - [ ] 3.3.7 INSERT suggestions into goal_suggestions table

## 4. TanStack Query Hooks

- [ ] 4.1 Create `src/hooks/useOnboardingProgress.ts` — Query progress, mutation to update step
- [ ] 4.2 Create `src/hooks/useOnboardingQuestions.ts` — Queries for personality, learning style, self-efficacy, study strategy, and baseline questions
- [ ] 4.3 Create `src/hooks/useOnboardingResponses.ts` — Mutation to save batched responses
- [ ] 4.4 Create `src/hooks/useStudentProfile.ts` — Query student profile, mutation to call process-onboarding Edge Function
- [ ] 4.5 Create `src/hooks/useBaselineTests.ts` — Query baseline test config, results, and course stats (teacher view)
- [ ] 4.6 Create `src/hooks/useMicroAssessments.ts` — Query micro-assessment schedule, today's micro, complete/dismiss mutations
- [ ] 4.7 Create `src/hooks/useProfileCompleteness.ts` — Query profile completeness percentage
- [ ] 4.8 Create `src/hooks/useStarterWeekPlan.ts` — Query starter week sessions, update session status, generate starter week mutation
- [ ] 4.9 Create `src/hooks/useGoalSuggestions.ts` — Query goal suggestions, accept/dismiss mutations, generate suggestions mutation

## 5. Onboarding Wizard UI

- [ ] 5.1 Create `src/pages/student/onboarding/OnboardingWizard.tsx` — Full-screen overlay with step navigation, progress bar, back/next/skip controls; Day 1 mode (7 questions) vs full mode
- [ ] 5.2 Create `src/pages/student/onboarding/WelcomeStep.tsx` — Welcome message, time estimate (under 3 min for Day 1), XP preview
- [ ] 5.3 Create `src/pages/student/onboarding/PersonalityStep.tsx` — Big Five questionnaire (Day 1: 3 questions; full: 25 questions, one at a time, LikertScale)
- [ ] 5.4 Create `src/pages/student/onboarding/LearningStyleStep.tsx` — VARK questionnaire (16 questions, one at a time, 4 radio options) with research disclaimer; delivered via micro-assessments only
- [ ] 5.5 Create `src/pages/student/onboarding/SelfEfficacyStep.tsx` — Self-efficacy scale (Day 1: 2 items; full: 6 items, LikertScale)
- [ ] 5.6 Create `src/pages/student/onboarding/StudyStrategyStep.tsx` — Study strategy inventory (8 items, 4 dimensions, LikertScale); delivered via micro-assessments only
- [ ] 5.7 Create `src/pages/student/onboarding/BaselineSelectStep.tsx` — Course selection for baseline tests
- [ ] 5.8 Create `src/pages/student/onboarding/BaselineTestStep.tsx` — Timed test per course with AssessmentTimer
- [ ] 5.9 Create `src/pages/student/onboarding/ProfileSummaryStep.tsx` — Radar chart, VARK display (with "self-awareness only" note), self-efficacy display, baseline scores, confirm button
- [ ] 5.10 Create `src/pages/student/onboarding/CompleteProfilePage.tsx` — "Complete My Profile" page listing remaining dimensions with item counts and estimated time

## 6. Shared UI Components

- [ ] 6.1 Create `src/components/shared/LikertScale.tsx` — 5-point Likert scale input with keyboard navigation and ARIA labels
- [ ] 6.2 Create `src/components/shared/QuestionCard.tsx` — Single question display with options (radio or Likert)
- [ ] 6.3 Create `src/components/shared/AssessmentTimer.tsx` — Countdown timer with warning state and auto-submit callback
- [ ] 6.4 Create `src/components/shared/ProfileSummaryCard.tsx` — Dashboard card with Big Five radar chart, VARK display (under "Self-Awareness" section with disclaimer), self-efficacy display, and study strategy summary
- [ ] 6.5 Create `src/components/shared/MicroAssessmentCard.tsx` — Dismissible dashboard prompt card with question text, time estimate, XP reward, "Complete Now" and "Remind Me Later" actions
- [ ] 6.6 Create `src/components/shared/ProfileCompletenessBar.tsx` — Tappable progress bar showing profiling completion %, navigates to CompleteProfilePage; replaced by badge at 100%
- [ ] 6.7 Create `src/components/shared/StarterWeekHeroCard.tsx` — Dashboard hero card showing session count, total study time, "View Plan" CTA; post-week summary with completion stats
- [ ] 6.8 Create `src/components/shared/GoalSuggestionPanel.tsx` — Panel showing 3 AI-suggested goals with GoalDifficultyBadge, accept/edit/dismiss actions
- [ ] 6.9 Create `src/components/shared/SmartGoalForm.tsx` — SMART template form with 5 fields (Specific, Measurable, Achievable, Relevant dropdown, Time-bound date picker), pre-fills Relevant and Time-bound
- [ ] 6.10 Create `src/components/shared/GoalDifficultyBadge.tsx` — Visual badge: Easy (green), Moderate (amber), Ambitious (red)

## 7. Dashboard & Navigation Integration

- [ ] 7.1 Wire OnboardingWizard into StudentLayout — render as overlay when `onboarding_completed = false`; Day 1 mode (7 questions only)
- [ ] 7.2 Add ProfileSummaryCard to StudentDashboard — display when `onboarding_completed = true` and student_profile exists; show VARK under "Self-Awareness" section with disclaimer
- [ ] 7.3 Add MicroAssessmentCard to StudentDashboard — display daily micro-assessment prompt when available (first 14 days)
- [ ] 7.4 Add ProfileCompletenessBar to StudentDashboard — display when profile_completeness < 100%
- [ ] 7.5 Add StarterWeekHeroCard to StudentDashboard — display after Day 1 onboarding; show completion summary after first week
- [ ] 7.6 Add "Complete Assessment" prompt to StudentDashboard for students with skipped sections
- [ ] 7.7 Add onboarding completion reminder banner for students who deferred onboarding
- [ ] 7.8 Add `/student/onboarding/complete-profile` route to AppRouter for CompleteProfilePage

## 8. Teacher Baseline Management

- [ ] 8.1 Create `src/pages/teacher/baseline/BaselineConfigPage.tsx` — Configure baseline test (time limit, activate/deactivate)
- [ ] 8.2 Create `src/pages/teacher/baseline/BaselineQuestionForm.tsx` — Add/edit baseline questions (question text, 4 options, correct answer, CLO mapping, difficulty)
- [ ] 8.3 Create `src/pages/teacher/baseline/BaselineResultsPage.tsx` — Per-CLO bar chart of average scores, completion count
- [ ] 8.4 Add `/teacher/baseline/:courseId` routes to AppRouter
- [ ] 8.5 Add baseline nav item or section to TeacherLayout

## 9. Admin Onboarding Analytics

- [ ] 9.1 Add "Onboarding Status" KPI card to AdminDashboard — percentage of students who completed onboarding
- [ ] 9.2 Create admin view for students who have not completed onboarding (filterable by program, enrollment date)
- [ ] 9.3 Add "Send Reminder" action to notify students who haven't completed onboarding within 7 days

## 10. Re-Assessment Flow

- [ ] 10.1 Create `src/pages/student/settings/ReassessmentPage.tsx` — Re-assessment flow with cooldown check (90 days)
- [ ] 10.2 Add `/student/settings/reassessment` route to AppRouter
- [ ] 10.3 Add "Retake Assessment" link to ProfileSummaryCard and student settings page

## 11. XP & Badge Integration

- [ ] 11.1 Add `onboarding_personality`, `onboarding_learning_style`, `onboarding_baseline`, `onboarding_complete`, `onboarding_self_efficacy`, `onboarding_study_strategy`, `micro_assessment`, `profile_complete`, `starter_session_complete` sources to XPSource type
- [ ] 11.2 Add XP amounts to XP schedule (personality: 25, learning_style: 25, self_efficacy: 25, study_strategy: 25, baseline: 20/course, complete: 50, micro_assessment: 10, profile_complete: 30, starter_session_complete: 15)
- [ ] 11.3 Add "Self-Aware Scholar" and "Thorough Explorer" badge definitions to badge catalog
- [ ] 11.4 Wire badge checks into process-onboarding Edge Function

## 12. Property-Based Tests

- [ ] 12.1 `src/__tests__/properties/bigFiveScoring.property.test.ts` — P1, P4, P8: trait scores bounded [0,100], deterministic, reverse scoring
- [ ] 12.2 `src/__tests__/properties/varkScoring.property.test.ts` — P2, P3, P5: VARK scores bounded [0,100], sum to 100, dominant style logic
- [ ] 12.3 `src/__tests__/properties/baselineScoring.property.test.ts` — P6, P12: baseline score = % correct, unanswered = 0
- [ ] 12.4 `src/__tests__/properties/scoreRoundTrip.property.test.ts` — P7: score computation → serialize → deserialize → recompute equivalence
- [ ] 12.5 `src/__tests__/properties/onboardingValidation.property.test.ts` — P9, P10, P11: Likert [1,5], VARK [0,3], baseline [0,3] schema validation
- [ ] 12.6 `src/__tests__/properties/onboardingXp.property.test.ts` — P13, P14: XP awarded once, re-assessment no XP
- [ ] 12.7 `src/__tests__/properties/reassessmentCooldown.property.test.ts` — P15: 90-day cooldown enforcement
- [ ] 12.8 `src/__tests__/properties/baselineConfig.property.test.ts` — P18, P19: min questions per CLO, time limit [5,60]
- [ ] 12.9 `src/__tests__/properties/selfEfficacyScoring.property.test.ts` — P21, P23: self-efficacy scores bounded [0,100], deterministic
- [ ] 12.10 `src/__tests__/properties/studyStrategyScoring.property.test.ts` — P22, P24: study strategy scores bounded [0,100], deterministic
- [ ] 12.11 `src/__tests__/properties/profileCompleteness.property.test.ts` — P25, P26: completeness bounded [0,100], monotonically non-decreasing
- [ ] 12.12 `src/__tests__/properties/day1Profile.property.test.ts` — P27: Day 1 produces valid preliminary profile with partial scores
- [ ] 12.13 `src/__tests__/properties/microAssessment.property.test.ts` — P28, P29: dismissal limit enforced (3 max), XP awarded per completion only
- [ ] 12.14 `src/__tests__/properties/starterWeekPlan.property.test.ts` — P30, P31: session count matches self-efficacy tier, sessions within 7-day window
- [ ] 12.15 `src/__tests__/properties/goalDifficulty.property.test.ts` — P32: difficulty classification matches cohort thresholds
- [ ] 12.16 `src/__tests__/properties/smartGoalTemplate.property.test.ts` — P33: SMART template produces valid non-empty goal text
- [ ] 12.17 `src/__tests__/properties/profileCompleteBonus.property.test.ts` — P35: profile complete bonus awarded exactly once at 100%

## 13. Unit Tests

- [ ] 13.1 `src/__tests__/unit/scoreCalculator.test.ts` — Big Five, VARK, baseline, self-efficacy, study strategy, and profile completeness score calculation edge cases
- [ ] 13.2 `src/__tests__/unit/onboardingSchemas.test.ts` — Zod schema validation (valid/invalid payloads) for all schemas including selfEfficacyResponse, studyStrategyResponse, starterWeekSession, goalSuggestion, smartGoalTemplate
- [ ] 13.3 `src/__tests__/unit/onboardingWizard.test.tsx` — Wizard step navigation, Day 1 mode (7 questions), progress persistence, skip behavior
- [ ] 13.4 `src/__tests__/unit/likertScale.test.tsx` — Likert scale rendering, keyboard navigation, ARIA attributes
- [ ] 13.5 `src/__tests__/unit/assessmentTimer.test.tsx` — Timer countdown, warning state, auto-submit on expiry
- [ ] 13.6 `src/__tests__/unit/profileSummaryCard.test.tsx` — Radar chart rendering, VARK "Self-Awareness" section with disclaimer, null state handling, retake link
- [ ] 13.7 `src/__tests__/unit/microAssessmentCard.test.tsx` — Micro-assessment card rendering, complete/dismiss actions, dismissal counter, skip after 3 dismissals
- [ ] 13.8 `src/__tests__/unit/profileCompletenessBar.test.tsx` — Progress bar rendering, percentage display, navigation to CompleteProfilePage, badge at 100%
- [ ] 13.9 `src/__tests__/unit/starterWeekHeroCard.test.tsx` — Hero card rendering, session count display, "View Plan" navigation, post-week summary
- [ ] 13.10 `src/__tests__/unit/goalSuggestionPanel.test.tsx` — Goal suggestion rendering, difficulty badges, accept/edit/dismiss actions
- [ ] 13.11 `src/__tests__/unit/smartGoalForm.test.tsx` — SMART form rendering, pre-filled fields, goal text composition on submit
- [ ] 13.12 `src/__tests__/unit/goalDifficultyBadge.test.tsx` — Badge rendering for Easy (green), Moderate (amber), Ambitious (red)
- [ ] 13.13 `src/__tests__/unit/completeProfilePage.test.tsx` — Remaining dimensions list, item counts, estimated time, bulk completion flow
- [ ] 13.14 `src/__tests__/unit/goalTemplates.test.ts` — SMART goal composition, difficulty classification from cohort rates


## 14. Progressive Profiling & Micro-Assessments

- [ ] 14.1 Implement micro-assessment schedule generation logic in process-onboarding Edge Function (14-day schedule based on MICRO_ASSESSMENT_SCHEDULE constant)
- [ ] 14.2 Create pg_cron job to check for due micro-assessments daily and update scheduled_at dates
- [ ] 14.3 Wire MicroAssessmentCard into StudentDashboard — fetch today's micro-assessment, handle complete/dismiss
- [ ] 14.4 Implement dismissal tracking: increment dismissal_count on dismiss, mark as 'skipped' after 3 consecutive dismissals
- [ ] 14.5 Wire ProfileCompletenessBar into StudentDashboard — fetch profile_completeness, navigate to CompleteProfilePage
- [ ] 14.6 Implement profile_completeness recalculation on each micro-assessment completion (UPSERT student_profiles)
- [ ] 14.7 Wire "Profile Complete" bonus XP (30 XP) when profile_completeness reaches 100%

## 15. Starter Week Plan Integration

- [ ] 15.1 Wire generate-starter-week Edge Function call from process-onboarding after Day 1 completion
- [ ] 15.2 Wire StarterWeekHeroCard into StudentDashboard — fetch starter_week_sessions, display session count and total time
- [ ] 15.3 Integrate starter week sessions into weekly planner — display with "AI Suggested" badge and subtle background tint
- [ ] 15.4 Implement session status management: accept, modify, reschedule, dismiss, complete actions
- [ ] 15.5 Wire XP award (15 XP) on starter session completion
- [ ] 15.6 Implement post-week summary: replace hero card with completion stats after 7 days

## 16. Goal-Setting Scaffolding Integration

- [ ] 16.1 Wire suggest-goals Edge Function call when student opens weekly planner goal-setting interface
- [ ] 16.2 Wire GoalSuggestionPanel into weekly planner — display 3 suggested goals with difficulty badges
- [ ] 16.3 Implement goal accept/edit/dismiss actions — populate goal slot on accept
- [ ] 16.4 Wire SmartGoalForm into weekly planner goal creation/edit flow — "Use SMART Template" option
- [ ] 16.5 Implement SMART goal text composition from template fields
- [ ] 16.6 Wire GoalDifficultyBadge into weekly planner — display next to each goal (suggested and custom)
- [ ] 16.7 Add difficulty dropdown (Easy/Moderate/Ambitious) to custom goal creation form

## 17. VARK Repositioning

- [ ] 17.1 Add research disclaimer to LearningStyleStep: "Learning style preferences are provided as a self-awareness exercise..."
- [ ] 17.2 Remove LearningStyleStep from Day 1 onboarding flow — move to micro-assessment schedule (Days 9–12)
- [ ] 17.3 Update ProfileSummaryCard to display VARK under "Self-Awareness" section with "For reflection only" note
- [ ] 17.4 Audit adaptive engine integration points — ensure VARK scores are NOT used for content adaptation or learning path ordering
- [ ] 17.5 Update process-onboarding Edge Function to handle VARK as optional/deferred section
