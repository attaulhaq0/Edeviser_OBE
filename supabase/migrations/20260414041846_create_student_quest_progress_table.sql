-- ============================================================
-- student_quest_progress — Student progress on knowledge quests
-- ============================================================

CREATE TABLE student_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  quest_id UUID NOT NULL REFERENCES knowledge_quests(id),
  status VARCHAR(20) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'expired')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (student_id, quest_id)
);

CREATE INDEX idx_quest_progress_student ON student_quest_progress (student_id, status);
CREATE INDEX idx_quest_progress_quest ON student_quest_progress (quest_id);;
