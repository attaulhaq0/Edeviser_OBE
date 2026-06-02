ALTER FUNCTION public.process_marketplace_purchase SET search_path = '';
ALTER FUNCTION public.badge_auto_archive() SET search_path = '';
ALTER FUNCTION public.seed_marketplace_items SET search_path = '';
ALTER FUNCTION public.get_effective_price SET search_path = '';
ALTER FUNCTION public.badge_spotlight_auto_rotate() SET search_path = '';
ALTER FUNCTION public.is_pgcron_available() SET search_path = '';
-- NOTE (db-function-search-path-qualification Task 6, replay-only): the ALTER
-- statements for validate_sub_clo_weights, enforce_max_active_challenges,
-- update_graduate_attributes_updated_at, sync_tutor_conversation_stats, and
-- set_tutor_conversations_updated_at were REMOVED from here. Those functions are
-- created LATER in the chain (20260601110014 / 20260620000002 / 20260720000003 /
-- 20260820000003), so ALTERing them at this May-4 point aborted a fresh replay
-- with 42883 (function does not exist yet). search_path='' is now baked into each
-- function's CREATE site instead, matching the LIVE production definitions.
ALTER FUNCTION public.trg_review_schedules_set_updated_at() SET search_path = '';
ALTER FUNCTION public.update_marketplace_items_updated_at() SET search_path = '';
ALTER FUNCTION public.get_wellness_aggregate_stats(uuid) SET search_path = '';
ALTER FUNCTION public.trigger_attainment_rollup() SET search_path = '';
ALTER FUNCTION public.delete_department_if_no_programs(uuid) SET search_path = '';
ALTER FUNCTION public.get_xp_balance SET search_path = '';
ALTER FUNCTION public.prevent_xp_purchases_delete() SET search_path = '';;
