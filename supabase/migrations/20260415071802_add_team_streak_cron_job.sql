-- ============================================================
-- Migration: pg_cron job for team streak updates
-- Schedule: Daily at 00:05 UTC
-- Logic: For each active team (deleted_at IS NULL), check if any
--   team member had a habit_log yesterday. If yes, increment
--   streak_count. If no, reset to 0. At milestones (7, 14, 30),
--   insert team_badges record (idempotent via ON CONFLICT).
-- Guard: Wrapped in pg_cron availability check for free-tier compat.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    PERFORM cron.schedule(
      'update-team-streaks',
      '5 0 * * *',
      $cron$
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
            SELECT 1
            FROM habit_tracking ht
            JOIN team_members tm ON tm.student_id = ht.student_id
            WHERE tm.team_id = team_rec.id
              AND tm.left_at IS NULL
              AND ht.habit_date = yesterday
              AND (ht.login = true OR ht.submit = true
                   OR ht.journal = true OR ht.read_content = true)
          ) INTO has_habit;

          IF has_habit THEN
            new_streak := team_rec.streak_count + 1;

            UPDATE teams
            SET streak_count = new_streak,
                streak_last_active_date = yesterday,
                updated_at = NOW()
            WHERE id = team_rec.id;

            -- Award streak badges at milestones (7, 14, 30)
            IF new_streak IN (7, 14, 30) THEN
              INSERT INTO team_badges (team_id, badge_key, earned_at)
              VALUES (
                team_rec.id,
                CASE new_streak
                  WHEN 7  THEN 'streak_squad'
                  WHEN 14 THEN 'streak_champions'
                  WHEN 30 THEN 'streak_legends'
                END,
                NOW()
              )
              ON CONFLICT (team_id, badge_key) DO NOTHING;
            END IF;
          ELSE
            -- No member had a habit yesterday — reset streak
            UPDATE teams
            SET streak_count = 0,
                updated_at = NOW()
            WHERE id = team_rec.id;
          END IF;
        END LOOP;
      END $body$;
      $cron$
    );

    RAISE NOTICE 'pg_cron job "update-team-streaks" created (daily 00:05 UTC)';
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping update-team-streaks cron job';
  END IF;
END;
$$;
