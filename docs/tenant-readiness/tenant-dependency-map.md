# Tenant ownership and dependency map

This map reflects the current repository and read-only production metadata on 2026-08-05. It is an operator safety artifact, not permission to delete data.

## Direct `institution_id` ownership

The production `public` schema contains 49 direct tenant tables:

`academic_calendar_events`, `accreditation_approvals`, `accreditation_generated_reports`, `accreditation_report_jobs`, `ai_assistance_events`, `ai_governance_policies`, `audit_logs`, `badge_definitions`, `badge_spotlight_schedule`, `blooms_progression`, `class_donations`, `communication_threads`, `competency_frameworks`, `coordinator_ai_insights`, `course_material_embeddings`, `departments`, `development_seed_runs`, `fee_accounts`, `friendships`, `graduate_attributes`, `institution_contacts`, `institution_settings`, `invitations`, `knowledge_quests`, `learning_outcomes`, `marketplace_items`, `mastery_recovery_pathways`, `onboarding_questions`, `outcome_attainment_snapshots`, `profiles`, `program_accreditations`, `programs`, `question_bank`, `quiz_generation_logs`, `sale_events`, `semesters`, `social_challenges`, `student_content`, `student_profiles`, `surveys`, `teacher_handoff_requests`, `teams`, `tutor_conversations`, `tutor_llm_logs`, `tutor_plan_updates`, `tutor_usage_limits`, `verified_explanations`, `xp_events`, and `xp_purchases`.

## Indirect tenant anchors

| Anchor                    | Important dependent tables                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles` / Auth user    | onboarding responses/progress, Parent links, enrollments, submissions, attendance, journals, habits, study/planner/reflection rows, notifications, activity, XP, badges, gamification, AI feedback, Tutor messages, communications, friendships, fees, audit actors |
| `programs`                | courses, program accreditation, CQI plans, program outcomes and mappings                                                                                                                                                                                            |
| `courses`                 | sections, assignments, announcements, modules, discussions, quizzes, teams, study/review rows, course outcomes                                                                                                                                                      |
| `course_sections`         | class sessions, timetable slots, section enrollments                                                                                                                                                                                                                |
| `assignments`             | submissions, grade/evidence chain, announcement/deadline references                                                                                                                                                                                                 |
| `submissions`             | grades and evidence                                                                                                                                                                                                                                                 |
| `class_sessions`          | attendance records and session evidence/reflections                                                                                                                                                                                                                 |
| `learning_outcomes`       | mappings, rubrics, attainment, sub-CLOs, evidence, baseline and Bloom progression                                                                                                                                                                                   |
| `teams` / challenges      | team members/invitations/badges/health/gamification, challenge participants/progress, replacement votes, peer-teaching records                                                                                                                                      |
| `fee_accounts` / invoices | invoice items, payment allocations, receipts, credits and refunds                                                                                                                                                                                                   |
| `communication_threads`   | participants, messages and read receipts                                                                                                                                                                                                                            |
| `development_seed_runs`   | `development_seed_entities` ownership manifest                                                                                                                                                                                                                      |

Many cleanup paths depend on profile/user IDs rather than a direct `institution_id`. A reset must resolve and freeze the approved tenant ID sets first; it must never use a global delete or infer ownership from an email domain alone.

## Auth and invitations

- `profiles.id` is the application identity corresponding to `auth.users.id`; tenant ownership lives in the profile.
- Users must be checked for every supported membership/relationship path before deletion. The current schema has no separate multi-tenant membership table; this must be rechecked at run time.
- Production invitations still use the legacy raw-token schema. PR #237 adds hashed-token lifecycle migrations and preview/acceptance functions, but those changes are not deployed.
- Email delivery/event tables from PR #237 do not exist in production and must not be assumed by current-backend tooling.

## Storage

- Tenant identity may be encoded in bucket paths, object ownership, or the owning database row.
- Current Noor fixtures use a `noor/` prefix in course materials, reports and submissions.
- Current Gulf has no detected tenant-path or profile-owner objects.
- Avatar paths without a tenant prefix or profile owner are unknown and block destructive cleanup.
- A future reset deletes only objects present in an approved manifest; it never lists and deletes a whole bucket.

## Append-only and retained history

`audit_logs` and rate-limit/audit event streams are retained. The reset plan must not disable their triggers, update/delete their rows, or bypass append-only controls. Retained rows must not grant application access and must record the reset run through the normal append-only path.

## Dependency-safe deletion layers

1. Receipts, allocations, grades, evidence, replies, reads, attachments, messages, and other terminal children.
2. Submissions, attendance, session/reflection rows, notifications/activity, gamification transactions, Parent links, enrollments, team membership, and seed-owned Storage objects.
3. Assignments, rubrics, modules/material metadata, discussions, class sessions, timetable slots, outcome mappings/attainment, CQI/accreditation children, invoices.
4. Sections, courses, program outcomes, teams/challenges, fee accounts.
5. Programs, departments, semesters, direct tenant configuration rows that are explicitly approved for reset.
6. Approved fixture profiles and Auth users after session revocation.
7. Preserve the institution row, approved branding/settings, and append-only logs.

`RESTRICT`, `NO ACTION`, `SET NULL`, and `CASCADE` foreign keys are mixed throughout the schema. The operator must verify actual constraints at run time and generate a plan before execution; it must not depend on cascade behavior as an ownership proof.

## Overlapping seed mechanisms

- `supabase/seed.sql` creates a separate “Seed Demo University” with random IDs and only a sentinel institution-name check.
- `scripts/seed-noor-golden-graph.ts` is deterministic in part but production-coupled, deletes title-matched rows, and marks only 12 entities.
- `scripts/setup-accreditation-reports.ts` separately seeds Noor accreditation/Storage data.
- migrations seed shared onboarding, marketplace, badge and challenge reference data.
- Playwright fixtures have a separate preview-only seed path.

The replacement design should consolidate Noor ownership and planning without rewriting migration history or treating shared reference rows as tenant reset candidates.

## Review-required scoping surfaces

Indirect-only tables, polymorphic IDs, JSON metadata references, unowned Storage paths, and user-ID-scoped tables require explicit catalog entries and cross-tenant tests. Their existence is a cleanup risk, not by itself proof of an RLS defect. Only evidence-backed authorization defects should produce migrations.
