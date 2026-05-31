ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS rubric_id uuid REFERENCES public.rubrics(id);;
