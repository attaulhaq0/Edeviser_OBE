-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types/enums
DO $$ BEGIN
    CREATE TYPE role AS ENUM ('admin', 'coordinator', 'teacher', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE blooms_level AS ENUM ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE outcome_type AS ENUM ('ILO', 'PLO', 'CLO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE badge_type AS ENUM ('achievement', 'mastery', 'streak', 'special');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE mascot_type AS ENUM ('fox', 'owl', 'penguin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('low_performance', 'inactivity', 'missed_deadline', 'help_request', 'achievement', 'streak_break');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role role NOT NULL DEFAULT 'student',
  is_active BOOLEAN NOT NULL DEFAULT true,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Programs table
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code VARCHAR(10) UNIQUE NOT NULL,
  level TEXT NOT NULL,
  coordinator_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code VARCHAR(10) UNIQUE NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  program_id UUID NOT NULL REFERENCES public.programs(id),
  teacher_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Learning Outcomes table
CREATE TABLE IF NOT EXISTS public.learning_outcomes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type outcome_type NOT NULL,
  blooms_level blooms_level NOT NULL,
  program_id UUID REFERENCES public.programs(id),
  course_id UUID REFERENCES public.courses(id),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  last_edited_by UUID NOT NULL REFERENCES public.profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Outcome Mappings table
CREATE TABLE IF NOT EXISTS public.outcome_mappings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_outcome_id UUID NOT NULL REFERENCES public.learning_outcomes(id),
  target_outcome_id UUID NOT NULL REFERENCES public.learning_outcomes(id),
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_outcomes_updated_at BEFORE UPDATE ON public.learning_outcomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON public.student_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Programs policies  
CREATE POLICY "Everyone can view active programs" ON public.programs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins and coordinators can manage programs" ON public.programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Courses policies
CREATE POLICY "Everyone can view active courses" ON public.courses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Teachers can manage their courses" ON public.courses
  FOR ALL USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Learning outcomes policies
CREATE POLICY "Everyone can view active learning outcomes" ON public.learning_outcomes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage their learning outcomes" ON public.learning_outcomes
  FOR ALL USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Student progress policies
CREATE POLICY "Students can view their own progress" ON public.student_progress
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can update their own progress" ON public.student_progress
  FOR ALL USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator', 'teacher')
    )
  );

-- Badge templates policies
CREATE POLICY "Everyone can view active badge templates" ON public.badge_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage badge templates" ON public.badge_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Student badges policies
CREATE POLICY "Students can view their own badges" ON public.student_badges
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "System can award badges" ON public.student_badges
  FOR INSERT WITH CHECK (true);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, first_name, last_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Name'),
    COALESCE((new.raw_user_meta_data->>'role')::role, 'student')
  );
  
  -- Create student progress if user is a student
  IF COALESCE((new.raw_user_meta_data->>'role')::role, 'student') = 'student' THEN
    INSERT INTO public.student_progress (student_id)
    VALUES (new.id);
  END IF;
  
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();