-- Step 2: Create main tables
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