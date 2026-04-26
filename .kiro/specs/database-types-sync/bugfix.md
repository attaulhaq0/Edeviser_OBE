# Bugfix Requirements Document

## Introduction

The auto-generated TypeScript type file `src/types/database.ts` is out of sync with the live Supabase database schema for project `cdlgtbvxlxjpcddjazzx`. The file was last regenerated before several major features (marketplace, planner, AI tutor, study sessions, team health, peer teaching, weekly goals, and others) were added to the database. This causes 612 TypeScript compilation errors across 99 files (76+ hooks, pages, and components), effectively blocking all CI checks and development.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a hook references a table that exists in the live Supabase schema but is missing from `src/types/database.ts` (e.g., `marketplace_items`, `planner_tasks`, `study_sessions`, `tutor_conversations`, `tutor_messages`, `weekly_goals`, `student_active_boosts`, `student_equipped_items`, `student_quest_progress`, `knowledge_quests`, `session_evidence`, `session_reflections`, `sale_events`, `class_donations`, `review_schedules`, `student_content`, `deadline_extensions`, `reflection_digests`, `flow_check_ins`, `teacher_handoff_requests`, `tutor_usage_limits`, `tutor_plan_updates`, `badge_definitions`, and others) THEN the TypeScript compiler emits TS2769 (no overload matches) errors because the table name is not a valid key in the `Database["public"]["Tables"]` type union

1.2 WHEN a hook accesses columns on tables that exist in `database.ts` but have had new columns added in the live schema (e.g., `planned_date`, `planned_duration_minutes`, `timer_mode`, `actual_start_at`, `actual_end_at`, `actual_duration_minutes`, `clo_ids`, `clo_scope`, `dynamic_price_override`, `xp_cost`, `xp_price`, `satisfaction_rating`, `health_score`, `health_status`, `tutor_autonomy_level`, `token_count`, `message_count`, `streak_count`, `cooperation_score`) THEN the TypeScript compiler emits TS2339 (property does not exist) errors

1.3 WHEN a hook uses enums that exist in the live Supabase schema but are missing from `database.ts` (e.g., `cosmetic_slot`, `marketplace_item_category`, `marketplace_item_sub_category`, `marketplace_stock_type`, `session_status_type`, `timer_mode_type`, `task_priority_type`, `task_status_type`, `goal_type_enum`, `xp_purchase_status`) THEN the TypeScript compiler emits TS2345 (argument type mismatch) or TS2322 (type not assignable) errors

1.4 WHEN a hook uses Supabase RPC functions that exist in the live schema but are missing from `database.ts` (e.g., `get_xp_balance`, `get_institution_total_earned`, `get_institution_total_spent`, `get_weekly_xp_flow`, `increment_donation_total`) THEN the TypeScript compiler emits TS2769 (no overload matches) errors

1.5 WHEN `npx tsc --noEmit` is run against the codebase THEN the compiler reports 612 errors across 99 files, broken down as: 188 TS2339 (property doesn't exist), 171 TS2345 (argument type mismatch), 147 TS2769 (no overload matches), 40 TS2322 (type not assignable), 20 TS2353 (object literal excess properties), 13 TS2305 (module has no exported member), 13 TS2589 (type instantiation excessively deep), and others

1.6 WHEN the CI pipeline runs THEN the `npx tsc --noEmit` step fails, blocking all pull requests and deployments

1.7 WHEN previous attempts were made to fix this by writing the Supabase MCP `generate_typescript_types` output to disk THEN the `fsWrite` tool truncated the file (which is ~5,000+ lines) and the Supabase CLI `npx supabase gen types --linked` failed with "Unauthorized", leaving temporary debug files (`.supabase-types-temp.txt`, `.supabase-types-temp.json`, `scripts/write-db-types.js`, `scripts/pipe-types.js`, `tsc_out.txt`, `tsc_check.txt`, `lint_out.txt`) in the repository

### Expected Behavior (Correct)

2.1 WHEN `src/types/database.ts` is regenerated from the live Supabase schema THEN it SHALL contain type definitions for all tables present in the live database, including all marketplace, planner, tutor, study session, team health, peer teaching, weekly goals, and other recently added tables

2.2 WHEN `src/types/database.ts` is regenerated THEN all columns present in the live schema for each table SHALL be reflected in the corresponding `Row`, `Insert`, and `Update` type definitions

2.3 WHEN `src/types/database.ts` is regenerated THEN all enums present in the live schema SHALL be reflected in the `Enums` section of the `Database` type

2.4 WHEN `src/types/database.ts` is regenerated THEN all RPC functions present in the live schema SHALL be reflected in the `Functions` section of the `Database` type

2.5 WHEN `npx tsc --noEmit` is run after the type file is updated THEN the compiler SHALL report zero errors (or only errors unrelated to database type mismatches)

2.6 WHEN the CI pipeline runs after the fix THEN the `npx tsc --noEmit`, `npm run lint`, and `npm test` steps SHALL all pass

2.7 WHEN the fix is complete THEN all temporary debug files created during previous fix attempts (`.supabase-types-temp.txt`, `.supabase-types-temp.json`, `scripts/write-db-types.js`, `scripts/pipe-types.js`, `tsc_out.txt`, `tsc_check.txt`, `lint_out.txt`) SHALL be removed from the repository

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `src/types/database.ts` is regenerated THEN the system SHALL CONTINUE TO export the `Database` type and `Json` helper type with the same top-level structure expected by `src/lib/supabase.ts` (`createClient<Database>(...)`)

3.2 WHEN `src/types/database.ts` is regenerated THEN all existing tables that were already correctly typed (e.g., `academic_calendar_events`, `profiles`, `courses`, `assignments`, `xp_transactions`, `institutions`, `semesters`, and the other ~68 tables in the current file) SHALL CONTINUE TO have their type definitions present and compatible

3.3 WHEN hooks that currently work correctly (e.g., `useCourses`, `useUsers`, `useILOs`, `usePLOs`, `useCLOs`, `useAttendance`, `useGradebook`) reference existing tables THEN they SHALL CONTINUE TO compile without errors

3.4 WHEN the `Database` type is used with `@supabase/supabase-js` `createClient<Database>()` THEN the Supabase client SHALL CONTINUE TO provide correct type inference for `.from()`, `.select()`, `.insert()`, `.update()`, `.delete()`, and `.rpc()` operations

3.5 WHEN `src/types/app.ts` and other application type files import from or reference `database.ts` types THEN those imports SHALL CONTINUE TO resolve correctly
