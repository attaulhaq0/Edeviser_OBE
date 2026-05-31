-- L28-1 Fix: Add length constraints to user-input text columns
-- Prevents accidental/malicious 1MB+ inputs that break screen readers and UI

-- Notifications: title <= 200, body <= 2000
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_title_length;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_title_length
  CHECK (length(title) <= 200);
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_body_length;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_body_length
  CHECK (body IS NULL OR length(body) <= 2000);

-- Grades feedback: <= 5000
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_feedback_length;
ALTER TABLE public.grades ADD CONSTRAINT grades_feedback_length
  CHECK (overall_feedback IS NULL OR length(overall_feedback) <= 5000);

-- Assignments: title <= 200, description <= 10000
ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_title_length;
ALTER TABLE public.assignments ADD CONSTRAINT assignments_title_length
  CHECK (length(title) <= 200);
ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_description_length;
ALTER TABLE public.assignments ADD CONSTRAINT assignments_description_length
  CHECK (description IS NULL OR length(description) <= 10000);

-- Profiles: full_name <= 200
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_full_name_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_full_name_length
  CHECK (full_name IS NULL OR length(full_name) <= 200);;
