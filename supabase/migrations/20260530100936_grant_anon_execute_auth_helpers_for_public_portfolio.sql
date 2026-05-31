-- ============================================================================
-- Allow the anon role to EVALUATE the auth helper functions used inside the
-- existing PUBLIC RLS policies on the public-portfolio content tables.
--
-- Requirement 24.3 / 24.4 (student-experience-remediation, task 2.3):
--   The public portfolio content queries must "always run under RLS" for
--   unauthenticated (anon) requests. Postgres OR-evaluates every RLS policy
--   that applies to the current role; the pre-existing PUBLIC policies on
--   profiles / badges / outcome_attainment / student_gamification call
--   auth_user_role() and auth_institution_id(). Without EXECUTE on those
--   SECURITY DEFINER helpers, an anon SELECT raises "permission denied for
--   function auth_user_role" BEFORE the anon public-portfolio policy can admit
--   the row, so the public portfolio cannot load at all.
--
-- Safety: both helpers are SECURITY DEFINER and resolve auth.uid(), which is
-- NULL for an anon session, so they return NULL for anon. Every existing
-- policy predicate that consumes them (id = auth.uid(), institution_id =
-- auth_institution_id(), auth_user_role() = 'admin', ...) therefore evaluates
-- to NULL/false and exposes NO additional rows. anon row visibility remains
-- governed solely by the explicit *_anon_public_portfolio policies.
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.auth_user_role()      TO anon;
GRANT EXECUTE ON FUNCTION public.auth_institution_id() TO anon;
;
