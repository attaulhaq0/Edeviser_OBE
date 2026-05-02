-- ============================================================
-- class_donations — XP sink: class-wide resource unlocks
-- Students donate XP toward a shared goal for their course.
-- ============================================================

CREATE TABLE class_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  resource_description TEXT NOT NULL,
  goal_amount INTEGER NOT NULL CHECK (goal_amount >= 100),
  current_total INTEGER NOT NULL DEFAULT 0 CHECK (current_total >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_class_donations_course ON class_donations (course_id, status);
CREATE INDEX idx_class_donations_institution ON class_donations (institution_id, status);;
