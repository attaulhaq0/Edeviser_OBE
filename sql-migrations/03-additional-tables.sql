-- Step 3: Create additional tables
-- Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID NOT NULL REFERENCES public.courses(id),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  total_points INTEGER NOT NULL DEFAULT 100,
  due_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rubric_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Progress table
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id),
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date TIMESTAMP WITH TIME ZONE,
  total_badges INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Badge Templates table
CREATE TABLE IF NOT EXISTS public.badge_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type badge_type NOT NULL,
  icon_url TEXT,
  requirements JSONB NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Badges table
CREATE TABLE IF NOT EXISTS public.student_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  badge_template_id UUID NOT NULL REFERENCES public.badge_templates(id),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);