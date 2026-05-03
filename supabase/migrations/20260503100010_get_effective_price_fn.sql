-- ============================================================
-- Migration 1.10: get_effective_price helper function
-- Feature: XP Marketplace & Virtual Economy
-- Returns item price minus highest active sale discount
-- SECURITY INVOKER
-- ============================================================

CREATE OR REPLACE FUNCTION get_effective_price(p_item_id UUID, p_institution_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_base_price INTEGER;
  v_discount INTEGER;
BEGIN
  -- Fetch base price
  SELECT xp_price INTO v_base_price
    FROM marketplace_items
    WHERE id = p_item_id AND institution_id = p_institution_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Find highest active sale discount
  SELECT COALESCE(MAX(se.discount_percentage), 0) INTO v_discount
    FROM sale_event_items sei
    JOIN sale_events se ON se.id = sei.sale_event_id
    WHERE sei.item_id = p_item_id
      AND se.institution_id = p_institution_id
      AND se.start_date <= NOW()
      AND se.end_date > NOW();

  -- Return discounted price (minimum 1 XP)
  RETURN GREATEST(1, v_base_price - FLOOR(v_base_price * v_discount / 100));
END;
$$;
