-- Task 2.9: pg_cron job for team health score computation
-- Runs weekly Monday at 02:00 UTC

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'compute-team-health',
      '0 2 * * 1',
      $$
      DO $body$
      DECLARE
        team_rec RECORD;
        member_xp_values NUMERIC[];
        n INTEGER;
        mean_xp NUMERIC;
        sum_abs_diff NUMERIC;
        gini NUMERIC;
        i INTEGER;
        j INTEGER;
        this_week_xp NUMERIC;
        last_week_xp NUMERIC;
        trend_score NUMERIC;
        engagement_trend_val TEXT;
        participation_rate NUMERIC;
        overlap_rate NUMERIC;
        health NUMERIC;
        health_status_val TEXT;
        active_challenges_count INTEGER;
        participated_challenges INTEGER;
        overlap_days INTEGER;
        day_offset INTEGER;
        check_date DATE;
        active_members_on_day INTEGER;
      BEGIN
        FOR team_rec IN
          SELECT t.id, t.course_id
          FROM teams t
          WHERE t.deleted_at IS NULL
        LOOP
          -- Collect per-member XP for last 7 days
          member_xp_values := ARRAY(
            SELECT COALESCE(SUM(xt.xp_amount), 0)
            FROM team_members tm
            LEFT JOIN xp_transactions xt ON xt.student_id = tm.student_id
              AND xt.created_at >= NOW() - INTERVAL '7 days'
            WHERE tm.team_id = team_rec.id AND tm.left_at IS NULL
            GROUP BY tm.student_id
          );

          n := COALESCE(array_length(member_xp_values, 1), 0);
          IF n < 2 THEN
            gini := 0;
          ELSE
            mean_xp := 0;
            FOR i IN 1..n LOOP
              mean_xp := mean_xp + member_xp_values[i];
            END LOOP;
            mean_xp := mean_xp / n;

            IF mean_xp > 0 THEN
              sum_abs_diff := 0;
              FOR i IN 1..n LOOP
                FOR j IN 1..n LOOP
                  sum_abs_diff := sum_abs_diff + ABS(member_xp_values[i] - member_xp_values[j]);
                END LOOP;
              END LOOP;
              gini := sum_abs_diff / (2.0 * n * n * mean_xp);
            ELSE
              gini := 0;
            END IF;
          END IF;

          -- Engagement trend: compare this week vs last week XP
          SELECT COALESCE(SUM(xt.xp_amount), 0) INTO this_week_xp
          FROM xp_transactions xt
          JOIN team_members tm ON tm.student_id = xt.student_id
          WHERE tm.team_id = team_rec.id AND tm.left_at IS NULL
            AND xt.created_at >= NOW() - INTERVAL '7 days';

          SELECT COALESCE(SUM(xt.xp_amount), 0) INTO last_week_xp
          FROM xp_transactions xt
          JOIN team_members tm ON tm.student_id = xt.student_id
          WHERE tm.team_id = team_rec.id AND tm.left_at IS NULL
            AND xt.created_at >= NOW() - INTERVAL '14 days'
            AND xt.created_at < NOW() - INTERVAL '7 days';

          IF last_week_xp > 0 THEN
            IF this_week_xp > last_week_xp * 1.1 THEN
              engagement_trend_val := 'rising';
              trend_score := 100;
            ELSIF this_week_xp < last_week_xp * 0.9 THEN
              engagement_trend_val := 'declining';
              trend_score := 25;
            ELSE
              engagement_trend_val := 'stable';
              trend_score := 75;
            END IF;
          ELSE
            IF this_week_xp > 0 THEN
              engagement_trend_val := 'rising';
              trend_score := 100;
            ELSE
              engagement_trend_val := 'stable';
              trend_score := 75;
            END IF;
          END IF;

          -- Challenge participation rate
          SELECT COUNT(*) INTO active_challenges_count
          FROM social_challenges sc
          WHERE sc.course_id = team_rec.course_id
            AND sc.status IN ('active', 'ended')
            AND sc.end_date >= NOW() - INTERVAL '30 days';

          SELECT COUNT(DISTINCT cp.challenge_id) INTO participated_challenges
          FROM challenge_progress cp
          JOIN social_challenges sc ON sc.id = cp.challenge_id
          WHERE cp.participant_id = team_rec.id
            AND cp.participant_type = 'team'
            AND sc.course_id = team_rec.course_id;

          IF active_challenges_count > 0 THEN
            participation_rate := (participated_challenges::numeric / active_challenges_count) * 100;
          ELSE
            participation_rate := 100; -- No challenges = full participation
          END IF;

          -- Activity overlap rate: days with 2+ active members in last 7 days
          overlap_days := 0;
          FOR day_offset IN 0..6 LOOP
            check_date := (CURRENT_DATE - day_offset)::DATE;
            SELECT COUNT(DISTINCT hl.student_id) INTO active_members_on_day
            FROM habit_logs hl
            JOIN team_members tm ON tm.student_id = hl.student_id
            WHERE tm.team_id = team_rec.id
              AND tm.left_at IS NULL
              AND hl.log_date = check_date;

            IF active_members_on_day >= 2 THEN
              overlap_days := overlap_days + 1;
            END IF;
          END LOOP;
          overlap_rate := (overlap_days::numeric / 7.0) * 100;

          -- Health score formula
          health := 0.30 * (1 - gini) * 100
                  + 0.25 * trend_score
                  + 0.25 * participation_rate
                  + 0.20 * overlap_rate;
          health := GREATEST(0, LEAST(100, ROUND(health)));

          -- Health status classification
          IF health >= 70 THEN
            health_status_val := 'healthy';
          ELSIF health >= 40 THEN
            health_status_val := 'needs_attention';
          ELSE
            health_status_val := 'at_risk';
          END IF;

          -- Insert snapshot
          INSERT INTO team_health_snapshots (
            team_id, health_score, gini_coefficient, engagement_trend,
            challenge_participation_rate, activity_overlap_rate, computed_at
          ) VALUES (
            team_rec.id, health, ROUND(gini::numeric, 3), engagement_trend_val,
            ROUND(participation_rate, 2), ROUND(overlap_rate, 2), NOW()
          );

          -- Update team record
          UPDATE teams
          SET health_score = health,
              health_status = health_status_val,
              updated_at = NOW()
          WHERE id = team_rec.id;

        END LOOP;
      END $body$;
      $$
    );
  END IF;
END $$;
