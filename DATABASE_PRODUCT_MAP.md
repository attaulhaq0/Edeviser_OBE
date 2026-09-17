# DATABASE PRODUCT MAP — ACTUAL IMPLEMENTATION AUDIT
**Date:** 2026-09-12 | **Source:** `src/types/database.ts`

## ACTIVE DOMAINS BY TABLE COUNT
- **OBE Outcomes**: 9 tables (learning_outcomes, outcome_mappings, outcome_attainment, graduate_attributes, sub_clos, etc.) — ACTIVE
- **Assessment & Evidence**: ~18 tables (assignments, submissions, grades, evidence, rubrics, quizzes, quiz_attempts, quiz_questions, question_bank, baseline_*, micro_assessment_schedule) — ACTIVE
- **Gamification**: ~20 tables (xp_transactions, badges, badge_definitions, marketplace_items, teams, team_gamification, leaderboard_weekly, student_gamification) — ACTIVE
- **Habits & Study**: ~15 tables (habit_logs, habit_tracking, study_sessions, session_evidence, journal_entries, planner_tasks, weekly_goals, wellness_*, flow_check_ins, starter_week_sessions) — ACTIVE
- **Agent & Intelligence**: ~18 tables (agent_runs, agent_messages, agent_tool_calls, agent_action_proposals, proactive_agent_jobs, tutor_conversations, tutor_messages, course_material_embeddings) — ACTIVE
- **Intervention & CQI**: ~12 tables (learning_interventions, intervention_measurements, intervention_outcomes, cqi_action_plans, cqi_systemic_patterns, accreditation_report_jobs, competency_frameworks) — ACTIVE
- **LMS Infrastructure**: ~12 tables (attendance_records, announcements, discussion_threads, lessons, timetable_slots, academic_calendar_events, notifications, course_materials) — ACTIVE
- **Parent**: 5 tables (parent_student_links, parent_encouragements, parent_reminders, parent_saved_support_actions, student_support_states) — ACTIVE
- **Institutional**: ~13 tables (institutions, institution_settings, departments, programs, semesters, courses, course_sections, profiles, student_profiles, student_courses) — ACTIVE
- **Admin & Ops**: ~15 tables (invitations, onboarding_*, audit_logs, login_attempts, fee_* (7), connected_integrations, blocked_ips, rate_limit_events) — ACTIVE
## TABLE STATUS CLASSIFICATION

| Status | Tables | Notes |
|--------|--------|-------|
| **ACTIVE** (populated, used) | ~130 tables | Core OBE, LMS, agent, gamification, habits |
| **SPARSE** (table exists, light data) | ~5 | habit_correlations, competency_outcome_mappings, cqi_systemic_patterns |
| **CONTRACT ONLY** (table exists, unused) | ~3 | assessment_blueprints, assessment_blueprint_slots |
| **LEGACY/ORPHANED** | ~0 | No orphaned tables found |
| **DUPLICATE OVERLAP** | ~2 | intervention_outcomes vs intervention_measurements (partial role overlap) |

## KEY INSIGHTS

1. **~130 active tables** is a substantial schema — this is not a prototype
2. **Tenant isolation**: All tables with `institution_id` — RLS enforces tenant scope
3. **Evidence provenance**: `evidence` table links grade_id → submission_id → clo_id/plo_id/ilo_id
4. **Agent audit trail**: 8+ tables track every agent run, tool call, proposal, and evaluation
5. **Gamification depth**: 20 tables for XP, badges, teams, marketplace — fully implemented
6. **Fee system**: 7 dedicated tables for billing — operational for paid institutions
7. **Learning state**: `student_learning_states` with 20+ JSON columns — dense, versioned
8. **No orphaned tables**: Every table found has at least one reference in hooks/lib/migrations
9. **Materialized views**: `mv_historical_evidence` for aggregated reporting
10. **491 migrations**: Very high migration count; schema evolved significantly

## VERDICT

The database schema is **ACTIVE, COHERENT, AND WELL-ORGANIZED BY DOMAIN**. Every declared domain has corresponding tables. The evidence→attainment cascade is fully represented. Agent operations are fully auditable. No orphaned or dead tables detected. The schema accurately reflects the product architecture.