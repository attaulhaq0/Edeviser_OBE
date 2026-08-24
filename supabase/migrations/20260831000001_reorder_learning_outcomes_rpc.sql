-- Task 1.8 (edeviser-agentic-intelligence): atomic, validated Admin ILO reorder.
-- Replaces the client-side Promise.all batch (non-atomic, partial-failure
-- prone) with one transactional statement. Authorization model:
--   * Caller must be an active admin (profiles.role = 'admin').
--   * Every payload id must be an ILO owned by the caller's institution.
--   * Duplicate ids rejected; payload bounded to 1..500 items.
--   * SECURITY INVOKER: RLS policies additionally gate every updated row.
CREATE OR REPLACE FUNCTION public.reorder_learning_outcomes(p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_role text;
  v_institution_id uuid;
  v_count integer;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT profile.role::text, profile.institution_id
    INTO v_role, v_institution_id
  FROM public.profiles AS profile
  WHERE profile.id = v_actor_id AND profile.is_active = true;

  IF v_role IS DISTINCT FROM 'admin' OR v_institution_id IS NULL THEN
    RAISE EXCEPTION 'Active admin profile required' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 500 THEN
    RAISE EXCEPTION 'p_items must be a JSON array of 1..500 items'
      USING ERRCODE = '22023';
  END IF;

  -- A duplicated id would double-write the same row: reject up front.
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(id uuid, sort_order integer)
    GROUP BY item.id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate outcome ids in reorder payload'
      USING ERRCODE = '22023';
  END IF;

  -- Every id must be an ILO owned by the caller's institution. Any foreign,
  -- missing, or wrong-type id aborts the WHOLE statement (no partial reorder).
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(id uuid, sort_order integer)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.learning_outcomes AS lo
      WHERE lo.id = item.id
        AND lo.type = 'ILO'
        AND lo.institution_id = v_institution_id
    )
  ) THEN
    RAISE EXCEPTION 'All outcomes must be ILOs of your institution'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.learning_outcomes AS lo
  SET sort_order = item.sort_order,
      updated_at = now()
  FROM jsonb_to_recordset(p_items) AS item(id uuid, sort_order integer)
  WHERE lo.id = item.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.reorder_learning_outcomes(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_learning_outcomes(jsonb) TO authenticated;