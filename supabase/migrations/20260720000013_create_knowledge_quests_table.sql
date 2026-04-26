-- ============================================================
-- knowledge_quests — Time-limited learning challenges
-- ============================================================

CREATE TABLE knowledge_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  quest_type VARCHAR(30) NOT NULL CHECK (quest_type IN ('quiz_challenge', 'content_creation', 'peer_review')),
  target_clo_ids UUID[] DEFAULT '{}',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  reward_type VARCHAR(10) NOT NULL CHECK (reward_type IN ('item', 'xp')),
  reward_item_id UUID REFERENCES marketplace_items(id),
  reward_xp_amount INTEGER CHECK (reward_xp_amount > 0 OR reward_type = 'item'),
  max_participants INTEGER,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT valid_quest_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_knowledge_quests_institution ON knowledge_quests (institution_id, start_date, end_date);
CREATE INDEX idx_knowledge_quests_active ON knowledge_quests (institution_id, is_active) WHERE is_active = true;
