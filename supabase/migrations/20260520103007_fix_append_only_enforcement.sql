-- FIX #9: Add DB-level append-only enforcement via BEFORE UPDATE/DELETE triggers
-- These raise exceptions if anyone (even service_role) tries to mutate append-only tables

CREATE OR REPLACE FUNCTION public.prevent_mutation()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only. UPDATE and DELETE are prohibited.', TG_TABLE_NAME;
  RETURN NULL;
END;
$$;

-- Evidence: immutable
DROP TRIGGER IF EXISTS prevent_evidence_mutation ON public.evidence;
CREATE TRIGGER prevent_evidence_mutation
  BEFORE UPDATE OR DELETE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

-- audit_logs: immutable
DROP TRIGGER IF EXISTS prevent_audit_logs_mutation ON public.audit_logs;
CREATE TRIGGER prevent_audit_logs_mutation
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

-- xp_transactions: immutable
DROP TRIGGER IF EXISTS prevent_xp_transactions_mutation ON public.xp_transactions;
CREATE TRIGGER prevent_xp_transactions_mutation
  BEFORE UPDATE OR DELETE ON public.xp_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();;
