-- PostgreSQL OR-combines permissive policies. These legacy write policies
-- bypass the tenant-bound teacher/admin policies installed in migration 003.
DROP POLICY IF EXISTS "social_challenges_insert" ON public.social_challenges;
DROP POLICY IF EXISTS "teacher_all_challenges" ON public.social_challenges;
