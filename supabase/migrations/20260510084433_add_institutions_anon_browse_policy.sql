-- Follow-up to 20260901000006: add anon SELECT policy on institutions so the
-- security_invoker=true institutions_public view actually returns rows to
-- the unauthenticated signup picker.
DROP POLICY IF EXISTS "institutions_anon_browse" ON public.institutions;
CREATE POLICY "institutions_anon_browse" ON public.institutions
  FOR SELECT
  TO anon
  USING (true);

COMMENT ON POLICY "institutions_anon_browse" ON public.institutions
  IS 'Allows unauthenticated signup page to list institutions via institutions_public view. Column projection is enforced by the view.';
;
