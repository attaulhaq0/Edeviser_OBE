-- ============================================
-- Migration 3: Institutional Management Tables
-- ============================================

-- semesters
CREATE TABLE IF NOT EXISTS semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date > start_date),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;

-- departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  head_of_department_id uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- course_sections
CREATE TABLE IF NOT EXISTS course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  section_code text NOT NULL,
  teacher_id uuid REFERENCES profiles(id) NOT NULL,
  capacity integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, section_code)
);
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;

-- surveys
CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('course_exit', 'graduate_exit', 'employer')),
  target_outcomes jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- survey_questions
CREATE TABLE IF NOT EXISTS survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('likert', 'mcq', 'text')),
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (survey_id, sort_order)
);
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

-- survey_responses
CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) NOT NULL,
  question_id uuid REFERENCES survey_questions(id) NOT NULL,
  respondent_id uuid REFERENCES profiles(id) NOT NULL,
  response_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, question_id, respondent_id)
);
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- cqi_action_plans
CREATE TABLE IF NOT EXISTS cqi_action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) NOT NULL,
  semester_id uuid REFERENCES semesters(id) NOT NULL,
  outcome_id uuid REFERENCES learning_outcomes(id) NOT NULL,
  outcome_type text NOT NULL CHECK (outcome_type IN ('PLO', 'CLO')),
  baseline_attainment numeric NOT NULL CHECK (baseline_attainment >= 0 AND baseline_attainment <= 100),
  target_attainment numeric NOT NULL CHECK (target_attainment >= 0 AND target_attainment <= 100),
  action_description text NOT NULL,
  responsible_person text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'evaluated')),
  result_attainment numeric CHECK (result_attainment >= 0 AND result_attainment <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cqi_action_plans ENABLE ROW LEVEL SECURITY;

-- institution_settings
CREATE TABLE IF NOT EXISTS institution_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) NOT NULL UNIQUE,
  attainment_thresholds jsonb NOT NULL DEFAULT '{"excellent": 85, "satisfactory": 70, "developing": 50}',
  success_threshold integer NOT NULL DEFAULT 70,
  accreditation_body text NOT NULL DEFAULT 'Generic' CHECK (accreditation_body IN ('HEC', 'QQA', 'ABET', 'NCAAA', 'AACSB', 'Generic')),
  grade_scales jsonb NOT NULL DEFAULT '[{"letter":"A","min_percent":85,"max_percent":100,"gpa_points":4.0},{"letter":"B","min_percent":70,"max_percent":84,"gpa_points":3.0},{"letter":"C","min_percent":55,"max_percent":69,"gpa_points":2.0},{"letter":"D","min_percent":50,"max_percent":54,"gpa_points":1.0},{"letter":"F","min_percent":0,"max_percent":49,"gpa_points":0.0}]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE institution_settings ENABLE ROW LEVEL SECURITY;

-- program_accreditations
CREATE TABLE IF NOT EXISTS program_accreditations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) NOT NULL,
  accreditation_body text NOT NULL,
  framework_version text,
  accreditation_date date,
  next_review_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE program_accreditations ENABLE ROW LEVEL SECURITY;

-- Column additions for institutional management
ALTER TABLE courses ADD COLUMN IF NOT EXISTS semester_id uuid REFERENCES semesters(id);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id);
ALTER TABLE student_courses ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES course_sections(id);
;
