# Edge Function Schema-Drift Remediation — Requirements (stub)

## Introduction

This spec is **carved out of `production-bug-fixes` Track C (Req 19/22)**. While landing
the OBE-export fixes (Req 19) and the CI schema-contract checker
(`scripts/check-edge-fn-schema.mjs`, Req 22), the checker surfaced **45 pre-existing
schema-drift references across 16 other Edge Functions** — the same "compiles in Deno,
wrong column at runtime" class that broke the accreditation report and course-file
generators.

These are **real bugs** (each verified-or-strongly-indicated against the live
`cdlgtbvxlxjpcddjazzx` schema), but they are out of scope for the tightly-scoped Req 19
PR and each needs its own reproduce → verify-column → fix → (ideally) parity loop. They
are therefore **grandfathered in `scripts/edge-fn-schema-baseline.json`** so the CI gate
fails only on NEW drift, and tracked here for follow-up.

> Scope rule (inherited): no seeded gameplay/institutional data; backward-compatible
> contract preservation; gate every push (lint → tsc → test, + `db:check-edge-schema`).
> A fix is "done" only when the function's baseline entries are removed AND the checker
> stays green.

## How to work an item

1. `node scripts/check-edge-fn-schema.mjs --update-baseline` is **not** the fix — it only
   re-snapshots. To fix, correct the query to the real column/enum, then **delete** that
   function's entries from `edge-fn-schema-baseline.json` and confirm the checker is green.
2. Verify the real column against the live schema (MCP `execute_sql` on
   `information_schema.columns`) before changing — do not guess.
3. Preserve each function's request/response contract; change only the data-access layer.

## Backlog (grouped by function; column → likely real column)

### High-confidence real drift (column renamed/moved)

- **ai-at-risk-prediction** — `assignments.clo_ids` → `clo_weights` (jsonb `[{clo_id,weight}]`);
  `student_gamification.at_risk_signals` (verify table/column).
- **calculate-attainment-rollup** — `graduate_attribute_mappings.ilo_id` → `outcome_id`;
  `learning_outcomes.parent_outcome_id` (mappings live in `outcome_mappings`
  `source_outcome_id`/`target_outcome_id`).
- **chat-with-tutor** — `learning_outcomes.bloom_level` → `blooms_level`.
- **check-bonus-question** — `learning_outcomes.type="clo"` → enum value `"CLO"`.
- **embed-course-material** / **tutor-analytics** — `courses.institution_id` (no such
  column; derive via `programs.institution_id` using `courses.program_id`).
- **export-student-data** — `grades.created_at` → `graded_at`;
  `journal_entries.title` / `word_count` (verify).
- **generate-transcript** — `courses.title` (→ `name`); `grades.assignment_id` /
  `score` / `max_score` / `student_id` (grades join via `submission_id`; use
  `total_score`/`score_percent`).
- **select-adaptive-question** / **update-question-analytics** —
  `outcome_attainment.attainment_percentage` → `attainment_percent`;
  `outcome_attainment.scope="clo"` → real enum `student_course`.
- **suggest-goals** — `outcome_attainment.score` → `attainment_percent`;
  `scope="clo"` → `student_course`.
- **update-challenge-progress** — `habit_logs.log_date` (verify date column);
  `learning_outcomes.type="clo"` → `"CLO"`; `xp_transactions.course_id` (verify).

### Verify-then-fix (column may be intended elsewhere / latent)

- **award-xp** / **check-badges** / **process-streak** — `profiles.leaderboard_anonymous`
  (confirm whether this lives on `profiles` vs a gamification table).
- **check-badges** — `challenge_participants.is_winner` / `team_id` (verify schema).
- **challenge-progress-update** — `social_challenges.goal_metric` / `notification_sent_90`.
- **cqi-review-reminder** — `cqi_action_plans.next_review_date`.
- **generate-fee-receipt** — `fee_structures.title`.
- **select-adaptive-question** — `quizzes.total_questions`.

## Acceptance Criteria (per function)

1. WHEN a function is fixed THEN every `.from().select/.eq/...` reference SHALL resolve to
   a real column/enum in `src/types/database.ts`, and that function's entries SHALL be
   removed from `edge-fn-schema-baseline.json`.
2. WHEN all functions are fixed THEN `edge-fn-schema-baseline.json` SHALL be empty (or
   deleted) and `npm run db:check-edge-schema` SHALL pass with zero baselined findings.
3. WHEN a fix changes behaviour THEN it SHALL be covered by a regression test and verified
   against real data where the function has a reachable code path.

## Out of scope

- The two OBE-export functions (`generate-accreditation-report`, `generate-course-file`)
  — already fixed under `production-bug-fixes` Req 19 and intentionally NOT baselined.
- The checker itself (`production-bug-fixes` Req 22).
