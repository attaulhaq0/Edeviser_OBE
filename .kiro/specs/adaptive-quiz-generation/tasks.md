# Tasks — AI-Powered Adaptive Quiz Generation

## Task 1: Database Schema and Migrations

- [ ] 1.1 Create `question_bank` table migration with all columns, constraints, and indexes
- [ ] 1.2 Create `question_analytics` table migration with unique constraint on question_id
- [ ] 1.3 Create `quiz_generation_logs` table migration with indexes
- [ ] 1.4 Create migration to add `is_adaptive`, `adaptation_config` columns to `quizzes` table
- [ ] 1.5 Create migration to add `question_sequence`, `difficulty_trajectory`, `per_question_times` columns to `quiz_attempts` table
- [ ] 1.6 Create RLS policies for `question_bank` (teacher CRUD, admin read, no student access)
- [ ] 1.7 Create RLS policies for `question_analytics` (teacher read, admin read)
- [ ] 1.8 Create RLS policies for `quiz_generation_logs` (teacher own, admin institution)
- [ ] 1.9 Regenerate TypeScript types: `npx supabase gen types --linked > src/types/database.ts`

## Task 2: Shared Libraries and Schemas

- [ ] 2.1 Create `src/lib/quizGenerationSchemas.ts` with Zod schemas: `generateQuestionsSchema`, `questionBankEntrySchema`, `adaptiveQuizConfigSchema`
- [ ] 2.2 Create `src/lib/adaptiveEngine.ts` with functions: `classifyAbility`, `abilityToTargetDifficulty`, `adjustDifficulty`, `preferredBloomLevels`
- [ ] 2.3 Create `src/lib/difficultyCalibration.ts` with functions: `computeCalibratedDifficulty`, `computeDiscriminationIndex`, `determineQualityFlag`
- [ ] 2.4 Create `src/lib/questionAnalytics.ts` with functions: `computePerCLOScore`, `detectCLODiscrepancy`, `computeApprovalRate`, `computeBonusXP`
- [ ] 2.5 Add query keys to `src/lib/queryKeys.ts`: `questionBank`, `questionAnalytics`, `quizGeneration`, `reviewQueue`, `quizCLOCorrelation`

## Task 3: Property-Based Tests

- [ ] 3.1 Create `src/__tests__/properties/generateQuestionsSchema.property.test.ts` — Property 1: Generation request schema validation
- [ ] 3.2 Create `src/__tests__/properties/generatedQuestionOutput.property.test.ts` — Property 2: Generated question output completeness
- [ ] 3.3 Create `src/__tests__/properties/questionInsertion.property.test.ts` — Property 3: AI-generated questions inserted with pending review status
- [ ] 3.4 Create `src/__tests__/properties/questionStatusTransitions.property.test.ts` — Property 4: Question status transitions
- [ ] 3.5 Create `src/__tests__/properties/questionVersioning.property.test.ts` — Property 5: Question versioning preserves original
- [ ] 3.6 Create `src/__tests__/properties/questionBankSchema.property.test.ts` — Property 6: Question schema enforces single CLO and Bloom's level
- [ ] 3.7 Create `src/__tests__/properties/abilityClassification.property.test.ts` — Property 7: Ability classification from attainment percentage
- [ ] 3.8 Create `src/__tests__/properties/difficultyAdjustment.property.test.ts` — Property 8: Difficulty adjustment is bounded
- [ ] 3.9 Create `src/__tests__/properties/questionSelection.property.test.ts` — Property 9: Selected question respects difficulty range
- [ ] 3.10 Create `src/__tests__/properties/preferredBloomLevels.property.test.ts` — Property 10: Preferred Bloom's levels match ability
- [ ] 3.11 Create `src/__tests__/properties/noPreviousQuestions.property.test.ts` — Property 11: No previously answered questions selected
- [ ] 3.12 Create `src/__tests__/properties/adaptiveSessionData.property.test.ts` — Property 12: Adaptive session stores complete trajectory data
- [ ] 3.13 Create `src/__tests__/properties/calibratedDifficulty.property.test.ts` — Property 13: Calibrated difficulty formula correctness
- [ ] 3.14 Create `src/__tests__/properties/discriminationIndex.property.test.ts` — Property 14: Discrimination index computation
- [ ] 3.15 Create `src/__tests__/properties/qualityFlag.property.test.ts` — Property 15: Quality flag determination
- [ ] 3.16 Create `src/__tests__/properties/perCLOScore.property.test.ts` — Property 16: Per-CLO score breakdown calculation
- [ ] 3.17 Create `src/__tests__/properties/cloDiscrepancy.property.test.ts` — Property 17: CLO discrepancy detection
- [ ] 3.18 Create `src/__tests__/properties/approvalRate.property.test.ts` — Property 18: Approval rate calculation
- [ ] 3.19 Create `src/__tests__/properties/bonusXP.property.test.ts` — Property 19: Hard question bonus XP capped at 50
- [ ] 3.20 Create `src/__tests__/properties/promptPII.property.test.ts` — Property 20: LLM prompt excludes student PII

## Task 4: Unit Tests

- [ ] 4.1 Create `src/__tests__/unit/quizGenerationSchemas.test.ts` — Specific valid/invalid input examples for all Zod schemas
- [ ] 4.2 Create `src/__tests__/unit/adaptiveEngine.test.ts` — Edge cases: null attainment, difficulty bounds, empty question pool
- [ ] 4.3 Create `src/__tests__/unit/difficultyCalibration.test.ts` — Edge cases: 0%/100% success rate, threshold attempt counts
- [ ] 4.4 Create `src/__tests__/unit/questionAnalytics.test.ts` — Analytics update, cumulative updates, flagging thresholds
- [ ] 4.5 Create `src/__tests__/unit/quizBonusXP.test.ts` — 0 hard questions, max cap, mixed difficulties
- [ ] 4.6 Create `src/__tests__/unit/postQuizReview.test.ts` — Per-CLO score with various CLO configurations

## Task 5: Edge Functions

- [ ] 5.1 Create `supabase/functions/generate-quiz-questions/index.ts` — AI question generation Edge Function with JWT validation, RAG retrieval, LLM call, question insertion, logging
- [ ] 5.2 Create `supabase/functions/select-adaptive-question/index.ts` — Adaptive question selection Edge Function with ability estimation, difficulty targeting, question filtering, exclusion of previously answered
- [ ] 5.3 Create `supabase/functions/update-question-analytics/index.ts` — Post-quiz analytics recalculation Edge Function with success rate, discrimination index, calibrated difficulty, quality flagging

## Task 6: TanStack Query Hooks

- [ ] 6.1 Create `src/hooks/useQuestionBank.ts` — CRUD hooks for question_bank with filters (CLO, Bloom's, type, status, source)
- [ ] 6.2 Create `src/hooks/useGenerateQuestions.ts` — Mutation hook for AI question generation via Edge Function
- [ ] 6.3 Create `src/hooks/useReviewQueue.ts` — Query + mutations for pending questions: approve, reject, edit, bulk approve
- [ ] 6.4 Create `src/hooks/useAdaptiveQuiz.ts` — Hooks for adaptive quiz session: start, select next question, submit attempt
- [ ] 6.5 Create `src/hooks/useQuestionAnalytics.ts` — Query hooks for per-question analytics and question detail
- [ ] 6.6 Create `src/hooks/useQuizCLOCorrelation.ts` — Query hook for quiz vs CLO attainment correlation data

## Task 7: Shared Components

- [ ] 7.1 Create `src/components/shared/QuestionPreview.tsx` — Renders question by type (MCQ, T/F, short answer, fill-in-blank) with answer input
- [ ] 7.2 Create `src/components/shared/DifficultyBadge.tsx` — Color-coded difficulty rating badge (1.0–5.0 scale)
- [ ] 7.3 Create `src/components/shared/QuestionQualityIndicator.tsx` — Green/yellow/red quality status based on analytics
- [ ] 7.4 Create `src/components/shared/AnswerDistributionChart.tsx` — Recharts bar chart for MCQ option distribution

## Task 8: Teacher Pages — Question Generation and Review

- [ ] 8.1 Create `src/pages/teacher/quiz-generation/GenerateQuestionsPage.tsx` — AI generation form with CLO picker, Bloom's checkboxes, type selector, count slider, results panel
- [ ] 8.2 Create `src/pages/teacher/quiz-generation/ReviewQueuePage.tsx` — Pending question review grouped by CLO/Bloom's with approve/edit/reject actions and approval rate
- [ ] 8.3 Create `src/pages/teacher/quiz-generation/QuestionBankPage.tsx` — Full question bank DataTable with filters, inline analytics, manual question creation, label tagging

## Task 9: Teacher Pages — Analytics

- [ ] 9.1 Create `src/pages/teacher/quiz-analytics/QuestionAnalyticsDashboard.tsx` — Per-question metrics table with color-coded quality, sort/filter, flagged question detail panel with answer distribution chart
- [ ] 9.2 Create `src/pages/teacher/quiz-analytics/QuizCLOCorrelationPage.tsx` — Per-CLO comparison chart (quiz score vs attainment), discrepancy highlighting, Bloom's distribution chart

## Task 10: Student Pages — Adaptive Quiz and Review

- [ ] 10.1 Create `src/pages/student/quiz/AdaptiveQuizSession.tsx` — One-at-a-time adaptive quiz UI with progress bar, timer, no backward navigation, immediate next question on submit
- [ ] 10.2 Create `src/pages/student/quiz/PostQuizReview.tsx` — Post-quiz review with AI explanations, CLO/Bloom's badges, "Get Help" AI Tutor link, per-CLO score breakdown

## Task 11: Routing and Navigation

- [ ] 11.1 Add teacher routes: `/teacher/courses/:courseId/generate-questions`, `/teacher/courses/:courseId/review-queue`, `/teacher/courses/:courseId/question-bank`, `/teacher/courses/:courseId/question-analytics`, `/teacher/courses/:courseId/quiz-clo-correlation`
- [ ] 11.2 Add student routes: `/student/quizzes/:quizId/adaptive`, `/student/quizzes/:quizId/review/:attemptId`
- [ ] 11.3 Add navigation items to teacher sidebar for Question Bank, Generate Questions, and Analytics

## Task 12: Integration with Existing Systems

- [ ] 12.1 Update existing quiz creation form to include `is_adaptive` toggle and `adaptation_config` fields
- [ ] 12.2 Integrate `update-question-analytics` Edge Function call into existing quiz attempt submission flow
- [ ] 12.3 Add quiz completion XP award (50 base, 25 late) and hard question bonus XP to existing `award-xp` Edge Function
- [ ] 12.4 Add "Get Help" link in PostQuizReview that opens AI Tutor scoped to question's CLO (depends on AI Tutor RAG feature)

## Task 13: Component Tests

- [ ] 13.1 Create `src/__tests__/unit/questionPreview.test.tsx` — Renders MCQ, T/F, short answer, fill-in-blank correctly
- [ ] 13.2 Create `src/__tests__/unit/difficultyBadge.test.tsx` — Color coding for difficulty ranges
- [ ] 13.3 Create `src/__tests__/unit/questionQualityIndicator.test.tsx` — Green/yellow/red rendering based on quality flag
- [ ] 13.4 Create `src/__tests__/unit/adaptiveQuizSession.test.tsx` — Progress bar, timer, one-at-a-time rendering
- [ ] 13.5 Create `src/__tests__/unit/postQuizReviewPage.test.tsx` — Explanation display, CLO badges, "Get Help" link
