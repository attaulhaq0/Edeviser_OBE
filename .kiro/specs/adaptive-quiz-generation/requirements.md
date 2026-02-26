# Requirements Document — AI-Powered Adaptive Quiz Generation

## Introduction

The AI-Powered Adaptive Quiz Generation feature extends the existing Quiz Module (Requirement 79) in Edeviser with three capabilities: (1) AI-driven question generation from uploaded course materials using an LLM via OpenRouter, grounded by the RAG pipeline from the AI Tutor feature; (2) per-student adaptive difficulty that adjusts question Bloom's level and complexity based on CLO attainment data from the existing `outcome_attainment` table; and (3) per-question analytics (success rate, average time, discrimination index) that help teachers identify weak questions and correlate quiz performance with CLO attainment. The feature integrates with the existing OBE engine (ILO → PLO → CLO mapping, evidence rollup), gamification engine (XP awards for quiz completion), and Supabase backend (PostgreSQL + RLS, Edge Functions, Realtime).

## Glossary

- **Quiz_Generator**: The Edge Function that accepts a course_id, target CLO(s), target Bloom's level(s), question count, and question types, then calls the LLM via OpenRouter to produce candidate quiz questions grounded in course material retrieved from the Vector_Store
- **Question_Bank**: The `question_bank` table storing AI-generated and teacher-authored questions with metadata (course_id, clo_id, bloom_level, question_type, difficulty_rating, status, generation_source)
- **Adaptive_Engine**: The subsystem that selects questions for a student's quiz session based on the student's CLO attainment profile, targeting the zone of proximal development by adjusting Bloom's level and difficulty_rating
- **Difficulty_Rating**: A numeric score (1.0–5.0) assigned to each question, initially estimated by the LLM and refined over time using Item Response Theory metrics (success_rate, discrimination_index)
- **Discrimination_Index**: A statistical measure (−1.0 to 1.0) indicating how well a question differentiates between high-performing and low-performing students on the linked CLO
- **Success_Rate**: The percentage of students who answered a question correctly across all attempts
- **Average_Response_Time**: The mean time (in seconds) students spend on a question before submitting an answer
- **Question_Analytics**: The subsystem that computes and stores per-question metrics (Success_Rate, Average_Response_Time, Discrimination_Index) in the `question_analytics` table after each quiz attempt
- **Distractor**: An incorrect answer option in an MCQ question, designed to be plausible and pedagogically meaningful to expose common misconceptions
- **Generation_Request**: A teacher-initiated request to the Quiz_Generator specifying parameters (CLO targets, Bloom's levels, question count, question types) for AI question generation
- **Review_Queue**: The teacher-facing UI where AI-generated questions appear for approval, editing, or rejection before being added to the Question_Bank with `status = 'approved'`
- **Adaptive_Quiz_Session**: A quiz attempt where the Adaptive_Engine selects each subsequent question based on the student's responses to previous questions within the same session (item-level adaptation)
- **Item_Selection_Algorithm**: The algorithm within the Adaptive_Engine that chooses the next question by matching the student's estimated ability (derived from CLO attainment and in-session performance) to question Difficulty_Rating and Bloom's level
- **Quiz_Module**: The existing subsystem (Requirement 79) for creating and auto-grading online quizzes (MCQ, true/false, short answer, fill-in-blank) linked to CLOs
- **Vector_Store**: The pgvector-powered table (`course_material_embeddings`) from the AI Tutor RAG feature that stores chunked course material text and embedding vectors
- **RAG_Pipeline**: The Retrieval-Augmented Generation pipeline from the AI Tutor feature that retrieves relevant course material chunks via vector similarity search
- **Post_Quiz_Review**: The student-facing UI displayed after quiz submission showing each question, the student's answer, the correct answer, and an AI-generated explanation

## Requirements

### SECTION A: AI Quiz Question Generation

#### Requirement 1: Teacher-Initiated AI Question Generation

**User Story:** As a Teacher, I want to generate quiz questions from my course materials using AI, so that I can quickly build formative assessments aligned to specific CLOs and Bloom's levels.

##### Acceptance Criteria

1. WHEN a Teacher initiates a Generation_Request, THE Quiz_Generator SHALL accept parameters: target course_id, target clo_ids (1–5), target bloom_levels (1–6), desired question_count (1–50), and desired question_types (MCQ, true/false, short_answer, fill_in_blank).
2. WHEN the Quiz_Generator processes a Generation_Request, THE RAG_Pipeline SHALL retrieve the top 10 most relevant course material Chunks from the Vector_Store filtered by the target course_id and clo_ids.
3. THE Quiz_Generator SHALL construct an LLM prompt that includes the retrieved Chunks, the target Bloom's level(s), the desired question type(s), and instructions to generate pedagogically meaningful Distractors for MCQ questions.
4. THE Quiz_Generator SHALL return generated questions within 30 seconds for a batch of up to 20 questions.
5. WHEN the Quiz_Generator produces questions, THE Quiz_Generator SHALL tag each question with: the source clo_id, the target bloom_level, an estimated Difficulty_Rating (1.0–5.0), and the source Chunk references used for generation.
6. IF the Vector_Store contains fewer than 3 relevant Chunks for the target CLO (cosine similarity ≥ 0.7), THEN THE Quiz_Generator SHALL warn the Teacher that insufficient course material is available and suggest uploading more content before generating questions.

---

#### Requirement 2: AI-Generated Distractor Quality

**User Story:** As a Teacher, I want AI-generated MCQ distractors to be plausible and target common misconceptions, so that the quiz effectively assesses student understanding rather than guessing.

##### Acceptance Criteria

1. WHEN the Quiz_Generator generates an MCQ question, THE Quiz_Generator SHALL produce exactly 3 Distractors alongside 1 correct answer (4 options total by default).
2. THE LLM prompt SHALL instruct the model to base Distractors on common student misconceptions, partial understanding, and adjacent but incorrect concepts from the course material.
3. THE Quiz_Generator SHALL ensure that no two options in a generated MCQ are semantically identical (verified by the LLM in the same generation pass).
4. WHEN a Teacher reviews a generated MCQ, THE Review_Queue SHALL display the source material excerpt that informed each Distractor.

---

#### Requirement 3: Teacher Review and Approval Workflow

**User Story:** As a Teacher, I want to review, edit, approve, or reject AI-generated questions before they appear in quizzes, so that I maintain quality control over assessment content.

##### Acceptance Criteria

1. WHEN the Quiz_Generator completes a Generation_Request, THE Platform SHALL insert all generated questions into the Question_Bank with `status = 'pending_review'` and `generation_source = 'ai'`.
2. THE Review_Queue SHALL display pending questions grouped by CLO and Bloom's level, with the source material excerpt, estimated Difficulty_Rating, and question preview.
3. WHEN a Teacher approves a question, THE Platform SHALL update the question status to `approved` in the Question_Bank.
4. WHEN a Teacher edits a question, THE Platform SHALL save the edited version with `generation_source = 'ai_edited'` and update the status to `approved`.
5. WHEN a Teacher rejects a question, THE Platform SHALL update the question status to `rejected` and exclude the question from quiz selection.
6. THE Teacher SHALL be able to create questions manually in the Question_Bank with `generation_source = 'manual'` and `status = 'approved'`.
7. THE Review_Queue SHALL display the approval rate (approved / total generated) per Generation_Request to help teachers gauge AI quality over time.

---

#### Requirement 4: Question Bank Management

**User Story:** As a Teacher, I want a centralized question bank for my course where I can browse, filter, and manage all questions (AI-generated and manual), so that I can efficiently build quizzes from a curated pool.

##### Acceptance Criteria

1. THE Question_Bank UI SHALL display all questions for a course with filters: by CLO, by Bloom's level, by question_type, by status (approved, pending_review, rejected), and by generation_source (ai, ai_edited, manual).
2. THE Question_Bank UI SHALL display per-question analytics (Success_Rate, Average_Response_Time, Discrimination_Index) for questions that have been used in at least one quiz attempt.
3. THE Teacher SHALL be able to edit any approved question; edits SHALL create a new version while preserving the original for historical analytics.
4. THE Teacher SHALL be able to tag questions with custom labels for organizational purposes.
5. THE Question_Bank SHALL enforce that each question is linked to exactly one CLO and one Bloom's level.

---

### SECTION B: Adaptive Difficulty Engine

#### Requirement 5: Student Ability Profile for Quiz Adaptation

**User Story:** As the system, I want to compute a per-student ability profile from CLO attainment data, so that the Adaptive_Engine can select appropriately challenging questions.

##### Acceptance Criteria

1. WHEN a Student starts an Adaptive_Quiz_Session, THE Adaptive_Engine SHALL retrieve the student's current CLO attainment percentages for all CLOs linked to the quiz from the `outcome_attainment` table.
2. THE Adaptive_Engine SHALL classify the student's ability per CLO as: High (attainment ≥ 85%), Medium (attainment 50–84%), or Low (attainment < 50%).
3. FOR students with no prior attainment data on a linked CLO, THE Adaptive_Engine SHALL default to Medium ability for that CLO.
4. THE Adaptive_Engine SHALL recompute the student's in-session ability estimate after each answered question using the correctness of the response and the Difficulty_Rating of the answered question.

---

#### Requirement 6: Item-Level Adaptive Question Selection

**User Story:** As a Student, I want the quiz to adjust question difficulty based on my performance, so that I am challenged at my level without being overwhelmed or bored.

##### Acceptance Criteria

1. WHEN the Adaptive_Engine selects the next question in an Adaptive_Quiz_Session, THE Item_Selection_Algorithm SHALL choose a question from the Question_Bank where the Difficulty_Rating is within ±0.5 of the student's current estimated ability level (mapped to the 1.0–5.0 scale).
2. WHEN a Student answers a question correctly, THE Adaptive_Engine SHALL increase the target difficulty for the next question by 0.3 (capped at 5.0).
3. WHEN a Student answers a question incorrectly, THE Adaptive_Engine SHALL decrease the target difficulty for the next question by 0.5 (floored at 1.0).
4. THE Item_Selection_Algorithm SHALL prefer questions at higher Bloom's levels for students with High CLO ability, and questions at lower Bloom's levels (Remembering, Understanding) for students with Low CLO ability.
5. THE Item_Selection_Algorithm SHALL avoid selecting questions the student has previously answered in any prior quiz attempt for the same quiz.
6. IF the Question_Bank has fewer than 3 eligible questions matching the target difficulty range, THEN THE Adaptive_Engine SHALL expand the range to ±1.0 and log a warning for the Teacher indicating insufficient question pool depth.

---

#### Requirement 7: Adaptive Quiz Session Flow

**User Story:** As a Student, I want to take an adaptive quiz that feels like a normal quiz experience while the difficulty adjusts behind the scenes, so that the adaptation is seamless.

##### Acceptance Criteria

1. WHEN a Teacher creates an adaptive quiz, THE Quiz_Module SHALL allow the Teacher to set: total question count, time limit, linked CLOs, and whether adaptation is enabled (toggle).
2. WHEN a Student starts an Adaptive_Quiz_Session, THE Platform SHALL present questions one at a time (no backward navigation) to support item-level adaptation.
3. THE Platform SHALL display a progress indicator showing the current question number out of the total count.
4. WHEN the Student submits an answer, THE Platform SHALL immediately select and display the next question (target latency < 500ms for question selection).
5. WHEN the Student completes all questions or the time limit expires, THE Platform SHALL submit the attempt and trigger the existing auto-grading, evidence generation, and XP award pipelines.
6. THE Adaptive_Quiz_Session SHALL store the sequence of questions presented, the student's answers, per-question response times, and the difficulty trajectory in the `quiz_attempts` record.

---

#### Requirement 8: Non-Adaptive Quiz Compatibility

**User Story:** As a Teacher, I want to create traditional (non-adaptive) quizzes that draw from the Question_Bank, so that I can use the question bank without requiring adaptation.

##### Acceptance Criteria

1. WHEN a Teacher creates a non-adaptive quiz, THE Quiz_Module SHALL allow the Teacher to manually select specific questions from the Question_Bank or auto-select a random set filtered by CLO, Bloom's level, and difficulty range.
2. Non-adaptive quizzes SHALL present all questions at once (or sequentially without adaptation) and allow backward navigation.
3. Non-adaptive quizzes SHALL use the same auto-grading, evidence generation, and XP award pipelines as adaptive quizzes.
4. THE Question_Bank questions SHALL be usable in both adaptive and non-adaptive quizzes without duplication.

---

### SECTION C: Question Difficulty Calibration

#### Requirement 9: Automatic Difficulty Calibration from Attempt Data

**User Story:** As the system, I want to recalibrate question difficulty ratings based on actual student performance data, so that the Adaptive_Engine uses empirically validated difficulty values rather than LLM estimates alone.

##### Acceptance Criteria

1. AFTER each quiz attempt submission, THE Question_Analytics subsystem SHALL update the Success_Rate, Average_Response_Time, and Discrimination_Index for every question answered in that attempt.
2. WHEN a question has been answered by at least 10 students, THE Question_Analytics subsystem SHALL recalculate the Difficulty_Rating using the formula: `calibrated_difficulty = 5.0 - (4.0 × success_rate)`, blended with the original estimate using a weighted average (weight shifts toward empirical as sample size grows).
3. THE Discrimination_Index SHALL be calculated as the difference in Success_Rate between the top 27% and bottom 27% of students (by CLO attainment) who attempted the question.
4. WHEN a question's Discrimination_Index falls below 0.2 after 20 or more attempts, THE Platform SHALL flag the question in the Question_Bank as "low discrimination" for teacher review.
5. WHEN a question's Success_Rate exceeds 95% or falls below 10% after 20 or more attempts, THE Platform SHALL flag the question as "too easy" or "too hard" respectively.

---

### SECTION D: Post-Quiz Review and Explanations

#### Requirement 10: Student Post-Quiz Review with AI Explanations

**User Story:** As a Student, I want to see a detailed review after completing a quiz with explanations for each question, so that I learn from my mistakes and reinforce correct understanding.

##### Acceptance Criteria

1. WHEN a Student completes a quiz attempt, THE Post_Quiz_Review SHALL display: each question, the student's selected answer, the correct answer, and whether the answer was correct or incorrect.
2. FOR each question in the Post_Quiz_Review, THE Platform SHALL display an AI-generated explanation grounded in course material from the Vector_Store, generated at quiz creation time and cached in the Question_Bank.
3. THE Post_Quiz_Review SHALL highlight the CLO and Bloom's level associated with each question.
4. WHEN a Student answers a question incorrectly, THE Post_Quiz_Review SHALL display a "Get Help" link that opens the AI Tutor (from the AI Tutor RAG feature) pre-scoped to the question's CLO.
5. THE Post_Quiz_Review SHALL display the student's per-CLO score breakdown (percentage correct per CLO) alongside the student's current CLO attainment from the `outcome_attainment` table.

---

### SECTION E: Quiz Analytics for Teachers

#### Requirement 11: Per-Question Analytics Dashboard

**User Story:** As a Teacher, I want to see analytics for each question in my quizzes, so that I can identify poorly performing questions and improve assessment quality.

##### Acceptance Criteria

1. THE Question_Analytics dashboard SHALL display per-question metrics: Success_Rate (%), Average_Response_Time (seconds), Discrimination_Index, and total attempt count.
2. THE Question_Analytics dashboard SHALL color-code questions by quality: green (Discrimination_Index ≥ 0.3 and Success_Rate 30–85%), yellow (marginal), red (Discrimination_Index < 0.2 or Success_Rate > 95% or < 10%).
3. THE Question_Analytics dashboard SHALL allow sorting and filtering by CLO, Bloom's level, question_type, and quality status.
4. WHEN a Teacher clicks a flagged question, THE Platform SHALL display a detail panel with the question text, answer distribution chart (bar chart showing percentage of students selecting each option), and suggested action (edit, replace, or retire).

---

#### Requirement 12: Quiz-Level CLO Performance Correlation

**User Story:** As a Teacher, I want to see how quiz performance correlates with overall CLO attainment, so that I can validate whether my quizzes are measuring the right outcomes.

##### Acceptance Criteria

1. THE Quiz_Analytics dashboard SHALL display a per-CLO comparison chart showing: average quiz score on questions linked to each CLO versus the class average CLO attainment from the `outcome_attainment` table.
2. WHEN the quiz score for a CLO deviates from the CLO attainment by more than 15 percentage points, THE Platform SHALL highlight the discrepancy and suggest the Teacher review question alignment.
3. THE Quiz_Analytics dashboard SHALL display a Bloom's level distribution chart showing the number of questions per Bloom's level in the quiz alongside the CLO Bloom's level targets.

---

### SECTION F: Gamification Integration

#### Requirement 13: XP Awards for Adaptive Quiz Completion

**User Story:** As a Student, I want to earn XP for completing adaptive quizzes, with bonus XP for performing well on harder questions, so that the gamification system rewards genuine learning effort.

##### Acceptance Criteria

1. WHEN a Student completes an adaptive quiz on time, THE XP_Engine SHALL award 50 XP (base quiz completion, consistent with existing XP schedule).
2. WHEN a Student completes an adaptive quiz after the due date but within the late window, THE XP_Engine SHALL award 25 XP.
3. WHEN a Student correctly answers a question with Difficulty_Rating ≥ 4.0 in an adaptive quiz, THE XP_Engine SHALL award a bonus of 10 XP per such question (max 50 bonus XP per quiz).
4. THE XP_Engine SHALL log adaptive quiz XP awards as `xp_transactions` with `source = 'quiz_completion'` and `reference_id` pointing to the quiz_attempt_id.
5. THE Adaptive_XP_Engine diminishing returns rules SHALL apply to quiz completion XP (reduced XP after 5 quiz completions in a rolling 24-hour window).

---

### SECTION G: Data Model and Security

#### Requirement 14: Question Bank Data Model

**User Story:** As the system, I want a well-structured data model for the question bank and analytics, so that questions, attempts, and metrics are stored efficiently with proper access control.

##### Acceptance Criteria

1. THE Platform SHALL create a `question_bank` table with columns: `id` (uuid PK), `course_id` (FK), `clo_id` (FK), `bloom_level` (smallint 1–6), `question_type` (enum: mcq, true_false, short_answer, fill_in_blank), `question_text` (text), `options` (jsonb), `correct_answer` (jsonb), `explanation` (text), `difficulty_rating` (numeric 1.0–5.0), `status` (enum: pending_review, approved, rejected), `generation_source` (enum: ai, ai_edited, manual), `source_chunks` (jsonb, array of chunk references), `labels` (text[]), `created_by` (FK to profiles), `created_at`, `updated_at`.
2. THE Platform SHALL create a `question_analytics` table with columns: `id` (uuid PK), `question_id` (FK to question_bank), `total_attempts` (int), `correct_count` (int), `success_rate` (numeric), `avg_response_time_seconds` (numeric), `discrimination_index` (numeric), `calibrated_difficulty` (numeric), `last_calculated_at` (timestamptz).
3. THE Platform SHALL add an `is_adaptive` (boolean, default false) and `adaptation_config` (jsonb) column to the existing `quizzes` table.
4. THE Platform SHALL add `question_sequence` (jsonb), `difficulty_trajectory` (jsonb), and `per_question_times` (jsonb) columns to the existing `quiz_attempts` table.
5. RLS policies on `question_bank` SHALL ensure: Teachers can CRUD questions for their own courses; Students cannot read question_bank directly (questions are served through the quiz session API); Admins can read all questions within their institution.
6. RLS policies on `question_analytics` SHALL ensure: Teachers can read analytics for their own courses; Students cannot access question_analytics.

---

### SECTION H: Non-Functional Requirements

#### Requirement 15: Performance

**User Story:** As a user, I want the adaptive quiz system to respond quickly, so that the quiz-taking experience is smooth and the AI generation does not block my workflow.

##### Acceptance Criteria

1. THE Quiz_Generator SHALL return a batch of up to 20 generated questions within 30 seconds.
2. THE Adaptive_Engine SHALL select the next question within 500ms of the student submitting an answer.
3. THE Question_Analytics recalculation SHALL complete within 2 seconds of a quiz attempt submission.
4. THE Question_Bank UI SHALL load and render up to 500 questions with filters applied within 1 second.
5. THE Post_Quiz_Review page SHALL render within 1 second of the student completing the quiz.

---

#### Requirement 16: Reliability and Fallback

**User Story:** As a Teacher, I want the AI generation to handle errors gracefully, so that a failed generation does not block quiz creation.

##### Acceptance Criteria

1. IF the LLM API (via OpenRouter) returns an error or times out during a Generation_Request, THEN THE Quiz_Generator SHALL retry once with exponential backoff (2-second initial delay) and, if the retry fails, return a descriptive error to the Teacher.
2. IF the RAG_Pipeline is unavailable (Vector_Store unreachable), THEN THE Quiz_Generator SHALL generate questions using only the LLM's general knowledge and tag the generated questions with `grounded = false` to alert the Teacher.
3. IF the Adaptive_Engine cannot find eligible questions during an Adaptive_Quiz_Session (empty Question_Bank for the target range), THEN THE Platform SHALL fall back to random selection from all approved questions for the linked CLOs and log a warning.
4. THE Platform SHALL queue failed Question_Analytics recalculations and retry them on the next quiz attempt submission.

---

#### Requirement 17: Security and Access Control

**User Story:** As an institution, I want all adaptive quiz data secured with RLS and proper access control, so that question content and student performance data are protected.

##### Acceptance Criteria

1. THE Platform SHALL store the OpenRouter API key as a Supabase Edge Function secret, never in client-side code.
2. THE Quiz_Generator Edge Function SHALL validate the teacher's JWT and verify course ownership before processing any Generation_Request.
3. THE Adaptive_Engine SHALL serve questions to students only through the quiz session API, preventing direct access to the Question_Bank table.
4. THE Platform SHALL NOT send student PII (full name, email, student ID) to the LLM provider during question generation; only course material content and pedagogical parameters SHALL be included in the prompt.
5. All LLM API calls for question generation SHALL be logged to an internal monitoring table with: teacher_id, course_id, model used, token count, latency, and timestamp for cost tracking.
