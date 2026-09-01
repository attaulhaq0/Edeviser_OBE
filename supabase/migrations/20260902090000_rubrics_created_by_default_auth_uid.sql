-- Parity mirror of the MCP-applied migration `rubrics_created_by_default_auth_uid`
-- (applied live 2026-09-02). E1.5: rubric INSERTs from the client omitted
-- created_by, so rubrics_teacher_write WITH CHECK evaluated NULL and rejected
-- every teacher create with "new row violates row-level security policy".
-- Idempotent; policy semantics unchanged.
ALTER TABLE public.rubrics
  ALTER COLUMN created_by SET DEFAULT auth.uid();
