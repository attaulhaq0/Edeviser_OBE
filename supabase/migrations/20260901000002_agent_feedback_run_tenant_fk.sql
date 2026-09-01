-- Tenant integrity (Wave D review): bind agent_feedback.run_id to the SAME
-- institution as the feedback row itself. agent_runs is RLS-deny-all to
-- clients (no SELECT policy), so a client cannot verify run ownership before
-- inserting; this composite FK enforces the tenant binding at the storage
-- layer for every writer, client and service-role alike.
-- Pre-validated 2026-09-01: 0 existing agent_feedback rows carry run_id
-- (0 potential violations), so the constraint applies without backfill.

alter table public.agent_runs
  add constraint agent_runs_id_institution_id_key unique (id, institution_id);

alter table public.agent_feedback
  add constraint agent_feedback_run_tenant_fkey
  foreign key (run_id, institution_id)
  references public.agent_runs (id, institution_id)
  on delete no action;
