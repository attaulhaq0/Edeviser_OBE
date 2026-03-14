CREATE TABLE starter_week_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  course_id UUID REFERENCES courses(id),
  session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('reading', 'practice', 'review', 'exploration')),
  suggested_date DATE NOT NULL,
  suggested_time_slot VARCHAR(10) NOT NULL CHECK (suggested_time_slot IN ('morning', 'afternoon', 'evening')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 25 AND duration_minutes <= 50),
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'modified', 'dismissed', 'completed')),
  planner_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_starter_week_sessions_student ON starter_week_sessions (student_id, status);

ALTER TABLE starter_week_sessions ENABLE ROW LEVEL SECURITY;;
