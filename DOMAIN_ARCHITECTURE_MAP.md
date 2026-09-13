# DOMAIN ARCHITECTURE MAP — ACTUAL
**Date:** 2026-09-12 | **Source:** Codebase reverse-engineering

## DOMAIN: LMS (Learning Management System)
**Status: IMPLEMENTED, EXECUTABLE, CUSTOMER-VISIBLE**
- Tables: courses, assignments, submissions, grades, grade_categories, attendance_records, announcements, discussion_threads, lessons, timetable_slots, modules, course_materials, deadline_extensions
- Frontend: TeacherDashboard, GradebookView, GradingInterface, AttendanceMarker, AnnouncementEditor, ModuleManager, DiscussionForum → All connected via TanStack Query hooks
- APIs: Standard Supabase CRUD through hooks (useCourses, useAssignments, useSubmissions, useGrades, useGradebook, etc.)
- Tests: Unit tests for gradebookCalc, hooks, components
- Current: OPERATIONAL — Noor institution has active courses and submissions

## DOMAIN: LXP (Learning Experience Platform)
**Status: IMPLEMENTED, EXECUTABLE, CUSTOMER-VISIBLE**
- Gamification: XP (xp_transactions), badges (badges, badge_definitions), streaks (streakCalculator, process-streak), leaderboards (leaderboard_weekly), teams (teams, team_gamification), marketplace (marketplace_items, xp_purchases), league tiers (leagueTierCalculator)
- Learning Path: learning_path_nodes, useLearningPath, LearningPathPage
- Progress: CLOProgress, XPHistory, habit heatmap, analytics
- Frontend: StudentDashboard, LeaderboardPage, StudentBadgesPage, LearningPathPage, HabitHeatmapPage, StudentPortfolio
- Tests: Unit tests for streakCalculator, perfectDay, leagueTierCalculator
- Current: OPERATIONAL — Active XP transactions, badges, streaks in Noor

## DOMAIN: OBE (Outcome-Based Education)
**Status: IMPLEMENTED, EXECUTABLE, CUSTOMER-VISIBLE**
- Tables: learning_outcomes (ILO/PLO/CLO/SUB_CLO), outcome_mappings (source=parent→target=child), outcome_attainment (4 scopes), evidence (from grades), graduate_attributes, sub_clos
- Calculation: DB trigger (evidence from grades), calculate-attainment-rollup EF, RPCs (get_coordinator_analytics_v1, etc.)
- Frontend: Coordinator PLO/Sankey/Trends/Coverage pages, Teacher CLO/attainment, Student CLOProgress
- Tests: Unit + integration for attainment, gapAnalysis, outcomeChain
- Current: OPERATIONAL — Evidence→attainment cascade verified live

## DOMAIN: CURRICULUM / FRAMEWORK
**Status: PARTIALLY IMPLEMENTED (registry active, runtime adaptation NOT)**
- Tables: competency_frameworks (IB MYP, IGCSE, MoEHE seeded), competency_items, competency_outcome_mappings, institution_framework_assignments
- Config: courses.assessment_model (percent/criterion/band_grade/component), grade_scales (JSON definition)
- Agent: FrameworkContext injected into prompts (assessmentModel, accreditationBodies, curriculumCode, keyStage)
- Gap: assessment_model changes do NOT change evidence/attainment computation
- Current: FRAMEWORK REGISTRY ACTIVE, RUNTIME ADAPTATION CONTRACT ONLY

## DOMAIN: HABIT ENGINE
**Status: TRACKING IMPLEMENTED, INTELLIGENCE PARTIAL**
- Tables: habit_logs (4 types), habit_tracking, habit_correlations (sparse), student_habit_levels
- Logic: perfectDay.ts (4 habits → 50 XP), streakCalculator.ts (milestones, freezes, comeback), compute-habit-correlations EF
- Signals: student_learning_states.habits (JSON blobs, unstructured)
- BJ Fogg: NOT IMPLEMENTED (no MAP model, no behavior taxonomy, no motivation tracking)
- Current: DAILY TRACKER ACTIVE, INTELLIGENCE MODEL SHALLOW

## DOMAIN: AGENTIC INTELLIGENCE
**Status: IMPLEMENTED, EXECUTABLE, GATED**
- Architecture: 1 orchestrator + 10 specialists (prompt variants) + 21 read tools + 10 write tools
- Runtime: agent-orchestrator (synchronous user requests), agent-worker (proactive cron every 5 min), agent-evaluation-jobs (evaluation cron every 20 min)
- Data: 2,399 agent_runs, 845 proactive jobs, 3 interventions
- Approval: ALL write tools require human approval (student/teacher/coordinator/admin)
- Provider: DeepSeek (primary), AI_PROVIDER=deepseek
- Gate: All AI surfaces behind VITE_AI_FEATURE_ENABLED
- Current: DEPLOYED AND RUNNING, BUT FEATURES GATED

## DOMAIN: INTERVENTION
**Status: IMPLEMENTED, EXECUTABLE, LIMITED DATA**
- Tables: learning_interventions, intervention_measurements, intervention_outcomes
- State Machine: pending → approved → executed → measured → evaluated
- Cron: intervention-jobs (generate every hour, evaluate every 15 min)
- Measurement: interventionMeasurement.ts (deterministic, 5-point delta threshold)
- Current: 3 interventions total, 1 complete cycle proven

## DOMAIN: PARENT
**Status: IMPLEMENTED, EXECUTABLE, CUSTOMER-VISIBLE**
- Tables: parent_student_links (21 verified), parent_encouragements, parent_reminders, parent_saved_support_actions
- Pages: ParentDashboard, ParentAttendancePage, ParentChildrenPage, ParentProgressPage, ParentPlannerView, ParentCommunicationsPage, ParentSupportPage
- Security: RLS enforced, parent sees only verified linked children
- Current: OPERATIONAL

## DOMAIN: ACCREDITATION / EVIDENCE
**Status: IMPLEMENTED, EXECUTABLE**
- Tables: accreditation_approvals, accreditation_report_jobs, accreditation_generated_reports, program_accreditations
- Reports: generate-accreditation-report EF (10+ templates)
- Evidence: evidence table (grade→submission→outcome link), mv_historical_evidence
- Current: OPERATIONAL

## DOMAIN: CQI (Continuous Quality Improvement)
**Status: IMPLEMENTED, LIMITED LIVE DATA**
- Tables: cqi_action_plans, cqi_systemic_patterns, coordinator_ai_insights
- RPCs: detect_systemic_attainment_gaps_v1, classify_problem_cases_v1, get_coordinator_cqi_patterns_v1
- Logic: cqiInstitutionalLoop.ts (systemic pattern detection + effect measurement)
- Frontend: Coordinator CQI page, gap-analysis page
- Current: PATTERN DETECTION OPERATIONAL, MEASUREMENT HAS LIMITED LIVE DATA