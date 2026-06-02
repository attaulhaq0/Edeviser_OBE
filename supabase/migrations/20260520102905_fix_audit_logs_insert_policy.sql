-- FIX #2: Audit trail INSERT policy - allow all authenticated roles (not just admin)
DROP POLICY IF EXISTS audit_logs_admin_insert ON public.audit_logs;
CREATE POLICY "audit_logs_authenticated_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Also fix the demo student missing gamification row (FIX #5 partial)
-- Replay-only guard: this hardcoded demo-student row only exists on production. On a
-- fresh replay (Supabase Preview / clean rebuild) the referenced profile is absent, so a
-- bare INSERT aborts with 23503 (FK violation). Insert only when the profile exists.
INSERT INTO student_gamification (student_id, xp_total, level, streak_current, streak_longest, last_login_date)
SELECT 'f0b2fa46-7bdf-48c2-a74a-d98960eaeb2d', 0, 1, 0, 0, NULL
WHERE EXISTS (
  SELECT 1 FROM profiles WHERE id = 'f0b2fa46-7bdf-48c2-a74a-d98960eaeb2d'
)
ON CONFLICT DO NOTHING;
