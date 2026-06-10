ALTER TABLE public.cqi_action_plans
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS evidence_of_improvement text;;
