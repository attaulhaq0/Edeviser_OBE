-- Add covering indexes for the 4 unindexed foreign keys flagged by the
-- Supabase performance advisor (audit finding, Section 12.2 /
-- unindexed_foreign_keys). These are small, safe, additive indexes — no
-- behavior change, only faster JOIN/DELETE-cascade lookups on these columns.

CREATE INDEX IF NOT EXISTS idx_accreditation_approvals_approver_id
  ON public.accreditation_approvals (approver_id);

CREATE INDEX IF NOT EXISTS idx_coordinator_ai_insights_created_by
  ON public.coordinator_ai_insights (created_by);

CREATE INDEX IF NOT EXISTS idx_outcome_attainment_snapshots_outcome_id
  ON public.outcome_attainment_snapshots (outcome_id);

CREATE INDEX IF NOT EXISTS idx_outcome_attainment_snapshots_semester_id
  ON public.outcome_attainment_snapshots (semester_id);
