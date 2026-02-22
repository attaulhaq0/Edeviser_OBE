-- Rubrics table
CREATE TABLE public.rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clo_id uuid REFERENCES public.learning_outcomes(id),
  created_by uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  is_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;

-- Rubric Criteria table
CREATE TABLE public.rubric_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id uuid NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
  criterion_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  levels jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_points numeric NOT NULL
);
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;

-- Assignment type enum
CREATE TYPE assignment_type AS ENUM ('assignment', 'quiz', 'project', 'exam');

-- Assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  created_by uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  type assignment_type NOT NULL DEFAULT 'assignment',
  total_marks numeric NOT NULL,
  due_date timestamptz NOT NULL,
  is_late_allowed boolean NOT NULL DEFAULT true,
  late_window_hours integer NOT NULL DEFAULT 24,
  clo_weights jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Submission status enum
CREATE TYPE submission_status AS ENUM ('submitted', 'graded');

-- Submissions table
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  file_url text,
  text_content text,
  is_late boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status submission_status NOT NULL DEFAULT 'submitted',
  UNIQUE(assignment_id, student_id)
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Grades table
CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) UNIQUE,
  graded_by uuid NOT NULL REFERENCES public.profiles(id),
  rubric_selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_score numeric NOT NULL,
  score_percent numeric NOT NULL,
  overall_feedback text,
  graded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;;
