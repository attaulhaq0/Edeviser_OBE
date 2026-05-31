-- L1-M1 Fix: Add indexes for unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_run_id ON public.audit_findings(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_blocked_by ON public.blocked_ips(blocked_by);
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON public.invitations(created_by);;
