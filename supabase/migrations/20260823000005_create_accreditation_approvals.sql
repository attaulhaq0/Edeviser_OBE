-- =============================================================================
-- accreditation_approvals — program accreditation sign-off workflow
-- =============================================================================
--
-- Tracks the accreditation approval chain per program
-- (coordinator → hod → qa → office). One row per (program, stage). Coordinators
-- maintain the chain for their own programs (advance a stage as each sign-off is
-- obtained); admins manage any program in their institution. When a program has
-- no rows yet, the UI renders the default four stages as "pending" (graceful).
--
-- RLS: institution-scoped read for coordinators/admins; writes limited to the
-- coordinator who owns the program (programs.coordinator_id) or an institution
-- admin. Replay-safe: table before policies; helper functions (20260222073710)
-- exist earlier; policies only CALL them.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.accreditation_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  stage text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  approver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accreditation_approvals_stage_chk
    CHECK (stage IN ('coordinator', 'hod', 'qa', 'office')),
  CONSTRAINT accreditation_approvals_status_chk
    CHECK (status IN ('done', 'current', 'pending')),
  UNIQUE (program_id, stage)
);

COMMENT ON TABLE public.accreditation_approvals IS
  'Per-program accreditation sign-off chain (coordinator/hod/qa/office). Coordinator-owned/admin write, institution read.';

CREATE INDEX IF NOT EXISTS idx_accreditation_approvals_program
  ON public.accreditation_approvals (institution_id, program_id, sort_order);

ALTER TABLE public.accreditation_approvals ENABLE ROW LEVEL SECURITY;

-- Read: coordinators/admins within the institution.
CREATE POLICY "accreditation_approvals_read" ON public.accreditation_approvals
  FOR SELECT TO authenticated
  USING (
    institution_id = (SELECT public.auth_institution_id())
    AND (SELECT public.auth_user_role()) IN ('coordinator', 'admin')
  );

-- Insert: admin (own institution) or coordinator (own program).
CREATE POLICY "accreditation_approvals_insert" ON public.accreditation_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    institution_id = (SELECT public.auth_institution_id())
    AND (
      (SELECT public.auth_user_role()) = 'admin'
      OR (
        (SELECT public.auth_user_role()) = 'coordinator'
        AND program_id IN (
          SELECT id FROM public.programs
          WHERE coordinator_id = (SELECT auth.uid())
        )
      )
    )
  );

-- Update: same authority as insert.
CREATE POLICY "accreditation_approvals_update" ON public.accreditation_approvals
  FOR UPDATE TO authenticated
  USING (
    institution_id = (SELECT public.auth_institution_id())
    AND (
      (SELECT public.auth_user_role()) = 'admin'
      OR (
        (SELECT public.auth_user_role()) = 'coordinator'
        AND program_id IN (
          SELECT id FROM public.programs
          WHERE coordinator_id = (SELECT auth.uid())
        )
      )
    )
  );
