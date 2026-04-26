-- Task 2.8: pg_cron job for contribution status updates
-- Runs daily at 01:00 UTC, computes weekly XP per member, calculates contribution %,
-- updates contribution_status, computes Cooperation Score, checks Team Player badge

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'update-contribution-status',
      '0 1 * * *',
      $$
      DO $body$
      DECLARE
        team_rec RECORD;
        member_rec RECORD;
        team_weekly_xp NUMERIC;
        member_weekly_xp NUMERIC;
        contribution_pct NUMERIC;
        threshold NUMERIC;
        active_count INTEGER;
        above_threshold_count INTEGER;
        gini NUMERIC;
        coop_score INTEGER;
        xp_values NUMERIC[];
        n INTEGER;
        sum_abs_diff NUMERIC;
        mean_xp NUMERIC;
        i INTEGER;
        j INTEGER;
      BEGIN
        FOR team_rec IN
          SELECT t.id, t.course_id, t.institution_id
          FROM teams t
          WHERE t.deleted_at IS NULL
        LOOP
          -- Get institution threshold (default 20%)
          SELECT COALESCE(
            (SELECT (settings->>'contribution_threshold')::numeric
             FROM institution_settings
             WHERE institution_id = team_rec.institution_id
             LIMIT 1),
            20
          ) INTO threshold;

          -- Compute weekly XP for the team (last 7 days, course-scoped)
          SELECT COALESCE(SUM(xt.xp_amount), 0)
          INTO team_weekly_xp
          FROM xp_transactions xt
          JOIN team_members tm ON tm.student_id = xt.student_id
          WHERE tm.team_id = team_rec.id
            AND tm.left_at IS NULL
            AND xt.created_at >= NOW() - INTERVAL '7 days';

          -- Collect per-member XP values
          xp_values := ARRAY[]::NUMERIC[];
          active_count := 0;
          above_threshold_count := 0;

          FOR member_rec IN
            SELECT tm.id, tm.student_id, tm.consecutive_low_days, tm.contribution_status
            FROM team_members tm
            WHERE tm.team_id = team_rec.id AND tm.left_at IS NULL
          LOOP
            active_count := active_count + 1;

            SELECT COALESCE(SUM(xt.xp_amount), 0)
            INTO member_weekly_xp
            FROM xp_transactions xt
            WHERE xt.student_id = member_rec.student_id
              AND xt.created_at >= NOW() - INTERVAL '7 days';

            xp_values := array_append(xp_values, member_weekly_xp);

            -- Calculate contribution percentage
            IF team_weekly_xp > 0 THEN
              contribution_pct := (member_weekly_xp / team_weekly_xp) * 100;
            ELSE
              contribution_pct := 0;
            END IF;

            -- Update contribution status
            IF contribution_pct < threshold THEN
              UPDATE team_members
              SET consecutive_low_days = member_rec.consecutive_low_days + 1,
                  contribution_status = CASE
                    WHEN member_rec.consecutive_low_days + 1 >= 5 THEN 'inactive'
                    WHEN member_rec.consecutive_low_days + 1 >= 3 THEN 'warning'
                    ELSE contribution_status
                  END,
                  contribution_status_since = CASE
                    WHEN (member_rec.consecutive_low_days + 1 = 3 AND member_rec.contribution_status = 'active')
                      OR (member_rec.consecutive_low_days + 1 = 5 AND member_rec.contribution_status = 'warning')
                    THEN NOW()
                    ELSE contribution_status_since
                  END
              WHERE id = member_rec.id;
            ELSE
              above_threshold_count := above_threshold_count + 1;
              UPDATE team_members
              SET consecutive_low_days = 0,
                  contribution_status = 'active',
                  contribution_status_since = CASE
                    WHEN member_rec.contribution_status != 'active' THEN NOW()
                    ELSE contribution_status_since
                  END
              WHERE id = member_rec.id;
            END IF;
          END LOOP;

          -- Compute Gini coefficient
          n := array_length(xp_values, 1);
          IF n IS NOT NULL AND n >= 2 THEN
            mean_xp := 0;
            FOR i IN 1..n LOOP
              mean_xp := mean_xp + xp_values[i];
            END LOOP;
            mean_xp := mean_xp / n;

            IF mean_xp > 0 THEN
              sum_abs_diff := 0;
              FOR i IN 1..n LOOP
                FOR j IN 1..n LOOP
                  sum_abs_diff := sum_abs_diff + ABS(xp_values[i] - xp_values[j]);
                END LOOP;
              END LOOP;
              gini := sum_abs_diff / (2.0 * n * n * mean_xp);
            ELSE
              gini := 0;
            END IF;
          ELSE
            gini := 0;
          END IF;

          -- Cooperation Score = 100 × (1 − Gini) × (% active members)
          IF active_count > 0 THEN
            coop_score := ROUND(100 * (1 - gini) * (above_threshold_count::numeric / active_count));
          ELSE
            coop_score := 0;
          END IF;

          UPDATE teams
          SET cooperation_score = GREATEST(0, LEAST(100, coop_score)),
              updated_at = NOW()
          WHERE id = team_rec.id;

        END LOOP;
      END $body$;
      $$
    );
  END IF;
END $$;
