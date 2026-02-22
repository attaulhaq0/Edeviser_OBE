-- Attainment level enum
CREATE TYPE attainment_level AS ENUM ('excellent', 'satisfactory', 'developing', 'not_yet');

-- Evidence table (immutable — append only)
CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  submission_id uuid NOT NULL REFERENCES public.submissions(id),
  grade_id uuid NOT NULL REFERENCES public.grades(id),
  clo_id uuid NOT NULL REFERENCES public.learning_outcomes(id),
  plo_id uuid NOT NULL REFERENCES public.learning_outcomes(id),
  ilo_id uuid NOT NULL REFERENCES public.learning_outcomes(id),
  score_percent numeric NOT NULL,
  attainment_level attainment_level NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

-- Attainment scope enum
CREATE TYPE attainment_scope AS ENUM ('student_course', 'course', 'program', 'institution');

-- Outcome Attainment table
CREATE TABLE public.outcome_attainment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id uuid NOT NULL REFERENCES public.learning_outcomes(id),
  student_id uuid REFERENCES public.profiles(id),
  course_id uuid REFERENCES public.courses(id),
  scope attainment_scope NOT NULL,
  attainment_percent numeric NOT NULL DEFAULT 0,
  sample_count integer NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outcome_attainment ENABLE ROW LEVEL SECURITY;;
