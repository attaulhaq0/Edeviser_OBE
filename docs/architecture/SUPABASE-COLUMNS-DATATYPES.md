# Edeviser — Supabase Columns & Data Types Reference

> **Generated**: April 1, 2026 | **Project**: cdlgtbvxlxjpcddjazzx (Edeviser-Kiro) | **Region**: ap-northeast-1
>
> Source: `src/types/database.ts` (auto-generated from Supabase)

---

## Table of Contents

1. [Enums](#enums)
2. [Tables A–C](#tables-ac)
3. [Tables D–G](#tables-dg)
4. [Tables H–L](#tables-hl)
5. [Tables M–O](#tables-mo)
6. [Tables P–Q](#tables-pq)
7. [Tables R–S](#tables-rs)
8. [Tables T–X](#tables-tx)
9. [Views](#views)
10. [Functions](#functions)

---

## Enums

| Enum Name             | Values                                                                            |
| --------------------- | --------------------------------------------------------------------------------- |
| `assignment_type`     | `assignment`, `quiz`, `project`, `exam`                                           |
| `attainment_level`    | `excellent`, `satisfactory`, `developing`, `not_yet`                              |
| `attainment_scope`    | `student_course`, `course`, `program`, `institution`                              |
| `blooms_level`        | `remembering`, `understanding`, `applying`, `analyzing`, `evaluating`, `creating` |
| `outcome_type`        | `ILO`, `PLO`, `CLO`                                                               |
| `submission_status`   | `submitted`, `graded`                                                             |
| `user_role`           | `admin`, `coordinator`, `teacher`, `student`, `parent`                            |
| `wellness_habit_type` | `meditation`, `hydration`, `exercise`, `sleep`                                    |

---

## Tables A–C

### `academic_calendar_events`

Institution-wide calendar events (exam periods, holidays, registration deadlines).

| Column           | Type          | Nullable | Default             | Key                  | Notes                            |
| ---------------- | ------------- | -------- | ------------------- | -------------------- | -------------------------------- |
| `id`             | `uuid`        | No       | `gen_random_uuid()` | PK                   |                                  |
| `institution_id` | `uuid`        | No       | —                   | FK → institutions.id |                                  |
| `semester_id`    | `uuid`        | Yes      | `null`              | FK → semesters.id    |                                  |
| `title`          | `text`        | No       | —                   |                      | Event name                       |
| `event_type`     | `text`        | No       | —                   |                      | e.g. exam, holiday, registration |
| `start_date`     | `date`        | No       | —                   |                      |                                  |
| `end_date`       | `date`        | No       | —                   |                      |                                  |
| `is_recurring`   | `boolean`     | No       | `false`             |                      |                                  |
| `created_at`     | `timestamptz` | No       | `now()`             |                      |                                  |

### `ai_feedback`

Stores AI-generated suggestions and student feedback on them.

| Column              | Type          | Nullable | Default             | Key              | Notes                            |
| ------------------- | ------------- | -------- | ------------------- | ---------------- | -------------------------------- |
| `id`                | `uuid`        | No       | `gen_random_uuid()` | PK               |                                  |
| `student_id`        | `uuid`        | No       | —                   | FK → profiles.id |                                  |
| `suggestion_type`   | `text`        | No       | —                   |                  | Type of AI suggestion            |
| `suggestion_text`   | `text`        | No       | —                   |                  | The suggestion content           |
| `suggestion_data`   | `jsonb`       | Yes      | `null`              |                  | Structured suggestion metadata   |
| `feedback`          | `text`        | Yes      | `null`              |                  | Student's feedback on suggestion |
| `validated_outcome` | `text`        | Yes      | `null`              |                  | Whether suggestion was helpful   |
| `created_at`        | `timestamptz` | No       | `now()`             |                  |                                  |

### `announcements`

Course-level announcements posted by teachers/coordinators.

| Column          | Type          | Nullable | Default             | Key              | Notes                  |
| --------------- | ------------- | -------- | ------------------- | ---------------- | ---------------------- |
| `id`            | `uuid`        | No       | `gen_random_uuid()` | PK               |                        |
| `course_id`     | `uuid`        | No       | —                   | FK → courses.id  |                        |
| `author_id`     | `uuid`        | No       | —                   | FK → profiles.id |                        |
| `title`         | `text`        | No       | —                   |                  |                        |
| `content`       | `text`        | No       | —                   |                  | Rich text body         |
| `is_pinned`     | `boolean`     | No       | `false`             |                  |                        |
| `search_vector` | `tsvector`    | No       | auto-generated      |                  | Full-text search index |
| `created_at`    | `timestamptz` | No       | `now()`             |                  |                        |
| `updated_at`    | `timestamptz` | No       | `now()`             |                  |                        |

### `assignments`

Coursework items (assignments, quizzes, projects, exams) with CLO weights and prerequisites.

| Column              | Type              | Nullable | Default             | Key              | Notes                              |
| ------------------- | ----------------- | -------- | ------------------- | ---------------- | ---------------------------------- |
| `id`                | `uuid`            | No       | `gen_random_uuid()` | PK               |                                    |
| `course_id`         | `uuid`            | No       | —                   | FK → courses.id  |                                    |
| `created_by`        | `uuid`            | Yes      | `null`              | FK → profiles.id | Teacher who created                |
| `title`             | `text`            | No       | —                   |                  |                                    |
| `description`       | `text`            | Yes      | `null`              |                  |                                    |
| `type`              | `assignment_type` | No       | `'assignment'`      |                  | Enum: assignment/quiz/project/exam |
| `due_date`          | `timestamptz`     | No       | —                   |                  |                                    |
| `total_marks`       | `integer`         | No       | —                   |                  |                                    |
| `clo_weights`       | `jsonb`           | No       | `'{}'`              |                  | CLO → weight mapping               |
| `prerequisites`     | `jsonb`           | Yes      | `null`              |                  | Prerequisite gate config           |
| `is_late_allowed`   | `boolean`         | No       | `false`             |                  |                                    |
| `late_window_hours` | `integer`         | No       | `0`                 |                  | Hours after due date               |
| `search_vector`     | `tsvector`        | No       | auto-generated      |                  | Full-text search                   |
| `created_at`        | `timestamptz`     | No       | `now()`             |                  |                                    |

### `attendance_records`

Per-student attendance for class sessions.

| Column       | Type          | Nullable | Default             | Key                    | Notes                       |
| ------------ | ------------- | -------- | ------------------- | ---------------------- | --------------------------- |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | PK                     |                             |
| `session_id` | `uuid`        | No       | —                   | FK → class_sessions.id |                             |
| `student_id` | `uuid`        | No       | —                   | FK → profiles.id       |                             |
| `marked_by`  | `uuid`        | No       | —                   | FK → profiles.id       | Teacher who marked          |
| `status`     | `text`        | No       | —                   |                        | present/absent/late/excused |
| `created_at` | `timestamptz` | No       | `now()`             |                        |                             |

### `audit_logs`

Append-only audit trail for admin actions. **Immutable — no UPDATE/DELETE.**

| Column        | Type          | Nullable | Default             | Key              | Notes                       |
| ------------- | ------------- | -------- | ------------------- | ---------------- | --------------------------- |
| `id`          | `uuid`        | No       | `gen_random_uuid()` | PK               |                             |
| `actor_id`    | `uuid`        | No       | —                   | FK → profiles.id | Who performed action        |
| `action`      | `text`        | No       | —                   |                  | e.g. create, update, delete |
| `target_type` | `text`        | No       | —                   |                  | Entity type affected        |
| `target_id`   | `uuid`        | Yes      | `null`              |                  | Entity ID affected          |
| `diff`        | `jsonb`       | Yes      | `null`              |                  | Before/after change diff    |
| `ip_address`  | `inet`        | No       | —                   |                  | Client IP                   |
| `created_at`  | `timestamptz` | No       | `now()`             |                  |                             |

### `badges`

Earned badges for students (gamification).

| Column       | Type          | Nullable | Default             | Key              | Notes                   |
| ------------ | ------------- | -------- | ------------------- | ---------------- | ----------------------- |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | PK               |                         |
| `student_id` | `uuid`        | No       | —                   | FK → profiles.id |                         |
| `badge_key`  | `text`        | No       | —                   |                  | Unique badge identifier |
| `badge_name` | `text`        | No       | —                   |                  | Display name            |
| `emoji`      | `text`        | No       | `''`                |                  | Badge emoji icon        |
| `awarded_at` | `timestamptz` | No       | `now()`             |                  |                         |

### `baseline_attainment`

Pre-course CLO attainment scores from baseline assessments.

| Column               | Type          | Nullable | Default             | Key                       | Notes                 |
| -------------------- | ------------- | -------- | ------------------- | ------------------------- | --------------------- |
| `id`                 | `uuid`        | No       | `gen_random_uuid()` | PK                        |                       |
| `student_id`         | `uuid`        | No       | —                   | FK → profiles.id          |                       |
| `course_id`          | `uuid`        | No       | —                   | FK → courses.id           |                       |
| `clo_id`             | `uuid`        | No       | —                   | FK → learning_outcomes.id |                       |
| `score`              | `numeric`     | No       | —                   |                           | Attainment percentage |
| `correct_count`      | `integer`     | No       | —                   |                           |                       |
| `question_count`     | `integer`     | No       | —                   |                           |                       |
| `assessment_version` | `integer`     | No       | `1`                 |                           | Reassessment tracking |
| `created_at`         | `timestamptz` | No       | `now()`             |                           |                       |

### `baseline_test_config`

Per-course configuration for baseline assessments.

| Column                  | Type          | Nullable | Default             | Key             | Notes          |
| ----------------------- | ------------- | -------- | ------------------- | --------------- | -------------- |
| `id`                    | `uuid`        | No       | `gen_random_uuid()` | PK              |                |
| `course_id`             | `uuid`        | No       | —                   | FK → courses.id | **One-to-one** |
| `time_limit_minutes`    | `integer`     | No       | `30`                |                 |                |
| `min_questions_per_clo` | `integer`     | No       | `3`                 |                 |                |
| `is_active`             | `boolean`     | No       | `true`              |                 |                |
| `created_at`            | `timestamptz` | No       | `now()`             |                 |                |
| `updated_at`            | `timestamptz` | No       | `now()`             |                 |                |

### `challenge_participants`

Tracks individual/team participation and progress in social challenges.

| Column             | Type          | Nullable | Default             | Key                       | Notes               |
| ------------------ | ------------- | -------- | ------------------- | ------------------------- | ------------------- |
| `id`               | `uuid`        | No       | `gen_random_uuid()` | PK                        |                     |
| `challenge_id`     | `uuid`        | No       | —                   | FK → social_challenges.id |                     |
| `participant_id`   | `uuid`        | No       | —                   |                           | Student or team ID  |
| `participant_type` | `text`        | No       | —                   |                           | 'student' or 'team' |
| `current_progress` | `numeric`     | No       | `0`                 |                           |                     |
| `created_at`       | `timestamptz` | No       | `now()`             |                           |                     |

### `class_sessions`

Individual class meetings within a course section.

| Column         | Type          | Nullable | Default             | Key                     | Notes                |
| -------------- | ------------- | -------- | ------------------- | ----------------------- | -------------------- |
| `id`           | `uuid`        | No       | `gen_random_uuid()` | PK                      |                      |
| `section_id`   | `uuid`        | No       | —                   | FK → course_sections.id |                      |
| `session_date` | `date`        | No       | —                   |                         |                      |
| `session_type` | `text`        | No       | —                   |                         | lecture/lab/tutorial |
| `topic`        | `text`        | Yes      | `null`              |                         |                      |
| `created_at`   | `timestamptz` | No       | `now()`             |                         |                      |

### `course_materials`

Learning materials (files, links, videos) within course modules.

| Column          | Type          | Nullable | Default             | Key                    | Notes                    |
| --------------- | ------------- | -------- | ------------------- | ---------------------- | ------------------------ |
| `id`            | `uuid`        | No       | `gen_random_uuid()` | PK                     |                          |
| `module_id`     | `uuid`        | No       | —                   | FK → course_modules.id |                          |
| `title`         | `text`        | No       | —                   |                        |                          |
| `description`   | `text`        | Yes      | `null`              |                        |                          |
| `type`          | `text`        | No       | —                   |                        | file/link/video/document |
| `file_path`     | `text`        | Yes      | `null`              |                        | Storage bucket path      |
| `content_url`   | `text`        | Yes      | `null`              |                        | External URL             |
| `clo_ids`       | `jsonb`       | Yes      | `null`              |                        | Linked CLOs              |
| `sort_order`    | `integer`     | No       | `0`                 |                        |                          |
| `is_published`  | `boolean`     | No       | `false`             |                        |                          |
| `search_vector` | `tsvector`    | No       | auto-generated      |                        |                          |
| `created_at`    | `timestamptz` | No       | `now()`             |                        |                          |

### `course_modules`

Organizational units within a course (chapters/units).

| Column         | Type          | Nullable | Default             | Key             | Notes |
| -------------- | ------------- | -------- | ------------------- | --------------- | ----- |
| `id`           | `uuid`        | No       | `gen_random_uuid()` | PK              |       |
| `course_id`    | `uuid`        | No       | —                   | FK → courses.id |       |
| `title`        | `text`        | No       | —                   |                 |       |
| `description`  | `text`        | Yes      | `null`              |                 |       |
| `sort_order`   | `integer`     | No       | `0`                 |                 |       |
| `is_published` | `boolean`     | No       | `false`             |                 |       |
| `created_at`   | `timestamptz` | No       | `now()`             |                 |       |

### `course_sections`

Sections within a course, each assigned to a teacher.

| Column         | Type          | Nullable | Default             | Key              | Notes         |
| -------------- | ------------- | -------- | ------------------- | ---------------- | ------------- |
| `id`           | `uuid`        | No       | `gen_random_uuid()` | PK               |               |
| `course_id`    | `uuid`        | No       | —                   | FK → courses.id  |               |
| `teacher_id`   | `uuid`        | No       | —                   | FK → profiles.id |               |
| `section_code` | `text`        | No       | —                   |                  | e.g. "A", "B" |
| `capacity`     | `integer`     | No       | `30`                |                  |               |
| `is_active`    | `boolean`     | No       | `true`              |                  |               |
| `created_at`   | `timestamptz` | No       | `now()`             |                  |               |

### `courses`

Academic courses belonging to a program.

| Column          | Type          | Nullable | Default             | Key               | Notes                |
| --------------- | ------------- | -------- | ------------------- | ----------------- | -------------------- |
| `id`            | `uuid`        | No       | `gen_random_uuid()` | PK                |                      |
| `program_id`    | `uuid`        | No       | —                   | FK → programs.id  |                      |
| `semester_id`   | `uuid`        | Yes      | `null`              | FK → semesters.id |                      |
| `teacher_id`    | `uuid`        | Yes      | `null`              | FK → profiles.id  | Primary teacher      |
| `code`          | `text`        | No       | —                   |                   | e.g. "CS101"         |
| `name`          | `text`        | No       | —                   |                   |                      |
| `semester`      | `text`        | No       | —                   |                   | Legacy semester text |
| `academic_year` | `text`        | No       | —                   |                   | e.g. "2025-2026"     |
| `is_active`     | `boolean`     | No       | `true`              |                   |                      |
| `search_vector` | `tsvector`    | No       | auto-generated      |                   |                      |
| `created_at`    | `timestamptz` | No       | `now()`             |                   |                      |

### `cqi_action_plans`

Continuous Quality Improvement action plans for outcome gaps.

| Column                | Type          | Nullable | Default             | Key                       | Notes                                   |
| --------------------- | ------------- | -------- | ------------------- | ------------------------- | --------------------------------------- |
| `id`                  | `uuid`        | No       | `gen_random_uuid()` | PK                        |                                         |
| `program_id`          | `uuid`        | No       | —                   | FK → programs.id          |                                         |
| `semester_id`         | `uuid`        | No       | —                   | FK → semesters.id         |                                         |
| `outcome_id`          | `uuid`        | No       | —                   | FK → learning_outcomes.id |                                         |
| `outcome_type`        | `text`        | No       | —                   |                           | ILO/PLO/CLO                             |
| `action_description`  | `text`        | No       | —                   |                           | Corrective action                       |
| `responsible_person`  | `text`        | No       | —                   |                           |                                         |
| `baseline_attainment` | `numeric`     | No       | —                   |                           | Before CQI                              |
| `target_attainment`   | `numeric`     | No       | —                   |                           | Goal                                    |
| `result_attainment`   | `numeric`     | Yes      | `null`              |                           | After CQI                               |
| `status`              | `text`        | No       | `'planned'`         |                           | planned/in_progress/completed/evaluated |
| `created_at`          | `timestamptz` | No       | `now()`             |                           |                                         |
| `updated_at`          | `timestamptz` | No       | `now()`             |                           |                                         |

---

## Tables D–G

### `departments`

Organizational departments within an institution.

| Column                  | Type          | Nullable | Default             | Key                  | Notes           |
| ----------------------- | ------------- | -------- | ------------------- | -------------------- | --------------- |
| `id`                    | `uuid`        | No       | `gen_random_uuid()` | PK                   |                 |
| `institution_id`        | `uuid`        | No       | —                   | FK → institutions.id |                 |
| `head_of_department_id` | `uuid`        | Yes      | `null`              | FK → profiles.id     |                 |
| `name`                  | `text`        | No       | —                   |                      |                 |
| `code`                  | `text`        | No       | —                   |                      | e.g. "CS", "EE" |
| `created_at`            | `timestamptz` | No       | `now()`             |                      |                 |

### `discussion_replies`

Replies within discussion threads.

| Column       | Type          | Nullable | Default             | Key                        | Notes                     |
| ------------ | ------------- | -------- | ------------------- | -------------------------- | ------------------------- |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | PK                         |                           |
| `thread_id`  | `uuid`        | No       | —                   | FK → discussion_threads.id |                           |
| `author_id`  | `uuid`        | No       | —                   | FK → profiles.id           |                           |
| `content`    | `text`        | No       | —                   |                            |                           |
| `is_answer`  | `boolean`     | No       | `false`             |                            | Marked as accepted answer |
| `created_at` | `timestamptz` | No       | `now()`             |                            |                           |

### `discussion_threads`

Course-level discussion forum threads.

| Column        | Type          | Nullable | Default             | Key              | Notes |
| ------------- | ------------- | -------- | ------------------- | ---------------- | ----- |
| `id`          | `uuid`        | No       | `gen_random_uuid()` | PK               |       |
| `course_id`   | `uuid`        | No       | —                   | FK → courses.id  |       |
| `author_id`   | `uuid`        | No       | —                   | FK → profiles.id |       |
| `title`       | `text`        | No       | —                   |                  |       |
| `content`     | `text`        | No       | —                   |                  |       |
| `is_pinned`   | `boolean`     | No       | `false`             |                  |       |
| `is_resolved` | `boolean`     | No       | `false`             |                  |       |
| `created_at`  | `timestamptz` | No       | `now()`             |                  |       |

### `evidence`

Immutable evidence records linking grades to CLO/PLO/ILO attainment. **Append-only — no UPDATE/DELETE.**

| Column             | Type               | Nullable | Default             | Key                       | Notes                                           |
| ------------------ | ------------------ | -------- | ------------------- | ------------------------- | ----------------------------------------------- |
| `id`               | `uuid`             | No       | `gen_random_uuid()` | PK                        |                                                 |
| `student_id`       | `uuid`             | No       | —                   | FK → profiles.id          |                                                 |
| `submission_id`    | `uuid`             | No       | —                   | FK → submissions.id       |                                                 |
| `grade_id`         | `uuid`             | No       | —                   | FK → grades.id            |                                                 |
| `clo_id`           | `uuid`             | No       | —                   | FK → learning_outcomes.id |                                                 |
| `plo_id`           | `uuid`             | No       | —                   | FK → learning_outcomes.id |                                                 |
| `ilo_id`           | `uuid`             | No       | —                   | FK → learning_outcomes.id |                                                 |
| `score_percent`    | `numeric`          | No       | —                   |                           | 0–100                                           |
| `attainment_level` | `attainment_level` | No       | —                   |                           | Enum: excellent/satisfactory/developing/not_yet |
| `created_at`       | `timestamptz`      | No       | `now()`             |                           |                                                 |

### `fee_payments`

Student fee payment records.

| Column             | Type          | Nullable | Default             | Key                    | Notes                      |
| ------------------ | ------------- | -------- | ------------------- | ---------------------- | -------------------------- |
| `id`               | `uuid`        | No       | `gen_random_uuid()` | PK                     |                            |
| `student_id`       | `uuid`        | No       | —                   | FK → profiles.id       |                            |
| `fee_structure_id` | `uuid`        | No       | —                   | FK → fee_structures.id |                            |
| `amount_paid`      | `numeric`     | No       | —                   |                        |                            |
| `payment_date`     | `date`        | No       | —                   |                        |                            |
| `payment_method`   | `text`        | Yes      | `null`              |                        |                            |
| `receipt_number`   | `text`        | Yes      | `null`              |                        |                            |
| `status`           | `text`        | No       | `'pending'`         |                        | pending/completed/refunded |
| `created_at`       | `timestamptz` | No       | `now()`             |                        |                            |

### `fee_structures`

Fee definitions per program per semester.

| Column        | Type          | Nullable | Default             | Key               | Notes                    |
| ------------- | ------------- | -------- | ------------------- | ----------------- | ------------------------ |
| `id`          | `uuid`        | No       | `gen_random_uuid()` | PK                |                          |
| `program_id`  | `uuid`        | No       | —                   | FK → programs.id  |                          |
| `semester_id` | `uuid`        | No       | —                   | FK → semesters.id |                          |
| `fee_type`    | `text`        | No       | —                   |                   | tuition/lab/library/etc. |
| `amount`      | `numeric`     | No       | —                   |                   |                          |
| `currency`    | `text`        | No       | `'USD'`             |                   |                          |
| `due_date`    | `date`        | No       | —                   |                   |                          |
| `created_at`  | `timestamptz` | No       | `now()`             |                   |                          |

### `goal_suggestions`

AI-generated SMART goal suggestions for students.

| Column                   | Type          | Nullable | Default             | Key              | Notes                                  |
| ------------------------ | ------------- | -------- | ------------------- | ---------------- | -------------------------------------- |
| `id`                     | `uuid`        | No       | `gen_random_uuid()` | PK               |                                        |
| `student_id`             | `uuid`        | No       | —                   | FK → profiles.id |                                        |
| `goal_text`              | `text`        | No       | —                   |                  |                                        |
| `difficulty`             | `text`        | No       | —                   |                  | easy/medium/hard                       |
| `week_start`             | `date`        | No       | —                   |                  | Week the goal targets                  |
| `status`                 | `text`        | No       | `'suggested'`       |                  | suggested/accepted/completed/dismissed |
| `smart_specific`         | `text`        | Yes      | `null`              |                  | SMART breakdown                        |
| `smart_measurable`       | `text`        | Yes      | `null`              |                  |                                        |
| `smart_achievable`       | `text`        | Yes      | `null`              |                  |                                        |
| `smart_relevant`         | `text`        | Yes      | `null`              |                  |                                        |
| `smart_timebound`        | `text`        | Yes      | `null`              |                  |                                        |
| `cohort_completion_rate` | `numeric`     | Yes      | `null`              |                  | % of cohort who completed similar      |
| `created_at`             | `timestamptz` | No       | `now()`             |                  |                                        |

### `grade_categories`

Weighted grade categories within a course (e.g., Midterm 30%, Final 40%).

| Column           | Type          | Nullable | Default             | Key             | Notes                      |
| ---------------- | ------------- | -------- | ------------------- | --------------- | -------------------------- |
| `id`             | `uuid`        | No       | `gen_random_uuid()` | PK              |                            |
| `course_id`      | `uuid`        | No       | —                   | FK → courses.id |                            |
| `name`           | `text`        | No       | —                   |                 |                            |
| `weight_percent` | `numeric`     | No       | —                   |                 | Must sum to 100 per course |
| `sort_order`     | `integer`     | No       | `0`                 |                 |                            |
| `created_at`     | `timestamptz` | No       | `now()`             |                 |                            |

### `grades`

Grading records for submissions, including rubric selections.

| Column              | Type          | Nullable | Default             | Key                 | Notes                    |
| ------------------- | ------------- | -------- | ------------------- | ------------------- | ------------------------ |
| `id`                | `uuid`        | No       | `gen_random_uuid()` | PK                  |                          |
| `submission_id`     | `uuid`        | No       | —                   | FK → submissions.id | **One-to-one**           |
| `graded_by`         | `uuid`        | No       | —                   | FK → profiles.id    | Teacher                  |
| `total_score`       | `numeric`     | No       | —                   |                     | Raw score                |
| `score_percent`     | `numeric`     | No       | —                   |                     | 0–100                    |
| `rubric_selections` | `jsonb`       | No       | `'{}'`              |                     | Per-criterion selections |
| `overall_feedback`  | `text`        | Yes      | `null`              |                     |                          |
| `graded_at`         | `timestamptz` | No       | `now()`             |                     |                          |

---

## Tables H–L

### `habit_tracking`

Daily habit completion tracking (legacy — see also `wellness_habit_logs`).

| Column           | Type          | Nullable | Default             | Key              | Notes             |
| ---------------- | ------------- | -------- | ------------------- | ---------------- | ----------------- |
| `id`             | `uuid`        | No       | `gen_random_uuid()` | PK               |                   |
| `student_id`     | `uuid`        | No       | —                   | FK → profiles.id |                   |
| `habit_date`     | `date`        | No       | —                   |                  |                   |
| `login`          | `boolean`     | No       | `false`             |                  |                   |
| `submit`         | `boolean`     | No       | `false`             |                  |                   |
| `journal`        | `boolean`     | No       | `false`             |                  |                   |
| `read_content`   | `boolean`     | No       | `false`             |                  |                   |
| `is_perfect_day` | `boolean`     | No       | `false`             |                  | All 4 habits done |
| `created_at`     | `timestamptz` | No       | `now()`             |                  |                   |

### `institution_settings`

Per-institution configuration (attainment thresholds, grade scales, etc.).

| Column                  | Type          | Nullable | Default             | Key                  | Notes                                             |
| ----------------------- | ------------- | -------- | ------------------- | -------------------- | ------------------------------------------------- |
| `id`                    | `uuid`        | No       | `gen_random_uuid()` | PK                   |                                                   |
| `institution_id`        | `uuid`        | No       | —                   | FK → institutions.id | **One-to-one**                                    |
| `attainment_thresholds` | `jsonb`       | No       | default thresholds  |                      | {excellent: 85, satisfactory: 70, developing: 50} |
| `success_threshold`     | `numeric`     | No       | `70`                |                      | % for "meeting expectations"                      |
| `grade_scales`          | `jsonb`       | No       | `'{}'`              |                      | Custom grade scale config                         |
| `accreditation_body`    | `text`        | No       | `''`                |                      | e.g. ABET, AACSB                                  |
| `wellness_xp_amount`    | `integer`     | No       | `10`                |                      | XP per wellness habit                             |
| `created_at`            | `timestamptz` | No       | `now()`             |                      |                                                   |

### `institutions`

Top-level institution entities. Root of the multi-tenant hierarchy.

| Column               | Type          | Nullable | Default             | Key | Notes            |
| -------------------- | ------------- | -------- | ------------------- | --- | ---------------- |
| `id`                 | `uuid`        | No       | `gen_random_uuid()` | PK  |                  |
| `name`               | `text`        | No       | —                   |     |                  |
| `logo_url`           | `text`        | Yes      | `null`              |     |                  |
| `accreditation_body` | `text`        | Yes      | `null`              |     |                  |
| `settings`           | `jsonb`       | No       | `'{}'`              |     | General settings |
| `created_at`         | `timestamptz` | No       | `now()`             |     |                  |

### `journal_entries`

Student reflective journal entries linked to courses and CLOs.

| Column       | Type          | Nullable | Default             | Key                       | Notes              |
| ------------ | ------------- | -------- | ------------------- | ------------------------- | ------------------ |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | PK                        |                    |
| `student_id` | `uuid`        | No       | —                   | FK → profiles.id          |                    |
| `course_id`  | `uuid`        | No       | —                   | FK → courses.id           |                    |
| `clo_id`     | `uuid`        | Yes      | `null`              | FK → learning_outcomes.id | Optional CLO link  |
| `content`    | `text`        | No       | —                   |                           | ≥50 words for XP   |
| `is_shared`  | `boolean`     | No       | `false`             |                           | Visible to teacher |
| `created_at` | `timestamptz` | No       | `now()`             |                           |                    |

### `learning_outcomes`

Unified table for ILOs, PLOs, and CLOs (polymorphic via `type` column).

| Column           | Type           | Nullable | Default             | Key                  | Notes             |
| ---------------- | -------------- | -------- | ------------------- | -------------------- | ----------------- |
| `id`             | `uuid`         | No       | `gen_random_uuid()` | PK                   |                   |
| `institution_id` | `uuid`         | No       | —                   | FK → institutions.id |                   |
| `program_id`     | `uuid`         | Yes      | `null`              | FK → programs.id     | Set for PLO/CLO   |
| `course_id`      | `uuid`         | Yes      | `null`              | FK → courses.id      | Set for CLO only  |
| `created_by`     | `uuid`         | Yes      | `null`              | FK → profiles.id     |                   |
| `type`           | `outcome_type` | No       | —                   |                      | Enum: ILO/PLO/CLO |
| `title`          | `text`         | No       | —                   |                      |                   |
| `description`    | `text`         | Yes      | `null`              |                      |                   |
| `blooms_level`   | `blooms_level` | Yes      | `null`              |                      | CLOs only — enum  |
| `sort_order`     | `integer`      | No       | `0`                 |                      |                   |
| `created_at`     | `timestamptz`  | No       | `now()`             |                      |                   |
| `updated_at`     | `timestamptz`  | No       | `now()`             |                      |                   |

### `learning_path_nodes`

Ordered assignment nodes in a course learning path with prerequisite gating.

| Column                 | Type          | Nullable | Default             | Key                         | Notes                    |
| ---------------------- | ------------- | -------- | ------------------- | --------------------------- | ------------------------ |
| `id`                   | `uuid`        | No       | `gen_random_uuid()` | PK                          |                          |
| `course_id`            | `uuid`        | No       | —                   | FK → courses.id             |                          |
| `assignment_id`        | `uuid`        | No       | —                   | FK → assignments.id         |                          |
| `prerequisite_node_id` | `uuid`        | Yes      | `null`              | FK → learning_path_nodes.id | Self-referencing         |
| `sort_order`           | `integer`     | No       | `0`                 |                             |                          |
| `unlock_threshold`     | `numeric`     | No       | `70`                |                             | % needed on prerequisite |
| `created_at`           | `timestamptz` | No       | `now()`             |                             |                          |

### `login_attempts`

Rate-limiting table for login attempts (no FK — keyed by email).

| Column          | Type          | Nullable | Default | Key | Notes                |
| --------------- | ------------- | -------- | ------- | --- | -------------------- |
| `email`         | `text`        | No       | —       | PK  |                      |
| `attempt_count` | `integer`     | No       | `0`     |     |                      |
| `locked_until`  | `timestamptz` | Yes      | `null`  |     | Account lockout time |
| `updated_at`    | `timestamptz` | No       | `now()` |     |                      |

---

## Tables M–O

### `mastery_recovery_pathways`

Tracks student recovery pathways when CLO mastery fails.

| Column                       | Type          | Nullable | Default             | Key                       | Notes                    |
| ---------------------------- | ------------- | -------- | ------------------- | ------------------------- | ------------------------ |
| `id`                         | `uuid`        | No       | `gen_random_uuid()` | PK                        |                          |
| `student_id`                 | `uuid`        | No       | —                   | FK → profiles.id          |                          |
| `course_id`                  | `uuid`        | No       | —                   | FK → courses.id           |                          |
| `clo_id`                     | `uuid`        | No       | —                   | FK → learning_outcomes.id |                          |
| `institution_id`             | `uuid`        | No       | —                   | FK → institutions.id      |                          |
| `failure_count`              | `integer`     | No       | `0`                 |                           | Times failed mastery     |
| `status`                     | `text`        | No       | `'active'`          |                           | active/completed/expired |
| `activated_at`               | `timestamptz` | No       | `now()`             |                           |                          |
| `completed_at`               | `timestamptz` | Yes      | `null`              |                           |                          |
| `expired_at`                 | `timestamptz` | Yes      | `null`              |                           |                          |
| `practice_completed`         | `boolean`     | No       | `false`             |                           |                          |
| `practice_completed_at`      | `timestamptz` | Yes      | `null`              |                           |                          |
| `ai_tutor_completed`         | `boolean`     | No       | `false`             |                           |                          |
| `ai_tutor_completed_at`      | `timestamptz` | Yes      | `null`              |                           |                          |
| `peer_suggestion_shown`      | `boolean`     | No       | `false`             |                           |                          |
| `peer_suggestion_applicable` | `boolean`     | No       | `false`             |                           |                          |
| `retry_quiz_attempt_id`      | `uuid`        | Yes      | `null`              |                           |                          |
| `retry_outcome`              | `text`        | Yes      | `null`              |                           | pass/fail                |
| `created_at`                 | `timestamptz` | No       | `now()`             |                           |                          |
| `updated_at`                 | `timestamptz` | No       | `now()`             |                           |                          |

### `micro_assessment_schedule`

Scheduled micro-assessments during onboarding (days 2–7).

| Column            | Type          | Nullable | Default             | Key              | Notes                       |
| ----------------- | ------------- | -------- | ------------------- | ---------------- | --------------------------- |
| `id`              | `uuid`        | No       | `gen_random_uuid()` | PK               |                             |
| `student_id`      | `uuid`        | No       | —                   | FK → profiles.id |                             |
| `assessment_type` | `text`        | No       | —                   |                  |                             |
| `scheduled_day`   | `integer`     | No       | —                   |                  | Day number (2–7)            |
| `scheduled_at`    | `timestamptz` | No       | —                   |                  |                             |
| `completed_at`    | `timestamptz` | Yes      | `null`              |                  |                             |
| `status`          | `text`        | No       | `'pending'`         |                  | pending/completed/dismissed |
| `dismissal_count` | `integer`     | No       | `0`                 |                  |                             |
| `question_ids`    | `text[]`      | No       | `'{}'`              |                  | Array of question UUIDs     |
| `created_at`      | `timestamptz` | No       | `now()`             |                  |                             |

### `notifications`

In-app notifications for all users.

| Column       | Type          | Nullable | Default             | Key              | Notes                      |
| ------------ | ------------- | -------- | ------------------- | ---------------- | -------------------------- |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | PK               |                            |
| `user_id`    | `uuid`        | No       | —                   | FK → profiles.id |                            |
| `type`       | `text`        | No       | —                   |                  | badge/xp/streak/grade/etc. |
| `title`      | `text`        | No       | —                   |                  |                            |
| `body`       | `text`        | Yes      | `null`              |                  |                            |
| `metadata`   | `jsonb`       | Yes      | `null`              |                  | Extra data for deep links  |
| `is_read`    | `boolean`     | No       | `false`             |                  |                            |
| `created_at` | `timestamptz` | No       | `now()`             |                  |                            |

### `onboarding_progress`

Tracks student onboarding wizard completion state.

| Column                        | Type          | Nullable | Default             | Key              | Notes                       |
| ----------------------------- | ------------- | -------- | ------------------- | ---------------- | --------------------------- |
| `id`                          | `uuid`        | No       | `gen_random_uuid()` | PK               |                             |
| `student_id`                  | `uuid`        | No       | —                   | FK → profiles.id | **One-to-one**              |
| `current_step`                | `text`        | No       | `'welcome'`         |                  | Current wizard step         |
| `personality_completed`       | `boolean`     | No       | `false`             |                  | Big Five done               |
| `learning_style_completed`    | `boolean`     | No       | `false`             |                  | VARK done                   |
| `self_efficacy_completed`     | `boolean`     | No       | `false`             |                  |                             |
| `study_strategy_completed`    | `boolean`     | No       | `false`             |                  |                             |
| `baseline_completed`          | `boolean`     | No       | `false`             |                  |                             |
| `day1_completed`              | `boolean`     | No       | `false`             |                  |                             |
| `baseline_course_ids`         | `text[]`      | Yes      | `null`              |                  | Courses with baseline tests |
| `skipped_sections`            | `text[]`      | Yes      | `null`              |                  |                             |
| `profile_completeness`        | `numeric`     | No       | `0`                 |                  | 0–100                       |
| `assessment_version`          | `integer`     | No       | `1`                 |                  |                             |
| `micro_assessment_day`        | `integer`     | No       | `0`                 |                  |                             |
| `micro_assessment_dismissals` | `integer`     | No       | `0`                 |                  |                             |
| `created_at`                  | `timestamptz` | No       | `now()`             |                  |                             |
| `updated_at`                  | `timestamptz` | No       | `now()`             |                  |                             |

### `onboarding_questions`

Question bank for onboarding assessments (personality, learning style, baseline, etc.).

| Column             | Type          | Nullable | Default             | Key                       | Notes                                                            |
| ------------------ | ------------- | -------- | ------------------- | ------------------------- | ---------------------------------------------------------------- |
| `id`               | `uuid`        | No       | `gen_random_uuid()` | PK                        |                                                                  |
| `institution_id`   | `uuid`        | No       | —                   | FK → institutions.id      |                                                                  |
| `course_id`        | `uuid`        | Yes      | `null`              | FK → courses.id           | For baseline questions                                           |
| `clo_id`           | `uuid`        | Yes      | `null`              | FK → learning_outcomes.id | For baseline questions                                           |
| `assessment_type`  | `text`        | No       | —                   |                           | personality/learning_style/self_efficacy/study_strategy/baseline |
| `dimension`        | `text`        | Yes      | `null`              |                           | e.g. openness, visual, etc.                                      |
| `question_text`    | `text`        | No       | —                   |                           |                                                                  |
| `options`          | `jsonb`       | Yes      | `null`              |                           | Answer options                                                   |
| `correct_option`   | `integer`     | Yes      | `null`              |                           | For baseline only                                                |
| `difficulty_level` | `text`        | Yes      | `null`              |                           |                                                                  |
| `weight`           | `numeric`     | Yes      | `null`              |                           | Scoring weight                                                   |
| `sort_order`       | `integer`     | No       | `0`                 |                           |                                                                  |
| `is_active`        | `boolean`     | No       | `true`              |                           |                                                                  |
| `created_at`       | `timestamptz` | No       | `now()`             |                           |                                                                  |
| `updated_at`       | `timestamptz` | No       | `now()`             |                           |                                                                  |

### `onboarding_responses`

Student answers to onboarding questions.

| Column               | Type          | Nullable | Default             | Key                          | Notes            |
| -------------------- | ------------- | -------- | ------------------- | ---------------------------- | ---------------- |
| `id`                 | `uuid`        | No       | `gen_random_uuid()` | PK                           |                  |
| `student_id`         | `uuid`        | No       | —                   | FK → profiles.id             |                  |
| `question_id`        | `uuid`        | No       | —                   | FK → onboarding_questions.id |                  |
| `selected_option`    | `integer`     | No       | —                   |                              | 0-indexed option |
| `score_contribution` | `numeric`     | Yes      | `null`              |                              | Calculated score |
| `assessment_version` | `integer`     | No       | `1`                 |                              |                  |
| `created_at`         | `timestamptz` | No       | `now()`             |                              |                  |

### `outcome_attainment`

Calculated attainment percentages per outcome per student (UPSERT pattern).

| Column               | Type               | Nullable | Default             | Key                       | Notes                                           |
| -------------------- | ------------------ | -------- | ------------------- | ------------------------- | ----------------------------------------------- |
| `id`                 | `uuid`             | No       | `gen_random_uuid()` | PK                        |                                                 |
| `outcome_id`         | `uuid`             | No       | —                   | FK → learning_outcomes.id |                                                 |
| `student_id`         | `uuid`             | Yes      | `null`              | FK → profiles.id          | Null for aggregate                              |
| `course_id`          | `uuid`             | Yes      | `null`              | FK → courses.id           |                                                 |
| `scope`              | `attainment_scope` | No       | —                   |                           | Enum: student_course/course/program/institution |
| `attainment_percent` | `numeric`          | No       | `0`                 |                           | 0–100                                           |
| `sample_count`       | `integer`          | No       | `0`                 |                           | Evidence count                                  |
| `last_calculated_at` | `timestamptz`      | No       | `now()`             |                           |                                                 |

### `outcome_mappings`

Weighted mappings between outcomes (CLO→PLO, PLO→ILO). Many-to-many.

| Column              | Type          | Nullable | Default             | Key                       | Notes                            |
| ------------------- | ------------- | -------- | ------------------- | ------------------------- | -------------------------------- |
| `id`                | `uuid`        | No       | `gen_random_uuid()` | PK                        |                                  |
| `source_outcome_id` | `uuid`        | No       | —                   | FK → learning_outcomes.id | Child (CLO or PLO)               |
| `target_outcome_id` | `uuid`        | No       | —                   | FK → learning_outcomes.id | Parent (PLO or ILO)              |
| `weight`            | `numeric`     | No       | `0`                 |                           | Must sum to 100 per child→parent |
| `created_at`        | `timestamptz` | No       | `now()`             |                           |                                  |

---

## Tables P–Q

### `parent_student_links`

Links parent accounts to student accounts.

| Column         | Type          | Nullable | Default             | Key              | Notes                  |
| -------------- | ------------- | -------- | ------------------- | ---------------- | ---------------------- |
| `id`           | `uuid`        | No       | `gen_random_uuid()` | PK               |                        |
| `parent_id`    | `uuid`        | No       | —                   | FK → profiles.id |                        |
| `student_id`   | `uuid`        | No       | —                   | FK → profiles.id |                        |
| `relationship` | `text`        | No       | —                   |                  | father/mother/guardian |
| `verified`     | `boolean`     | No       | `false`             |                  | Admin-verified link    |
| `created_at`   | `timestamptz` | No       | `now()`             |                  |                        |

### `profiles`

User profiles linked to Supabase Auth. Central user table for all roles.

| Column                     | Type          | Nullable | Default        | Key                  | Notes                                          |
| -------------------------- | ------------- | -------- | -------------- | -------------------- | ---------------------------------------------- |
| `id`                       | `uuid`        | No       | —              | PK                   | Matches auth.users.id                          |
| `institution_id`           | `uuid`        | No       | —              | FK → institutions.id |                                                |
| `email`                    | `text`        | No       | —              |                      |                                                |
| `full_name`                | `text`        | No       | —              |                      |                                                |
| `role`                     | `user_role`   | No       | `'student'`    |                      | Enum: admin/coordinator/teacher/student/parent |
| `avatar_url`               | `text`        | Yes      | `null`         |                      | Storage bucket URL                             |
| `is_active`                | `boolean`     | No       | `true`         |                      | Soft delete                                    |
| `language_preference`      | `text`        | No       | `'en'`         |                      | i18n                                           |
| `theme_preference`         | `text`        | No       | `'light'`      |                      | light/dark/system                              |
| `notification_preferences` | `jsonb`       | No       | `'{}'`         |                      | Per-channel prefs                              |
| `onboarding_completed`     | `boolean`     | No       | `false`        |                      |                                                |
| `portfolio_public`         | `boolean`     | No       | `false`        |                      | Public portfolio opt-in                        |
| `tos_accepted_at`          | `timestamptz` | Yes      | `null`         |                      | Terms of Service                               |
| `last_seen_at`             | `timestamptz` | Yes      | `null`         |                      | Last activity                                  |
| `search_vector`            | `tsvector`    | No       | auto-generated |                      |                                                |
| `created_at`               | `timestamptz` | No       | `now()`        |                      |                                                |

### `program_accreditations`

Accreditation records for academic programs.

| Column               | Type          | Nullable | Default             | Key              | Notes                  |
| -------------------- | ------------- | -------- | ------------------- | ---------------- | ---------------------- |
| `id`                 | `uuid`        | No       | `gen_random_uuid()` | PK               |                        |
| `program_id`         | `uuid`        | No       | —                   | FK → programs.id |                        |
| `accreditation_body` | `text`        | No       | —                   |                  | e.g. ABET              |
| `status`             | `text`        | No       | `'pending'`         |                  | pending/active/expired |
| `accreditation_date` | `date`        | Yes      | `null`              |                  |                        |
| `next_review_date`   | `date`        | Yes      | `null`              |                  |                        |
| `framework_version`  | `text`        | Yes      | `null`              |                  |                        |
| `created_at`         | `timestamptz` | No       | `now()`             |                  |                        |

### `programs`

Academic programs (e.g., BSc Computer Science) within an institution.

| Column           | Type          | Nullable | Default             | Key                  | Notes       |
| ---------------- | ------------- | -------- | ------------------- | -------------------- | ----------- |
| `id`             | `uuid`        | No       | `gen_random_uuid()` | PK                   |             |
| `institution_id` | `uuid`        | No       | —                   | FK → institutions.id |             |
| `department_id`  | `uuid`        | Yes      | `null`              | FK → departments.id  |             |
| `coordinator_id` | `uuid`        | Yes      | `null`              | FK → profiles.id     |             |
| `code`           | `text`        | No       | —                   |                      | e.g. "BSCS" |
| `name`           | `text`        | No       | —                   |                      |             |
| `description`    | `text`        | Yes      | `null`              |                      |             |
| `is_active`      | `boolean`     | No       | `true`              |                      |             |
| `created_at`     | `timestamptz` | No       | `now()`             |                      |             |

### `question_analytics`

Aggregated analytics per question (success rate, discrimination, difficulty calibration).

| Column                      | Type          | Nullable | Default             | Key                   | Notes            |
| --------------------------- | ------------- | -------- | ------------------- | --------------------- | ---------------- |
| `id`                        | `uuid`        | No       | `gen_random_uuid()` | PK                    |                  |
| `question_id`               | `uuid`        | No       | —                   | FK → question_bank.id | **One-to-one**   |
| `total_attempts`            | `integer`     | No       | `0`                 |                       |                  |
| `correct_count`             | `integer`     | No       | `0`                 |                       |                  |
| `success_rate`              | `numeric`     | Yes      | `null`              |                       | 0–1              |
| `discrimination_index`      | `numeric`     | Yes      | `null`              |                       | -1 to 1          |
| `calibrated_difficulty`     | `numeric`     | Yes      | `null`              |                       | 1–5              |
| `avg_response_time_seconds` | `numeric`     | Yes      | `null`              |                       |                  |
| `quality_flag`              | `text`        | Yes      | `null`              |                       | good/review/poor |
| `last_calculated_at`        | `timestamptz` | No       | `now()`             |                       |                  |

### `question_bank`

AI-generated and manually created questions for adaptive quizzes.

| Column                   | Type          | Nullable | Default             | Key                       | Notes                       |
| ------------------------ | ------------- | -------- | ------------------- | ------------------------- | --------------------------- |
| `id`                     | `uuid`        | No       | `gen_random_uuid()` | PK                        |                             |
| `institution_id`         | `uuid`        | No       | —                   | FK → institutions.id      |                             |
| `course_id`              | `uuid`        | No       | —                   | FK → courses.id           |                             |
| `clo_id`                 | `uuid`        | No       | —                   | FK → learning_outcomes.id |                             |
| `created_by`             | `uuid`        | No       | —                   | FK → profiles.id          |                             |
| `parent_question_id`     | `uuid`        | Yes      | `null`              | FK → question_bank.id     | Version chain (self-ref)    |
| `generation_request_id`  | `uuid`        | Yes      | `null`              |                           | Links to generation log     |
| `generation_source`      | `text`        | No       | —                   |                           | ai/manual                   |
| `question_type`          | `text`        | No       | —                   |                           | mcq/true_false/short_answer |
| `question_text`          | `text`        | No       | —                   |                           |                             |
| `options`                | `jsonb`       | Yes      | `null`              |                           | MCQ options                 |
| `correct_answer`         | `jsonb`       | No       | —                   |                           |                             |
| `explanation`            | `text`        | Yes      | `null`              |                           |                             |
| `explanation_confidence` | `numeric`     | Yes      | `null`              |                           | 0–1 AI confidence           |
| `source_chunks`          | `jsonb`       | Yes      | `null`              |                           | RAG source references       |
| `difficulty_rating`      | `numeric`     | No       | —                   |                           | 1–5                         |
| `bloom_level`            | `integer`     | No       | —                   |                           | 1–6                         |
| `labels`                 | `text[]`      | Yes      | `null`              |                           | Tags                        |
| `status`                 | `text`        | No       | `'draft'`           |                           | draft/approved/archived     |
| `created_at`             | `timestamptz` | No       | `now()`             |                           |                             |
| `updated_at`             | `timestamptz` | No       | `now()`             |                           |                             |

### `quiz_attempts`

Student quiz attempt records with answers and adaptive trajectory.

| Column                  | Type          | Nullable | Default             | Key              | Notes                   |
| ----------------------- | ------------- | -------- | ------------------- | ---------------- | ----------------------- |
| `id`                    | `uuid`        | No       | `gen_random_uuid()` | PK               |                         |
| `quiz_id`               | `uuid`        | No       | —                   | FK → quizzes.id  |                         |
| `student_id`            | `uuid`        | No       | —                   | FK → profiles.id |                         |
| `attempt_number`        | `integer`     | No       | `1`                 |                  |                         |
| `answers`               | `jsonb`       | No       | `'{}'`              |                  | Per-question answers    |
| `score`                 | `numeric`     | Yes      | `null`              |                  | Null until submitted    |
| `started_at`            | `timestamptz` | No       | `now()`             |                  |                         |
| `submitted_at`          | `timestamptz` | Yes      | `null`              |                  |                         |
| `question_sequence`     | `jsonb`       | Yes      | `null`              |                  | Adaptive question order |
| `difficulty_trajectory` | `jsonb`       | Yes      | `null`              |                  | Difficulty over time    |
| `per_question_times`    | `jsonb`       | Yes      | `null`              |                  | Time per question       |

### `quiz_generation_logs`

Audit trail for AI question generation requests.

| Column                     | Type          | Nullable | Default             | Key                  | Notes             |
| -------------------------- | ------------- | -------- | ------------------- | -------------------- | ----------------- |
| `id`                       | `uuid`        | No       | `gen_random_uuid()` | PK                   |                   |
| `institution_id`           | `uuid`        | No       | —                   | FK → institutions.id |                   |
| `course_id`                | `uuid`        | No       | —                   | FK → courses.id      |                   |
| `teacher_id`               | `uuid`        | No       | —                   | FK → profiles.id     |                   |
| `generation_request_id`    | `uuid`        | No       | —                   |                      | Unique request ID |
| `model_used`               | `text`        | No       | —                   |                      | e.g. gpt-4o       |
| `question_count_requested` | `integer`     | No       | —                   |                      |                   |
| `question_count_generated` | `integer`     | No       | —                   |                      |                   |
| `chunks_retrieved`         | `integer`     | No       | —                   |                      | RAG chunks used   |
| `prompt_tokens`            | `integer`     | No       | —                   |                      |                   |
| `completion_tokens`        | `integer`     | No       | —                   |                      |                   |
| `total_tokens`             | `integer`     | No       | —                   |                      |                   |
| `latency_ms`               | `integer`     | No       | —                   |                      |                   |
| `status`                   | `text`        | No       | —                   |                      | success/error     |
| `error_message`            | `text`        | Yes      | `null`              |                      |                   |
| `created_at`               | `timestamptz` | No       | `now()`             |                      |                   |

### `quiz_questions`

Questions within a specific quiz instance.

| Column           | Type      | Nullable | Default             | Key             | Notes                       |
| ---------------- | --------- | -------- | ------------------- | --------------- | --------------------------- |
| `id`             | `uuid`    | No       | `gen_random_uuid()` | PK              |                             |
| `quiz_id`        | `uuid`    | No       | —                   | FK → quizzes.id |                             |
| `question_text`  | `text`    | No       | —                   |                 |                             |
| `question_type`  | `text`    | No       | —                   |                 | mcq/true_false/short_answer |
| `options`        | `jsonb`   | Yes      | `null`              |                 |                             |
| `correct_answer` | `jsonb`   | No       | —                   |                 |                             |
| `points`         | `integer` | No       | `1`                 |                 |                             |
| `sort_order`     | `integer` | No       | `0`                 |                 |                             |

### `quizzes`

Quiz definitions with adaptive configuration.

| Column               | Type          | Nullable | Default             | Key             | Notes                |
| -------------------- | ------------- | -------- | ------------------- | --------------- | -------------------- |
| `id`                 | `uuid`        | No       | `gen_random_uuid()` | PK              |                      |
| `course_id`          | `uuid`        | No       | —                   | FK → courses.id |                      |
| `title`              | `text`        | No       | —                   |                 |                      |
| `description`        | `text`        | Yes      | `null`              |                 |                      |
| `clo_ids`            | `jsonb`       | No       | `'[]'`              |                 | Targeted CLOs        |
| `due_date`           | `timestamptz` | No       | —                   |                 |                      |
| `time_limit_minutes` | `integer`     | Yes      | `null`              |                 | Null = no limit      |
| `max_attempts`       | `integer`     | No       | `1`                 |                 |                      |
| `is_published`       | `boolean`     | No       | `false`             |                 |                      |
| `is_adaptive`        | `boolean`     | No       | `false`             |                 | Uses adaptive engine |
| `adaptation_config`  | `jsonb`       | Yes      | `null`              |                 | Adaptive parameters  |
| `created_at`         | `timestamptz` | No       | `now()`             |                 |                      |

---

## Tables R–S

### `rubric_criteria`

Individual criteria within a rubric.

| Column           | Type      | Nullable | Default             | Key             | Notes                         |
| ---------------- | --------- | -------- | ------------------- | --------------- | ----------------------------- |
| `id`             | `uuid`    | No       | `gen_random_uuid()` | PK              |                               |
| `rubric_id`      | `uuid`    | No       | —                   | FK → rubrics.id |                               |
| `criterion_name` | `text`    | No       | —                   |                 |                               |
| `max_points`     | `integer` | No       | —                   |                 |                               |
| `levels`         | `jsonb`   | No       | `'[]'`              |                 | Performance level descriptors |
| `sort_order`     | `integer` | No       | `0`                 |                 |                               |

### `rubrics`

Rubric definitions for grading assignments.

| Column        | Type          | Nullable | Default             | Key                       | Notes             |
| ------------- | ------------- | -------- | ------------------- | ------------------------- | ----------------- |
| `id`          | `uuid`        | No       | `gen_random_uuid()` | PK                        |                   |
| `clo_id`      | `uuid`        | Yes      | `null`              | FK → learning_outcomes.id |                   |
| `created_by`  | `uuid`        | Yes      | `null`              | FK → profiles.id          |                   |
| `title`       | `text`        | No       | —                   |                           |                   |
| `description` | `text`        | Yes      | `null`              |                           |                   |
| `is_template` | `boolean`     | No       | `false`             |                           | Reusable template |
| `created_at`  | `timestamptz` | No       | `now()`             |                           |                   |

### `semesters`

Academic semesters/terms within an institution.

| Column           | Type          | Nullable | Default             | Key                  | Notes                           |
| ---------------- | ------------- | -------- | ------------------- | -------------------- | ------------------------------- |
| `id`             | `uuid`        | No       | `gen_random_uuid()` | PK                   |                                 |
| `institution_id` | `uuid`        | No       | —                   | FK → institutions.id |                                 |
| `name`           | `text`        | No       | —                   |                      | e.g. "Fall 2025"                |
| `code`           | `text`        | No       | —                   |                      | e.g. "F25"                      |
| `start_date`     | `date`        | No       | —                   |                      |                                 |
| `end_date`       | `date`        | No       | —                   |                      |                                 |
| `is_active`      | `boolean`     | No       | `false`             |                      | Only one active per institution |
| `created_at`     | `timestamptz` | No       | `now()`             |                      |                                 |

### `social_challenges`

Teacher-created challenges (individual or team-based).

| Column                 | Type          | Nullable | Default             | Key              | Notes                      |
| ---------------------- | ------------- | -------- | ------------------- | ---------------- | -------------------------- |
| `id`                   | `uuid`        | No       | `gen_random_uuid()` | PK               |                            |
| `course_id`            | `uuid`        | No       | —                   | FK → courses.id  |                            |
| `created_by`           | `uuid`        | No       | —                   | FK → profiles.id |                            |
| `title`                | `text`        | No       | —                   |                  |                            |
| `description`          | `text`        | Yes      | `null`              |                  |                            |
| `challenge_type`       | `text`        | No       | —                   |                  | individual/team            |
| `start_date`           | `timestamptz` | No       | —                   |                  |                            |
| `end_date`             | `timestamptz` | No       | —                   |                  |                            |
| `goal_metric`          | `text`        | No       | —                   |                  | xp/submissions/streak/etc. |
| `goal_target`          | `numeric`     | No       | —                   |                  | Target value               |
| `reward_type`          | `text`        | No       | —                   |                  | xp/badge                   |
| `reward_value`         | `numeric`     | No       | `0`                 |                  |                            |
| `status`               | `text`        | No       | `'draft'`           |                  | draft/active/completed     |
| `notification_sent_90` | `boolean`     | No       | `false`             |                  | 90% progress notification  |
| `created_at`           | `timestamptz` | No       | `now()`             |                  |                            |

### `starter_week_sessions`

AI-generated starter week plan sessions for new students.

| Column                | Type          | Nullable | Default             | Key              | Notes                      |
| --------------------- | ------------- | -------- | ------------------- | ---------------- | -------------------------- |
| `id`                  | `uuid`        | No       | `gen_random_uuid()` | PK               |                            |
| `student_id`          | `uuid`        | No       | —                   | FK → profiles.id |                            |
| `course_id`           | `uuid`        | Yes      | `null`              | FK → courses.id  |                            |
| `planner_entry_id`    | `uuid`        | Yes      | `null`              |                  | Link to planner            |
| `session_type`        | `text`        | No       | —                   |                  | study/review/practice/etc. |
| `description`         | `text`        | No       | —                   |                  |                            |
| `suggested_date`      | `date`        | No       | —                   |                  |                            |
| `suggested_time_slot` | `text`        | No       | —                   |                  | morning/afternoon/evening  |
| `duration_minutes`    | `integer`     | No       | —                   |                  |                            |
| `status`              | `text`        | No       | `'pending'`         |                  | pending/completed/skipped  |
| `created_at`          | `timestamptz` | No       | `now()`             |                  |                            |
| `updated_at`          | `timestamptz` | No       | `now()`             |                  |                            |

### `student_activity_log`

Append-only log of student actions for analytics and at-risk detection.

| Column       | Type          | Nullable | Default             | Key              | Notes                           |
| ------------ | ------------- | -------- | ------------------- | ---------------- | ------------------------------- |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | PK               |                                 |
| `student_id` | `uuid`        | No       | —                   | FK → profiles.id |                                 |
| `event_type` | `text`        | No       | —                   |                  | page_view/submission/login/etc. |
| `metadata`   | `jsonb`       | Yes      | `null`              |                  | Event-specific data             |
| `created_at` | `timestamptz` | No       | `now()`             |                  |                                 |

### `student_courses`

Enrollment junction table (student ↔ course).

| Column        | Type          | Nullable | Default             | Key                     | Notes                      |
| ------------- | ------------- | -------- | ------------------- | ----------------------- | -------------------------- |
| `id`          | `uuid`        | No       | `gen_random_uuid()` | PK                      |                            |
| `student_id`  | `uuid`        | No       | —                   | FK → profiles.id        |                            |
| `course_id`   | `uuid`        | No       | —                   | FK → courses.id         |                            |
| `section_id`  | `uuid`        | Yes      | `null`              | FK → course_sections.id |                            |
| `status`      | `text`        | No       | `'enrolled'`        |                         | enrolled/dropped/completed |
| `enrolled_at` | `timestamptz` | No       | `now()`             |                         |                            |

### `student_gamification`

Per-student gamification state (XP, level, streak).

| Column                     | Type          | Nullable | Default             | Key              | Notes                             |
| -------------------------- | ------------- | -------- | ------------------- | ---------------- | --------------------------------- |
| `id`                       | `uuid`        | No       | `gen_random_uuid()` | PK               |                                   |
| `student_id`               | `uuid`        | No       | —                   | FK → profiles.id | **One-to-one**                    |
| `xp_total`                 | `integer`     | No       | `0`                 |                  | Derived from SUM(xp_transactions) |
| `level`                    | `integer`     | No       | `1`                 |                  | Calculated from xp_total          |
| `streak_count`             | `integer`     | No       | `0`                 |                  | Current streak days               |
| `streak_longest`           | `integer`     | No       | `0`                 |                  | All-time best                     |
| `streak_freezes_available` | `integer`     | No       | `0`                 |                  | Max 2                             |
| `last_login_date`          | `date`        | Yes      | `null`              |                  | For streak calculation            |
| `leaderboard_anonymous`    | `boolean`     | No       | `false`             |                  | Opt-out of leaderboard            |
| `updated_at`               | `timestamptz` | No       | `now()`             |                  |                                   |

### `student_profiles`

Extended student profile data from onboarding assessments.

| Column                 | Type          | Nullable | Default             | Key                  | Notes           |
| ---------------------- | ------------- | -------- | ------------------- | -------------------- | --------------- |
| `id`                   | `uuid`        | No       | `gen_random_uuid()` | PK                   |                 |
| `student_id`           | `uuid`        | No       | —                   | FK → profiles.id     |                 |
| `institution_id`       | `uuid`        | No       | —                   | FK → institutions.id |                 |
| `personality_traits`   | `jsonb`       | Yes      | `null`              |                      | Big Five scores |
| `learning_style`       | `jsonb`       | Yes      | `null`              |                      | VARK scores     |
| `self_efficacy`        | `jsonb`       | Yes      | `null`              |                      |                 |
| `study_strategies`     | `jsonb`       | Yes      | `null`              |                      |                 |
| `profile_completeness` | `numeric`     | No       | `0`                 |                      | 0–100           |
| `assessment_version`   | `integer`     | No       | `1`                 |                      |                 |
| `completed_at`         | `timestamptz` | No       | `now()`             |                      |                 |
| `created_at`           | `timestamptz` | No       | `now()`             |                      |                 |

### `student_wellness_preferences`

Per-student wellness habit configuration and preferences.

| Column                      | Type          | Nullable | Default             | Key              | Notes                     |
| --------------------------- | ------------- | -------- | ------------------- | ---------------- | ------------------------- |
| `id`                        | `uuid`        | No       | `gen_random_uuid()` | PK               |                           |
| `student_id`                | `uuid`        | No       | —                   | FK → profiles.id | **One-to-one**            |
| `enabled_habits`            | `text[]`      | No       | `'{}'`              |                  | Which habits are active   |
| `habit_targets`             | `jsonb`       | No       | `'{}'`              |                  | Per-habit daily targets   |
| `reminder_times`            | `jsonb`       | No       | `'{}'`              |                  | Per-habit reminder config |
| `parent_visibility`         | `boolean`     | No       | `false`             |                  | Share with parent         |
| `dismissed_onboarding_tips` | `text[]`      | No       | `'{}'`              |                  |                           |
| `created_at`                | `timestamptz` | No       | `now()`             |                  |                           |
| `updated_at`                | `timestamptz` | No       | `now()`             |                  |                           |

### `submissions`

Student assignment submissions.

| Column             | Type                | Nullable | Default             | Key                 | Notes                  |
| ------------------ | ------------------- | -------- | ------------------- | ------------------- | ---------------------- |
| `id`               | `uuid`              | No       | `gen_random_uuid()` | PK                  |                        |
| `assignment_id`    | `uuid`              | No       | —                   | FK → assignments.id |                        |
| `student_id`       | `uuid`              | No       | —                   | FK → profiles.id    |                        |
| `text_content`     | `text`              | Yes      | `null`              |                     | Inline text submission |
| `file_url`         | `text`              | Yes      | `null`              |                     | Storage bucket URL     |
| `status`           | `submission_status` | No       | `'submitted'`       |                     | Enum: submitted/graded |
| `is_late`          | `boolean`           | No       | `false`             |                     |                        |
| `plagiarism_score` | `numeric`           | Yes      | `null`              |                     | 0–100                  |
| `submitted_at`     | `timestamptz`       | No       | `now()`             |                     |                        |

### `survey_questions`

Questions within a survey.

| Column          | Type      | Nullable | Default             | Key             | Notes           |
| --------------- | --------- | -------- | ------------------- | --------------- | --------------- |
| `id`            | `uuid`    | No       | `gen_random_uuid()` | PK              |                 |
| `survey_id`     | `uuid`    | No       | —                   | FK → surveys.id |                 |
| `question_text` | `text`    | No       | —                   |                 |                 |
| `question_type` | `text`    | No       | —                   |                 | likert/text/mcq |
| `options`       | `jsonb`   | Yes      | `null`              |                 |                 |
| `sort_order`    | `integer` | No       | `0`                 |                 |                 |

### `survey_responses`

Individual survey responses.

| Column           | Type          | Nullable | Default             | Key                      | Notes |
| ---------------- | ------------- | -------- | ------------------- | ------------------------ | ----- |
| `id`             | `uuid`        | No       | `gen_random_uuid()` | PK                       |       |
| `survey_id`      | `uuid`        | No       | —                   | FK → surveys.id          |       |
| `question_id`    | `uuid`        | No       | —                   | FK → survey_questions.id |       |
| `respondent_id`  | `uuid`        | No       | —                   | FK → profiles.id         |       |
| `response_value` | `text`        | No       | —                   |                          |       |
| `created_at`     | `timestamptz` | No       | `now()`             |                          |       |

### `surveys`

Institution-level surveys (course evaluation, exit survey, etc.).

| Column            | Type          | Nullable | Default             | Key                  | Notes                         |
| ----------------- | ------------- | -------- | ------------------- | -------------------- | ----------------------------- |
| `id`              | `uuid`        | No       | `gen_random_uuid()` | PK                   |                               |
| `institution_id`  | `uuid`        | No       | —                   | FK → institutions.id |                               |
| `title`           | `text`        | No       | —                   |                      |                               |
| `type`            | `text`        | No       | —                   |                      | course_evaluation/exit/custom |
| `target_outcomes` | `jsonb`       | No       | `'[]'`              |                      | Linked outcomes               |
| `is_active`       | `boolean`     | No       | `true`              |                      |                               |
| `created_at`      | `timestamptz` | No       | `now()`             |                      |                               |

---

## Tables T–X

### `timetable_slots`

Weekly recurring timetable slots for course sections.

| Column        | Type      | Nullable | Default             | Key                     | Notes                |
| ------------- | --------- | -------- | ------------------- | ----------------------- | -------------------- |
| `id`          | `uuid`    | No       | `gen_random_uuid()` | PK                      |                      |
| `section_id`  | `uuid`    | No       | —                   | FK → course_sections.id |                      |
| `day_of_week` | `integer` | No       | —                   |                         | 0=Sunday, 6=Saturday |
| `start_time`  | `time`    | No       | —                   |                         |                      |
| `end_time`    | `time`    | No       | —                   |                         |                      |
| `room`        | `text`    | Yes      | `null`              |                         |                      |
| `slot_type`   | `text`    | No       | —                   |                         | lecture/lab/tutorial |

### `verified_explanations`

Teacher-verified explanations for question bank items.

| Column             | Type          | Nullable | Default             | Key                   | Notes               |
| ------------------ | ------------- | -------- | ------------------- | --------------------- | ------------------- |
| `id`               | `uuid`        | No       | `gen_random_uuid()` | PK                    |                     |
| `question_id`      | `uuid`        | No       | —                   | FK → question_bank.id |                     |
| `institution_id`   | `uuid`        | No       | —                   | FK → institutions.id  |                     |
| `verified_by`      | `uuid`        | No       | —                   | FK → profiles.id      | Teacher             |
| `explanation_text` | `text`        | No       | —                   |                       |                     |
| `source`           | `text`        | No       | —                   |                       | ai_generated/manual |
| `is_active`        | `boolean`     | No       | `true`              |                       |                     |
| `created_at`       | `timestamptz` | No       | `now()`             |                       |                     |
| `updated_at`       | `timestamptz` | No       | `now()`             |                       |                     |

### `wellness_habit_logs`

Individual wellness habit completion logs (meditation, hydration, exercise, sleep).

| Column          | Type                  | Nullable | Default             | Key              | Notes                                     |
| --------------- | --------------------- | -------- | ------------------- | ---------------- | ----------------------------------------- |
| `id`            | `uuid`                | No       | `gen_random_uuid()` | PK               |                                           |
| `student_id`    | `uuid`                | No       | —                   | FK → profiles.id |                                           |
| `wellness_type` | `wellness_habit_type` | No       | —                   |                  | Enum: meditation/hydration/exercise/sleep |
| `date`          | `date`                | No       | —                   |                  |                                           |
| `value`         | `numeric`             | Yes      | `null`              |                  | Duration/amount                           |
| `completed_at`  | `timestamptz`         | No       | `now()`             |                  |                                           |
| `created_at`    | `timestamptz`         | No       | `now()`             |                  |                                           |

### `xp_events`

Admin-created bonus XP events with time-bounded multipliers.

| Column           | Type          | Nullable | Default             | Key                  | Notes                  |
| ---------------- | ------------- | -------- | ------------------- | -------------------- | ---------------------- |
| `id`             | `uuid`        | No       | `gen_random_uuid()` | PK                   |                        |
| `institution_id` | `uuid`        | Yes      | `null`              | FK → institutions.id | Null = global          |
| `name`           | `text`        | No       | —                   |                      |                        |
| `description`    | `text`        | Yes      | `null`              |                      |                        |
| `event_type`     | `text`        | No       | —                   |                      |                        |
| `xp_multiplier`  | `numeric`     | No       | `1`                 |                      | e.g. 2.0 for double XP |
| `bonus_xp`       | `integer`     | No       | `0`                 |                      | Flat bonus             |
| `starts_at`      | `timestamptz` | Yes      | `null`              |                      |                        |
| `ends_at`        | `timestamptz` | Yes      | `null`              |                      |                        |
| `is_active`      | `boolean`     | No       | `true`              |                      |                        |
| `created_at`     | `timestamptz` | No       | `now()`             |                      |                        |

### `xp_transactions`

Append-only XP transaction ledger. **Immutable — xp_total is derived from SUM.**

| Column         | Type          | Nullable | Default             | Key              | Notes                                      |
| -------------- | ------------- | -------- | ------------------- | ---------------- | ------------------------------------------ |
| `id`           | `uuid`        | No       | `gen_random_uuid()` | PK               |                                            |
| `student_id`   | `uuid`        | No       | —                   | FK → profiles.id |                                            |
| `team_id`      | `uuid`        | Yes      | `null`              | FK → teams.id    | For team XP                                |
| `source`       | `text`        | No       | —                   |                  | login/submission/grade/journal/streak/etc. |
| `xp_amount`    | `integer`     | No       | —                   |                  | Final XP (after multipliers)               |
| `base_xp`      | `integer`     | Yes      | `null`              |                  | Before multipliers                         |
| `final_xp`     | `integer`     | Yes      | `null`              |                  | After multipliers                          |
| `multipliers`  | `jsonb`       | No       | `'{}'`              |                  | Applied multiplier details                 |
| `scope`        | `text`        | No       | `'individual'`      |                  | individual/team                            |
| `reference_id` | `uuid`        | Yes      | `null`              |                  | Related entity ID                          |
| `note`         | `text`        | Yes      | `null`              |                  |                                            |
| `created_at`   | `timestamptz` | No       | `now()`             |                  |                                            |

---

## Views

### `leaderboard_weekly`

Materialized view for weekly leaderboard rankings.

| Column           | Type      | Nullable | Notes                                       |
| ---------------- | --------- | -------- | ------------------------------------------- |
| `student_id`     | `uuid`    | Yes      | FK → profiles.id (via student_gamification) |
| `institution_id` | `uuid`    | Yes      | FK → institutions.id (via profiles)         |
| `full_name`      | `text`    | Yes      | From profiles                               |
| `xp_total`       | `integer` | Yes      | From student_gamification                   |
| `level`          | `integer` | Yes      | From student_gamification                   |
| `streak_current` | `integer` | Yes      | From student_gamification                   |
| `global_rank`    | `bigint`  | Yes      | Computed rank                               |

---

## Functions

| Function                                         | Arguments | Returns                                             | Purpose                                              |
| ------------------------------------------------ | --------- | --------------------------------------------------- | ---------------------------------------------------- |
| `auth_user_role()`                               | none      | `text`                                              | Returns current user's role from JWT                 |
| `auth_institution_id()`                          | none      | `uuid`                                              | Returns current user's institution_id from JWT       |
| `expire_stale_recovery_sessions()`               | none      | `integer`                                           | Expires old mastery recovery pathways, returns count |
| `get_wellness_aggregate_stats(p_institution_id)` | `uuid`    | `table(total_logs, unique_students, wellness_type)` | Aggregated wellness stats per institution            |

---

> **Total**: 57 tables + 1 materialized view + 4 functions + 8 enums
>
> To generate a PDF: `npx md-to-pdf docs/SUPABASE-COLUMNS-DATATYPES.md`
