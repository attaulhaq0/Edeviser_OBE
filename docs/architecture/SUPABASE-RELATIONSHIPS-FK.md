# Edeviser — Supabase Relationships & Foreign Keys Reference

> **Generated**: April 1, 2026 | **Project**: cdlgtbvxlxjpcddjazzx (Edeviser-Kiro) | **Region**: ap-northeast-1
>
> Source: `src/types/database.ts` (auto-generated from Supabase)

---

## Table of Contents

1. [Relationship Summary](#relationship-summary)
2. [Entity Relationship Diagram (Text)](#entity-relationship-diagram-text)
3. [All Foreign Keys by Source Table](#all-foreign-keys-by-source-table)
4. [One-to-One Relationships](#one-to-one-relationships)
5. [Self-Referencing Relationships](#self-referencing-relationships)
6. [Many-to-Many Junction Tables](#many-to-many-junction-tables)
7. [Tables with No Foreign Keys](#tables-with-no-foreign-keys)
8. [FK Index by Target Table](#fk-index-by-target-table)

---

## Relationship Summary

| Metric                   | Count                           |
| ------------------------ | ------------------------------- |
| Total tables             | 57                              |
| Total foreign keys       | 107                             |
| One-to-one relationships | 6                               |
| Self-referencing FKs     | 2                               |
| Junction/bridge tables   | 3                               |
| Tables with no FKs       | 2                               |
| Most-referenced table    | `profiles` (34 FKs point to it) |
| Second most-referenced   | `institutions` (13 FKs)         |
| Third most-referenced    | `courses` (13 FKs)              |

---

## Entity Relationship Diagram (Text)

```
institutions (root)
├── departments
│   └── programs
│       ├── courses
│       │   ├── course_sections
│       │   │   ├── class_sessions
│       │   │   │   └── attendance_records
│       │   │   └── timetable_slots
│       │   ├── course_modules
│       │   │   └── course_materials
│       │   ├── assignments
│       │   │   ├── submissions
│       │   │   │   ├── grades
│       │   │   │   │   └── evidence
│       │   │   │   └── evidence
│       │   │   └── learning_path_nodes
│       │   ├── quizzes
│       │   │   ├── quiz_questions
│       │   │   └── quiz_attempts
│       │   ├── question_bank
│       │   │   ├── question_analytics
│       │   │   └── verified_explanations
│       │   ├── learning_outcomes (CLO)
│       │   │   ├── outcome_mappings (CLO→PLO)
│       │   │   ├── outcome_attainment
│       │   │   ├── baseline_attainment
│       │   │   └── rubrics
│       │   ├── discussion_threads
│       │   │   └── discussion_replies
│       │   ├── announcements
│       │   ├── journal_entries
│       │   ├── grade_categories
│       │   ├── student_courses (enrollment)
│       │   ├── social_challenges
│       │   │   └── challenge_participants
│       │   ├── baseline_test_config
│       │   ├── mastery_recovery_pathways
│       │   └── quiz_generation_logs
│       ├── fee_structures
│       │   └── fee_payments
│       ├── cqi_action_plans
│       └── program_accreditations
├── semesters
│   ├── academic_calendar_events
│   ├── courses (via semester_id)
│   ├── fee_structures
│   └── cqi_action_plans
├── institution_settings (1:1)
├── surveys
│   ├── survey_questions
│   │   └── survey_responses
│   └── survey_responses
├── onboarding_questions
│   └── onboarding_responses
├── xp_events
└── profiles (all roles)
    ├── student_gamification (1:1)
    ├── student_profiles
    ├── student_wellness_preferences (1:1)
    ├── onboarding_progress (1:1)
    ├── badges
    ├── xp_transactions
    ├── notifications
    ├── habit_tracking
    ├── wellness_habit_logs
    ├── student_activity_log
    ├── ai_feedback
    ├── goal_suggestions
    ├── micro_assessment_schedule
    ├── starter_week_sessions
    ├── parent_student_links
    └── audit_logs
```

---

## All Foreign Keys by Source Table

### `academic_calendar_events`

| FK Name                                        | Source Column    | → Target Table | Target Column | Type        |
| ---------------------------------------------- | ---------------- | -------------- | ------------- | ----------- |
| `academic_calendar_events_institution_id_fkey` | `institution_id` | `institutions` | `id`          | Many-to-one |
| `academic_calendar_events_semester_id_fkey`    | `semester_id`    | `semesters`    | `id`          | Many-to-one |

### `ai_feedback`

| FK Name                       | Source Column | → Target Table | Target Column | Type        |
| ----------------------------- | ------------- | -------------- | ------------- | ----------- |
| `ai_feedback_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `announcements`

| FK Name                        | Source Column | → Target Table | Target Column | Type        |
| ------------------------------ | ------------- | -------------- | ------------- | ----------- |
| `announcements_author_id_fkey` | `author_id`   | `profiles`     | `id`          | Many-to-one |
| `announcements_course_id_fkey` | `course_id`   | `courses`      | `id`          | Many-to-one |

### `assignments`

| FK Name                       | Source Column | → Target Table | Target Column | Type        |
| ----------------------------- | ------------- | -------------- | ------------- | ----------- |
| `assignments_course_id_fkey`  | `course_id`   | `courses`      | `id`          | Many-to-one |
| `assignments_created_by_fkey` | `created_by`  | `profiles`     | `id`          | Many-to-one |

### `attendance_records`

| FK Name                              | Source Column | → Target Table   | Target Column | Type        |
| ------------------------------------ | ------------- | ---------------- | ------------- | ----------- |
| `attendance_records_marked_by_fkey`  | `marked_by`   | `profiles`       | `id`          | Many-to-one |
| `attendance_records_session_id_fkey` | `session_id`  | `class_sessions` | `id`          | Many-to-one |
| `attendance_records_student_id_fkey` | `student_id`  | `profiles`       | `id`          | Many-to-one |

### `audit_logs`

| FK Name                    | Source Column | → Target Table | Target Column | Type        |
| -------------------------- | ------------- | -------------- | ------------- | ----------- |
| `audit_logs_actor_id_fkey` | `actor_id`    | `profiles`     | `id`          | Many-to-one |

### `badges`

| FK Name                  | Source Column | → Target Table | Target Column | Type        |
| ------------------------ | ------------- | -------------- | ------------- | ----------- |
| `badges_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `baseline_attainment`

| FK Name                               | Source Column | → Target Table      | Target Column | Type        |
| ------------------------------------- | ------------- | ------------------- | ------------- | ----------- |
| `baseline_attainment_clo_id_fkey`     | `clo_id`      | `learning_outcomes` | `id`          | Many-to-one |
| `baseline_attainment_course_id_fkey`  | `course_id`   | `courses`           | `id`          | Many-to-one |
| `baseline_attainment_student_id_fkey` | `student_id`  | `profiles`          | `id`          | Many-to-one |

### `baseline_test_config`

| FK Name                               | Source Column | → Target Table | Target Column | Type           |
| ------------------------------------- | ------------- | -------------- | ------------- | -------------- |
| `baseline_test_config_course_id_fkey` | `course_id`   | `courses`      | `id`          | **One-to-one** |

### `challenge_participants`

| FK Name                                    | Source Column  | → Target Table      | Target Column | Type        |
| ------------------------------------------ | -------------- | ------------------- | ------------- | ----------- |
| `challenge_participants_challenge_id_fkey` | `challenge_id` | `social_challenges` | `id`          | Many-to-one |

### `class_sessions`

| FK Name                          | Source Column | → Target Table    | Target Column | Type        |
| -------------------------------- | ------------- | ----------------- | ------------- | ----------- |
| `class_sessions_section_id_fkey` | `section_id`  | `course_sections` | `id`          | Many-to-one |

### `course_materials`

| FK Name                           | Source Column | → Target Table   | Target Column | Type        |
| --------------------------------- | ------------- | ---------------- | ------------- | ----------- |
| `course_materials_module_id_fkey` | `module_id`   | `course_modules` | `id`          | Many-to-one |

### `course_modules`

| FK Name                         | Source Column | → Target Table | Target Column | Type        |
| ------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `course_modules_course_id_fkey` | `course_id`   | `courses`      | `id`          | Many-to-one |

### `course_sections`

| FK Name                           | Source Column | → Target Table | Target Column | Type        |
| --------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `course_sections_course_id_fkey`  | `course_id`   | `courses`      | `id`          | Many-to-one |
| `course_sections_teacher_id_fkey` | `teacher_id`  | `profiles`     | `id`          | Many-to-one |

### `courses`

| FK Name                    | Source Column | → Target Table | Target Column | Type        |
| -------------------------- | ------------- | -------------- | ------------- | ----------- |
| `courses_program_id_fkey`  | `program_id`  | `programs`     | `id`          | Many-to-one |
| `courses_semester_id_fkey` | `semester_id` | `semesters`    | `id`          | Many-to-one |
| `courses_teacher_id_fkey`  | `teacher_id`  | `profiles`     | `id`          | Many-to-one |

### `cqi_action_plans`

| FK Name                             | Source Column | → Target Table      | Target Column | Type        |
| ----------------------------------- | ------------- | ------------------- | ------------- | ----------- |
| `cqi_action_plans_outcome_id_fkey`  | `outcome_id`  | `learning_outcomes` | `id`          | Many-to-one |
| `cqi_action_plans_program_id_fkey`  | `program_id`  | `programs`          | `id`          | Many-to-one |
| `cqi_action_plans_semester_id_fkey` | `semester_id` | `semesters`         | `id`          | Many-to-one |

### `departments`

| FK Name                                  | Source Column           | → Target Table | Target Column | Type        |
| ---------------------------------------- | ----------------------- | -------------- | ------------- | ----------- |
| `departments_head_of_department_id_fkey` | `head_of_department_id` | `profiles`     | `id`          | Many-to-one |
| `departments_institution_id_fkey`        | `institution_id`        | `institutions` | `id`          | Many-to-one |

### `discussion_replies`

| FK Name                             | Source Column | → Target Table       | Target Column | Type        |
| ----------------------------------- | ------------- | -------------------- | ------------- | ----------- |
| `discussion_replies_author_id_fkey` | `author_id`   | `profiles`           | `id`          | Many-to-one |
| `discussion_replies_thread_id_fkey` | `thread_id`   | `discussion_threads` | `id`          | Many-to-one |

### `discussion_threads`

| FK Name                             | Source Column | → Target Table | Target Column | Type        |
| ----------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `discussion_threads_author_id_fkey` | `author_id`   | `profiles`     | `id`          | Many-to-one |
| `discussion_threads_course_id_fkey` | `course_id`   | `courses`      | `id`          | Many-to-one |

### `evidence`

| FK Name                       | Source Column   | → Target Table      | Target Column | Type        |
| ----------------------------- | --------------- | ------------------- | ------------- | ----------- |
| `evidence_clo_id_fkey`        | `clo_id`        | `learning_outcomes` | `id`          | Many-to-one |
| `evidence_grade_id_fkey`      | `grade_id`      | `grades`            | `id`          | Many-to-one |
| `evidence_ilo_id_fkey`        | `ilo_id`        | `learning_outcomes` | `id`          | Many-to-one |
| `evidence_plo_id_fkey`        | `plo_id`        | `learning_outcomes` | `id`          | Many-to-one |
| `evidence_student_id_fkey`    | `student_id`    | `profiles`          | `id`          | Many-to-one |
| `evidence_submission_id_fkey` | `submission_id` | `submissions`       | `id`          | Many-to-one |

### `fee_payments`

| FK Name                              | Source Column      | → Target Table   | Target Column | Type        |
| ------------------------------------ | ------------------ | ---------------- | ------------- | ----------- |
| `fee_payments_fee_structure_id_fkey` | `fee_structure_id` | `fee_structures` | `id`          | Many-to-one |
| `fee_payments_student_id_fkey`       | `student_id`       | `profiles`       | `id`          | Many-to-one |

### `fee_structures`

| FK Name                           | Source Column | → Target Table | Target Column | Type        |
| --------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `fee_structures_program_id_fkey`  | `program_id`  | `programs`     | `id`          | Many-to-one |
| `fee_structures_semester_id_fkey` | `semester_id` | `semesters`    | `id`          | Many-to-one |

### `goal_suggestions`

| FK Name                            | Source Column | → Target Table | Target Column | Type        |
| ---------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `goal_suggestions_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `grade_categories`

| FK Name                           | Source Column | → Target Table | Target Column | Type        |
| --------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `grade_categories_course_id_fkey` | `course_id`   | `courses`      | `id`          | Many-to-one |

### `grades`

| FK Name                     | Source Column   | → Target Table | Target Column | Type           |
| --------------------------- | --------------- | -------------- | ------------- | -------------- |
| `grades_graded_by_fkey`     | `graded_by`     | `profiles`     | `id`          | Many-to-one    |
| `grades_submission_id_fkey` | `submission_id` | `submissions`  | `id`          | **One-to-one** |

### `habit_tracking`

| FK Name                          | Source Column | → Target Table | Target Column | Type        |
| -------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `habit_tracking_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `institution_settings`

| FK Name                                    | Source Column    | → Target Table | Target Column | Type           |
| ------------------------------------------ | ---------------- | -------------- | ------------- | -------------- |
| `institution_settings_institution_id_fkey` | `institution_id` | `institutions` | `id`          | **One-to-one** |

### `journal_entries`

| FK Name                           | Source Column | → Target Table      | Target Column | Type        |
| --------------------------------- | ------------- | ------------------- | ------------- | ----------- |
| `journal_entries_clo_id_fkey`     | `clo_id`      | `learning_outcomes` | `id`          | Many-to-one |
| `journal_entries_course_id_fkey`  | `course_id`   | `courses`           | `id`          | Many-to-one |
| `journal_entries_student_id_fkey` | `student_id`  | `profiles`          | `id`          | Many-to-one |

### `learning_outcomes`

| FK Name                                 | Source Column    | → Target Table | Target Column | Type        |
| --------------------------------------- | ---------------- | -------------- | ------------- | ----------- |
| `learning_outcomes_course_id_fkey`      | `course_id`      | `courses`      | `id`          | Many-to-one |
| `learning_outcomes_created_by_fkey`     | `created_by`     | `profiles`     | `id`          | Many-to-one |
| `learning_outcomes_institution_id_fkey` | `institution_id` | `institutions` | `id`          | Many-to-one |
| `learning_outcomes_program_id_fkey`     | `program_id`     | `programs`     | `id`          | Many-to-one |

### `learning_path_nodes`

| FK Name                                         | Source Column          | → Target Table        | Target Column | Type         |
| ----------------------------------------------- | ---------------------- | --------------------- | ------------- | ------------ |
| `learning_path_nodes_assignment_id_fkey`        | `assignment_id`        | `assignments`         | `id`          | Many-to-one  |
| `learning_path_nodes_course_id_fkey`            | `course_id`            | `courses`             | `id`          | Many-to-one  |
| `learning_path_nodes_prerequisite_node_id_fkey` | `prerequisite_node_id` | `learning_path_nodes` | `id`          | **Self-ref** |

### `mastery_recovery_pathways`

| FK Name                                         | Source Column    | → Target Table      | Target Column | Type        |
| ----------------------------------------------- | ---------------- | ------------------- | ------------- | ----------- |
| `mastery_recovery_pathways_clo_id_fkey`         | `clo_id`         | `learning_outcomes` | `id`          | Many-to-one |
| `mastery_recovery_pathways_course_id_fkey`      | `course_id`      | `courses`           | `id`          | Many-to-one |
| `mastery_recovery_pathways_institution_id_fkey` | `institution_id` | `institutions`      | `id`          | Many-to-one |
| `mastery_recovery_pathways_student_id_fkey`     | `student_id`     | `profiles`          | `id`          | Many-to-one |

### `micro_assessment_schedule`

| FK Name                                     | Source Column | → Target Table | Target Column | Type        |
| ------------------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `micro_assessment_schedule_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `notifications`

| FK Name                      | Source Column | → Target Table | Target Column | Type        |
| ---------------------------- | ------------- | -------------- | ------------- | ----------- |
| `notifications_user_id_fkey` | `user_id`     | `profiles`     | `id`          | Many-to-one |

### `onboarding_progress`

| FK Name                               | Source Column | → Target Table | Target Column | Type           |
| ------------------------------------- | ------------- | -------------- | ------------- | -------------- |
| `onboarding_progress_student_id_fkey` | `student_id`  | `profiles`     | `id`          | **One-to-one** |

### `onboarding_questions`

| FK Name                                    | Source Column    | → Target Table      | Target Column | Type        |
| ------------------------------------------ | ---------------- | ------------------- | ------------- | ----------- |
| `onboarding_questions_clo_id_fkey`         | `clo_id`         | `learning_outcomes` | `id`          | Many-to-one |
| `onboarding_questions_course_id_fkey`      | `course_id`      | `courses`           | `id`          | Many-to-one |
| `onboarding_questions_institution_id_fkey` | `institution_id` | `institutions`      | `id`          | Many-to-one |

### `onboarding_responses`

| FK Name                                 | Source Column | → Target Table         | Target Column | Type        |
| --------------------------------------- | ------------- | ---------------------- | ------------- | ----------- |
| `onboarding_responses_question_id_fkey` | `question_id` | `onboarding_questions` | `id`          | Many-to-one |
| `onboarding_responses_student_id_fkey`  | `student_id`  | `profiles`             | `id`          | Many-to-one |

### `outcome_attainment`

| FK Name                              | Source Column | → Target Table      | Target Column | Type        |
| ------------------------------------ | ------------- | ------------------- | ------------- | ----------- |
| `outcome_attainment_course_id_fkey`  | `course_id`   | `courses`           | `id`          | Many-to-one |
| `outcome_attainment_outcome_id_fkey` | `outcome_id`  | `learning_outcomes` | `id`          | Many-to-one |
| `outcome_attainment_student_id_fkey` | `student_id`  | `profiles`          | `id`          | Many-to-one |

### `outcome_mappings`

| FK Name                                   | Source Column       | → Target Table      | Target Column | Type        |
| ----------------------------------------- | ------------------- | ------------------- | ------------- | ----------- |
| `outcome_mappings_source_outcome_id_fkey` | `source_outcome_id` | `learning_outcomes` | `id`          | Many-to-one |
| `outcome_mappings_target_outcome_id_fkey` | `target_outcome_id` | `learning_outcomes` | `id`          | Many-to-one |

### `parent_student_links`

| FK Name                                | Source Column | → Target Table | Target Column | Type        |
| -------------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `parent_student_links_parent_id_fkey`  | `parent_id`   | `profiles`     | `id`          | Many-to-one |
| `parent_student_links_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `profiles`

| FK Name                        | Source Column    | → Target Table | Target Column | Type        |
| ------------------------------ | ---------------- | -------------- | ------------- | ----------- |
| `profiles_institution_id_fkey` | `institution_id` | `institutions` | `id`          | Many-to-one |

### `program_accreditations`

| FK Name                                  | Source Column | → Target Table | Target Column | Type        |
| ---------------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `program_accreditations_program_id_fkey` | `program_id`  | `programs`     | `id`          | Many-to-one |

### `programs`

| FK Name                        | Source Column    | → Target Table | Target Column | Type        |
| ------------------------------ | ---------------- | -------------- | ------------- | ----------- |
| `programs_coordinator_id_fkey` | `coordinator_id` | `profiles`     | `id`          | Many-to-one |
| `programs_department_id_fkey`  | `department_id`  | `departments`  | `id`          | Many-to-one |
| `programs_institution_id_fkey` | `institution_id` | `institutions` | `id`          | Many-to-one |

### `question_analytics`

| FK Name                               | Source Column | → Target Table  | Target Column | Type           |
| ------------------------------------- | ------------- | --------------- | ------------- | -------------- |
| `question_analytics_question_id_fkey` | `question_id` | `question_bank` | `id`          | **One-to-one** |

### `question_bank`

| FK Name                                 | Source Column        | → Target Table      | Target Column | Type         |
| --------------------------------------- | -------------------- | ------------------- | ------------- | ------------ |
| `question_bank_clo_id_fkey`             | `clo_id`             | `learning_outcomes` | `id`          | Many-to-one  |
| `question_bank_course_id_fkey`          | `course_id`          | `courses`           | `id`          | Many-to-one  |
| `question_bank_created_by_fkey`         | `created_by`         | `profiles`          | `id`          | Many-to-one  |
| `question_bank_institution_id_fkey`     | `institution_id`     | `institutions`      | `id`          | Many-to-one  |
| `question_bank_parent_question_id_fkey` | `parent_question_id` | `question_bank`     | `id`          | **Self-ref** |

### `quiz_attempts`

| FK Name                         | Source Column | → Target Table | Target Column | Type        |
| ------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `quiz_attempts_quiz_id_fkey`    | `quiz_id`     | `quizzes`      | `id`          | Many-to-one |
| `quiz_attempts_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `quiz_generation_logs`

| FK Name                                    | Source Column    | → Target Table | Target Column | Type        |
| ------------------------------------------ | ---------------- | -------------- | ------------- | ----------- |
| `quiz_generation_logs_course_id_fkey`      | `course_id`      | `courses`      | `id`          | Many-to-one |
| `quiz_generation_logs_institution_id_fkey` | `institution_id` | `institutions` | `id`          | Many-to-one |
| `quiz_generation_logs_teacher_id_fkey`     | `teacher_id`     | `profiles`     | `id`          | Many-to-one |

### `quiz_questions`

| FK Name                       | Source Column | → Target Table | Target Column | Type        |
| ----------------------------- | ------------- | -------------- | ------------- | ----------- |
| `quiz_questions_quiz_id_fkey` | `quiz_id`     | `quizzes`      | `id`          | Many-to-one |

### `quizzes`

| FK Name                  | Source Column | → Target Table | Target Column | Type        |
| ------------------------ | ------------- | -------------- | ------------- | ----------- |
| `quizzes_course_id_fkey` | `course_id`   | `courses`      | `id`          | Many-to-one |

### `rubric_criteria`

| FK Name                          | Source Column | → Target Table | Target Column | Type        |
| -------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `rubric_criteria_rubric_id_fkey` | `rubric_id`   | `rubrics`      | `id`          | Many-to-one |

### `rubrics`

| FK Name                   | Source Column | → Target Table      | Target Column | Type        |
| ------------------------- | ------------- | ------------------- | ------------- | ----------- |
| `rubrics_clo_id_fkey`     | `clo_id`      | `learning_outcomes` | `id`          | Many-to-one |
| `rubrics_created_by_fkey` | `created_by`  | `profiles`          | `id`          | Many-to-one |

### `semesters`

| FK Name                         | Source Column    | → Target Table | Target Column | Type        |
| ------------------------------- | ---------------- | -------------- | ------------- | ----------- |
| `semesters_institution_id_fkey` | `institution_id` | `institutions` | `id`          | Many-to-one |

### `social_challenges`

| FK Name                             | Source Column | → Target Table | Target Column | Type        |
| ----------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `social_challenges_course_id_fkey`  | `course_id`   | `courses`      | `id`          | Many-to-one |
| `social_challenges_created_by_fkey` | `created_by`  | `profiles`     | `id`          | Many-to-one |

### `starter_week_sessions`

| FK Name                                 | Source Column | → Target Table | Target Column | Type        |
| --------------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `starter_week_sessions_course_id_fkey`  | `course_id`   | `courses`      | `id`          | Many-to-one |
| `starter_week_sessions_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `student_activity_log`

| FK Name                                | Source Column | → Target Table | Target Column | Type        |
| -------------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `student_activity_log_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `student_courses`

| FK Name                           | Source Column | → Target Table    | Target Column | Type        |
| --------------------------------- | ------------- | ----------------- | ------------- | ----------- |
| `student_courses_course_id_fkey`  | `course_id`   | `courses`         | `id`          | Many-to-one |
| `student_courses_section_id_fkey` | `section_id`  | `course_sections` | `id`          | Many-to-one |
| `student_courses_student_id_fkey` | `student_id`  | `profiles`        | `id`          | Many-to-one |

### `student_gamification`

| FK Name                                | Source Column | → Target Table | Target Column | Type           |
| -------------------------------------- | ------------- | -------------- | ------------- | -------------- |
| `student_gamification_student_id_fkey` | `student_id`  | `profiles`     | `id`          | **One-to-one** |

### `student_profiles`

| FK Name                                | Source Column    | → Target Table | Target Column | Type        |
| -------------------------------------- | ---------------- | -------------- | ------------- | ----------- |
| `student_profiles_institution_id_fkey` | `institution_id` | `institutions` | `id`          | Many-to-one |
| `student_profiles_student_id_fkey`     | `student_id`     | `profiles`     | `id`          | Many-to-one |

### `student_wellness_preferences`

| FK Name                                        | Source Column | → Target Table | Target Column | Type           |
| ---------------------------------------------- | ------------- | -------------- | ------------- | -------------- |
| `student_wellness_preferences_student_id_fkey` | `student_id`  | `profiles`     | `id`          | **One-to-one** |

### `submissions`

| FK Name                          | Source Column   | → Target Table | Target Column | Type        |
| -------------------------------- | --------------- | -------------- | ------------- | ----------- |
| `submissions_assignment_id_fkey` | `assignment_id` | `assignments`  | `id`          | Many-to-one |
| `submissions_student_id_fkey`    | `student_id`    | `profiles`     | `id`          | Many-to-one |

### `survey_questions`

| FK Name                           | Source Column | → Target Table | Target Column | Type        |
| --------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `survey_questions_survey_id_fkey` | `survey_id`   | `surveys`      | `id`          | Many-to-one |

### `survey_responses`

| FK Name                               | Source Column   | → Target Table     | Target Column | Type        |
| ------------------------------------- | --------------- | ------------------ | ------------- | ----------- |
| `survey_responses_question_id_fkey`   | `question_id`   | `survey_questions` | `id`          | Many-to-one |
| `survey_responses_respondent_id_fkey` | `respondent_id` | `profiles`         | `id`          | Many-to-one |
| `survey_responses_survey_id_fkey`     | `survey_id`     | `surveys`          | `id`          | Many-to-one |

### `surveys`

| FK Name                       | Source Column    | → Target Table | Target Column | Type        |
| ----------------------------- | ---------------- | -------------- | ------------- | ----------- |
| `surveys_institution_id_fkey` | `institution_id` | `institutions` | `id`          | Many-to-one |

### `timetable_slots`

| FK Name                           | Source Column | → Target Table    | Target Column | Type        |
| --------------------------------- | ------------- | ----------------- | ------------- | ----------- |
| `timetable_slots_section_id_fkey` | `section_id`  | `course_sections` | `id`          | Many-to-one |

### `verified_explanations`

| FK Name                                     | Source Column    | → Target Table  | Target Column | Type        |
| ------------------------------------------- | ---------------- | --------------- | ------------- | ----------- |
| `verified_explanations_institution_id_fkey` | `institution_id` | `institutions`  | `id`          | Many-to-one |
| `verified_explanations_question_id_fkey`    | `question_id`    | `question_bank` | `id`          | Many-to-one |
| `verified_explanations_verified_by_fkey`    | `verified_by`    | `profiles`      | `id`          | Many-to-one |

### `wellness_habit_logs`

| FK Name                               | Source Column | → Target Table | Target Column | Type        |
| ------------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `wellness_habit_logs_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |

### `xp_events`

| FK Name                         | Source Column    | → Target Table | Target Column | Type        |
| ------------------------------- | ---------------- | -------------- | ------------- | ----------- |
| `xp_events_institution_id_fkey` | `institution_id` | `institutions` | `id`          | Many-to-one |

### `xp_transactions`

| FK Name                           | Source Column | → Target Table | Target Column | Type        |
| --------------------------------- | ------------- | -------------- | ------------- | ----------- |
| `xp_transactions_student_id_fkey` | `student_id`  | `profiles`     | `id`          | Many-to-one |
| `xp_transactions_team_id_fkey`    | `team_id`     | `teams`        | `id`          | Many-to-one |

---

## One-to-One Relationships

These relationships have a unique constraint on the FK column, ensuring exactly one child per parent.

| Child Table                    | FK Column        | Parent Table    | Notes                              |
| ------------------------------ | ---------------- | --------------- | ---------------------------------- |
| `baseline_test_config`         | `course_id`      | `courses`       | One config per course              |
| `grades`                       | `submission_id`  | `submissions`   | One grade per submission           |
| `institution_settings`         | `institution_id` | `institutions`  | One settings row per institution   |
| `onboarding_progress`          | `student_id`     | `profiles`      | One progress tracker per student   |
| `question_analytics`           | `question_id`    | `question_bank` | One analytics row per question     |
| `student_gamification`         | `student_id`     | `profiles`      | One gamification state per student |
| `student_wellness_preferences` | `student_id`     | `profiles`      | One wellness config per student    |

---

## Self-Referencing Relationships

| Table                 | FK Column              | References               | Purpose                                    |
| --------------------- | ---------------------- | ------------------------ | ------------------------------------------ |
| `learning_path_nodes` | `prerequisite_node_id` | `learning_path_nodes.id` | Prerequisite chain for assignment ordering |
| `question_bank`       | `parent_question_id`   | `question_bank.id`       | Question versioning chain                  |

---

## Many-to-Many Junction Tables

| Junction Table         | Side A                       | Side B                       | Purpose                               |
| ---------------------- | ---------------------------- | ---------------------------- | ------------------------------------- |
| `outcome_mappings`     | `learning_outcomes` (source) | `learning_outcomes` (target) | CLO↔PLO and PLO↔ILO weighted mappings |
| `student_courses`      | `profiles` (student)         | `courses`                    | Student enrollment                    |
| `parent_student_links` | `profiles` (parent)          | `profiles` (student)         | Parent-student relationships          |

---

## Tables with No Foreign Keys

| Table            | Notes                                            |
| ---------------- | ------------------------------------------------ |
| `institutions`   | Root entity — all other tables reference it      |
| `login_attempts` | Keyed by email (text PK), not linked to profiles |

---

## FK Index by Target Table

How many foreign keys point to each table (inbound references):

| Target Table           | Inbound FK Count | Referenced By                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`             | 34               | Nearly every table — central user entity                                                                                                                                                                                                                                                                                                                                            |
| `institutions`         | 13               | departments, learning_outcomes, onboarding_questions, profiles, programs, question_bank, quiz_generation_logs, semesters, surveys, xp_events, institution_settings, mastery_recovery_pathways, student_profiles, verified_explanations                                                                                                                                              |
| `courses`              | 13               | assignments, announcements, baseline_attainment, baseline_test_config, course_modules, course_sections, discussion_threads, grade_categories, journal_entries, learning_outcomes, learning_path_nodes, mastery_recovery_pathways, onboarding_questions, outcome_attainment, question_bank, quiz_generation_logs, quizzes, social_challenges, starter_week_sessions, student_courses |
| `learning_outcomes`    | 9                | baseline_attainment, cqi_action_plans, evidence (×3: clo, plo, ilo), journal_entries, onboarding_questions, outcome_attainment, outcome_mappings (×2), question_bank, rubrics                                                                                                                                                                                                       |
| `programs`             | 4                | courses, cqi_action_plans, fee_structures, program_accreditations                                                                                                                                                                                                                                                                                                                   |
| `semesters`            | 4                | academic_calendar_events, courses, cqi_action_plans, fee_structures                                                                                                                                                                                                                                                                                                                 |
| `submissions`          | 2                | evidence, grades                                                                                                                                                                                                                                                                                                                                                                    |
| `course_sections`      | 3                | class_sessions, student_courses, timetable_slots                                                                                                                                                                                                                                                                                                                                    |
| `question_bank`        | 3                | question_analytics, question_bank (self), verified_explanations                                                                                                                                                                                                                                                                                                                     |
| `quizzes`              | 2                | quiz_attempts, quiz_questions                                                                                                                                                                                                                                                                                                                                                       |
| `surveys`              | 2                | survey_questions, survey_responses                                                                                                                                                                                                                                                                                                                                                  |
| `departments`          | 1                | programs                                                                                                                                                                                                                                                                                                                                                                            |
| `assignments`          | 2                | learning_path_nodes, submissions                                                                                                                                                                                                                                                                                                                                                    |
| `class_sessions`       | 1                | attendance_records                                                                                                                                                                                                                                                                                                                                                                  |
| `course_modules`       | 1                | course_materials                                                                                                                                                                                                                                                                                                                                                                    |
| `discussion_threads`   | 1                | discussion_replies                                                                                                                                                                                                                                                                                                                                                                  |
| `fee_structures`       | 1                | fee_payments                                                                                                                                                                                                                                                                                                                                                                        |
| `grades`               | 1                | evidence                                                                                                                                                                                                                                                                                                                                                                            |
| `onboarding_questions` | 1                | onboarding_responses                                                                                                                                                                                                                                                                                                                                                                |
| `rubrics`              | 1                | rubric_criteria                                                                                                                                                                                                                                                                                                                                                                     |
| `social_challenges`    | 1                | challenge_participants                                                                                                                                                                                                                                                                                                                                                              |
| `survey_questions`     | 1                | survey_responses                                                                                                                                                                                                                                                                                                                                                                    |
| `teams`                | 1                | xp_transactions                                                                                                                                                                                                                                                                                                                                                                     |
| `learning_path_nodes`  | 1                | learning_path_nodes (self)                                                                                                                                                                                                                                                                                                                                                          |

---

> **Total**: 107 foreign key relationships across 57 tables
>
> To generate a PDF: `npx md-to-pdf docs/SUPABASE-RELATIONSHIPS-FK.md`
