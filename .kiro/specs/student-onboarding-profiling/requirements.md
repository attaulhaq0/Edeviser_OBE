# Requirements Document — Student Onboarding & Profiling

## Introduction

The Student Onboarding & Profiling feature extends the Edeviser platform with a structured onboarding flow for new students that captures personality traits, learning style preferences, and baseline competency levels. When a student logs in for the first time (with `onboarding_completed = false`), the platform presents a multi-step wizard that guides the student through a personality assessment (Big Five traits), a learning style questionnaire (VARK model), and optional baseline diagnostic tests mapped to enrolled course CLOs. The results are stored in a student profile that feeds into adaptive features (AI Tutor persona recommendations, learning path ordering, at-risk predictions) and awards XP for completion. The feature integrates with the existing auth flow (AuthProvider, `onboarding_completed` flag), gamification engine (XP awards, badge checks), and OBE outcome hierarchy (CLO-based baseline testing).

## Glossary

- **Onboarding_Wizard**: The multi-step React wizard component presented to students on first login that guides them through personality assessment, learning style detection, and baseline testing
- **Personality_Assessment**: A questionnaire based on the Big Five personality traits (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) that produces a normalized trait profile for each student
- **Learning_Style_Detector**: A questionnaire based on the VARK model (Visual, Auditory, Read/Write, Kinesthetic) that identifies the student's preferred learning modalities
- **Baseline_Test**: A diagnostic assessment mapped to specific CLOs for an enrolled course that establishes the student's initial competency level before formal instruction begins
- **Student_Profile**: The composite data record combining personality traits, learning style preferences, and baseline attainment scores, stored in the `student_profiles` table
- **Trait_Score**: A normalized value between 0 and 100 representing the student's score on a single Big Five personality dimension
- **VARK_Score**: A normalized value between 0 and 100 representing the student's affinity for a single VARK learning modality
- **Baseline_Score**: A percentage (0–100) representing the student's performance on a Baseline_Test for a specific CLO
- **Profile_Engine**: The Edge Function that processes assessment responses, calculates scores, persists the Student_Profile, and triggers XP awards
- **Question_Bank**: The collection of assessment questions stored in the `onboarding_questions` table, categorized by assessment type (personality, learning_style, baseline)
- **Assessment_Response**: A student's answer to a single question, stored in the `onboarding_responses` table with the selected option and computed score contribution
- **Onboarding_Progress**: The tracking record in `onboarding_progress` that stores which steps the student has completed and allows resuming an interrupted onboarding flow
- **Profile_Summary_Card**: The UI component on the student dashboard that displays a visual summary of the student's personality traits and learning style after onboarding completion

## Requirements

### SECTION A: Onboarding Flow & Navigation

#### Requirement 1: Onboarding Wizard Activation

**User Story:** As a Student, I want to be guided through an onboarding flow on my first login, so that the platform can personalize my learning experience from the start.

##### Acceptance Criteria

1. WHEN a Student logs in with `onboarding_completed = false`, THE Onboarding_Wizard SHALL be displayed as a full-screen overlay that blocks access to the main student dashboard.
2. THE Onboarding_Wizard SHALL present a welcome step explaining the purpose of the onboarding process, estimated completion time (10–15 minutes), and the XP reward for completion.
3. THE Onboarding_Wizard SHALL display a progress indicator showing the current step number out of total steps and a progress bar with percentage completion.
4. THE Onboarding_Wizard SHALL allow the Student to navigate backward to review and change previous answers without losing progress on later steps.
5. IF the Student closes the browser or logs out during onboarding, THEN THE Onboarding_Wizard SHALL resume from the last completed step on the next login.
6. THE Onboarding_Wizard SHALL include a "Skip for Now" option on each assessment section that allows the Student to defer that section and proceed to the next, with a reminder shown on the dashboard to complete skipped sections.

---

#### Requirement 2: Onboarding Step Sequence

**User Story:** As the system, I want the onboarding to follow a defined step sequence, so that the student experience is consistent and data collection is structured.

##### Acceptance Criteria

1. THE Onboarding_Wizard SHALL present steps in the following order: (1) Welcome, (2) Personality_Assessment, (3) Learning_Style_Detector, (4) Baseline_Test selection, (5) Baseline_Test execution (per selected course), (6) Profile summary and confirmation.
2. WHEN the Student completes the final step (profile summary confirmation), THE Platform SHALL set `onboarding_completed = true` on the Student's profile record.
3. WHEN the Student completes the final step, THE Platform SHALL redirect the Student to the student dashboard.
4. THE Onboarding_Wizard SHALL allow the Student to skip the Baseline_Test steps entirely if the Student chooses not to take any baseline tests.

---

### SECTION B: Personality Assessment

#### Requirement 3: Big Five Personality Questionnaire

**User Story:** As a Student, I want to complete a personality assessment, so that the platform can understand my traits and tailor recommendations accordingly.

##### Acceptance Criteria

1. THE Personality_Assessment SHALL present 25 questions (5 per Big Five dimension: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism).
2. WHEN a question is displayed, THE Personality_Assessment SHALL show the question text and a 5-point Likert scale (Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree).
3. THE Personality_Assessment SHALL display one question at a time with smooth transition animations between questions.
4. WHEN the Student completes all 25 questions, THE Profile_Engine SHALL calculate a Trait_Score (0–100) for each of the 5 dimensions using the weighted average of responses for that dimension.
5. IF the Student skips the Personality_Assessment, THEN THE Student_Profile SHALL store null values for all Trait_Scores, and THE Profile_Summary_Card SHALL display "Not assessed" for personality traits.

---

#### Requirement 4: Personality Assessment Question Design

**User Story:** As an Admin, I want personality assessment questions to be stored in the database and manageable, so that the institution can customize the assessment over time.

##### Acceptance Criteria

1. THE Question_Bank SHALL store personality questions with fields: question_text, dimension (one of the 5 Big Five traits), weight (positive or negative scoring direction), and sort_order.
2. THE Platform SHALL seed a default set of 25 validated personality questions on first deployment.
3. WHERE an institution enables custom questions, THE Admin SHALL be able to add, edit, or deactivate personality questions via the admin panel.
4. THE Personality_Assessment SHALL only present questions with `is_active = true` from the Question_Bank.

---

### SECTION C: Learning Style Detection

#### Requirement 5: VARK Learning Style Questionnaire

**User Story:** As a Student, I want to discover my learning style preferences, so that I can understand how I learn most effectively and the platform can adapt content delivery.

##### Acceptance Criteria

1. THE Learning_Style_Detector SHALL present 16 questions covering the 4 VARK modalities (Visual, Auditory, Read/Write, Kinesthetic), with 4 questions per modality.
2. WHEN a question is displayed, THE Learning_Style_Detector SHALL show the question text and 4 answer options, each mapped to one VARK modality.
3. WHEN the Student completes all 16 questions, THE Profile_Engine SHALL calculate a VARK_Score (0–100) for each modality based on the frequency of selections for that modality.
4. THE Profile_Engine SHALL identify the Student's dominant learning style as the modality with the highest VARK_Score, and SHALL flag multimodal learners when two or more modalities score within 10 points of each other.
5. IF the Student skips the Learning_Style_Detector, THEN THE Student_Profile SHALL store null values for all VARK_Scores, and THE Profile_Summary_Card SHALL display "Not assessed" for learning style.

---

#### Requirement 6: Learning Style Question Design

**User Story:** As an Admin, I want learning style questions to be stored in the database and manageable, so that the institution can refine the assessment.

##### Acceptance Criteria

1. THE Question_Bank SHALL store learning style questions with fields: question_text, options (array of 4 objects each with option_text and mapped modality), and sort_order.
2. THE Platform SHALL seed a default set of 16 validated VARK questions on first deployment.
3. WHERE an institution enables custom questions, THE Admin SHALL be able to add, edit, or deactivate learning style questions via the admin panel.

---

### SECTION D: Baseline Testing

#### Requirement 7: Baseline Test Selection

**User Story:** As a Student, I want to choose which courses to take baseline tests for, so that I can establish my starting competency level in subjects I care about.

##### Acceptance Criteria

1. THE Onboarding_Wizard SHALL display a list of the Student's enrolled courses that have active Baseline_Tests configured by their Teachers.
2. THE Student SHALL be able to select one or more courses for baseline testing, or skip baseline testing entirely.
3. WHEN a course is selected, THE Onboarding_Wizard SHALL display the estimated time for that course's Baseline_Test and the number of questions.

---

#### Requirement 8: Baseline Test Execution

**User Story:** As a Student, I want to take a diagnostic test for my enrolled courses, so that the platform knows my starting competency level for each CLO.

##### Acceptance Criteria

1. WHEN the Student starts a Baseline_Test for a course, THE Onboarding_Wizard SHALL present questions grouped by CLO, with each question mapped to exactly one CLO.
2. THE Baseline_Test SHALL support multiple-choice questions with a single correct answer.
3. WHEN the Student completes a Baseline_Test, THE Profile_Engine SHALL calculate a Baseline_Score (0–100) for each CLO based on the percentage of correct answers for that CLO.
4. THE Profile_Engine SHALL store Baseline_Scores in the `baseline_attainment` table with student_id, course_id, clo_id, and score.
5. THE Baseline_Test SHALL enforce a time limit per course (configurable by the Teacher, default 15 minutes) and auto-submit when time expires.
6. IF the Student does not answer a question before time expires, THEN THE Profile_Engine SHALL treat unanswered questions as incorrect (score of 0 for that question).

---

#### Requirement 9: Baseline Test Configuration by Teachers

**User Story:** As a Teacher, I want to configure baseline diagnostic tests for my courses, so that I can assess students' prior knowledge at the start of the semester.

##### Acceptance Criteria

1. THE Teacher SHALL be able to create Baseline_Test questions for a course, with each question mapped to one CLO, containing question_text, 4 answer options, the correct_option index, and a difficulty_level (easy, medium, hard).
2. THE Teacher SHALL be able to set the time limit for the Baseline_Test (5–60 minutes, default 15 minutes).
3. THE Teacher SHALL be able to activate or deactivate the Baseline_Test for a course, controlling whether the test appears in the onboarding flow.
4. WHEN a Teacher activates a Baseline_Test, THE Platform SHALL require at least 2 questions per CLO in the course before activation.

---

### SECTION E: Profile Storage & Computation

#### Requirement 10: Student Profile Persistence

**User Story:** As the system, I want to store all onboarding assessment results in a structured profile, so that other platform features can use the data for personalization.

##### Acceptance Criteria

1. THE Profile_Engine SHALL store the Student_Profile in the `student_profiles` table with: student_id, personality_traits (JSONB with 5 Trait_Scores), learning_style (JSONB with 4 VARK_Scores and dominant_style), completed_at timestamp, and assessment_version.
2. THE Profile_Engine SHALL store individual Assessment_Responses in the `onboarding_responses` table with: student_id, question_id, selected_option, score_contribution, and created_at.
3. THE Student_Profile SHALL be immutable after initial creation during onboarding; updates require a re-assessment flow accessible from the student settings page.
4. FOR ALL valid Assessment_Responses, computing scores from responses then serializing to the Student_Profile then re-computing from the stored profile SHALL produce equivalent Trait_Scores and VARK_Scores (round-trip property).

---

#### Requirement 11: Score Calculation Accuracy

**User Story:** As the system, I want score calculations to be deterministic and accurate, so that student profiles are reliable.

##### Acceptance Criteria

1. THE Profile_Engine SHALL calculate each Trait_Score as: `(sum of weighted responses for dimension / max possible score for dimension) * 100`, rounded to the nearest integer.
2. THE Profile_Engine SHALL calculate each VARK_Score as: `(count of selections for modality / total questions) * 100`, rounded to the nearest integer.
3. THE sum of all 4 VARK_Scores SHALL NOT exceed 400 (since each question maps to exactly one modality, the sum equals 100 * number_of_modalities_selected / total_questions * 4, which simplifies to 400 when all questions are answered).
4. FOR ALL valid sets of 25 personality responses, each Trait_Score SHALL be in the range [0, 100].
5. FOR ALL valid sets of 16 learning style responses, each VARK_Score SHALL be in the range [0, 100].

---

### SECTION F: Gamification Integration

#### Requirement 12: XP Awards for Onboarding Completion

**User Story:** As a Student, I want to earn XP for completing the onboarding assessments, so that I start my gamification journey from day one.

##### Acceptance Criteria

1. WHEN the Student completes the Personality_Assessment, THE XP_Engine SHALL award 25 XP with `source = 'onboarding_personality'`.
2. WHEN the Student completes the Learning_Style_Detector, THE XP_Engine SHALL award 25 XP with `source = 'onboarding_learning_style'`.
3. WHEN the Student completes a Baseline_Test for a course, THE XP_Engine SHALL award 20 XP per course with `source = 'onboarding_baseline'`.
4. WHEN the Student completes all onboarding steps (including profile confirmation), THE XP_Engine SHALL award a 50 XP "Welcome Bonus" with `source = 'onboarding_complete'`.
5. THE XP_Engine SHALL award onboarding XP only once per student; re-assessment SHALL NOT trigger additional onboarding XP.

---

#### Requirement 13: Onboarding Badge

**User Story:** As a Student, I want to earn a badge for completing onboarding, so that I have a visible achievement from the start.

##### Acceptance Criteria

1. WHEN the Student completes all three assessment sections (personality, learning style, and at least one baseline test), THE Badge_Engine SHALL award the "Self-Aware Scholar" badge.
2. WHEN the Student completes onboarding without skipping any section, THE Badge_Engine SHALL award the "Thorough Explorer" badge.
3. THE Badge awards SHALL trigger the standard badge pop animation and peer milestone notification.

---

### SECTION G: Profile Display & Dashboard Integration

#### Requirement 14: Profile Summary Card on Dashboard

**User Story:** As a Student, I want to see a summary of my personality and learning style on my dashboard, so that I can reflect on my profile and understand how the platform adapts to me.

##### Acceptance Criteria

1. WHEN `onboarding_completed = true` and the Student_Profile exists, THE StudentDashboard SHALL display a Profile_Summary_Card showing the Big Five trait scores as a radar chart and the dominant VARK learning style with a descriptive label.
2. THE Profile_Summary_Card SHALL display the dominant learning style with an icon and brief description (e.g., "Visual Learner — You learn best through diagrams, charts, and spatial understanding").
3. WHEN the Student_Profile has null personality traits or null VARK scores (skipped sections), THE Profile_Summary_Card SHALL display a prompt to complete the skipped assessment with a link to the re-assessment flow.
4. THE Profile_Summary_Card SHALL include a "Retake Assessment" link that navigates to the re-assessment page in student settings.

---

#### Requirement 15: Profile Visibility and Privacy

**User Story:** As a Student, I want my personality and learning style data to remain private, so that only I and authorized staff can see my profile.

##### Acceptance Criteria

1. THE RLS policies on `student_profiles` SHALL ensure that only the owning Student can read their own profile data.
2. Teachers SHALL be able to view aggregate learning style distributions for their courses (e.g., "60% Visual, 20% Auditory") but SHALL NOT access individual student personality or learning style scores.
3. Admins SHALL be able to view aggregate onboarding completion rates and learning style distributions at the institution level but SHALL NOT access individual student profiles.
4. THE Baseline_Score data in `baseline_attainment` SHALL be readable by the owning Student and the Teacher of the associated course.

---

### SECTION H: Teacher & Admin Views

#### Requirement 16: Teacher Baseline Results View

**User Story:** As a Teacher, I want to see baseline test results for my course, so that I can understand students' prior knowledge and adjust my teaching plan.

##### Acceptance Criteria

1. THE Teacher dashboard SHALL display a "Baseline Results" section for each course that has an active Baseline_Test.
2. THE Baseline Results section SHALL show a per-CLO bar chart of average Baseline_Scores across all students who completed the test.
3. THE Baseline Results section SHALL display the number of students who completed the baseline test out of total enrolled students.
4. THE Teacher SHALL be able to view individual student Baseline_Scores for their course (not personality or learning style data).

---

#### Requirement 17: Admin Onboarding Analytics

**User Story:** As an Admin, I want to see onboarding completion metrics, so that I can monitor adoption and identify students who have not completed onboarding.

##### Acceptance Criteria

1. THE Admin dashboard SHALL display an "Onboarding Status" KPI card showing the percentage of students who have completed onboarding.
2. THE Admin SHALL be able to view a list of students who have not completed onboarding, filterable by program and enrollment date.
3. THE Admin SHALL be able to send a reminder notification to students who have not completed onboarding within 7 days of their first login.

---

### SECTION I: Re-Assessment

#### Requirement 18: Profile Re-Assessment Flow

**User Story:** As a Student, I want to retake the personality and learning style assessments, so that my profile stays current as I grow.

##### Acceptance Criteria

1. THE Student settings page SHALL include a "Retake Assessments" section with options to retake the Personality_Assessment, Learning_Style_Detector, or both.
2. WHEN the Student completes a re-assessment, THE Profile_Engine SHALL create a new Student_Profile record with an incremented assessment_version and updated scores, preserving the previous version for historical comparison.
3. THE Student SHALL be able to retake assessments at most once per 90 days; THE Platform SHALL display the next eligible date if the cooldown has not elapsed.
4. Re-assessment SHALL NOT award additional onboarding XP.

---

### SECTION J: Non-Functional Requirements

#### Requirement 19: Performance

**User Story:** As a Student, I want the onboarding flow to be fast and responsive, so that I can complete it without frustration.

##### Acceptance Criteria

1. THE Onboarding_Wizard SHALL load the initial welcome step within 1 second of the student's first login redirect.
2. THE transition between questions within an assessment SHALL complete within 200ms.
3. THE Profile_Engine SHALL calculate and persist all scores within 2 seconds of the final assessment submission.
4. THE Baseline_Test timer SHALL be accurate to within 1 second over a 60-minute test duration.

---

#### Requirement 20: Data Integrity

**User Story:** As the system, I want onboarding data to be consistent and reliable, so that downstream features can trust the student profile.

##### Acceptance Criteria

1. THE Profile_Engine SHALL validate all Assessment_Responses against the Question_Bank before calculating scores (reject responses referencing non-existent or inactive questions).
2. IF the Profile_Engine receives duplicate responses for the same question from the same student, THEN THE Profile_Engine SHALL use only the most recent response.
3. THE `onboarding_responses` table SHALL enforce a unique constraint on (student_id, question_id, assessment_version) to prevent duplicate storage.
4. THE `student_profiles` table SHALL enforce a unique constraint on (student_id, assessment_version) to prevent duplicate profiles.
5. THE `baseline_attainment` table SHALL enforce a unique constraint on (student_id, course_id, clo_id) with UPSERT semantics for re-assessment.
