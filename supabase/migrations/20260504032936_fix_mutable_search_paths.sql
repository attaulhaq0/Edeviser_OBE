ALTER FUNCTION public.process_marketplace_purchase SET search_path = '';
ALTER FUNCTION public.badge_auto_archive() SET search_path = '';
ALTER FUNCTION public.seed_marketplace_items SET search_path = '';
ALTER FUNCTION public.get_effective_price SET search_path = '';
ALTER FUNCTION public.badge_spotlight_auto_rotate() SET search_path = '';
ALTER FUNCTION public.is_pgcron_available() SET search_path = '';
DO $$ BEGIN
  IF to_regprocedure('public.validate_sub_clo_weights()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.validate_sub_clo_weights() SET search_path = ''''';
  END IF;
END $$;
ALTER FUNCTION public.trg_review_schedules_set_updated_at() SET search_path = '';
DO $$ BEGIN
  IF to_regprocedure('public.enforce_max_active_challenges()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.enforce_max_active_challenges() SET search_path = ''''';
  END IF;
END $$;
ALTER FUNCTION public.update_marketplace_items_updated_at() SET search_path = '';
ALTER FUNCTION public.get_wellness_aggregate_stats(uuid) SET search_path = '';
DO $$ BEGIN
  IF to_regprocedure('public.update_graduate_attributes_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.update_graduate_attributes_updated_at() SET search_path = ''''';
  END IF;
END $$;
ALTER FUNCTION public.trigger_attainment_rollup() SET search_path = '';
DO $$ BEGIN
  IF to_regprocedure('public.sync_tutor_conversation_stats()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.sync_tutor_conversation_stats() SET search_path = ''''';
  END IF;
END $$;
DO $$ BEGIN
  IF to_regprocedure('public.set_tutor_conversations_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.set_tutor_conversations_updated_at() SET search_path = ''''';
  END IF;
END $$;
ALTER FUNCTION public.delete_department_if_no_programs(uuid) SET search_path = '';
ALTER FUNCTION public.get_xp_balance SET search_path = '';
ALTER FUNCTION public.prevent_xp_purchases_delete() SET search_path = '';;
