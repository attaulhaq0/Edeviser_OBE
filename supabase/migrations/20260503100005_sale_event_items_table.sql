-- ============================================================
-- Migration 1.5: sale_event_items junction table
-- Feature: XP Marketplace & Virtual Economy
-- Composite PK on (sale_event_id, item_id)
-- ============================================================

CREATE TABLE IF NOT EXISTS sale_event_items (
  sale_event_id UUID NOT NULL REFERENCES sale_events(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  PRIMARY KEY (sale_event_id, item_id)
);

-- Index for reverse lookups by item
CREATE INDEX IF NOT EXISTS idx_sale_event_items_item ON sale_event_items(item_id);

ALTER TABLE sale_event_items ENABLE ROW LEVEL SECURITY;
