-- Student Gamification (1:1 with student profile)
CREATE TABLE public.student_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) UNIQUE,
  xp_total integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_current integer NOT NULL DEFAULT 0,
  streak_longest integer NOT NULL DEFAULT 0,
  last_login_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_gamification ENABLE ROW LEVEL SECURITY;

-- Badges table
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  badge_key text NOT NULL,
  badge_name text NOT NULL,
  emoji text NOT NULL DEFAULT '🏆',
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, badge_key)
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- XP Transactions (immutable ledger)
CREATE TABLE public.xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  xp_amount integer NOT NULL,
  source text NOT NULL CHECK (source IN ('login', 'submission', 'grade', 'badge', 'streak', 'journal', 'admin_adjustment')),
  reference_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- Journal Entries
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  clo_id uuid REFERENCES public.learning_outcomes(id),
  content text NOT NULL,
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;;
