-- Task 16: close the xp_purchases append-only / column-immutability gap.
DROP POLICY IF EXISTS "xp_purchases_student_update" ON public.xp_purchases;
CREATE POLICY "xp_purchases_student_update" ON public.xp_purchases
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'student'
    AND student_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'student'
    AND student_id = (SELECT auth.uid())
  );

CREATE OR REPLACE FUNCTION public.prevent_xp_purchases_financial_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.id           := OLD.id;
  NEW.student_id   := OLD.student_id;
  NEW.item_id      := OLD.item_id;
  NEW.xp_cost      := OLD.xp_cost;
  NEW.purchased_at := OLD.purchased_at;
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.prevent_xp_purchases_financial_mutation()
  IS 'Task 16: BEFORE UPDATE trigger on public.xp_purchases. Resets immutable financial columns (id, student_id, item_id, xp_cost, purchased_at) to OLD values for end-user (non-service-role) callers so only status/consumed_at/metadata are mutable. No-op when auth.uid() is NULL (service_role/internal). search_path pinned.';

REVOKE ALL ON FUNCTION public.prevent_xp_purchases_financial_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_xp_purchases_financial_mutation() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_xp_purchases_financial_mutation() TO postgres, service_role;

DROP TRIGGER IF EXISTS trg_prevent_xp_purchases_financial_mutation ON public.xp_purchases;
CREATE TRIGGER trg_prevent_xp_purchases_financial_mutation
  BEFORE UPDATE ON public.xp_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_xp_purchases_financial_mutation();;
