-- L18-2 Fix: Add GDPR right-to-erasure function
-- Anonymizes user data (cannot truly delete due to NO ACTION FKs)
CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_id uuid;
  v_anonymized_count integer := 0;
BEGIN
  v_caller_id := auth.uid();

  -- Only the user themselves OR an admin can erase a user
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;

  IF v_caller_id IS NULL OR (v_caller_id != p_user_id AND v_caller_role != 'admin') THEN
    RETURN jsonb_build_object('error', 'Forbidden', 'detail', 'Only the user or an admin can erase user data');
  END IF;

  -- Anonymize PII in profiles (preserves FKs)
  UPDATE profiles
  SET email = 'anonymized-' || id || '@deleted.local',
      full_name = 'Deleted User',
      avatar_url = NULL,
      is_active = false,
      status = 'deleted'
  WHERE id = p_user_id;

  GET DIAGNOSTICS v_anonymized_count = ROW_COUNT;

  -- Mark gamification as inactive
  UPDATE student_gamification SET last_login_date = NULL WHERE student_id = p_user_id;

  -- Audit the erasure (immutable)
  INSERT INTO audit_logs (actor_id, action, target_type, target_id, diff)
  VALUES (v_caller_id, 'anonymize', 'profile', p_user_id,
    jsonb_build_object('anonymized_at', now()::text, 'caller_role', v_caller_role));

  RETURN jsonb_build_object('success', true, 'anonymized', v_anonymized_count > 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anonymize_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymize_user(uuid) TO authenticated;;
