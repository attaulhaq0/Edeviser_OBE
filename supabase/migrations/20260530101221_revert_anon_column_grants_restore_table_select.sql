-- ============================================================================
-- Revert the column-level anon SELECT grants introduced earlier in task 2.3.
--
-- Rationale: restricting anon to specific columns of public.profiles broke RLS
-- evaluation on OTHER content tables. Several pre-existing PUBLIC (all-roles)
-- policies run institution-scoped subqueries against profiles, e.g.
--   badges_institution_read: student_id IN (SELECT profiles.id FROM profiles
--                            WHERE profiles.institution_id = auth_institution_id())
-- Evaluating these as anon requires SELECT on profiles.institution_id (and
-- potentially other columns), which the narrowed grant removed, raising
-- "permission denied for table profiles" before the anon public-portfolio
-- policy could admit the row. The set of profiles columns referenced by such
-- policies is broad and may grow, so column-level grants on profiles are too
-- fragile.
--
-- Access control for the public portfolio is therefore enforced purely at the
-- ROW level via the *_anon_public_portfolio RLS policies (both portfolio flags
-- required), per design.md "Public portfolio RLS" (content queries always run
-- under RLS). The PublicPortfolio surface selects only non-sensitive columns.
--
-- Restores the Supabase default table-level SELECT grant for anon so the
-- existing PUBLIC policies evaluate without error.
-- ============================================================================

GRANT SELECT ON public.profiles            TO anon;
GRANT SELECT ON public.student_gamification TO anon;
;
