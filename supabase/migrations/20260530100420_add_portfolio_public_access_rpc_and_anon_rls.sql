-- ============================================================================
-- Public student portfolio: SECURITY DEFINER access discriminator + anon RLS
--
-- Requirements 24.3 / 24.3a / 24.4 (student-experience-remediation, task 2.3):
--   * 24.3  An unauthorized portfolio must NOT render protected content to an
--           unauthenticated request; access is denied at the data layer.
--   * 24.3a A denied (exists-but-unauthorized) portfolio must be distinguishable
--           as 403 Forbidden, NOT 404 Not Found.
--   * 24.4  Access control is enforced at the data layer (RLS), not only client.
--
-- An authorized portfolio requires BOTH profiles.portfolio_public = true AND
-- profiles.portfolio_sharing_permitted = true (the school/admin grant added in
-- task 1.3). This mirrors the pure-logic model in src/lib/portfolioAccess.ts
-- (evaluatePortfolioAccess): authorized only when public AND sharing-permitted.
--
-- Why SECURITY DEFINER for the discriminator: under anon RLS a private (but
-- existing) profile returns zero rows, so a SECURITY INVOKER function could not
-- tell "exists but private" (forbidden) from "does not exist" (not_found),
-- collapsing 403 into 404 and violating 24.3a. The discriminator therefore runs
-- as owner to SEE existence, while returning ONLY a status token and never any
-- portfolio content. Content itself is still fetched by the client under RLS
-- (the anon policies below), so unauthorized content is never returned even if
-- the client misbehaves.
--
-- Idempotent: CREATE OR REPLACE for functions, DROP POLICY IF EXISTS before
-- each CREATE POLICY, and column-grant narrowing guarded by explicit REVOKE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Authorization predicate (SECURITY DEFINER) shared by the discriminator
--    and every content RLS policy, so the "authorized" rule lives in ONE place.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_portfolio_publicly_accessible(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_student_id
      AND portfolio_public = true
      AND portfolio_sharing_permitted = true
  );
$$;

COMMENT ON FUNCTION public.is_portfolio_publicly_accessible(uuid)
  IS 'TRUE when the given student profile exists and is authorized for public portfolio viewing (portfolio_public AND portfolio_sharing_permitted). SECURITY DEFINER so it can be referenced from anon RLS policies that gate public-portfolio content (R24.3/24.4).';

REVOKE ALL     ON FUNCTION public.is_portfolio_publicly_accessible(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_portfolio_publicly_accessible(uuid) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Access discriminator: authorized | forbidden | not_found (no content).
--    Matches src/lib/portfolioAccess.ts evaluatePortfolioAccess exactly:
--      not_found  -> profile does not exist (evaluated first)
--      authorized -> public AND sharing_permitted
--      forbidden  -> exists, any other case
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.portfolio_public_access(p_student_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_student_id)
      THEN 'not_found'
    WHEN public.is_portfolio_publicly_accessible(p_student_id)
      THEN 'authorized'
    ELSE 'forbidden'
  END;
$$;

COMMENT ON FUNCTION public.portfolio_public_access(uuid)
  IS 'Public-portfolio authorization discriminator (R24.3/24.3a). Returns ''authorized'' (exists, public AND sharing_permitted), ''forbidden'' (exists but not authorized -> route 403), or ''not_found'' (no such profile -> route 404). SECURITY DEFINER so it can distinguish forbidden from not_found for unauthenticated callers without leaking any portfolio content. Mirrors src/lib/portfolioAccess.ts.';

REVOKE ALL     ON FUNCTION public.portfolio_public_access(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.portfolio_public_access(uuid) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Anonymous (unauthenticated) read policies for the public-portfolio surface.
--    Each is gated on the authorized predicate so only authorized portfolios
--    are ever readable by anon. Authenticated-role policies are untouched.
-- ----------------------------------------------------------------------------

-- profiles: the profile row itself (full_name + the gate flags).
DROP POLICY IF EXISTS profiles_anon_public_portfolio ON public.profiles;
CREATE POLICY profiles_anon_public_portfolio ON public.profiles
  FOR SELECT TO anon
  USING (portfolio_public = true AND portfolio_sharing_permitted = true);

-- badges earned by an authorized student.
DROP POLICY IF EXISTS badges_anon_public_portfolio ON public.badges;
CREATE POLICY badges_anon_public_portfolio ON public.badges
  FOR SELECT TO anon
  USING (public.is_portfolio_publicly_accessible(student_id));

-- student_course CLO attainment for an authorized student.
DROP POLICY IF EXISTS attainment_anon_public_portfolio ON public.outcome_attainment;
CREATE POLICY attainment_anon_public_portfolio ON public.outcome_attainment
  FOR SELECT TO anon
  USING (
    student_id IS NOT NULL
    AND scope = 'student_course'
    AND public.is_portfolio_publicly_accessible(student_id)
  );

-- learning outcome titles that appear in some authorized student's portfolio.
DROP POLICY IF EXISTS outcomes_anon_public_portfolio ON public.learning_outcomes;
CREATE POLICY outcomes_anon_public_portfolio ON public.learning_outcomes
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.outcome_attainment oa
      WHERE oa.outcome_id = learning_outcomes.id
        AND oa.scope = 'student_course'
        AND oa.student_id IS NOT NULL
        AND public.is_portfolio_publicly_accessible(oa.student_id)
    )
  );

-- gamification totals (XP / level) for an authorized student.
DROP POLICY IF EXISTS gamification_anon_public_portfolio ON public.student_gamification;
CREATE POLICY gamification_anon_public_portfolio ON public.student_gamification
  FOR SELECT TO anon
  USING (public.is_portfolio_publicly_accessible(student_id));

-- ----------------------------------------------------------------------------
-- 4. Column-level least privilege for anon (defense-in-depth for K-12 minors).
--    RLS restricts WHICH rows anon sees; these grants restrict WHICH columns,
--    so contact PII / internal gamification fields can never be selected by an
--    unauthenticated client even on an authorized row. authenticated is
--    unaffected.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.profiles FROM anon;
GRANT  SELECT (id, full_name, portfolio_public, portfolio_sharing_permitted)
  ON public.profiles TO anon;

REVOKE SELECT ON public.student_gamification FROM anon;
GRANT  SELECT (student_id, xp_total, level)
  ON public.student_gamification TO anon;
;
