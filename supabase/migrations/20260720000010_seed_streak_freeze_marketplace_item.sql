-- Seed streak freeze as a marketplace item (category: power_up, sub_category: streak_shield)
-- This migrates the existing streak freeze purchase into the unified marketplace system.

INSERT INTO marketplace_items (
  institution_id,
  name,
  description,
  category,
  sub_category,
  xp_price,
  level_requirement,
  stock_type,
  stock_quantity,
  icon_identifier,
  metadata,
  is_active
)
SELECT
  i.id,
  'Streak Shield',
  'Protect your streak for one missed day. Max 3 in inventory.',
  'power_up',
  'streak_shield',
  200,
  0,
  'unlimited',
  NULL,
  'shield',
  '{"max_inventory": 3}'::jsonb,
  true
FROM institutions i
ON CONFLICT DO NOTHING;
