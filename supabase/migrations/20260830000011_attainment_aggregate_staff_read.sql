-- Extends outcome_attainment SELECT for staff reading AGGREGATE rows
-- (student_id IS NULL) whose outcome belongs to their institution.
-- Per-row student reads remain scoped to the staff member's institution;
-- self-reads and verified parent links are unchanged.
DROP POLICY IF EXISTS attainment_read ON public.outcome_attainment;
CREATE POLICY attainment_read ON public.outcome_attainment
  FOR SELECT
  TO public
  USING (
    (
      (SELECT auth_user_role()) = ANY (ARRAY['teacher'::text, 'coordinator'::text, 'admin'::text])
      AND (
        student_id IN (
          SELECT p.id FROM public.profiles p
          WHERE p.institution_id = (SELECT auth_institution_id())
        )
        OR (
          student_id IS NULL
          AND EXISTS (
            SELECT 1 FROM public.learning_outcomes lo
            WHERE lo.id = outcome_attainment.outcome_id
              AND lo.institution_id = (SELECT auth_institution_id())
          )
        )
      )
    )
    OR student_id = (SELECT auth.uid())
    OR (
      (SELECT auth_user_role()) = 'parent'
      AND student_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.parent_student_links psl
        WHERE psl.student_id = outcome_attainment.student_id
          AND psl.parent_id = (SELECT auth.uid())
          AND psl.verified = true
      )
    )
  );