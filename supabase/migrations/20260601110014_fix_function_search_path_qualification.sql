-- Spec: db-function-search-path-qualification (bugfix) Part C. Bodies derived from LIVE pg_get_functiondef, public.-qualified, search_path='' retained.

CREATE OR REPLACE FUNCTION public.get_effective_price(p_item_id uuid, p_institution_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_base_price INTEGER;
  v_discount INTEGER;
BEGIN
  SELECT xp_price INTO v_base_price
    FROM public.marketplace_items
    WHERE id = p_item_id AND institution_id = p_institution_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(se.discount_percentage), 0) INTO v_discount
    FROM public.sale_event_items sei
    JOIN public.sale_events se ON se.id = sei.sale_event_id
    WHERE sei.item_id = p_item_id
      AND se.institution_id = p_institution_id
      AND se.start_date <= NOW()
      AND se.end_date > NOW();

  RETURN GREATEST(1, v_base_price - FLOOR(v_base_price * v_discount / 100));
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_xp_balance(p_student_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_earned INTEGER;
  v_spent INTEGER;
BEGIN
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_earned
    FROM public.xp_transactions WHERE student_id = p_student_id;

  SELECT COALESCE(SUM(xp_cost), 0) INTO v_spent
    FROM public.xp_purchases WHERE student_id = p_student_id AND status != 'refunded';

  RETURN GREATEST(0, v_earned - v_spent);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_wellness_aggregate_stats(p_institution_id uuid)
 RETURNS TABLE(wellness_type text, total_logs bigint, unique_students bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF public.auth_institution_id() != p_institution_id THEN
    RAISE EXCEPTION 'unauthorized: institution mismatch';
  END IF;

  RETURN QUERY
  SELECT
    whl.wellness_type::text,
    COUNT(*)::bigint AS total_logs,
    COUNT(DISTINCT whl.student_id)::bigint AS unique_students
  FROM public.wellness_habit_logs whl
  JOIN public.profiles p ON p.id = whl.student_id
  WHERE p.institution_id = p_institution_id
  GROUP BY whl.wellness_type;
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_marketplace_items(p_institution_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata)
  VALUES
    (p_institution_id, 'Ocean Blue', 'A calming ocean-inspired theme with deep blue accents', 'cosmetic', 'profile_theme', 500, 3, 'one_per_student', 'palette',
     '{"accent": "#0ea5e9", "accentDark": "#0284c7", "gradientStart": "#0ea5e9", "gradientEnd": "#2563eb"}'),
    (p_institution_id, 'Forest Green', 'A nature-inspired theme with lush green tones', 'cosmetic', 'profile_theme', 500, 3, 'one_per_student', 'trees',
     '{"accent": "#22c55e", "accentDark": "#16a34a", "gradientStart": "#22c55e", "gradientEnd": "#059669"}'),
    (p_institution_id, 'Sunset Orange', 'A warm sunset theme with orange and amber accents', 'cosmetic', 'profile_theme', 750, 5, 'one_per_student', 'sunset',
     '{"accent": "#f97316", "accentDark": "#ea580c", "gradientStart": "#f97316", "gradientEnd": "#dc2626"}'),
    (p_institution_id, 'Midnight Purple', 'A sleek dark theme with purple highlights', 'cosmetic', 'profile_theme', 1000, 8, 'one_per_student', 'moon',
     '{"accent": "#8b5cf6", "accentDark": "#7c3aed", "gradientStart": "#8b5cf6", "gradientEnd": "#6d28d9"}')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata)
  VALUES
    (p_institution_id, 'Gold Crown', 'A prestigious gold frame with crown accent', 'cosmetic', 'avatar_frame', 1200, 10, 'one_per_student', 'crown',
     '{"borderColor": "#fbbf24", "borderWidth": 4, "glow": true}'),
    (p_institution_id, 'Silver Shield', 'A shimmering silver frame with shield motif', 'cosmetic', 'avatar_frame', 600, 5, 'one_per_student', 'shield',
     '{"borderColor": "#9ca3af", "borderWidth": 3, "glow": true}'),
    (p_institution_id, 'Bronze Star', 'A classic bronze frame with star accent', 'cosmetic', 'avatar_frame', 300, 2, 'one_per_student', 'star',
     '{"borderColor": "#d97706", "borderWidth": 3, "glow": false}')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata)
  VALUES
    (p_institution_id, 'The Scholar', 'Display "The Scholar" on the leaderboard', 'cosmetic', 'display_title', 400, 3, 'one_per_student', 'book-open',
     '{"title": "The Scholar"}'),
    (p_institution_id, 'Night Owl', 'Display "Night Owl" on the leaderboard', 'cosmetic', 'display_title', 400, 3, 'one_per_student', 'moon',
     '{"title": "Night Owl"}'),
    (p_institution_id, 'Early Bird', 'Display "Early Bird" on the leaderboard', 'cosmetic', 'display_title', 400, 3, 'one_per_student', 'sunrise',
     '{"title": "Early Bird"}'),
    (p_institution_id, 'Perfectionist', 'Display "Perfectionist" on the leaderboard', 'cosmetic', 'display_title', 800, 7, 'one_per_student', 'target',
     '{"title": "Perfectionist"}')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata)
  VALUES
    (p_institution_id, 'Extra Quiz Attempt', 'Get one additional attempt on any quiz', 'educational_perk', 'extra_quiz_attempt', 50, 2, 'unlimited', 'refresh-cw',
     '{"attempts": 1}'),
    (p_institution_id, 'Deadline Extension', 'Extend any assignment deadline by 24 hours', 'educational_perk', 'deadline_extension', 75, 3, 'unlimited', 'clock',
     '{"hours": 24}'),
    (p_institution_id, 'AI Tutor Hint Pack', '5 extra AI Tutor messages for today', 'educational_perk', 'hint_token', 30, 1, 'unlimited', 'message-circle',
     '{"messages": 5}')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata)
  VALUES
    (p_institution_id, '2x XP Boost (1hr)', 'Double all XP earned for 1 hour', 'power_up', 'xp_boost', 100, 4, 'unlimited', 'zap',
     '{"multiplier": 2.0, "duration_minutes": 60}'),
    (p_institution_id, 'Streak Shield', 'Protect your streak for one missed day', 'power_up', 'streak_shield', 200, 1, 'unlimited', 'shield',
     '{"protection_days": 1}')
  ON CONFLICT DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_department_if_no_programs(dept_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  deleted_id uuid;
BEGIN
  DELETE FROM public.departments
  WHERE id = dept_id
    AND NOT EXISTS (
      SELECT 1 FROM public.programs WHERE department_id = dept_id
    )
  RETURNING id INTO deleted_id;

  RETURN deleted_id IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_sub_clo_weights()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  parent_type text;
BEGIN
  IF NEW.type != 'SUB_CLO' THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_outcome_id IS NULL THEN
    RAISE EXCEPTION 'Sub-CLO must have a parent_outcome_id';
  END IF;

  SELECT type INTO parent_type
  FROM public.learning_outcomes
  WHERE id = NEW.parent_outcome_id;

  IF parent_type IS NULL THEN
    RAISE EXCEPTION 'Parent outcome not found';
  END IF;

  IF parent_type != 'CLO' THEN
    RAISE EXCEPTION 'Sub-CLO parent must be a CLO, got %', parent_type;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_max_active_challenges()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status = 'active' AND NEW.challenge_type = 'course_wide' THEN
    IF (SELECT COUNT(*) FROM public.social_challenges
        WHERE course_id = NEW.course_id AND status = 'active' AND challenge_type = 'course_wide' AND id != NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 active course-wide challenges per course';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_tutor_conversation_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tutor_conversations
    SET message_count = message_count + 1,
        updated_at    = now()
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tutor_conversations
    SET message_count = GREATEST(message_count - 1, 0),
        updated_at    = now()
    WHERE id = OLD.conversation_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    UPDATE public.tutor_conversations
    SET message_count = GREATEST(message_count - 1, 0),
        updated_at    = now()
    WHERE id = OLD.conversation_id;
    UPDATE public.tutor_conversations
    SET message_count = message_count + 1,
        updated_at    = now()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.badge_auto_archive()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.badges
  SET archived_at = now()
  WHERE archived_at IS NULL
    AND is_pinned = false
    AND tier IS NOT NULL
    AND (
      COALESCE(updated_at, created_at, awarded_at, now() - interval '91 days')
      < now() - interval '90 days'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.badge_spotlight_auto_rotate()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  inst RECORD;
  current_monday date;
  has_manual boolean;
  last_category text;
  next_category text;
  all_categories text[];
  cat_index int;
BEGIN
  current_monday := date_trunc('week', now())::date;

  FOR inst IN SELECT id FROM public.institutions LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.badge_spotlight_schedule
      WHERE institution_id = inst.id
        AND week_start = current_monday
    ) INTO has_manual;

    IF has_manual THEN
      CONTINUE;
    END IF;

    all_categories := ARRAY['academic', 'engagement', 'social', 'streak', 'wellness'];

    SELECT category INTO last_category
    FROM public.badge_spotlight_schedule
    WHERE institution_id = inst.id
    ORDER BY week_start DESC
    LIMIT 1;

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

    INSERT INTO public.badge_spotlight_schedule (institution_id, week_start, category, is_manual)
    VALUES (inst.id, current_monday, next_category, false)
    ON CONFLICT (institution_id, week_start) DO NOTHING;
  END LOOP;
END;
$function$;;
