# Edeviser Certification Remediation — Operator Runbook
# Apply these fixes in order to close the critical loops.

## Pre-Checks
1. Verify branch: `git branch --show-current` should be `feat/accreditation-platform-audit-fix`
2. Run test suite: `npm test` (must pass)
3. Run type check: `npx tsc --noEmit` (must pass)
4. Run lint: `npm run lint` (must pass)

## Fix 1: Course Framework Backfill (P0-3)
Apply `scripts/certification/course_framework_backfill.sql` via Supabase SQL Editor or MCP.
```sql
-- Verify after: all courses should have framework_id NOT NULL
SELECT c.id, c.name, c.framework_id, c.curriculum_code, c.key_stage
FROM courses c;
```

## Fix 2: Habit Signal Trigger (P0-6)
Apply `scripts/certification/habit_signal_trigger.sql` via Supabase SQL Editor or MCP.
```sql
-- Verify after: new submissions should generate habit_logs
INSERT INTO submissions (student_id, assignment_id) VALUES (...) RETURNING id;
-- Then check:
SELECT count(*) FROM habit_logs WHERE created_at > now() - interval '1 minute';
```

## Fix 3: Intervention Proposal RPC (P0-1, P0-4)
Apply `scripts/certification/create_learning_intervention_proposal.sql` via Supabase SQL Editor or MCP.
```sql
-- Verify: RPC exists and is executable
SELECT proname FROM pg_proc WHERE proname = 'create_learning_intervention_proposal_v1';
```

## Fix 4: Accreditation Report Redeploy (P1-2)
```bash
npx supabase functions deploy generate-accreditation-report --project-ref cdlgtbvxlxjpcddjazzx
```
Verify: `npx supabase functions list --project-ref cdlgtbvxlxjpcddjazzx | grep accreditation`

## Fix 5: Edge Function Runtime Redeploy
```bash
npx supabase functions deploy agent-orchestrator --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy agent-worker --project-ref cdlgtbvxlxjpcddjazzx
npx supabase functions deploy intervention-jobs --project-ref cdlgtbvxlxjpcddjazzx
```

## Verification: Closed-Loop Test
1. As coordinator, navigate to Unit Close Review page for Mathematics 6
2. Verify `DecisionIntelligenceSection` shows problem cases (from classify_problem_cases_v1)
3. Click "Draft intervention" on a case
4. Click "Submit for Approval" (generates proposal via create_learning_intervention_proposal_v1)
5. As coordinator, open dashboard and check approval inbox
6. Approve the proposal
7. Click "Execute" to create learning_interventions rows
8. Verify: `SELECT count(*) FROM learning_interventions WHERE status = 'approved'` > 0
9. As student, verify intervention appears in student view
10. As teacher, perform reassessment
11. Verify new evidence created
12. Verify intervention_measurements created (within 15 min via cron)
13. Verify CQI pattern updated

## Post-Remediation Verification
```sql
-- All critical tables should have data:
SELECT 'interventions' as tbl, count(*) FROM learning_interventions
UNION ALL SELECT 'measurements', count(*) FROM intervention_measurements
UNION ALL SELECT 'habit_logs', count(*) FROM habit_logs
UNION ALL SELECT 'habit_correlations', count(*) FROM habit_correlations;
```