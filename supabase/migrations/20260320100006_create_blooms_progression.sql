-- ============================================================
-- Migration: Create blooms_progression table
-- Feature: AI-Powered Adaptive Quiz Generation (Task 17.1)
-- ============================================================

-- ============================================================
-- blooms_progression — Tracks highest Bloom's level reached per student-CLO
-- ============================================================
CREATE TABLE blooms_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  clo_id UUID NOT NULL REFERENCES clos(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  highest_bloom_level SMALLINT NOT NULL DEFAULT 1 CHECK (highest_bloom_level BETWEEN 1 AND 6),
  correct_count_at_highest INTEGER NOT NULL DEFAULT 0,
  bloom_explorer_awarded BOOLEAN NOT NULL DEFAULT false,
  bloom_challenger_awarded BOOLEAN NOT NULL DEFAULT false,
  bloom_pioneer_awarded BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, clo_id)
);

ALTER TABLE blooms_progression ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_blooms_student ON blooms_progression (student_id, course_id);
CREATE INDEX idx_blooms_clo ON blooms_progression (clo_id);
