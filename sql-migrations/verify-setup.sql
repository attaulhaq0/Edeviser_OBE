-- Verification Script - Run this after all migrations
-- Check if all tables were created
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check if all types were created
SELECT 
  typname,
  typtype
FROM pg_type 
WHERE typname IN ('role', 'blooms_level', 'outcome_type', 'badge_type');

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public';

-- Check sample data
SELECT 'programs' as table_name, count(*) as row_count FROM public.programs
UNION ALL
SELECT 'courses' as table_name, count(*) as row_count FROM public.courses
UNION ALL
SELECT 'badge_templates' as table_name, count(*) as row_count FROM public.badge_templates
UNION ALL
SELECT 'profiles' as table_name, count(*) as row_count FROM public.profiles;