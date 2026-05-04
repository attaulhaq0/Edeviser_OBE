-- Task 150.6: Badge Spotlight auto-rotate cron job
-- Runs at midnight UTC every Monday
-- If no manual selection for current week, auto-rotate alphabetically through categories
-- Requirements: 134.3, 134.6

-- Create the auto-rotate function
CREATE OR REPLACE FUNCTION badge_spotlight_auto_rotate()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inst RECORD;
  current_monday date;
  has_manual boolean;
  last_category text;
  next_category text;
  all_categories text[];
  cat_index int;
BEGIN
  -- Calculate current Monday
  current_monday := date_trunc('week', now())::date;

  -- Iterate over all institutions
  FOR inst IN SELECT id FROM institutions LOOP
    -- Check if there's already a manual selection for this week
    SELECT EXISTS(
      SELECT 1 FROM badge_spotlight_schedule
      WHERE institution_id = inst.id
        AND week_start = current_monday
    ) INTO has_manual;

    -- Skip if already has an entry for this week
    IF has_manual THEN
      CONTINUE;
    END IF;

    -- Get all distinct badge categories (alphabetically sorted)
    all_categories := ARRAY['academic', 'engagement', 'social', 'streak', 'wellness'];

    -- Get the last spotlight category for this institution
    SELECT category INTO last_category
    FROM badge_spotlight_schedule
    WHERE institution_id = inst.id
    ORDER BY week_start DESC
    LIMIT 1;

    -- Determine next category (alphabetical rotation)
    IF last_category IS NULL THEN
      next_category := all_categories[1];
    ELSE
      cat_index := array_position(all_categories, last_category);
      IF cat_index IS NULL OR cat_index >= array_length(all_categories, 1) THEN
        next_category := all_categories[1];
      ELSE
        next_category := all_categories[cat_index + 1];
      END IF;
    END IF;

    -- Insert the auto-rotated spotlight
    INSERT INTO badge_spotlight_schedule (institution_id, week_start, category, is_manual)
    VALUES (inst.id, current_monday, next_category, false)
    ON CONFLICT (institution_id, week_start) DO NOTHING;
  END LOOP;
END;
$$;
-- Schedule the cron job (midnight UTC every Monday)
-- Guard: only create if pg_cron extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'badge-spotlight-rotate',
      '0 0 * * 1',
      'SELECT badge_spotlight_auto_rotate()'
    );
  END IF;
END;
$$;
