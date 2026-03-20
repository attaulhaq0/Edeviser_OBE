-- ============================================================
-- Migration: Add pg_cron job to expire stale recovery sessions
-- Feature: AI-Powered Adaptive Quiz Generation (Task 14.9)
-- ============================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ============================================================
-- Function: expire_recovery_sessions
-- Expires active mastery recovery pathways older than 14 days.
-- For each expired session, inserts a notification for the
-- course teacher so they can follow up with the student.
-- Returns the count of expired sessions.
-- Idempotent: safe to run multiple times (only affects active sessions).
-- ============================================================
CREATE OR REPLACE FUNCTION expire_recovery_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  expired_count INTEGER;
  rec RECORD;
BEGIN
  -- Loop through active sessions older than 14 days, expire them,
  -- and notify the teacher for each one.
  FOR rec IN
    SELECT
      mrp.id AS recovery_id,
      mrp.student_id,
      mrp.clo_id,
      mrp.course_id,
      p.full_name AS student_name,
      lo.title AS clo_title,
      c.teacher_id
    FROM mastery_recovery_pathways mrp
    JOIN profiles p ON p.id = mrp.student_id
    JOIN learning_outcomes lo ON lo.id = mrp.clo_id
    JOIN courses c ON c.id = mrp.course_id
    WHERE mrp.status = 'active'
      AND mrp.activated_at < now() - interval '14 days'
      AND c.teacher_id IS NOT NULL
  LOOP
    -- Expire the recovery session
    UPDATE mastery_recovery_pathways
    SET
      status = 'expired',
      expired_at = now(),
      updated_at = now()
    WHERE id = rec.recovery_id;

    -- Notify the teacher
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (
      rec.teacher_id,
      'recovery_expired',
      'Recovery session expired for ' || rec.student_name,
      rec.student_name || '''s mastery recovery session for CLO "' || rec.clo_title || '" has expired after 14 days. Please follow up with the student.',
      jsonb_build_object(
        'recovery_id', rec.recovery_id,
        'student_id', rec.student_id,
        'clo_id', rec.clo_id,
        'course_id', rec.course_id
      )
    );
  END LOOP;

  -- Also expire any sessions where the course has no teacher assigned
  -- (no notification in this case, but still expire them)
  UPDATE mastery_recovery_pathways
  SET
    status = 'expired',
    expired_at = now(),
    updated_at = now()
  WHERE status = 'active'
    AND activated_at < now() - interval '14 days'
    AND course_id IN (
      SELECT id FROM courses WHERE teacher_id IS NULL
    );

  -- Return total count of expired sessions
  SELECT count(*) INTO expired_count
  FROM mastery_recovery_pathways
  WHERE status = 'expired'
    AND expired_at >= now() - interval '1 minute';

  RETURN expired_count;
END;
$fn$;

-- ============================================================
-- Schedule: Run daily at midnight UTC
-- ============================================================
SELECT cron.schedule(
  'expire-recovery-sessions',
  '0 0 * * *',
  $cron$SELECT expire_recovery_sessions()$cron$
);
