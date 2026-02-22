-- Add missing columns to institutions
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS accreditation_body text;

-- Programs table
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id),
  coordinator_id uuid REFERENCES public.profiles(id),
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id),
  teacher_id uuid REFERENCES public.profiles(id),
  name text NOT NULL,
  code text NOT NULL,
  semester text NOT NULL,
  academic_year text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Student-Course enrollment
CREATE TABLE public.student_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  UNIQUE(student_id, course_id)
);
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;

-- Create enums for learning outcomes
CREATE TYPE outcome_type AS ENUM ('ILO', 'PLO', 'CLO');
CREATE TYPE blooms_level AS ENUM ('remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating');

-- Learning Outcomes (unified table for ILO, PLO, CLO)
CREATE TABLE public.learning_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id),
  program_id uuid REFERENCES public.programs(id),
  course_id uuid REFERENCES public.courses(id),
  created_by uuid REFERENCES public.profiles(id),
  type outcome_type NOT NULL,
  title text NOT NULL CHECK (char_length(title) <= 255),
  description text,
  blooms_level blooms_level,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_outcomes ENABLE ROW LEVEL SECURITY;

-- Outcome Mappings (CLO->PLO, PLO->ILO)
CREATE TABLE public.outcome_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_outcome_id uuid NOT NULL REFERENCES public.learning_outcomes(id) ON DELETE CASCADE,
  target_outcome_id uuid NOT NULL REFERENCES public.learning_outcomes(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 1.0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_outcome_id, target_outcome_id)
);
ALTER TABLE public.outcome_mappings ENABLE ROW LEVEL SECURITY;;
