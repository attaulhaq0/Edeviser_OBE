-- Preserve append-only audit history while validating actors at insert time.
-- The actor profile may be retired later; retaining the audit row must not be
-- blocked by a historical foreign-key reference to profiles.

ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;

CREATE OR REPLACE FUNCTION public.validate_audit_log_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = NEW.actor_id
  ) THEN
    RAISE EXCEPTION 'audit_logs.actor_id must reference a live profile at insert time';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_audit_log_actor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_audit_log_actor ON public.audit_logs;
CREATE TRIGGER trg_validate_audit_log_actor
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_audit_log_actor();
