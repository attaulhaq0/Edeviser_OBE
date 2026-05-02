SELECT cron.schedule(
  'update-team-streaks',
  '5 0 * * *',
  $$
  DO $body$
  DECLARE
    team_rec RECORD;
    yesterday DATE := (CURRENT_DATE - INTERVAL '1 day')::DATE;
    has_habit BOOLEAN;
    new_streak INTEGER;
  BEGIN
    FOR team_rec IN
      SELECT t.id, t.streak_count FROM teams t WHERE t.deleted_at IS NULL
    LOOP
      SELECT EXISTS(
        SELECT 1 FROM habit_tracking ht
        JOIN team_members tm ON tm.student_id = ht.student_id
        WHERE tm.team_id = team_rec.id AND tm.left_at IS NULL
          AND ht.habit_date = yesterday
          AND (ht.login = true OR ht.submit = true OR ht.journal = true OR ht.read_content = true)
      ) INTO has_habit;

      IF has_habit THEN
        new_streak := team_rec.streak_count + 1;
        UPDATE teams SET streak_count = new_streak, streak_last_active_date = yesterday, updated_at = NOW() WHERE id = team_rec.id;
        IF new_streak IN (7, 14, 30) THEN
          INSERT INTO team_badges (team_id, badge_key, earned_at)
          VALUES (team_rec.id, CASE new_streak WHEN 7 THEN 'streak_squad' WHEN 14 THEN 'streak_champions' WHEN 30 THEN 'streak_legends' END, NOW())
          ON CONFLICT (team_id, badge_key) DO NOTHING;
        END IF;
      ELSE
        UPDATE teams SET streak_count = 0, updated_at = NOW() WHERE id = team_rec.id;
      END IF;
    END LOOP;
  END $body$;
  $$
);;
