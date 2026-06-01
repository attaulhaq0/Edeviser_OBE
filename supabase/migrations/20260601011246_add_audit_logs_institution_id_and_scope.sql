-- audit_logs had no institution_id, so the admin-read policy was scoped via
-- actor_id -> profiles.institution_id (subquery; hid system/null-actor rows
-- opaquely). Add a first-class institution_id, auto-populate from the actor's
-- profile via a BEFORE INSERT trigger (robust across all writers), one-time
-- backfill of existing rows, index it, and switch the policy to use it.
--
-- NOTE: audit_logs is append-only (prevent_audit_logs_mutation trigger blocks
-- UPDATE/DELETE). We temporarily disable that guard ONLY for the one-time
-- backfill within this migration transaction, then immediately re-enable it.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_audit_log_institution()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
BEGIN
  IF NEW.institution_id IS NULL AND NEW.actor_id IS NOT NULL THEN
    SELECT p.institution_id INTO NEW.institution_id
    FROM public.profiles p
    WHERE p.id = NEW.actor_id;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_audit_log_institution() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_set_audit_log_institution ON public.audit_logs;
CREATE TRIGGER trg_set_audit_log_institution
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_audit_log_institution();

-- One-time backfill: disable the append-only guard, backfill, re-enable.
ALTER TABLE public.audit_logs DISABLE TRIGGER prevent_audit_logs_mutation;
UPDATE public.audit_logs al
  SET institution_id = p.institution_id
  FROM public.profiles p
  WHERE al.actor_id = p.id
    AND al.institution_id IS NULL;
ALTER TABLE public.audit_logs ENABLE TRIGGER prevent_audit_logs_mutation;

CREATE INDEX IF NOT EXISTS idx_audit_logs_institution_id
  ON public.audit_logs (institution_id);

DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
CREATE POLICY audit_logs_admin_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'
    AND institution_id = (SELECT public.auth_institution_id())
  );;
