-- Feature: qa-partner-review-remediation — Req 9 (P5)
-- Task 18.1: Add CQI fields (Root Cause, Deadline, Evidence of Improvement).
--
-- `cqi_action_plans` already carries owner (responsible_person), the status lifecycle
-- (planned -> in_progress -> completed -> evaluated), and re-evaluation result
-- (result_attainment). The genuinely missing columns for closing the CQI loop are
-- root_cause, a due/deadline date, and evidence_of_improvement.
--
-- All three columns are nullable with no backfill, so existing rows and the status
-- lifecycle / responsible_person / result_attainment behavior are preserved (Req 9.5).
--
-- Replay integrity (migration-replay-integrity.md): purely additive against a
-- pre-existing table (public.cqi_action_plans) and guarded with IF NOT EXISTS, so a
-- from-scratch replay is clean and idempotent.
ALTER TABLE public.cqi_action_plans
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS evidence_of_improvement text;
