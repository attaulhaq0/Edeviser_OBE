# Tasks — Student Onboarding & Profiling

## 1. Database Schema & Migrations

- [ ] 1.1 Create migration: `onboarding_questions` table with indexes on (institution_id, assessment_type) and (course_id)
- [ ] 1.2 Create migration: `onboarding_responses` table with unique constraint on (student_id, question_id, assessment_version)
- [ ] 1.3 Create migration: `onboarding_progress` table with unique constraint on (student_id)
- [ ] 1.4 Create migration: `student_profiles` table with unique constraint on (student_id, assessment_version)
- [ ] 1.5 Create migration: `baseline_attainment` table with unique constraint on (student_id, course_id, clo_id)
- [ ] 1.6 Create migration: `baseline_test_config` table with unique constraint on (course_id)
- [ ] 1.7 Create migration: RLS policies for all 6 new tables (questions, responses, progress, student_profiles, baseline_attainment, baseline_test_config)
- [ ] 1.8 Create migration: Seed default 25 Big Five personality questions and 16 VARK learning style questions

## 2. Shared Library Code

- [ ] 2.1 Create `src/lib/onboardingSchemas.ts` — Zod schemas for likertResponse, varkResponse, baselineResponse, saveResponses, processOnboarding, baselineQuestion, baselineTestConfig
- [ ] 2.2 Create `src/lib/scoreCalculator.ts` — calculateBigFiveScores, calculateVARKScores, calculateBaselineScores functions
- [ ] 2.3 Create `src/lib/onboardingConstants.ts` — Step definitions, XP amounts, VARK descriptions, Big Five labels, cooldown config
- [ ] 2.4 Add onboarding query keys to `src/lib/queryKeys.ts` (onboardingProgress, onboardingQuestions, onboardingResponses, studentProfile, baselineTests, baselineResults)

## 3. Edge Function

- [ ] 3.1 Create `supabase/functions/process-onboarding/index.ts` — Profile computation Edge Function
  - [ ] 3.1.1 JWT validation and student_id verification
  - [ ] 3.1.2 Fetch onboarding_responses and validate against active questions
  - [ ] 3.1.3 Calculate Big Five trait scores (weighted average per dimension)
  - [ ] 3.1.4 Calculate VARK scores (frequency per modality) and determine dominant style
  - [ ] 3.1.5 Calculate baseline CLO scores (% correct per CLO)
  - [ ] 3.1.6 INSERT student_profiles record with personality_traits and learning_style JSONB
  - [ ] 3.1.7 INSERT baseline_attainment records (one per student × course × CLO)
  - [ ] 3.1.8 UPDATE profiles SET onboarding_completed = true
  - [ ] 3.1.9 DELETE onboarding_progress record (cleanup)
  - [ ] 3.1.10 Invoke award-xp for each completed section + completion bonus (once only)
  - [ ] 3.1.11 Invoke check-badges for "Self-Aware Scholar" and "Thorough Explorer"
  - [ ] 3.1.12 Handle skipped sections (store null for skipped assessment scores)

## 4. TanStack Query Hooks

- [ ] 4.1 Create `src/hooks/useOnboardingProgress.ts` — Query progress, mutation to update step
- [ ] 4.2 Create `src/hooks/useOnboardingQuestions.ts` — Queries for personality, learning style, and baseline questions
- [ ] 4.3 Create `src/hooks/useOnboardingResponses.ts` — Mutation to save batched responses
- [ ] 4.4 Create `src/hooks/useStudentProfile.ts` — Query student profile, mutation to call process-onboarding Edge Function
- [ ] 4.5 Create `src/hooks/useBaselineTests.ts` — Query baseline test config, results, and course stats (teacher view)

## 5. Onboarding Wizard UI

- [ ] 5.1 Create `src/pages/student/onboarding/OnboardingWizard.tsx` — Full-screen overlay with step navigation, progress bar, back/next/skip controls
- [ ] 5.2 Create `src/pages/student/onboarding/WelcomeStep.tsx` — Welcome message, time estimate, XP preview
- [ ] 5.3 Create `src/pages/student/onboarding/PersonalityStep.tsx` — Big Five questionnaire (25 questions, one at a time, LikertScale)
- [ ] 5.4 Create `src/pages/student/onboarding/LearningStyleStep.tsx` — VARK questionnaire (16 questions, one at a time, 4 radio options)
- [ ] 5.5 Create `src/pages/student/onboarding/BaselineSelectStep.tsx` — Course selection for baseline tests
- [ ] 5.6 Create `src/pages/student/onboarding/BaselineTestStep.tsx` — Timed test per course with AssessmentTimer
- [ ] 5.7 Create `src/pages/student/onboarding/ProfileSummaryStep.tsx` — Radar chart, VARK display, baseline scores, confirm button

## 6. Shared UI Components

- [ ] 6.1 Create `src/components/shared/LikertScale.tsx` — 5-point Likert scale input with keyboard navigation and ARIA labels
- [ ] 6.2 Create `src/components/shared/QuestionCard.tsx` — Single question display with options (radio or Likert)
- [ ] 6.3 Create `src/components/shared/AssessmentTimer.tsx` — Countdown timer with warning state and auto-submit callback
- [ ] 6.4 Create `src/components/shared/ProfileSummaryCard.tsx` — Dashboard card with Big Five radar chart and VARK dominant style display

## 7. Dashboard & Navigation Integration

- [ ] 7.1 Wire OnboardingWizard into StudentLayout — render as overlay when `onboarding_completed = false`
- [ ] 7.2 Add ProfileSummaryCard to StudentDashboard — display when `onboarding_completed = true` and student_profile exists
- [ ] 7.3 Add "Complete Assessment" prompt to StudentDashboard for students with skipped sections
- [ ] 7.4 Add onboarding completion reminder banner for students who deferred onboarding

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

- [ ] 11.1 Add `onboarding_personality`, `onboarding_learning_style`, `onboarding_baseline`, `onboarding_complete` sources to XPSource type
- [ ] 11.2 Add XP amounts to XP schedule (personality: 25, learning_style: 25, baseline: 20/course, complete: 50)
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

## 13. Unit Tests

- [ ] 13.1 `src/__tests__/unit/scoreCalculator.test.ts` — Big Five, VARK, and baseline score calculation edge cases
- [ ] 13.2 `src/__tests__/unit/onboardingSchemas.test.ts` — Zod schema validation (valid/invalid payloads)
- [ ] 13.3 `src/__tests__/unit/onboardingWizard.test.tsx` — Wizard step navigation, progress persistence, skip behavior
- [ ] 13.4 `src/__tests__/unit/likertScale.test.tsx` — Likert scale rendering, keyboard navigation, ARIA attributes
- [ ] 13.5 `src/__tests__/unit/assessmentTimer.test.tsx` — Timer countdown, warning state, auto-submit on expiry
- [ ] 13.6 `src/__tests__/unit/profileSummaryCard.test.tsx` — Radar chart rendering, null state handling, retake link
