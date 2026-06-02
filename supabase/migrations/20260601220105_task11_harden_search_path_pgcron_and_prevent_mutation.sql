-- Task 11 (migration-history-reconciliation, Req 9.2 / Req 5.6): clear the final two
-- function_search_path_mutable WARNs by pinning SET search_path = '' and fully qualifying
-- the bodies. prosecdef and volatility are preserved exactly:
--   is_pgcron_available  -> SECURITY DEFINER, VOLATILE (qualify pg_catalog.pg_extension)
--   prevent_mutation     -> SECURITY INVOKER, VOLATILE trigger (body has no relation refs)

CREATE OR REPLACE FUNCTION public.is_pgcron_available()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Table % is append-only. UPDATE and DELETE are prohibited.', TG_TABLE_NAME;
  RETURN NULL;
END;
$function$;;
