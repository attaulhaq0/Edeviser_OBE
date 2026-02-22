-- Create role enum type
CREATE TYPE public.user_role AS ENUM ('admin', 'coordinator', 'teacher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'student',
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;;
