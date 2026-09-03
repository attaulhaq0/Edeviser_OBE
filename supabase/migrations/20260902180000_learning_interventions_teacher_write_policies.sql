-- QA Round 2026-09-02 (V6): the intervention loop needs teachers to record
-- interventions from the triage flow. learning_interventions previously had
-- ONLY a SELECT policy, so teacher-created follow-ups were impossible.
-- Insert/update are restricted to staff with a real teaching/coordinating
-- relationship, mirroring the SELECT policy's relationship checks.

CREATE POLICY learning_interventions_insert
  ON public.learning_interventions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.institution_id = learning_interventions.institution_id
        AND (
          p.role = 'admin'
          OR (
            p.role = 'coordinator'
            AND learning_interventions.program_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM programs pr
              WHERE pr.id = learning_interventions.program_id
                AND pr.coordinator_id = p.id
            )
          )
          OR (
            p.role = 'teacher'
            AND learning_interventions.course_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM courses co
              WHERE co.id = learning_interventions.course_id
                AND co.teacher_id = p.id
            )
          )
        )
    )
  );

CREATE POLICY learning_interventions_update
  ON public.learning_interventions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.institution_id = learning_interventions.institution_id
        AND (
          p.role = 'admin'
          OR (
            p.role = 'coordinator'
            AND learning_interventions.program_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM programs pr
              WHERE pr.id = learning_interventions.program_id
                AND pr.coordinator_id = p.id
            )
          )
          OR (
            p.role = 'teacher'
            AND learning_interventions.course_id IS NOT NULL
              AND EXISTS (
              SELECT 1 FROM courses co
              WHERE co.id = learning_interventions.course_id
                AND co.teacher_id = p.id
            )
          )
        )
    )
  );