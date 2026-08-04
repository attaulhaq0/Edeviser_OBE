-- These tables are present in the live schema, but their consolidated local
-- definitions arrive later in 20260823000006/20260823000015. Guard ACL-only
-- repairs so a clean replay remains valid before those CREATE TABLE steps.
DO $$
BEGIN
  IF to_regclass('public.connected_integrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.connected_integrations FROM anon;
  END IF;
  IF to_regclass('public.accreditation_report_jobs') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.accreditation_report_jobs FROM anon;
  END IF;
  IF to_regclass('public.accreditation_generated_reports') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.accreditation_generated_reports FROM anon;
  END IF;
END
$$;
