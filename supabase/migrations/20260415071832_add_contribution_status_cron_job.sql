-- ============================================================
-- Migration: pg_cron job for contribution status updates
-- Schedule: Daily at 01:00 UTC
-- Logic:
--   1. For each active team, compute weekly XP per member (last 7 days)
--   2. Calculate contribution % = member_xp / team_xp × 100
--   3. Update contribution_status:
--      - Below threshold for 3+ consecutive days → 'warning'
--      - Below threshold for 5+ consecutive days → 'inactive'
--      - At or above threshold → 'active' (reset consecutive_low_days)
--   4. Compute Cooperation Score = 100 × (1 − Gini) × (% active members)
--   5. Check Team Player badge eligibility (14+ consecutive active days)
-- Guard: Wrapped in pg_cron availability check for free-tier compat.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    PERFORM cron.schedule(
      'update-contribution-status',
      '0 1 * * *',
      $cron$
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
        new_consecutive_low INTEGER;
        new_status TEXT;
        days_active_since INTERVAL;
      BEGIN
        FOR team_rec IN
          SELECT t.id, t.course_id, t.institution_id
          FROM teams t
          WHERE t.deleted_at IS NULL
        LOOP
          -- Look up institution-specific contribution threshold (default 20%)
          SELECT COALESCE(
            (SELECT (settings->>'contribution_threshold')::numeric
             FROM institution_settings
             WHERE institution_id = team_rec.institution_id
             LIMIT 1),
            20
          ) INTO threshold;

          -- Compute total team XP for the last 7 days
          SELECT COALESCE(SUM(xt.xp_amount), 0) INTO team_weekly_xp
          FROM xp_transactions xt
          JOIN team_members tm ON tm.student_id = xt.student_id
          WHERE tm.team_id = team_rec.id
            AND tm.left_at IS NULL
            AND xt.created_at >= NOW() - INTERVAL '7 days';

          xp_values := ARRAY[]::NUMERIC[];
          active_count := 0;
          above_threshold_count := 0;

          FOR member_rec IN
            SELECT tm.id, tm.student_id, tm.consecutive_low_days,
                   tm.contribution_status, tm.contribution_status_since
            FROM team_members tm
            WHERE tm.team_id = team_rec.id
              AND tm.left_at IS NULL
          LOOP
            active_count := active_count + 1;

            -- Compute this member's weekly XP
            SELECT COALESCE(SUM(xt.xp_amount), 0) INTO member_weekly_xp
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

            IF contribution_pct < threshold THEN
              -- Below threshold: increment consecutive low days
              new_consecutive_low := member_rec.consecutive_low_days + 1;

              IF new_consecutive_low >= 5 THEN
                new_status := 'inactive';
              ELSIF new_consecutive_low >= 3 THEN
                new_status := 'warning';
              ELSE
                new_status := member_rec.contribution_status;
              END IF;

              UPDATE team_members
              SET consecutive_low_days = new_consecutive_low,
                  contribution_status = new_status,
                  contribution_status_since = CASE
                    WHEN new_status != member_rec.contribution_status
                    THEN NOW()
                    ELSE contribution_status_since
                  END
              WHERE id = member_rec.id;
            ELSE
              -- At or above threshold: reset to active
              above_threshold_count := above_threshold_count + 1;

              UPDATE team_members
              SET consecutive_low_days = 0,
                  contribution_status = 'active',
                  contribution_status_since = CASE
                    WHEN member_rec.contribution_status != 'active'
                    THEN NOW()
                    ELSE contribution_status_since
                  END
              WHERE id = member_rec.id;

              -- Check Team Player badge eligibility:
              -- 14+ consecutive active days (contribution_status = 'active')
              IF member_rec.contribution_status = 'active'
                 AND member_rec.contribution_status_since IS NOT NULL THEN
                days_active_since := NOW() - member_rec.contribution_status_since;
                IF days_active_since >= INTERVAL '14 days' THEN
                  INSERT INTO badges (student_id, badge_key, badge_name, emoji, awarded_at)
                  VALUES (
                    member_rec.student_id,
                    'team_player',
                    'Team Player',
                    '💪',
                    NOW()
                  )
                  ON CONFLICT (student_id, badge_key) DO NOTHING;
                END IF;
              END IF;
            END IF;
          END LOOP;

          -- Compute Gini coefficient of XP contributions
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
            coop_score := ROUND(
              100 * (1 - gini) * (above_threshold_count::numeric / active_count)
            );
          ELSE
            coop_score := 0;
          END IF;

          UPDATE teams
          SET cooperation_score = GREATEST(0, LEAST(100, coop_score)),
              updated_at = NOW()
          WHERE id = team_rec.id;
        END LOOP;
      END $body$;
      $cron$
    );

    RAISE NOTICE 'pg_cron job "update-contribution-status" created (daily 01:00 UTC)';
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping update-contribution-status cron job';
  END IF;
END;
$$;
