-- ============================================================
-- Add dynamic_price_override column to marketplace_items
-- When not null, this overrides the base xp_price for display.
-- The recalculate_dynamic_prices function sets this value.
-- ============================================================

ALTER TABLE marketplace_items
  ADD COLUMN dynamic_price_override INTEGER;

COMMENT ON COLUMN marketplace_items.dynamic_price_override IS
  'When not null, overrides xp_price for display. Set by recalculate_dynamic_prices cron job.';;
