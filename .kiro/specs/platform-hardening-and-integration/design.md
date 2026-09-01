# Platform Hardening & Integration — Design

## Design principles
1. **No parallel data.** Every module reads/writes the canonical tables; aggregation happens in SQL/RPC views, never client-side copies.
2. **Fail-closed AI.** All AI outputs (suggestions, drafts, questions) require human approval before becoming official; the proposal/approval boundary (agent_action_proposals) stays the only write path for protected actions.
3. **Propagation by triggers/rollups.** Cross-module updates (attendance→triage, grades→attainment, approvals→availability) use Postgres triggers/RPCs + targeted TanStack Query invalidations, not manual sync.
4. **Evidence chain integrity.** ILO→PLO→CLO→Course→Assessment→Student-evidence drill-down is served by existing outcome tables + mapping conventions (source_outcome_id=parent, target_outcome_id=child).
5. **Design system fidelity.** White liquid-glass cards (`bg-white/80 border border-slate-200/60 backdrop-blur-xs`), transparent icon containers, logical (ms-/me-) spacing, en/ar parity for every new string.

## Key design decisions
- **Orchestrator boot guard**: `check:edge-imports.mjs` statically validates every named relative import in `supabase/functions/**` (entrypoints are invisible to vitest/tsc). Wired as `npm run check:edge-imports`; must run before any function deploy.
- **Rubrics RLS (E1.5)**: migration adds `created_by uuid DEFAULT auth.uid()` to `rubrics` (if absent) + `updated_at` touch trigger; client inserts include `created_by`; MCP-applied + parity mirror file committed.
- **Sort order (E1.7)**: shared `sortOrderInputSchema = z.coerce.number().int().min(0, { message: t(...) })` in `src/lib/schemas/`; inputs use value-as-number with empty→0; error toasts mapped through the central error-message helper.
- **Notification toggles (E1.8)**: mutation variables carry the pref key; `isPending` compared per-variable; optimistic setQueryData patch on the single row.
- **Grading Queue (E2.A)**: rubric coverage computed from existing rubric_criteria vs AI feedback criteria references (no new AI call); confidence = criteria covered / total; `ai_edited_by_teacher` flag column addition (migration) distinguishes edited feedback.
- **Question Bank (E2.C)**: usage analytics from existing attempts/submissions via SQL view `question_usage_stats_v1`; generation context restricted to approved materials + confirmed CLO mappings (server-side filter in generate-quiz-questions).
- **Attendance (E2.E)**: `record_attendance_v1(idempotency by session_id)` RPC upserts once per session, then recomputes percentages and refreshes risk signals via existing habit/risk functions; UI computes % server-side only.
- **Gradebook (E2.D/E1.11)**: letter scale centralized in `src/lib/gradeScale.ts` with pinned thresholds + property tests; matrix remains read-only aggregation of grades/submissions.
- **Handoffs (E2.F/E1.10)**: verify `teacher_handoff_requests` live; tutor function inserts on defined triggers only; teacher respond RPC resolves + messages student; regen `src/types/database.ts` to drop the `any` cast.
- **Coordinator connectivity (E3.*)**: drill-downs reuse existing outcome/mapping/assessment tables via SQL views; no new aggregates; each "next action" deep-links into existing routes (Matrix, CQI, assessments).

## Testing strategy
- Unit: grade-scale property tests, sort-order schema tests, toggle per-key behavior, rubric validation.
- Integration-RLS: rubric teacher insert path; attendance idempotent upsert; handoff create/read per role.
- E2E (existing Playwright suite): extend grading-queue + attendance flows after fixes.
- Gates per task: lint / tsc / vitest / i18n:check / check:edge-imports / db:check-replay / check:runtime-dependencies.
