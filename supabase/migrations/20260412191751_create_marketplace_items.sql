CREATE TYPE marketplace_item_category AS ENUM ('cosmetic', 'educational_perk', 'power_up');
CREATE TYPE marketplace_item_sub_category AS ENUM (
  'profile_theme', 'avatar_frame', 'display_title',
  'extra_quiz_attempt', 'deadline_extension', 'hint_token',
  'xp_boost', 'streak_shield'
);
CREATE TYPE marketplace_stock_type AS ENUM ('unlimited', 'limited', 'one_per_student');

CREATE TABLE marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  category marketplace_item_category NOT NULL,
  sub_category marketplace_item_sub_category NOT NULL,
  xp_price INTEGER NOT NULL CHECK (xp_price > 0),
  level_requirement INTEGER NOT NULL DEFAULT 0 CHECK (level_requirement >= 0),
  stock_type marketplace_stock_type NOT NULL DEFAULT 'unlimited',
  stock_quantity INTEGER CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  icon_identifier TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_items_institution ON marketplace_items(institution_id);
CREATE INDEX idx_marketplace_items_category ON marketplace_items(category);
CREATE INDEX idx_marketplace_items_active ON marketplace_items(institution_id, is_active) WHERE is_active = true;

ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_marketplace_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marketplace_items_updated_at
  BEFORE UPDATE ON marketplace_items
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_items_updated_at();;
