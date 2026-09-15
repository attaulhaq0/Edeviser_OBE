-- =============================================================================
-- Habit Signal Generation Trigger — Certification Remediation (P0-6)
-- Automatically generates habit_logs from student assessment activity.
-- Converts submission behavior into structured behavioral signals.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_habit_signals_from_submission_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_student_id uuid;
  v_course_id uuid;
  v_assignment_id uuid;
  v_submission_count_7d integer;
  v_submission_count_14d integer;
  v_submission_count_28d integer;
  v_on_time_count_14d integer;
  v_late_count_14d integer;
  v_assignment_type text;
  v_score_percent numeric;
BEGIN
  v_student_id := NEW.student_id;
  v_assignment_id := NEW.assignment_id;
  
  -- Resolve course_id from assignment
  SELECT a.course_id, a.type INTO v_course_id, v_assignment_type
  FROM public.assignments a WHERE a.id = v_assignment_id;
  
  IF v_course_id IS NULL THEN RETURN NEW; END IF;
  
  -- Count submissions in various windows
  SELECT count(*) INTO v_submission_count_7d
  FROM public.submissions s
  JOIN public.assignments a ON a.id = s.assignment_id
  WHERE s.student_id = v_student_id
    AND s.created_at >= now() - INTERVAL '7 days';
    
  SELECT count(*) INTO v_submission_count_14d
  FROM public.submissions s
  JOIN public.assignments a ON a.id = s.assignment_id
  WHERE s.student_id = v_student_id
    AND s.created_at >= now() - INTERVAL '14 days';
    
  SELECT count(*) INTO v_submission_count_28d
  FROM public.submissions s
  JOIN public.assignments a ON a.id = s.assignment_id
  WHERE s.student_id = v_student_id
    AND s.created_at >= now() - INTERVAL '28 days';

  -- On-time vs late submissions
  SELECT count(*) INTO v_on_time_count_14d
  FROM public.submissions s
  JOIN public.assignments a ON a.id = s.assignment_id
  WHERE s.student_id = v_student_id
    AND s.created_at >= now() - INTERVAL '14 days'
    AND (a.due_date IS NULL OR s.created_at <= a.due_date);

  v_late_count_14d := v_submission_count_14d - v_on_time_count_14d;

  -- Get the most recent grade score for this student
  SELECT g.score_percent INTO v_score_percent
  FROM public.grades g
  WHERE g.submission_id = NEW.id
  LIMIT 1;

  -- Insert habit signal for submission consistency
  IF v_submission_count_7d >= 3 THEN
    INSERT INTO public.habit_logs (
      student_id, course_id, signal_type, signal_value, metadata, created_at
    ) VALUES (
      v_student_id, v_course_id, 'submission_consistency',
      jsonb_build_object(
        'submissions_7d', v_submission_count_7d,
        'submissions_14d', v_submission_count_14d,
        'submissions_28d', v_submission_count_28d,
        'on_time_ratio_14d', CASE WHEN v_submission_count_14d > 0 
          THEN round((v_on_time_count_14d::numeric / v_submission_count_14d) * 100, 1) 
          ELSE NULL END
      ),
      jsonb_build_object(
        'source', 'submission_trigger',
        'trigger_assignment_id', v_assignment_id,
        'window_seven_days', v_submission_count_7d
      ),
      now()
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Insert habit signal for late submission pattern if detected
  IF v_late_count_14d >= 2 THEN
    INSERT INTO public.habit_logs (
      student_id, course_id, signal_type, signal_value, metadata, created_at
    ) VALUES (
      v_student_id, v_course_id, 'late_submission_pattern',
      jsonb_build_object(
        'late_count_14d', v_late_count_14d,
        'total_submissions_14d', v_submission_count_14d,
        'on_time_count_14d', v_on_time_count_14d
      ),
      jsonb_build_object(
        'source', 'submission_trigger',
        'trigger_assignment_id', v_assignment_id
      ),
      now()
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Insert habit signal for study consistency if sustained activity detected
  IF v_submission_count_28d >= 5 THEN
    INSERT INTO public.habit_logs (
      student_id, course_id, signal_type, signal_value, metadata, created_at
    ) VALUES (
      v_student_id, v_course_id, 'study_consistency',
      jsonb_build_object(
        'submissions_28d', v_submission_count_28d,
        'weekly_avg', round(v_submission_count_28d::numeric / 4, 1),
        'latest_score', v_score_percent
      ),
      jsonb_build_object(
        'source', 'submission_trigger'
      ),
      now()
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$fn$;

-- Attach trigger to submissions table
DROP TRIGGER IF EXISTS trg_habit_signals_on_submission ON public.submissions;
CREATE TRIGGER trg_habit_signals_on_submission
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_habit_signals_from_submission_v1();