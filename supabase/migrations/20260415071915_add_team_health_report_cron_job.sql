SELECT cron.schedule(
  'weekly-team-health-report',
  '0 3 * * 1',
  $$
  DO $body$
  DECLARE
    teacher_rec RECORD;
    at_risk_count INTEGER;
    needs_attention_count INTEGER;
    total_teams INTEGER;
  BEGIN
    FOR teacher_rec IN
      SELECT DISTINCT c.teacher_id FROM courses c JOIN teams t ON t.course_id = c.id WHERE t.deleted_at IS NULL AND c.teacher_id IS NOT NULL
    LOOP
      SELECT COUNT(*) FILTER (WHERE t.health_status = 'at_risk'), COUNT(*) FILTER (WHERE t.health_status = 'needs_attention'), COUNT(*)
      INTO at_risk_count, needs_attention_count, total_teams
      FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = teacher_rec.teacher_id AND t.deleted_at IS NULL;

      IF at_risk_count > 0 THEN
        INSERT INTO notifications (user_id, title, body, type, created_at)
        VALUES (teacher_rec.teacher_id, 'Weekly Team Health Report',
          format('You have %s at-risk team(s) and %s team(s) needing attention out of %s total teams. Review the Team Health dashboard for details.', at_risk_count, needs_attention_count, total_teams),
          'team_health_report', NOW())
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END $body$;
  $$
);;
