-- Drop the duplicate index on social_challenges
-- idx_social_challenges_course and idx_social_challenges_course_status are identical
-- Keep idx_social_challenges_course_status (more descriptive name), drop the other
DROP INDEX IF EXISTS public.idx_social_challenges_course;;
