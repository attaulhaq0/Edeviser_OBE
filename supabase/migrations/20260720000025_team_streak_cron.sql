-- Task 2.7: pg_cron job for team streak updates
-- Runs daily at 00:05 UTC, checks habit_logs for each active team,
-- increments or resets streak_count, awards streak badges at milestones

-- Guard: only schedule if pg_cron extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
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
          SELECT t.id, t.streak_count
          FROM teams t
          WHERE t.deleted_at IS NULL
        LOOP
          -- Check if any active team member completed a habit yesterday
          SELECT EXISTS(
            SELECT 1 FROM habit_logs hl
            JOIN team_members tm ON tm.student_id = hl.student_id
            WHERE tm.team_id = team_rec.id
              AND tm.left_at IS NULL
              AND hl.log_date = yesterday
          ) INTO has_habit;

          IF has_habit THEN
            new_streak := team_rec.streak_count + 1;

            UPDATE teams
            SET streak_count = new_streak,
                streak_last_active_date = yesterday,
                updated_at = NOW()
            WHERE id = team_rec.id;

            -- Award streak milestone badges (7, 14, 30) idempotently
            IF new_streak IN (7, 14, 30) THEN
              INSERT INTO team_badges (team_id, badge_key, earned_at)
              VALUES (
                team_rec.id,
                CASE new_streak
                  WHEN 7 THEN 'streak_squad'
                  WHEN 14 THEN 'streak_champions'
                  WHEN 30 THEN 'streak_legends'
                END,
                NOW()
              )
              ON CONFLICT (team_id, badge_key) DO NOTHING;
            END IF;
          ELSE
            UPDATE teams
            SET streak_count = 0, updated_at = NOW()
            WHERE id = team_rec.id;
          END IF;
        END LOOP;
      END $body$;
      $$
    );
  END IF;
END $$;
