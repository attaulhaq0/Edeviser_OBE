# Tasks — AI-Powered Adaptive Quiz Generation

## Task 1: Database Schema and Migrations

- [x] 1.1 Create `question_bank` table migration with all columns, constraints, and indexes
- [x] 1.2 Create `question_analytics` table migration with unique constraint on question_id
- [x] 1.3 Create `quiz_generation_logs` table migration with indexes
- [x] 1.4 Create migration to add `is_adaptive`, `adaptation_config` columns to `quizzes` table
- [x] 1.5 Create migration to add `question_sequence`, `difficulty_trajectory`, `per_question_times` columns to `quiz_attempts` table
- [x] 1.6 Create RLS policies for `question_bank` (teacher CRUD, admin read, no student access)
- [x] 1.7 Create RLS policies for `question_analytics` (teacher read, admin read)
- [x] 1.8 Create RLS policies for `quiz_generation_logs` (teacher own, admin institution)
- [x] 1.9 Regenerate TypeScript types: `npx supabase gen types --linked > src/types/database.ts`

## Task 2: Shared Libraries and Schemas

- [x] 2.1 Create `src/lib/quizGenerationSchemas.ts` with Zod schemas: `generateQuestionsSchema`, `questionBankEntrySchema`, `adaptiveQuizConfigSchema`
- [x] 2.2 Create `src/lib/adaptiveEngine.ts` with functions: `classifyAbility`, `abilityToTargetDifficulty`, `adjustDifficulty`, `preferredBloomLevels`
- [x] 2.3 Create `src/lib/difficultyCalibration.ts` with functions: `computeCalibratedDifficulty`, `computeDiscriminationIndex`, `determineQualityFlag`
- [x] 2.4 Create `src/lib/questionAnalytics.ts` with functions: `computePerCLOScore`, `detectCLODiscrepancy`, `computeApprovalRate`, `computeBonusXP`
- [x] 2.5 Add query keys to `src/lib/queryKeys.ts`: `questionBank`, `questionAnalytics`, `quizGeneration`, `reviewQueue`, `quizCLOCorrelation`

## Task 3: Property-Based Tests

- [x] 3.1 Create `src/__tests__/properties/generateQuestionsSchema.property.test.ts` — Property 1: Generation request schema validation
- [x] 3.2 Create `src/__tests__/properties/generatedQuestionOutput.property.test.ts` — Property 2: Generated question output completeness
- [x] 3.3 Create `src/__tests__/properties/questionInsertion.property.test.ts` — Property 3: AI-generated questions inserted with pending review status
- [x] 3.4 Create `src/__tests__/properties/questionStatusTransitions.property.test.ts` — Property 4: Question status transitions
- [x] 3.5 Create `src/__tests__/properties/questionVersioning.property.test.ts` — Property 5: Question versioning preserves original
- [x] 3.6 Create `src/__tests__/properties/questionBankSchema.property.test.ts` — Property 6: Question schema enforces single CLO and Bloom's level
- [x] 3.7 Create `src/__tests__/properties/abilityClassification.property.test.ts` — Property 7: Ability classification from attainment percentage
- [x] 3.8 Create `src/__tests__/properties/difficultyAdjustment.property.test.ts` — Property 8: Difficulty adjustment is bounded
- [x] 3.9 Create `src/__tests__/properties/questionSelection.property.test.ts` — Property 9: Selected question respects difficulty range
- [x] 3.10 Create `src/__tests__/properties/preferredBloomLevels.property.test.ts` — Property 10: Preferred Bloom's levels match ability
- [x] 3.11 Create `src/__tests__/properties/noPreviousQuestions.property.test.ts` — Property 11: No previously answered questions selected
- [x] 3.12 Create `src/__tests__/properties/adaptiveSessionData.property.test.ts` — Property 12: Adaptive session stores complete trajectory data
- [x] 3.13 Create `src/__tests__/properties/calibratedDifficulty.property.test.ts` — Property 13: Calibrated difficulty formula correctness
- [x] 3.14 Create `src/__tests__/properties/discriminationIndex.property.test.ts` — Property 14: Discrimination index computation
- [x] 3.15 Create `src/__tests__/properties/qualityFlag.property.test.ts` — Property 15: Quality flag determination
- [x] 3.16 Create `src/__tests__/properties/perCLOScore.property.test.ts` — Property 16: Per-CLO score breakdown calculation
- [x] 3.17 Create `src/__tests__/properties/cloDiscrepancy.property.test.ts` — Property 17: CLO discrepancy detection
- [x] 3.18 Create `src/__tests__/properties/approvalRate.property.test.ts` — Property 18: Approval rate calculation
- [x] 3.19 Create `src/__tests__/properties/bonusXP.property.test.ts` — Property 19: Hard question bonus XP capped at 50
- [x] 3.20 Create `src/__tests__/properties/promptPII.property.test.ts` — Property 20: LLM prompt excludes student PII

## Task 4: Unit Tests

- [x] 4.1 Create `src/__tests__/unit/quizGenerationSchemas.test.ts` — Specific valid/invalid input examples for all Zod schemas
- [x] 4.2 Create `src/__tests__/unit/adaptiveEngine.test.ts` — Edge cases: null attainment, difficulty bounds, empty question pool
- [x] 4.3 Create `src/__tests__/unit/difficultyCalibration.test.ts` — Edge cases: 0%/100% success rate, threshold attempt counts
- [x] 4.4 Create `src/__tests__/unit/questionAnalytics.test.ts` — Analytics update, cumulative updates, flagging thresholds
- [x] 4.5 Create `src/__tests__/unit/quizBonusXP.test.ts` — 0 hard questions, max cap, mixed difficulties
- [x] 4.6 Create `src/__tests__/unit/postQuizReview.test.ts` — Per-CLO score with various CLO configurations

## Task 5: Edge Functions

- [x] 5.1 Create `supabase/functions/generate-quiz-questions/index.ts` — AI question generation Edge Function with JWT validation, RAG retrieval, LLM call, question insertion, logging
- [x] 5.2 Create `supabase/functions/select-adaptive-question/index.ts` — Adaptive question selection Edge Function with ability estimation, difficulty targeting, question filtering, exclusion of previously answered
- [x] 5.3 Create `supabase/functions/update-question-analytics/index.ts` — Post-quiz analytics recalculation Edge Function with success rate, discrimination index, calibrated difficulty, quality flagging

## Task 6: TanStack Query Hooks

- [x] 6.1 Create `src/hooks/useQuestionBank.ts` — CRUD hooks for question_bank with filters (CLO, Bloom's, type, status, source)
- [x] 6.2 Create `src/hooks/useGenerateQuestions.ts` — Mutation hook for AI question generation via Edge Function
- [x] 6.3 Create `src/hooks/useReviewQueue.ts` — Query + mutations for pending questions: approve, reject, edit, bulk approve
- [x] 6.4 Create `src/hooks/useAdaptiveQuiz.ts` — Hooks for adaptive quiz session: start, select next question, submit attempt
- [x] 6.5 Create `src/hooks/useQuestionAnalytics.ts` — Query hooks for per-question analytics and question detail
- [x] 6.6 Create `src/hooks/useQuizCLOCorrelation.ts` — Query hook for quiz vs CLO attainment correlation data

## Task 7: Shared Components

- [x] 7.1 Create `src/components/shared/QuestionPreview.tsx` — Renders question by type (MCQ, T/F, short answer, fill-in-blank) with answer input
- [x] 7.2 Create `src/components/shared/DifficultyBadge.tsx` — Color-coded difficulty rating badge (1.0–5.0 scale)
- [x] 7.3 Create `src/components/shared/QuestionQualityIndicator.tsx` — Green/yellow/red quality status based on analytics
- [x] 7.4 Create `src/components/shared/AnswerDistributionChart.tsx` — Recharts bar chart for MCQ option distribution

## Task 8: Teacher Pages — Question Generation and Review

- [x] 8.1 Create `src/pages/teacher/quiz-generation/GenerateQuestionsPage.tsx` — AI generation form with CLO picker, Bloom's checkboxes, type selector, count slider, results panel
- [x] 8.2 Create `src/pages/teacher/quiz-generation/ReviewQueuePage.tsx` — Pending question review grouped by CLO/Bloom's with approve/edit/reject actions and approval rate
- [x] 8.3 Create `src/pages/teacher/quiz-generation/QuestionBankPage.tsx` — Full question bank DataTable with filters, inline analytics, manual question creation, label tagging

## Task 9: Teacher Pages — Analytics

- [x] 9.1 Create `src/pages/teacher/quiz-analytics/QuestionAnalyticsDashboard.tsx` — Per-question metrics table with color-coded quality, sort/filter, flagged question detail panel with answer distribution chart
- [x] 9.2 Create `src/pages/teacher/quiz-analytics/QuizCLOCorrelationPage.tsx` — Per-CLO comparison chart (quiz score vs attainment), discrepancy highlighting, Bloom's distribution chart

## Task 10: Student Pages — Adaptive Quiz and Review

- [x] 10.1 Create `src/pages/student/quiz/AdaptiveQuizSession.tsx` — One-at-a-time adaptive quiz UI with progress bar, timer, no backward navigation, immediate next question on submit
- [x] 10.2 Create `src/pages/student/quiz/PostQuizReview.tsx` — Post-quiz review with AI explanations, CLO/Bloom's badges, "Get Help" AI Tutor link, per-CLO score breakdown

## Task 11: Routing and Navigation

- [x] 11.1 Add teacher routes: `/teacher/courses/:courseId/generate-questions`, `/teacher/courses/:courseId/review-queue`, `/teacher/courses/:courseId/question-bank`, `/teacher/courses/:courseId/question-analytics`, `/teacher/courses/:courseId/quiz-clo-correlation`
- [x] 11.2 Add student routes: `/student/quizzes/:quizId/adaptive`, `/student/quizzes/:quizId/review/:attemptId`
- [x] 11.3 Add navigation items to teacher sidebar for Question Bank, Generate Questions, and Analytics

## Task 12: Integration with Existing Systems

- [x] 12.1 Update existing quiz creation form to include `is_adaptive` toggle and `adaptation_config` fields
- [x] 12.2 Integrate `update-question-analytics` Edge Function call into existing quiz attempt submission flow
- [x] 12.3 Add quiz completion XP award (50 base, 25 late) and hard question bonus XP to existing `award-xp` Edge Function
- [x] 12.4 Add "Get Help" link in PostQuizReview that opens AI Tutor scoped to question's CLO (depends on AI Tutor RAG feature)

## Task 13: Component Tests

- [x] 13.1 Create `src/__tests__/unit/questionPreview.test.tsx` — Renders MCQ, T/F, short answer, fill-in-blank correctly
- [x] 13.2 Create `src/__tests__/unit/difficultyBadge.test.tsx` — Color coding for difficulty ranges
- [x] 13.3 Create `src/__tests__/unit/questionQualityIndicator.test.tsx` — Green/yellow/red rendering based on quality flag
- [x] 13.4 Create `src/__tests__/unit/adaptiveQuizSession.test.tsx` — Progress bar, timer, one-at-a-time rendering
- [x] 13.5 Create `src/__tests__/unit/postQuizReviewPage.test.tsx` — Explanation display, CLO badges, "Get Help" link


## Task 14: Mastery Recovery System

- [x] 14.1 Create `mastery_recovery_pathways` table migration with all columns, constraints, indexes, and unique partial index on active sessions
- [x] 14.2 Create RLS policies for `mastery_recovery_pathways` (student own read, teacher course read, coordinator institution read, admin institution read)
- [x] 14.3 Create `src/lib/masteryRecovery.ts` with functions: `countMasteryFailures`, `shouldActivateRecovery`, `recoveryBloomLevel`, `isRecoveryComplete`
- [x] 14.4 Create `src/hooks/useMasteryRecovery.ts` — hooks for recovery status, pathway data, activation, step completion, and coordinator metrics
- [x] 14.5 Create `src/components/shared/MasteryRecoveryPanel.tsx` — 3-step recovery UI with AI Tutor link, practice questions, peer study suggestions, and retry gating
- [x] 14.6 Integrate mastery failure detection into quiz attempt submission flow — after grading, check failure count and activate recovery if threshold reached
- [x] 14.7 Add teacher dashboard alert for students flagged for mastery recovery
- [x] 14.8 Add coordinator dashboard recovery metrics (activations, completion rate, avg time, retry success rate)
- [x] 14.9 Add pg_cron job to expire active recovery sessions older than 14 days and notify teachers
- [x] 14.10 Add recovery pathway activations and completions to audit_logs
- [x] 14.11 Add query keys to `src/lib/queryKeys.ts`: `masteryRecovery`
- [x] 14.12 Regenerate TypeScript types after migration

## Task 15: AI Explanation Confidence and Verification

- [x] 15.1 Create `verified_explanations` table migration with all columns, constraints, and unique partial index on active explanations
- [x] 15.2 Create RLS policies for `verified_explanations` (teacher CRUD for course questions, student read active, admin read)
- [x] 15.3 Add `explanation_confidence` column to `question_bank` table via migration
- [x] 15.4 Create `src/lib/explanationConfidence.ts` with functions: `computeExplanationConfidence`, `needsTeacherVerification`, `isFrequentlyMissed`
- [x] 15.5 Create `src/hooks/useExplanationConfidence.ts` — hooks for confidence scores, verified explanations, approve/edit mutations, review queue
- [x] 15.6 Create `src/components/shared/ExplanationConfidenceBadge.tsx` — green/amber/blue badge based on confidence and verification status
- [x] 15.7 Update `generate-quiz-questions` Edge Function to compute and store `explanation_confidence` from RAG chunk similarities
- [x] 15.8 Update `PostQuizReview.tsx` to display ExplanationConfidenceBadge and prefer Verified_Explanation over AI-generated
- [x] 15.9 Add "Review Explanations" queue to teacher quiz pages — frequently-missed questions sorted by attempt count with approve/edit actions
- [x] 15.10 Add verified explanation badge indicator to QuestionBankPage
- [x] 15.11 Add query keys to `src/lib/queryKeys.ts`: `verifiedExplanations`, `explanationReviewQueue`
- [x] 15.12 Regenerate TypeScript types after migration

## Task 16: Practice Mode

- [x] 16.1 Add `practice_mode_enabled` column to `quizzes` table and `mode` column to `quiz_attempts` table via migration
- [x] 16.2 Create `src/hooks/usePracticeMode.ts` — hooks for practice mode config toggle and practice attempt queries
- [x] 16.3 Create `src/components/shared/PracticeModeToggle.tsx` — switch component for quiz settings form
- [x] 16.4 Create `src/components/shared/PracticeModeBanner.tsx` — "Practice Mode" banner for quiz session UI
- [x] 16.5 Update `AdaptiveQuizSession.tsx` to support practice mode: display banner, show immediate feedback after each question, no backward navigation change
- [x] 16.6 Update quiz attempt submission flow to skip evidence generation and attainment rollup when `mode = 'practice'`
- [x] 16.7 Update `award-xp` Edge Function to award 10 XP for practice quiz completion with `source = 'practice_quiz'`, no hard question bonus, separate diminishing returns window
- [x] 16.8 Update teacher quiz creation/edit form to include PracticeModeToggle
- [x] 16.9 Add `blooms_climb_state` column to `quiz_attempts` table via migration
- [x] 16.10 Add query keys to `src/lib/queryKeys.ts`: `practiceMode`
- [x] 16.11 Regenerate TypeScript types after migration

## Task 17: Bloom's Progression Pathway

- [x] 17.1 Create `blooms_progression` table migration with all columns, constraints, unique index on (student_id, clo_id)
- [x] 17.2 Create RLS policies for `blooms_progression` (student own read, teacher course read, admin institution read)
- [x] 17.3 Create `src/lib/bloomsClimb.ts` with functions: `shouldAdvanceBloom`, `handleBloomRevert`, `highestBloomReached`, `computePracticeXP`
- [x] 17.4 Create `src/hooks/useBloomsProgression.ts` — hooks for progression data, climb state, and pioneer badge queries
- [x] 17.5 Create `src/components/shared/BloomsProgressionLadder.tsx` — vertical 6-level ladder per CLO with Bloom's color coding and highlighted highest level
- [x] 17.6 Create `src/components/shared/BloomsPioneerBadge.tsx` — badge display for Explorer (level 4), Challenger (level 5), Pioneer (level 6)
- [x] 17.7 Update `select-adaptive-question` Edge Function to implement Bloom's Climb mechanic: track consecutive correct, advance/revert Bloom's level, record transitions
- [x] 17.8 Update quiz attempt submission to update `blooms_progression` table with highest Bloom's level reached
- [x] 17.9 Integrate Bloom's Pioneer badge checks into existing `check-badges` Edge Function (idempotent, after quiz attempt completion)
- [x] 17.10 Add BloomsProgressionLadder to student course detail page and PostQuizReview page
- [x] 17.11 Add query keys to `src/lib/queryKeys.ts`: `bloomsProgression`
- [x] 17.12 Regenerate TypeScript types after migration

## Task 18: Property-Based Tests for New Features

- [x] 18.1 Create `src/__tests__/properties/masteryFailureCount.property.test.ts` — Property 21: Mastery failure count triggers recovery at threshold
- [x] 18.2 Create `src/__tests__/properties/recoveryCompletion.property.test.ts` — Property 22: Recovery pathway blocks retry until complete
- [x] 18.3 Create `src/__tests__/properties/recoveryBloomLevel.property.test.ts` — Property 23: Recovery Bloom's level floored at 1
- [x] 18.4 Create `src/__tests__/properties/explanationConfidence.property.test.ts` — Property 24: Explanation confidence computation
- [x] 18.5 Create `src/__tests__/properties/confidenceThreshold.property.test.ts` — Property 25: Confidence threshold classification
- [x] 18.6 Create `src/__tests__/properties/frequentlyMissed.property.test.ts` — Property 26: Frequently missed question identification
- [x] 18.7 Create `src/__tests__/properties/practiceXP.property.test.ts` — Property 27: Practice mode XP is fixed at 10
- [x] 18.8 Create `src/__tests__/properties/bloomsClimbAdvance.property.test.ts` — Property 28: Bloom's Climb advancement after 3 consecutive correct
- [x] 18.9 Create `src/__tests__/properties/bloomsClimbRevert.property.test.ts` — Property 29: Bloom's Climb revert on incorrect at new level
- [x] 18.10 Create `src/__tests__/properties/highestBloomReached.property.test.ts` — Property 30: Highest Bloom's level requires 2 correct answers

## Task 19: Unit and Component Tests for New Features

- [x] 19.1 Create `src/__tests__/unit/masteryRecovery.test.ts` — Failure counting, recovery activation, step completion, expiry edge cases
- [x] 19.2 Create `src/__tests__/unit/explanationConfidence.test.ts` — Confidence computation, threshold checks, frequently missed detection, empty arrays
- [x] 19.3 Create `src/__tests__/unit/bloomsClimb.test.ts` — Advancement, revert, highest level reached, edge cases at level 1 and 6
- [x] 19.4 Create `src/__tests__/unit/practiceMode.test.ts` — XP calculation, mode flag, no evidence generation verification
- [x] 19.5 Create `src/__tests__/unit/masteryRecoveryPanel.test.tsx` — 3-step display, step completion checkmarks, retry button gating
- [x] 19.6 Create `src/__tests__/unit/explanationConfidenceBadge.test.tsx` — Green/amber/blue badge rendering based on confidence and verification
- [x] 19.7 Create `src/__tests__/unit/practiceModeBanner.test.tsx` — Banner visibility, correct styling, text content
- [x] 19.8 Create `src/__tests__/unit/bloomsProgressionLadder.test.tsx` — 6-level rendering, Bloom's color coding, highlighted level
- [x] 19.9 Create `src/__tests__/unit/bloomsPioneerBadge.test.tsx` — Badge rendering for Explorer, Challenger, Pioneer

## Task 20: Routing, Navigation, and Integration for New Features

- [x] 20.1 Add student route for mastery recovery: `/student/courses/:courseId/recovery/:cloId`
- [x] 20.2 Add teacher route for explanation review queue: `/teacher/courses/:courseId/explanation-review`
- [x] 20.3 Add coordinator dashboard route section for recovery metrics
- [x] 20.4 Add navigation items to teacher sidebar for "Explanation Review"
- [x] 20.5 Integrate MasteryRecoveryPanel into student quiz flow — show recovery panel when student-CLO pair is flagged, block quiz retry
- [x] 20.6 Integrate PracticeModeToggle into existing quiz creation/edit form
- [x] 20.7 Integrate BloomsProgressionLadder into student course detail page
- [x] 20.8 Update PostQuizReview to show ExplanationConfidenceBadge, Verified_Explanation preference, and BloomsProgressionLadder
