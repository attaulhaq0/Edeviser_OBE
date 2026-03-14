-- ============================================================
-- pg_cron job: Check for due micro-assessments daily
-- Updates scheduled_at dates and populates question_ids
-- Task 14.2
-- ============================================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily job at 6:00 AM UTC to update micro-assessment scheduled_at dates
-- and populate question_ids for today's pending assessments
SELECT cron.schedule(
  'update-micro-assessment-schedule',
  '0 6 * * *',
  $$
  -- Populate question_ids for today's pending micro-assessments that have empty question_ids
  UPDATE micro_assessment_schedule mas
  SET question_ids = (
    SELECT COALESCE(
      array_agg(q.id ORDER BY q.sort_order),
      '{}'::uuid[]
    )
    FROM (
      SELECT oq.id, oq.sort_order
      FROM onboarding_questions oq
      JOIN profiles p ON p.id = mas.student_id
      WHERE oq.assessment_type = mas.assessment_type
        AND oq.institution_id = p.institution_id
        AND oq.is_active = true
      ORDER BY oq.sort_order
      LIMIT CASE
        WHEN mas.assessment_type = 'personality' THEN 3
        WHEN mas.assessment_type = 'self_efficacy' THEN 2
        WHEN mas.assessment_type = 'study_strategy' THEN 2
        WHEN mas.assessment_type = 'learning_style' THEN 4
        ELSE 2
      END
    ) q
  )
  WHERE mas.status = 'pending'
    AND mas.scheduled_at = (now() AT TIME ZONE 'UTC')::date
    AND mas.question_ids = '{}'::uuid[];
  $$
);
