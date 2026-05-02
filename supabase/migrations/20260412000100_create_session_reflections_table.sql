-- Task 1.6: Create session_reflections table (append-only)
CREATE TABLE session_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  word_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE session_reflections ENABLE ROW LEVEL SECURITY;;
