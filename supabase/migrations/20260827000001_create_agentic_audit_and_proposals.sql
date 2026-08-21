-- Agentic observability and human-approval foundation.
-- Raw prompts, credentials, Authorization headers, and private tool payloads
-- are intentionally excluded. Server-side code stores hashes and typed,
-- minimized evidence references instead.

CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN (
    'student', 'teacher', 'parent', 'coordinator', 'admin'
  )),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  specialist text NOT NULL,
  input_hash text NOT NULL CHECK (length(input_hash) = 64),
  status text NOT NULL CHECK (status IN (
    'running', 'completed', 'failed', 'cancelled', 'feature_disabled'
  )),
  provider text,
  model text,
  error_classification text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, request_id)
);

CREATE TABLE public.agent_tool_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN (
    'student', 'teacher', 'parent', 'coordinator', 'admin'
  )),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  specialist text NOT NULL,
  tool_name text NOT NULL,
  tool_version text NOT NULL,
  proposal_id uuid,
  idempotency_key text,
  evidence_hash text NOT NULL CHECK (length(evidence_hash) = 64),
  status text NOT NULL CHECK (status IN (
    'started', 'succeeded', 'rejected', 'failed'
  )),
  risk_classification text NOT NULL CHECK (risk_classification IN (
    'read', 'low', 'protected'
  )),
  approval_state text NOT NULL CHECK (approval_state IN (
    'not_required', 'pending', 'approved', 'rejected', 'expired', 'executed'
  )),
  provider text,
  model text,
  error_classification text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_action_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 4000),
  evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_hash text NOT NULL CHECK (length(evidence_hash) = 64),
  risk_classification text NOT NULL DEFAULT 'protected'
    CHECK (risk_classification = 'protected'),
  required_approver_role text NOT NULL CHECK (required_approver_role IN (
    'student', 'teacher', 'parent', 'coordinator', 'admin'
  )),
  required_approver_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'expired', 'executed'
  )),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  decided_at timestamptz,
  decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision_reason text,
  executed_at timestamptz,
  CHECK (expires_at IS NULL OR expires_at > created_at),
  CHECK (
    (status = 'pending' AND decided_at IS NULL AND decided_by IS NULL)
    OR status <> 'pending'
  )
);

ALTER TABLE public.agent_tool_attempts
  ADD CONSTRAINT agent_tool_attempts_proposal_fk
  FOREIGN KEY (proposal_id) REFERENCES public.agent_action_proposals(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX agent_action_proposals_idempotency_unique
  ON public.agent_action_proposals (institution_id, idempotency_key);
CREATE INDEX agent_runs_actor_session_idx
  ON public.agent_runs (actor_user_id, session_id, started_at DESC);
CREATE INDEX agent_tool_attempts_run_idx
  ON public.agent_tool_attempts (run_id, started_at);
CREATE INDEX agent_action_proposals_pending_approver_idx
  ON public.agent_action_proposals (
    institution_id, required_approver_role, required_approver_user_id, created_at
  ) WHERE status = 'pending';

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tool_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_action_proposals ENABLE ROW LEVEL SECURITY;

-- These tables are a server boundary. The authenticated browser cannot forge
-- a run, tool attempt, proposal, or approval. The orchestrator returns only the
-- minimized records an authorized caller needs.
REVOKE ALL ON TABLE public.agent_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.agent_tool_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.agent_action_proposals FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.agent_runs TO service_role;
GRANT ALL ON TABLE public.agent_tool_attempts TO service_role;
GRANT ALL ON TABLE public.agent_action_proposals TO service_role;

COMMENT ON TABLE public.agent_action_proposals IS
  'Human approval records only. Approval never bypasses execution-time authorization rechecks.';
