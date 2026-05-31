-- L2-2 Fix: Create notification emitter infrastructure
-- Helper function for dedup-safe notification emission
CREATE OR REPLACE FUNCTION public.emit_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_dedup_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_dedup_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = p_user_id
        AND type = p_type
        AND metadata->>'dedup_key' = p_dedup_key
        AND created_at > now() - interval '1 hour'
    ) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, metadata, is_read)
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_body,
    COALESCE(p_metadata, '{}'::jsonb) || CASE
      WHEN p_dedup_key IS NOT NULL THEN jsonb_build_object('dedup_key', p_dedup_key)
      ELSE '{}'::jsonb
    END,
    false
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'emit_notification failed for user % type %: %', p_user_id, p_type, SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.emit_notification FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emit_notification TO postgres, service_role;;
