-- Add tier and category columns to badges table
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('bronze', 'silver', 'gold')),
  ADD COLUMN IF NOT EXISTS category text;

-- Add is_pinned and archived_at columns to badges table (acts as student_badges)
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Create badge_spotlight_schedule table
CREATE TABLE IF NOT EXISTS public.badge_spotlight_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id),
  week_start date NOT NULL,
  category text NOT NULL,
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT week_start_is_monday CHECK (EXTRACT(DOW FROM week_start) = 1),
  CONSTRAINT badge_spotlight_schedule_institution_week_unique UNIQUE (institution_id, week_start)
);

-- Enable RLS on badge_spotlight_schedule
ALTER TABLE public.badge_spotlight_schedule ENABLE ROW LEVEL SECURITY;

-- Admin manages (full CRUD) within institution
CREATE POLICY "admin_all_badge_spotlight_schedule" ON public.badge_spotlight_schedule
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'admin'
    AND institution_id = (SELECT institution_id FROM public.profiles WHERE id = (select auth.uid()))
  );

-- All authenticated roles can read within their institution
CREATE POLICY "all_roles_read_badge_spotlight_schedule" ON public.badge_spotlight_schedule
  FOR SELECT TO authenticated
  USING (
    institution_id = (SELECT institution_id FROM public.profiles WHERE id = (select auth.uid()))
  );;
