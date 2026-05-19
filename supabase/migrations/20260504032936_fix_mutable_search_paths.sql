DO $$
DECLARE
  target text;
  fn regprocedure;
BEGIN
  FOR target IN
    SELECT signature
    FROM (
      VALUES
        ('public.process_marketplace_purchase(uuid, uuid, uuid)'),
        ('public.badge_auto_archive()'),
        ('public.seed_marketplace_items(uuid)'),
        ('public.get_effective_price(uuid, uuid)'),
        ('public.badge_spotlight_auto_rotate()'),
        ('public.is_pgcron_available()'),
        ('public.validate_sub_clo_weights()'),
        ('public.trg_review_schedules_set_updated_at()'),
        ('public.enforce_max_active_challenges()'),
        ('public.update_marketplace_items_updated_at()'),
        ('public.get_wellness_aggregate_stats(uuid)'),
        ('public.update_graduate_attributes_updated_at()'),
        ('public.trigger_attainment_rollup()'),
        ('public.sync_tutor_conversation_stats()'),
        ('public.set_tutor_conversations_updated_at()'),
        ('public.delete_department_if_no_programs(uuid)'),
        ('public.get_xp_balance(uuid)'),
        ('public.prevent_xp_purchases_delete()')
    ) AS targets(signature)
  LOOP
    fn := to_regprocedure(target);
    IF fn IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
    END IF;
  END LOOP;
END $$;
