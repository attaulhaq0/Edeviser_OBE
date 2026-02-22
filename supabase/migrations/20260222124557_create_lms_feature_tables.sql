-- ============================================
-- Migration 4: LMS Feature Tables
-- ============================================

-- announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id, is_pinned DESC, created_at DESC);

-- course_modules
CREATE TABLE IF NOT EXISTS course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

-- course_materials
CREATE TABLE IF NOT EXISTS course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('file', 'link', 'video', 'text')),
  content_url text,
  file_path text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  clo_ids jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;

-- discussion_threads
CREATE TABLE IF NOT EXISTS discussion_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_discussion_threads_course ON discussion_threads(course_id, is_pinned DESC, created_at DESC);

-- discussion_replies
CREATE TABLE IF NOT EXISTS discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES discussion_threads(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  is_answer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;

-- class_sessions
CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES course_sections(id) NOT NULL,
  session_date date NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('lecture', 'lab', 'tutorial')),
  topic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, session_date, session_type)
);
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES class_sessions(id) NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id, session_id);

-- quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  title text NOT NULL,
  description text,
  clo_ids jsonb NOT NULL DEFAULT '[]',
  time_limit_minutes integer,
  max_attempts integer NOT NULL DEFAULT 1,
  is_published boolean NOT NULL DEFAULT false,
  due_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- quiz_questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('mcq_single', 'mcq_multi', 'true_false', 'short_answer', 'fill_blank')),
  options jsonb,
  correct_answer jsonb NOT NULL,
  points numeric NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- quiz_attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  score numeric,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  attempt_number integer NOT NULL DEFAULT 1,
  UNIQUE (quiz_id, student_id, attempt_number)
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id, quiz_id);

-- grade_categories
CREATE TABLE IF NOT EXISTS grade_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  name text NOT NULL,
  weight_percent numeric NOT NULL CHECK (weight_percent > 0 AND weight_percent <= 100),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;

-- timetable_slots
CREATE TABLE IF NOT EXISTS timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES course_sections(id) NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  room text,
  slot_type text NOT NULL CHECK (slot_type IN ('lecture', 'lab', 'tutorial')),
  UNIQUE (section_id, day_of_week, start_time)
);
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;

-- academic_calendar_events
CREATE TABLE IF NOT EXISTS academic_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  semester_id uuid REFERENCES semesters(id),
  title text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('semester_start', 'semester_end', 'exam_period', 'holiday', 'registration', 'custom')),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE academic_calendar_events ENABLE ROW LEVEL SECURITY;

-- parent_student_links
CREATE TABLE IF NOT EXISTS parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES profiles(id) NOT NULL,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('parent', 'guardian')),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;

-- fee_structures
CREATE TABLE IF NOT EXISTS fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) NOT NULL,
  semester_id uuid REFERENCES semesters(id) NOT NULL,
  fee_type text NOT NULL CHECK (fee_type IN ('tuition', 'lab', 'library', 'exam')),
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'PKR',
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;

-- fee_payments
CREATE TABLE IF NOT EXISTS fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  fee_structure_id uuid REFERENCES fee_structures(id) NOT NULL,
  amount_paid numeric NOT NULL CHECK (amount_paid >= 0),
  payment_date date NOT NULL,
  payment_method text,
  receipt_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id, status);
;
