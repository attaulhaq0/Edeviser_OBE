-- ============================================================
-- Migration: pg_cron job for weekly team health report generation
-- Schedule: Monday at 03:00 UTC (runs after health computation at 02:00)
-- Logic:
--   1. For each teacher with active teams, aggregate health data
--      across their courses
--   2. Count total teams, healthy, needs_attention, at_risk
--   3. If any at-risk teams exist, generate a notification with
--      summary and recommendations
-- Guard: Wrapped in pg_cron availability check for free-tier compat.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    PERFORM cron.schedule(
      'weekly-team-health-report',
      '0 3 * * 1',
      $cron$
      DO $body$
      DECLARE
        teacher_rec RECORD;
        at_risk_count INTEGER;
        needs_attention_count INTEGER;
        healthy_count INTEGER;
        total_teams INTEGER;
        at_risk_names TEXT;
        report_body TEXT;
        recommendations TEXT;
      BEGIN
        FOR teacher_rec IN
          SELECT DISTINCT c.teacher_id
          FROM courses c
          JOIN teams t ON t.course_id = c.id
          WHERE t.deleted_at IS NULL
            AND c.teacher_id IS NOT NULL
        LOOP
          -- Aggregate health data across teacher's courses
          SELECT
            COUNT(*) FILTER (WHERE t.health_status = 'at_risk'),
            COUNT(*) FILTER (WHERE t.health_status = 'needs_attention'),
            COUNT(*) FILTER (WHERE t.health_status = 'healthy'),
            COUNT(*)
          INTO at_risk_count, needs_attention_count, healthy_count, total_teams
          FROM teams t
          JOIN courses c ON t.course_id = c.id
          WHERE c.teacher_id = teacher_rec.teacher_id
            AND t.deleted_at IS NULL;

          -- Collect at-risk team names for the report
          SELECT string_agg(t.name, ', ' ORDER BY t.name)
          INTO at_risk_names
          FROM teams t
          JOIN courses c ON t.course_id = c.id
          WHERE c.teacher_id = teacher_rec.teacher_id
            AND t.deleted_at IS NULL
            AND t.health_status = 'at_risk';

          -- Build recommendations based on health data
          recommendations := '';
          IF at_risk_count > 0 THEN
            recommendations := recommendations
              || 'Consider reassigning inactive members in at-risk teams. ';
          END IF;
          IF needs_attention_count > 0 THEN
            recommendations := recommendations
              || 'Schedule check-ins with teams needing attention. ';
          END IF;
          IF at_risk_count > 0 OR needs_attention_count > 0 THEN
            recommendations := recommendations
              || 'Review team composition for better balance.';
          END IF;

          -- Build report body
          report_body := format(
            'Weekly Team Health Report: %s total team(s) — %s healthy, %s need attention, %s at-risk.',
            total_teams, healthy_count, needs_attention_count, at_risk_count
          );

          IF at_risk_names IS NOT NULL AND at_risk_names != '' THEN
            report_body := report_body
              || format(' At-risk teams: %s.', at_risk_names);
          END IF;

          IF recommendations != '' THEN
            report_body := report_body
              || ' Recommendations: ' || recommendations;
          END IF;

          -- Only send notification if there are teams needing attention
          IF at_risk_count > 0 OR needs_attention_count > 0 THEN
            INSERT INTO notifications (
              user_id, title, body, type, metadata, created_at
            ) VALUES (
              teacher_rec.teacher_id,
              'Weekly Team Health Report',
              report_body,
              'team_health_report',
              jsonb_build_object(
                'total_teams', total_teams,
                'healthy_count', healthy_count,
                'needs_attention_count', needs_attention_count,
                'at_risk_count', at_risk_count,
                'at_risk_teams', COALESCE(at_risk_names, ''),
                'recommendations', recommendations
              ),
              NOW()
            );
          END IF;
        END LOOP;
      END $body$;
      $cron$
    );

    RAISE NOTICE 'pg_cron job "weekly-team-health-report" created (Monday 03:00 UTC)';
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping weekly-team-health-report cron job';
  END IF;
END;
$$;
