CREATE TYPE cosmetic_slot AS ENUM ('profile_theme', 'avatar_frame', 'display_title');

CREATE TABLE student_equipped_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES xp_purchases(id) ON DELETE CASCADE,
  slot cosmetic_slot NOT NULL,
  equipped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_equipped_slot UNIQUE (student_id, slot)
);

CREATE INDEX idx_student_equipped_student ON student_equipped_items(student_id);

ALTER TABLE student_equipped_items ENABLE ROW LEVEL SECURITY;;
