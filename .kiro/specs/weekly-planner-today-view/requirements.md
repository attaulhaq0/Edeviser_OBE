# Requirements Document — Weekly Planner & Today View

## Introduction

The Weekly Planner & Today View feature adds a structured self-regulated learning workflow to the Edeviser student experience, built around the PDCR cycle (Plan, Do, Check, Reflect). Students plan their week by creating study sessions and tasks, execute sessions in a distraction-free Focus Mode with a configurable timer, track study time per subject/CLO with evidence capture (notes, screenshots, file uploads), review progress against weekly goals, and reflect on what worked. The Today View provides a single-screen daily agenda showing planned study sessions, assignment deadlines, tasks, and daily habits. Study session evidence links to CLOs for outcome tracking, integrating with the existing OBE attainment pipeline. The feature integrates with the existing gamification engine (XP for completing sessions, streaks for daily study), assignment deadlines, habit tracking (the "Submit" and "Read" daily habits), and parent visibility. All data is stored in Supabase (PostgreSQL + RLS, Storage for evidence files, Edge Functions for XP/badge processing). The feature also includes pre-learning rituals and flow optimization (session intent setting, flow state micro-check-ins, low-friction evidence capture), spaced repetition integration (automatic review scheduling based on the Leitner system with 1/3/7-day intervals), structured reflection frameworks (Gibbs' Reflective Cycle, What-So What-Now What templates), AI reflection synthesis (monthly digests identifying growth patterns and themes), and journal quality assurance (AI-powered quality scoring with XP adjustments to discourage gaming).

## Glossary

- **Weekly_Planner**: The student-facing page displaying a 7-day calendar grid (Monday–Sunday) for the current or selected week, where students create, view, and manage Study_Sessions and Planner_Tasks
- **Today_View**: The student-facing page showing the current day's agenda: scheduled Study_Sessions, Planner_Tasks, upcoming Assignment deadlines, and daily habit status in a single chronological timeline
- **PDCR_Cycle**: The four-phase self-regulated learning workflow: Plan (set weekly goals and schedule sessions), Do (execute study sessions in Focus Mode), Check (review progress against goals), Reflect (write reflections on learning)
- **Study_Session**: A planned or completed block of study time with a start time, duration, linked course, optional CLO linkage, and optional evidence attachments. Stored in the `study_sessions` table
- **Planner_Task**: A student-created to-do item with a title, optional description, due date, priority (low/medium/high), completion status, and optional course linkage. Stored in the `planner_tasks` table
- **Focus_Mode**: A distraction-free timer-based study interface that tracks elapsed time, supports Pomodoro (25 min work / 5 min break) and custom duration modes, and captures evidence during or after the session
- **Session_Evidence**: A file (screenshot, photo, document) or text note attached to a Study_Session as proof of study activity. Stored in Supabase Storage with metadata in the `session_evidence` table
- **Weekly_Goal**: A student-defined target for the week, expressed as a target number of study hours, sessions, or tasks to complete. Stored in the `weekly_goals` table
- **Pomodoro_Mode**: A Focus_Mode preset using 25-minute work intervals followed by 5-minute breaks, with a long break (15 min) after every 4 work intervals
- **Custom_Timer_Mode**: A Focus_Mode preset where the student sets a custom duration (5–180 minutes) for the study session
- **Progress_Summary**: The Check phase view showing weekly goal attainment, total study hours, sessions completed, tasks completed, and per-course/CLO study time breakdown
- **Session_Reflection**: A text entry written by the student after completing a Study_Session or at the end of the week, linked to the session or week. Integrates with the existing journal system for XP awards
- **Platform**: The Edeviser web application
- **Student**: A user with the `student` role in the Edeviser platform
- **Parent**: A user with the `parent` role linked to a Student via `parent_student_links`
- **Timer_State**: The current state of the Focus_Mode timer: idle, running, paused, break, or completed
- **Session_Intent**: A brief pre-learning declaration completed before starting a Study_Session, consisting of a specific concept to work on and a success criterion. Stored in the `session_intents` table
- **Flow_Check_In**: A micro-survey presented at Pomodoro break points (every 25 minutes) asking the student to self-report their flow state: "In the zone," "Stuck," or "Too easy." Stored in the `flow_check_ins` table
- **Quick_Thought**: A single-line text input (max 280 characters) offered as the lowest-friction evidence capture option after a Study_Session, as an alternative to file uploads or longer notes
- **Review_Session**: A Study_Session specifically created by the Spaced_Repetition_Schedule to review previously studied CLO material. Visually distinct from regular sessions in the planner with a review badge
- **Spaced_Repetition_Schedule**: An automatic schedule of review reminders generated after a Study_Session on a CLO, following the Leitner system intervals of 1 day, 3 days, and 7 days. Stored in the `review_schedules` table
- **Reflection_Template**: A structured framework for writing reflections, offering guided prompts instead of free-form text. Available templates: Simple ("What went well? / What was challenging? / What will I do differently?") and Gibbs' Reflective Cycle (Description, Feelings, Evaluation, Analysis, Conclusion, Action Plan)
- **Reflection_Digest**: A monthly AI-generated summary of a student's journal entries, identifying recurring themes, growth patterns, emotional trends, and suggested focus areas. Stored in the `reflection_digests` table
- **Quality_Score**: An AI-generated score (0–100) assigned to a journal entry or Session_Reflection, evaluating originality, relevance to CLOs, and metacognitive depth. Used to adjust XP awards and flag low-quality entries

## Requirements

### SECTION A: Weekly Planner

#### Requirement 1: Weekly Calendar Grid

**User Story:** As a Student, I want to see a weekly calendar view of my planned study sessions and tasks, so that I can organize my study schedule for the week.

##### Acceptance Criteria

1. THE Weekly_Planner SHALL render a 7-day grid (Monday through Sunday) for the current week, with each day column showing scheduled Study_Sessions and Planner_Tasks sorted by time.
2. THE Weekly_Planner SHALL display the week date range (e.g., "Jun 16 – Jun 22, 2025") in the page header.
3. WHEN a Student navigates to the previous or next week, THE Weekly_Planner SHALL update the grid to display that week's data.
4. THE Weekly_Planner SHALL display assignment deadlines from the student's enrolled courses as read-only items in the corresponding day column, visually distinct from student-created items.
5. THE Weekly_Planner SHALL display a "Today" indicator highlighting the current day column.
6. WHILE the viewport width is below the `md` breakpoint (768px), THE Weekly_Planner SHALL switch to a single-day view with swipe or tab navigation between days.

#### Requirement 2: Study Session Creation

**User Story:** As a Student, I want to create study sessions for specific days and times, so that I can plan dedicated study blocks for each subject.

##### Acceptance Criteria

1. WHEN a Student creates a Study_Session, THE Platform SHALL require: a title, a date, a start time, a planned duration (15–240 minutes in 15-minute increments), and a linked course (selected from enrolled courses).
2. WHEN a Student creates a Study_Session, THE Platform SHALL optionally allow: linking to one or more CLOs from the selected course, and adding a text description.
3. THE Platform SHALL validate that the planned duration is between 15 and 240 minutes.
4. THE Platform SHALL allow a Student to create multiple Study_Sessions on the same day, including overlapping time slots.
5. WHEN a Study_Session is created, THE Platform SHALL insert a record into the `study_sessions` table with status `planned`.

#### Requirement 3: Planner Task Management

**User Story:** As a Student, I want to create, edit, and complete to-do tasks for each day, so that I can track smaller action items alongside my study sessions.

##### Acceptance Criteria

1. WHEN a Student creates a Planner_Task, THE Platform SHALL require: a title and a due date. THE Platform SHALL optionally allow: a description, a priority level (low, medium, high), and a linked course.
2. WHEN a Student marks a Planner_Task as completed, THE Platform SHALL update the task status to `completed` and record the completion timestamp.
3. WHEN a Student marks a Planner_Task as completed, THE Platform SHALL award 10 XP via the existing `award-xp` Edge Function with source `planner_task`.
4. THE Platform SHALL allow a Student to edit the title, description, priority, due date, and course linkage of an incomplete Planner_Task.
5. THE Platform SHALL allow a Student to delete an incomplete Planner_Task. Completed tasks SHALL remain in the planner as read-only records.
6. THE Platform SHALL display Planner_Tasks grouped by priority (high first, then medium, then low) within each day column.

#### Requirement 4: Weekly Goal Setting (Plan Phase)

**User Story:** As a Student, I want to set weekly study goals, so that I have clear targets to work toward each week.

##### Acceptance Criteria

1. THE Weekly_Planner SHALL provide a goal-setting panel where the Student can define up to 3 Weekly_Goals for the current week.
2. Each Weekly_Goal SHALL have a type (study_hours, sessions_completed, or tasks_completed) and a numeric target value.
3. THE Weekly_Planner SHALL display each Weekly_Goal with a progress bar showing current progress toward the target.
4. WHEN a Student has not set any Weekly_Goals for the current week, THE Weekly_Planner SHALL display a prompt encouraging goal setting.
5. THE Platform SHALL prevent editing Weekly_Goals for past weeks.

### SECTION B: Today View

#### Requirement 5: Daily Agenda Timeline

**User Story:** As a Student, I want a single-screen view of everything I need to do today, so that I can quickly see my schedule and priorities.

##### Acceptance Criteria

1. THE Today_View SHALL display a chronological timeline for the current day showing: scheduled Study_Sessions with time and course, Planner_Tasks due today sorted by priority, assignment deadlines from enrolled courses, and daily habit status (Login, Submit, Journal, Read).
2. THE Today_View SHALL group items into time-based sections: "Morning" (before 12:00), "Afternoon" (12:00–17:00), and "Evening" (after 17:00), with unscheduled tasks and habits in a separate "To Do" section.
3. WHEN a Study_Session's scheduled time has passed and the session was not started, THE Today_View SHALL display the session with a "Missed" indicator.
4. WHEN an assignment deadline is within 24 hours, THE Today_View SHALL display the deadline item with a red urgency indicator.
5. WHEN an assignment deadline is within 72 hours, THE Today_View SHALL display the deadline item with a yellow urgency indicator.
6. THE Today_View SHALL display a daily progress summary at the top: study time completed today, tasks completed today, and sessions completed today.

#### Requirement 6: Quick Actions from Today View

**User Story:** As a Student, I want to quickly start a study session or complete a task from the Today View, so that I can act on my plan without navigating away.

##### Acceptance Criteria

1. WHEN a Student taps "Start" on a scheduled Study_Session in the Today_View, THE Platform SHALL launch Focus_Mode for that session.
2. WHEN a Student taps the checkbox on a Planner_Task in the Today_View, THE Platform SHALL mark the task as completed and award XP.
3. THE Today_View SHALL provide a "Quick Add" button to create a new Planner_Task for today without navigating to the full planner.
4. THE Today_View SHALL provide a "Start Unplanned Session" button to launch Focus_Mode for an ad-hoc study session not previously scheduled.

### SECTION C: Focus Mode (Do Phase)

#### Requirement 7: Focus Mode Timer

**User Story:** As a Student, I want a distraction-free timer for my study sessions, so that I can stay focused and track my actual study time.

##### Acceptance Criteria

1. THE Focus_Mode SHALL display a prominent countdown timer showing remaining time in MM:SS format.
2. THE Focus_Mode SHALL support two timer modes: Pomodoro_Mode (25 min work / 5 min break / 15 min long break after 4 intervals) and Custom_Timer_Mode (student-set duration from 5 to 180 minutes).
3. WHEN the Student starts Focus_Mode, THE Platform SHALL update the Study_Session status to `in_progress` and record the actual start timestamp.
4. THE Focus_Mode SHALL provide pause and resume controls. WHILE the timer is paused, THE Platform SHALL NOT count paused time toward the session's actual duration.
5. WHEN the timer reaches zero, THE Focus_Mode SHALL play an audio notification (respecting device mute settings) and display a completion prompt.
6. THE Focus_Mode SHALL display the session title, linked course name, and linked CLO titles for context.
7. IF the Student closes the browser tab or navigates away while Focus_Mode is active, THEN THE Platform SHALL persist the timer state to localStorage and restore the session on return.

#### Requirement 8: Pomodoro Mode Specifics

**User Story:** As a Student, I want Pomodoro-style intervals with automatic breaks, so that I can maintain focus using proven time management techniques.

##### Acceptance Criteria

1. WHILE in Pomodoro_Mode, THE Focus_Mode SHALL automatically transition from a 25-minute work interval to a 5-minute break interval.
2. WHILE in Pomodoro_Mode, THE Focus_Mode SHALL transition to a 15-minute long break after every 4 completed work intervals.
3. THE Focus_Mode SHALL display the current interval number (e.g., "Pomodoro 2 of 4") and interval type (Work / Break / Long Break).
4. WHEN a break interval ends, THE Focus_Mode SHALL prompt the Student to start the next work interval (auto-start disabled by default).
5. THE Focus_Mode SHALL allow the Student to skip a break and proceed directly to the next work interval.

#### Requirement 9: Session Completion and Evidence Capture

**User Story:** As a Student, I want to capture evidence of my study session (notes, screenshots, files), so that my study activity is documented and linked to learning outcomes.

##### Acceptance Criteria

1. WHEN a Study_Session is completed (timer ends or student manually ends), THE Platform SHALL display a session completion form with fields: session notes (text, optional), evidence file upload (up to 3 files, max 5MB each, accepted types: jpg, png, pdf, doc, docx), and a satisfaction rating (1–5 stars, optional).
2. WHEN the Student submits the completion form, THE Platform SHALL update the Study_Session status to `completed`, record the actual end timestamp and actual duration (excluding paused time), and store evidence files in Supabase Storage under `session-evidence/{student_id}/{session_id}/`.
3. WHEN evidence files are uploaded, THE Platform SHALL create Session_Evidence records linking each file to the Study_Session and its associated CLOs.
4. THE Platform SHALL allow the Student to skip evidence capture and complete the session with only the duration recorded.
5. WHEN a Study_Session with CLO linkage is completed, THE Platform SHALL log a `study_session` event to `student_activity_log` with metadata including course_id, clo_ids, and actual_duration_minutes.

#### Requirement 10: Focus Mode XP Awards

**User Story:** As a Student, I want to earn XP for completing study sessions, so that my self-directed study is rewarded by the gamification system.

##### Acceptance Criteria

1. WHEN a Study_Session is completed with an actual duration of 15 minutes or more, THE Platform SHALL award XP via the `award-xp` Edge Function with source `study_session`.
2. THE XP amount for a completed Study_Session SHALL be calculated as: base 20 XP + 5 XP per additional 15-minute block (e.g., 15 min = 20 XP, 30 min = 25 XP, 60 min = 35 XP, capped at 50 XP per session).
3. WHEN a Study_Session includes evidence (at least one file or note), THE Platform SHALL award a 10 XP bonus on top of the session XP.
4. THE `award-xp` Edge Function SHALL apply existing XP multipliers (Bonus XP Events) to study session XP awards.
5. WHEN a Study_Session has an actual duration of less than 15 minutes, THE Platform SHALL NOT award XP for that session.

### SECTION D: Progress Review (Check Phase)

#### Requirement 11: Weekly Progress Summary

**User Story:** As a Student, I want to review my weekly progress against my goals, so that I can assess whether I'm on track.

##### Acceptance Criteria

1. THE Progress_Summary SHALL display: total study hours for the week, number of sessions completed, number of tasks completed, and each Weekly_Goal with current progress and percentage toward target.
2. THE Progress_Summary SHALL display a per-course breakdown of study time (hours and minutes) for the week.
3. WHEN a Weekly_Goal is met (progress ≥ target), THE Progress_Summary SHALL display the goal with a success indicator and award 25 XP per goal met via the `award-xp` Edge Function with source `weekly_goal`.
4. THE Progress_Summary SHALL display a per-CLO study time breakdown for courses where Study_Sessions were linked to specific CLOs.
5. THE Progress_Summary SHALL be accessible from the Weekly_Planner page via a "Check Progress" tab or button.

#### Requirement 12: Study Time Analytics

**User Story:** As a Student, I want to see trends in my study time over multiple weeks, so that I can understand my long-term study patterns.

##### Acceptance Criteria

1. THE Platform SHALL display a bar chart showing total study hours per week for the last 8 weeks.
2. THE Platform SHALL display the average study hours per week over the displayed period.
3. THE chart SHALL support toggling between "All Courses" and individual course views.

### SECTION E: Reflection (Reflect Phase)

#### Requirement 13: Session and Weekly Reflections

**User Story:** As a Student, I want to write reflections after study sessions and at the end of each week, so that I can practice metacognitive learning.

##### Acceptance Criteria

1. WHEN a Study_Session is completed, THE Platform SHALL optionally prompt the Student to write a Session_Reflection (minimum 30 words).
2. THE Weekly_Planner SHALL provide a "Weekly Reflection" section accessible at the end of each week, prompting the Student to reflect on what worked, what to improve, and goals for next week.
3. WHEN a Session_Reflection is saved (≥30 words), THE Platform SHALL award 10 XP via the `award-xp` Edge Function with source `session_reflection`.
4. WHEN a Weekly Reflection is saved (≥50 words), THE Platform SHALL create a journal entry in the existing `journal_entries` table, triggering the standard journal XP award (20 XP).
5. THE Platform SHALL store Session_Reflections in the `session_reflections` table linked to the Study_Session.

### SECTION F: Data Model and Security

#### Requirement 14: Study Session Data Model

**User Story:** As the system, I want a well-structured data model for study sessions, tasks, goals, and evidence, so that planner data is stored efficiently with proper access control.

##### Acceptance Criteria

1. THE Platform SHALL create a `study_sessions` table with columns: `id` (uuid PK), `student_id` (FK to profiles), `course_id` (FK to courses), `title` (varchar 255), `description` (text, nullable), `planned_date` (date), `planned_start_time` (time), `planned_duration_minutes` (integer), `actual_start_at` (timestamptz, nullable), `actual_end_at` (timestamptz, nullable), `actual_duration_minutes` (integer, nullable), `timer_mode` (enum: pomodoro, custom), `status` (enum: planned, in_progress, completed, cancelled), `satisfaction_rating` (integer 1–5, nullable), `clo_ids` (uuid array, nullable), `created_at` (timestamptz), `updated_at` (timestamptz).
2. THE Platform SHALL create a `planner_tasks` table with columns: `id` (uuid PK), `student_id` (FK to profiles), `title` (varchar 255), `description` (text, nullable), `due_date` (date), `priority` (enum: low, medium, high), `status` (enum: pending, completed), `course_id` (FK to courses, nullable), `completed_at` (timestamptz, nullable), `created_at` (timestamptz), `updated_at` (timestamptz).
3. THE Platform SHALL create a `weekly_goals` table with columns: `id` (uuid PK), `student_id` (FK to profiles), `week_start_date` (date), `goal_type` (enum: study_hours, sessions_completed, tasks_completed), `target_value` (numeric), `created_at` (timestamptz), `updated_at` (timestamptz), with a unique constraint on (student_id, week_start_date, goal_type).
4. THE Platform SHALL create a `session_evidence` table with columns: `id` (uuid PK), `session_id` (FK to study_sessions), `student_id` (FK to profiles), `file_url` (text), `file_name` (varchar 255), `file_size_bytes` (integer), `mime_type` (varchar 100), `notes` (text, nullable), `created_at` (timestamptz). Session_Evidence records SHALL be append-only (no UPDATE or DELETE).
5. THE Platform SHALL create a `session_reflections` table with columns: `id` (uuid PK), `session_id` (FK to study_sessions), `student_id` (FK to profiles), `content` (text), `word_count` (integer), `created_at` (timestamptz). Session_Reflections SHALL be append-only.

#### Requirement 15: Row-Level Security Policies

**User Story:** As the system, I want RLS policies on all planner-related tables, so that data access is properly scoped by role.

##### Acceptance Criteria

1. RLS policies on `study_sessions` SHALL ensure: Students can SELECT, INSERT, and UPDATE their own sessions; Students cannot DELETE completed sessions; Teachers can SELECT study sessions for students in their courses (for CLO-linked sessions only).
2. RLS policies on `planner_tasks` SHALL ensure: Students can SELECT, INSERT, UPDATE, and DELETE their own tasks; no other role can access individual student tasks.
3. RLS policies on `weekly_goals` SHALL ensure: Students can SELECT, INSERT, and UPDATE their own goals; no other role can access individual student goals.
4. RLS policies on `session_evidence` SHALL ensure: Students can SELECT and INSERT their own evidence; Teachers can SELECT evidence for students in their courses (for CLO-linked sessions); no role can UPDATE or DELETE evidence records.
5. RLS policies on `session_reflections` SHALL ensure: Students can SELECT and INSERT their own reflections; no role can UPDATE or DELETE reflections.
6. THE Platform SHALL create a Supabase Storage bucket `session-evidence` with RLS policies allowing students to upload files to their own folder (`session-evidence/{student_id}/*`) and teachers to read evidence files for their course students.

### SECTION G: Integration with Existing Systems

#### Requirement 16: Gamification Integration

**User Story:** As the system, I want study sessions and planner tasks to integrate with the existing gamification engine, so that self-directed study is rewarded consistently.

##### Acceptance Criteria

1. THE `award-xp` Edge Function SHALL accept `study_session`, `planner_task`, `session_reflection`, and `weekly_goal` as valid XP sources.
2. THE `check-badges` Edge Function SHALL support a `study_session` trigger type for checking study-related badge conditions.
3. THE Platform SHALL define a "Study Starter" badge awarded WHEN a student completes their first Study_Session.
4. THE Platform SHALL define a "Deep Focus" badge awarded WHEN a student completes a single Study_Session of 60 minutes or more.
5. THE Platform SHALL define a "Weekly Warrior" badge awarded WHEN a student meets all 3 Weekly_Goals in a single week.
6. THE Platform SHALL define a "Evidence Pro" badge awarded WHEN a student attaches evidence to 10 Study_Sessions.

#### Requirement 17: Habit Tracking Integration

**User Story:** As the system, I want completed study sessions to count toward the daily "Read" habit, so that study activity contributes to the existing habit tracking system.

##### Acceptance Criteria

1. WHEN a Student completes a Study_Session of 15 minutes or more, THE Platform SHALL automatically mark the "Read" habit as completed for that day in `habit_logs` (if not already marked).
2. THE Today_View SHALL display the current daily habit status, reflecting any habits auto-completed by study sessions.
3. THE habit auto-completion SHALL NOT award duplicate XP — the habit XP is separate from the study session XP.

#### Requirement 18: Parent Visibility

**User Story:** As a Parent, I want to see my child's weekly study plan and session logs, so that I can support their study habits.

##### Acceptance Criteria

1. THE Parent dashboard SHALL display a read-only view of the linked student's Weekly_Planner showing scheduled and completed Study_Sessions and Planner_Tasks.
2. THE Parent dashboard SHALL display the linked student's Weekly_Goals with progress indicators.
3. THE Parent dashboard SHALL display the linked student's total study hours for the current week.
4. RLS policies SHALL ensure Parents can only access planner data for students linked via `parent_student_links` where `verified = true`.
5. THE Parent view SHALL NOT display Session_Reflections or session notes (private to the student).

### SECTION H: Non-Functional Requirements

#### Requirement 19: Performance

**User Story:** As a Student, I want the planner and focus mode to be fast and responsive, so that planning and studying feel seamless.

##### Acceptance Criteria

1. THE Weekly_Planner page SHALL load and render within 1 second, including data fetch for the current week.
2. THE Today_View SHALL load and render within 800 milliseconds.
3. THE Focus_Mode timer SHALL update the display every second with less than 50 milliseconds of drift over a 25-minute interval.
4. THE session evidence file upload SHALL complete within 5 seconds for a 5MB file on a standard broadband connection.

#### Requirement 20: Offline Resilience

**User Story:** As a Student, I want the focus mode timer to continue working if I briefly lose internet connection, so that my study session is not interrupted.

##### Acceptance Criteria

1. IF the network connection is lost while Focus_Mode is active, THEN THE Platform SHALL continue running the timer locally and queue any pending API calls (session status updates, XP awards) for retry when connectivity is restored.
2. IF the network connection is lost while Focus_Mode is active, THEN THE Platform SHALL display a subtle "Offline" indicator without interrupting the timer.
3. WHEN network connectivity is restored, THE Platform SHALL automatically sync queued session data to the server.

#### Requirement 21: Accessibility

**User Story:** As a Student using assistive technology, I want the planner and focus mode to be accessible, so that I can use the feature regardless of ability.

##### Acceptance Criteria

1. THE Focus_Mode timer SHALL announce time remaining via ARIA live regions at 5-minute intervals and at the 1-minute mark.
2. THE Weekly_Planner calendar grid SHALL be keyboard-navigable using arrow keys to move between days and Enter to open day details.
3. THE Today_View timeline items SHALL be navigable via Tab key with clear focus indicators.
4. All interactive elements in the planner and focus mode SHALL meet a minimum touch target of 44×44 pixels on mobile.
5. THE Focus_Mode completion audio notification SHALL be accompanied by a visual notification for users who cannot hear audio.


### SECTION I: Pre-Learning Rituals & Flow Optimization

#### Requirement 22: Session Intent Step

**User Story:** As a Student, I want to set a clear intention before starting a study session, so that I begin each session with focused goals aligned with self-regulated learning principles.

##### Acceptance Criteria

1. WHEN a Student starts a Study_Session, THE Platform SHALL display a Session_Intent dialog before launching Focus_Mode, requiring the student to answer: "What specific concept will you work on?" (text, 5–200 characters) and "What does success look like for this session?" (text, 5–200 characters).
2. THE Platform SHALL auto-suggest Session_Intent concepts based on the student's upcoming assignment deadlines and CLOs with attainment below 70%.
3. WHEN the Student submits a Session_Intent, THE Platform SHALL store the intent in the `session_intents` table linked to the Study_Session and then launch Focus_Mode.
4. THE Platform SHALL allow the Student to skip the Session_Intent step via a "Skip" button, launching Focus_Mode without an intent record.
5. WHEN a Study_Session has a Session_Intent, THE Focus_Mode SHALL display the intent text alongside the timer for reference during the session.

#### Requirement 23: Flow State Micro-Check-Ins

**User Story:** As a Student, I want brief check-ins during Pomodoro breaks to report how my session is going, so that the platform can help me maintain an optimal challenge-skill balance.

##### Acceptance Criteria

1. WHILE in Pomodoro_Mode, WHEN a work interval ends and a break begins, THE Platform SHALL display a Flow_Check_In dialog with three options: "In the zone," "Stuck," or "Too easy."
2. WHEN the Student selects "Stuck," THE Platform SHALL offer a link to launch the AI Tutor pre-scoped to the Study_Session's linked CLO.
3. WHEN the Student selects "Too easy," THE Platform SHALL suggest advancing to a higher Bloom's Taxonomy level task for the same CLO.
4. THE Platform SHALL store each Flow_Check_In response in the `flow_check_ins` table linked to the Study_Session and the interval number.
5. THE Platform SHALL allow the Student to dismiss the Flow_Check_In dialog without responding, proceeding directly to the break.
6. WHILE in Custom_Timer_Mode with a duration of 50 minutes or more, THE Platform SHALL display a Flow_Check_In at the midpoint of the session.

#### Requirement 24: Low-Friction Evidence Capture

**User Story:** As a Student, I want multiple lightweight options for capturing evidence after a session, so that documenting my work does not break my flow or discourage session completion.

##### Acceptance Criteria

1. WHEN a Study_Session is completed, THE session completion form SHALL offer three evidence capture tiers: Quick_Thought (single-line text, max 280 characters), text notes (multi-line, optional), and file upload (existing EvidenceUploader).
2. THE Platform SHALL auto-capture session metadata as minimal evidence: session duration, course, CLOs studied, Session_Intent text (if set), and Flow_Check_In responses (if any).
3. THE Platform SHALL store Quick_Thought entries in the `session_evidence` table with `mime_type` set to `text/quick-thought` and the text stored in the `notes` field.
4. THE session completion form SHALL default to the Quick_Thought input as the primary evidence option, with file upload available via an "Attach Files" expansion.
5. WHEN the Student submits a Quick_Thought or text note, THE Platform SHALL count the entry as evidence for the purposes of the evidence XP bonus (10 XP).

### SECTION J: Spaced Repetition Integration

#### Requirement 25: Automatic Review Scheduling

**User Story:** As a Student, I want the platform to automatically schedule review sessions after I study a CLO, so that I retain material according to spaced repetition principles.

##### Acceptance Criteria

1. WHEN a Study_Session linked to one or more CLOs is completed, THE Platform SHALL create Spaced_Repetition_Schedule entries for each linked CLO with review dates at 1 day, 3 days, and 7 days after the session date.
2. IF a Spaced_Repetition_Schedule entry already exists for the same CLO and review date, THEN THE Platform SHALL NOT create a duplicate entry.
3. THE Platform SHALL store Spaced_Repetition_Schedule entries in the `review_schedules` table with fields: student_id, clo_id, course_id, source_session_id, review_date, interval_days (1, 3, or 7), and status (pending, completed, skipped).
4. THE Weekly_Planner SHALL display pending Review_Sessions from the Spaced_Repetition_Schedule as suggested items in the corresponding day columns, visually distinct from student-created sessions.

#### Requirement 26: Review Session Management

**User Story:** As a Student, I want to see and act on scheduled review sessions in my planner, so that I can complete reviews and strengthen my retention.

##### Acceptance Criteria

1. THE Weekly_Planner SHALL display Review_Sessions with a distinct visual badge indicating the review interval (e.g., "Day 1 Review," "Day 3 Review," "Day 7 Review").
2. WHEN a Student starts a Review_Session from the planner, THE Platform SHALL create a Study_Session linked to the review's CLO and course, pre-populate the title with "Review: {CLO title}," and launch Focus_Mode.
3. WHEN a Review_Session's Study_Session is completed, THE Platform SHALL update the corresponding `review_schedules` entry status to `completed`.
4. THE Platform SHALL allow a Student to skip a Review_Session by marking the `review_schedules` entry status as `skipped`.
5. WHEN a review date has passed and the Review_Session was not completed or skipped, THE Today_View SHALL display the review with a "Missed Review" indicator.

#### Requirement 27: Review Session XP Incentives

**User Story:** As a Student, I want to earn bonus XP for completing review sessions, so that I am motivated to follow through on spaced repetition.

##### Acceptance Criteria

1. WHEN a Review_Session is completed, THE Platform SHALL award a 15 XP bonus on top of the standard Study_Session XP via the `award-xp` Edge Function with source `review_session`.
2. THE `award-xp` Edge Function SHALL accept `review_session` as a valid XP source with a fixed amount of 15 XP.
3. WHEN a Student completes all 3 review intervals (Day 1, Day 3, Day 7) for a single CLO, THE Platform SHALL award a 25 XP completion bonus via the `award-xp` Edge Function with source `review_cycle_complete`.

### SECTION K: Reflection Quality & Frameworks

#### Requirement 28: Structured Reflection Templates

**User Story:** As a Student, I want guided reflection templates with structured prompts, so that I can write deeper, more meaningful reflections instead of unstructured free-text.

##### Acceptance Criteria

1. WHEN a Student opens the Session_Reflection or Weekly Reflection input, THE Platform SHALL offer a Reflection_Template selector with options: "Free-form" (default), "Simple" (What went well? / What was challenging? / What will I do differently?), and "Gibbs' Cycle" (Description, Feelings, Evaluation, Analysis, Conclusion, Action Plan).
2. WHEN the Student selects the "Simple" template, THE Platform SHALL display three labeled text areas with the corresponding prompts.
3. WHEN the Student selects the "Gibbs' Cycle" template, THE Platform SHALL display six labeled text areas with the corresponding Gibbs' Reflective Cycle stage prompts.
4. THE Platform SHALL concatenate template section responses into a single text for storage, preserving section headers as markdown headings.
5. THE Platform SHALL apply the same minimum word count requirements to templated reflections as to free-form reflections (30 words for session, 50 words for weekly), counted across all sections combined.

#### Requirement 29: AI Reflection Prompts

**User Story:** As a Student, I want personalized reflection prompts that reference my specific CLO progress, so that my reflections are relevant and actionable.

##### Acceptance Criteria

1. WHEN a Student opens a Session_Reflection input, THE Platform SHALL display an AI-generated prompt referencing the Study_Session's linked CLOs and the student's current attainment levels for those CLOs.
2. WHEN a Student opens the Weekly Reflection input, THE Platform SHALL display an AI-generated prompt referencing the student's weekly progress, goals met or missed, and CLOs studied that week.
3. THE AI-generated prompts SHALL be displayed as optional suggestions above the reflection input, not as required fields.
4. IF the Platform cannot generate an AI prompt (Edge Function failure or no CLO data), THEN THE Platform SHALL fall back to a generic prompt: "What did you learn today?" for sessions or "How did your week go?" for weekly reflections.

#### Requirement 30: Reflection Consolidation

**User Story:** As a Student, I want a streamlined reflection experience that avoids redundant prompts, so that reflection feels purposeful rather than like busywork.

##### Acceptance Criteria

1. THE Platform SHALL limit reflection prompts to a maximum of one per Study_Session (the session completion form) and one per week (the Weekly Reflection panel).
2. WHEN a Student has already written a Session_Reflection for a completed Study_Session, THE Platform SHALL NOT prompt for reflection again for that session.
3. THE Weekly Reflection panel SHALL pre-populate a summary of the week's Session_Reflections (if any) as context, allowing the student to build on previous thoughts rather than starting from scratch.
4. THE Platform SHALL display a "Reflection streak" indicator showing consecutive weeks with a completed Weekly Reflection, encouraging consistency without requiring daily reflections.

### SECTION L: AI Reflection Synthesis

#### Requirement 31: Monthly Reflection Digest

**User Story:** As a Student, I want a monthly AI-generated summary of my journal entries and reflections, so that I can see patterns in my learning and growth over time.

##### Acceptance Criteria

1. THE Platform SHALL generate a Reflection_Digest at the end of each calendar month via the `generate-reflection-digest` Edge Function, analyzing all journal entries and Session_Reflections from that month.
2. THE Reflection_Digest SHALL include: recurring themes (top 3–5 topics), growth patterns (areas of improvement over the month), emotional trends (sentiment analysis summary), and suggested focus areas for the next month.
3. THE Platform SHALL store the Reflection_Digest in the `reflection_digests` table with fields: student_id, month (date, first of month), themes (jsonb), growth_patterns (jsonb), emotional_trends (jsonb), suggested_focus (jsonb), generated_at (timestamptz).
4. THE Platform SHALL display the Reflection_Digest on the student's Weekly_Planner page in a dedicated "Monthly Insights" card, accessible from the Reflect tab.
5. IF a Student has fewer than 3 journal entries or Session_Reflections in a month, THEN THE Platform SHALL NOT generate a Reflection_Digest for that month and SHALL display a message: "Write at least 3 reflections this month to unlock your Monthly Insights."

#### Requirement 32: Reflection Digest Sharing

**User Story:** As a Student, I want to share my monthly reflection digest with my advisor or parent, so that they can support my learning journey with informed guidance.

##### Acceptance Criteria

1. THE Platform SHALL provide a "Share Digest" button on the Reflection_Digest card with options: "Share with Parent" and "Share with Advisor."
2. WHEN the Student shares a Reflection_Digest with a Parent, THE Platform SHALL make the digest visible on the Parent dashboard for the linked student.
3. WHEN the Student shares a Reflection_Digest with an Advisor, THE Platform SHALL send a notification to the advisor (teacher role) with a link to view the digest.
4. THE Platform SHALL record sharing actions in the `reflection_digests` table via `shared_with` (jsonb array of {role, user_id, shared_at}).
5. THE Student SHALL be able to revoke sharing at any time, removing the digest from the recipient's view.

### SECTION M: Journal Quality Assurance

#### Requirement 33: AI Quality Scoring for Reflections

**User Story:** As the system, I want to assess the quality of journal entries and reflections using AI, so that the platform can provide feedback and discourage low-effort submissions.

##### Acceptance Criteria

1. WHEN a journal entry or Session_Reflection is saved, THE Platform SHALL submit the text to the `score-reflection-quality` Edge Function for quality assessment.
2. THE `score-reflection-quality` Edge Function SHALL return a Quality_Score (0–100) evaluating: originality (similarity to the student's previous 10 entries), relevance (references to CLOs, courses, or learning concepts), and metacognitive depth (evidence of self-awareness, analysis, or planning).
3. THE Platform SHALL store the Quality_Score in the `reflection_quality_scores` table with fields: reflection_id, reflection_type (session_reflection or journal_entry), student_id, score (integer 0–100), originality_score (integer 0–100), relevance_score (integer 0–100), depth_score (integer 0–100), flags (text array), scored_at (timestamptz).
4. THE Platform SHALL flag entries with a Quality_Score below 30 as "low quality" with flags indicating the reason: `similar_to_previous` (>60% similarity to a recent entry), `off_topic` (no relevance to learning content), or `ai_generated` (detected AI-generated patterns).
5. IF the `score-reflection-quality` Edge Function fails, THEN THE Platform SHALL save the reflection without a Quality_Score and retry scoring in the background.

#### Requirement 34: Quality-Based XP Adjustment

**User Story:** As the system, I want to adjust XP awards based on reflection quality, so that students are incentivized to write thoughtful reflections rather than gaming the system.

##### Acceptance Criteria

1. WHEN a journal entry or Session_Reflection receives a Quality_Score below 30, THE Platform SHALL reduce the XP award to 5 XP instead of the standard amount (20 XP for journal, 10 XP for session reflection).
2. WHEN a journal entry or Session_Reflection receives a Quality_Score of 80 or above, THE Platform SHALL award a bonus of 10 XP on top of the standard amount.
3. WHEN a reflection entry references specific CLOs or demonstrates metacognitive awareness (Quality_Score relevance_score ≥ 70 or depth_score ≥ 70), THE Platform SHALL award a bonus of 10 XP on top of the standard amount.
4. THE Platform SHALL display a Quality_Feedback banner on the reflection input showing the Quality_Score category: "Thoughtful reflection" (≥80), "Good effort" (30–79), or "Try adding more detail" (<30), with specific suggestions for improvement.
5. THE Platform SHALL NOT display the numeric Quality_Score to the student — only the category label and improvement suggestions.
6. THE maximum combined XP for a single reflection (base + quality bonus + CLO reference bonus) SHALL be capped at 40 XP for journal entries and 30 XP for session reflections.
