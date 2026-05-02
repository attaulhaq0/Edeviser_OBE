-- ============================================================
-- recalculate_dynamic_prices — Adjust marketplace item prices
-- based on purchase demand in the last 30 days.
-- High demand (>10 purchases): increase up to 150% of base
-- Low demand (<3 purchases): decrease to 50% of base
-- Called by pg_cron daily at midnight UTC.
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_dynamic_prices(p_institution_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_demand_count INTEGER;
BEGIN
  FOR r IN
    SELECT mi.id, mi.xp_price
    FROM marketplace_items mi
    WHERE mi.institution_id = p_institution_id
      AND mi.is_active = true
  LOOP
    -- Count purchases in the last 30 days for this item
    SELECT COUNT(*) INTO v_demand_count
    FROM xp_purchases xp
    WHERE xp.item_id = r.id
      AND xp.purchased_at > NOW() - INTERVAL '30 days'
      AND xp.status != 'refunded';

    -- Adjust price based on demand
    IF v_demand_count > 10 THEN
      -- High demand: increase price up to 150% of base
      UPDATE marketplace_items
      SET dynamic_price_override = LEAST(
        FLOOR(r.xp_price * 1.5),
        FLOOR(r.xp_price + (r.xp_price * 0.5 * LEAST(v_demand_count, 30)::NUMERIC / 30))
      )
      WHERE id = r.id;
    ELSIF v_demand_count < 3 THEN
      -- Low demand: decrease price to 50% of base
      UPDATE marketplace_items
      SET dynamic_price_override = GREATEST(
        FLOOR(r.xp_price * 0.5),
        FLOOR(r.xp_price - (r.xp_price * 0.5 * (3 - v_demand_count)::NUMERIC / 3))
      )
      WHERE id = r.id;
    ELSE
      -- Normal demand: clear override
      UPDATE marketplace_items
      SET dynamic_price_override = NULL
      WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;;
