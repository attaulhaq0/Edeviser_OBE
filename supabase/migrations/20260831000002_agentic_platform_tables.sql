-- Tasks 8.1 (edeviser-agentic-intelligence): observability + intervention tables.
-- Conventions: uuid PKs, institution_id scoping, RLS ENABLED on every table,
-- no secrets/tokens/raw PII/chain-of-thought columns, FKs + lookup indexes.

-- ─── agent_conversations ──────────────────────────────────────────────────
CREATE TABLE public.agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  specialist text NOT NULL DEFAULT 'tutor',
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz
);
CREATE INDEX idx_agent_conversations_actor ON public.agent_conversations(actor_user_id, last_message_at DESC);
CREATE INDEX idx_agent_conversations_institution ON public.agent_conversations(institution_id);

-- ─── agent_messages ───────────────────────────────────────────────────────
CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_messages_conversation ON public.agent_messages(conversation_id, created_at);
CREATE INDEX idx_agent_messages_run ON public.agent_messages(run_id);

-- ─── agent_tool_calls (naming reconciliation for agent_tool_attempts) ─────
-- agent_tool_attempts remains the physical audit table; this invoker-security
-- view provides the spec'd canonical name without duplicating rows.
CREATE VIEW public.agent_tool_calls WITH (security_invoker = true) AS
  SELECT * FROM public.agent_tool_attempts;
GRANT SELECT ON public.agent_tool_calls TO authenticated;

-- ─── agent_tasks ──────────────────────────────────────────────────────────
CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  assignee_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignee_role text NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  task_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','dismissed')),
  source_run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES public.agent_action_proposals(id) ON DELETE SET NULL,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_tasks_assignee ON public.agent_tasks(assignee_user_id, status, due_at);
CREATE INDEX idx_agent_tasks_institution ON public.agent_tasks(institution_id);

-- ─── agent_feedback ───────────────────────────────────────────────────────
CREATE TABLE public.agent_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.agent_messages(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_feedback_user ON public.agent_feedback(user_id, created_at DESC);
CREATE INDEX idx_agent_feedback_institution ON public.agent_feedback(institution_id);

-- ─── agent_evaluations (task 7.4 harness sink) ────────────────────────────
CREATE TABLE public.agent_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  evaluator_version text NOT NULL,
  citation_score numeric CHECK (citation_score BETWEEN 0 AND 1),
  integrity_score numeric CHECK (integrity_score BETWEEN 0 AND 1),
  tool_correctness_score numeric CHECK (tool_correctness_score BETWEEN 0 AND 1),
  overall_score numeric CHECK (overall_score BETWEEN 0 AND 1),
  passed boolean,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_evaluations_run ON public.agent_evaluations(run_id);
CREATE INDEX idx_agent_evaluations_institution ON public.agent_evaluations(institution_id, evaluated_at DESC);

-- ─── learning_interventions ───────────────────────────────────────────────
CREATE TABLE public.learning_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  intervention_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'agent' CHECK (source IN ('agent','teacher','coordinator','system')),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('draft','proposed','approved','active','completed','cancelled')),
  proposal_id uuid REFERENCES public.agent_action_proposals(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_learning_interventions_student ON public.learning_interventions(student_id, status);
CREATE INDEX idx_learning_interventions_institution ON public.learning_interventions(institution_id);
CREATE INDEX idx_learning_interventions_course ON public.learning_interventions(course_id);

-- ─── intervention_outcomes ────────────────────────────────────────────────
CREATE TABLE public.intervention_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  intervention_id uuid NOT NULL REFERENCES public.learning_interventions(id) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL DEFAULT now(),
  metric text NOT NULL,
  baseline numeric,
  value numeric,
  delta numeric,
  sample_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_intervention_outcomes_intervention ON public.intervention_outcomes(intervention_id, measured_at);
CREATE INDEX idx_intervention_outcomes_institution ON public.intervention_outcomes(institution_id);

-- ─── learning_state_events ────────────────────────────────────────────────
CREATE TABLE public.learning_state_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  learning_state_version bigint,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  state_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_learning_state_events_student ON public.learning_state_events(student_id, created_at DESC);
CREATE INDEX idx_learning_state_events_institution ON public.learning_state_events(institution_id);

-- ─── student_support_states ───────────────────────────────────────────────
CREATE TABLE public.student_support_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  support_level text NOT NULL DEFAULT 'none' CHECK (support_level IN ('none','watch','supported','escalated')),
  open_support_cases jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_support_states_institution ON public.student_support_states(institution_id);

-- ═══════════════════════════ RLS ═══════════════════════════
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_state_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_support_states ENABLE ROW LEVEL SECURITY;

-- agent_conversations
CREATE POLICY agent_conversations_select ON public.agent_conversations
FOR SELECT USING (
  actor_user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid()) AND p.is_active = true
      AND p.institution_id = agent_conversations.institution_id
      AND p.role IN ('admin','coordinator')
  )
);
CREATE POLICY agent_conversations_insert ON public.agent_conversations
FOR INSERT WITH CHECK (
  actor_user_id = (select auth.uid())
  AND institution_id = (SELECT p.institution_id FROM public.profiles p WHERE p.id = (select auth.uid()))
);
CREATE POLICY agent_conversations_update ON public.agent_conversations
FOR UPDATE USING (actor_user_id = (select auth.uid()))
WITH CHECK (actor_user_id = (select auth.uid()));
CREATE POLICY agent_conversations_delete ON public.agent_conversations
FOR DELETE USING (actor_user_id = (select auth.uid()));

-- agent_messages (participant-scoped)
CREATE POLICY agent_messages_select ON public.agent_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.agent_conversations c
    WHERE c.id = agent_messages.conversation_id
      AND (
        c.actor_user_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.is_active = true
            AND p.institution_id = c.institution_id
            AND p.role IN ('admin','coordinator')
        )
      )
  )
);
CREATE POLICY agent_messages_insert ON public.agent_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agent_conversations c
    WHERE c.id = agent_messages.conversation_id AND c.actor_user_id = (select auth.uid())
  )
);

-- agent_tasks (recipient + institutional staff read; writes via service role)
CREATE POLICY agent_tasks_select ON public.agent_tasks
FOR SELECT USING (
  assignee_user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid()) AND p.is_active = true
      AND p.institution_id = agent_tasks.institution_id
      AND p.role IN ('admin','coordinator')
  )
);

-- agent_feedback (author writes own; author + admin read)
CREATE POLICY agent_feedback_select ON public.agent_feedback
FOR SELECT USING (
  user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid()) AND p.is_active = true
      AND p.institution_id = agent_feedback.institution_id
      AND p.role = 'admin'
  )
);
CREATE POLICY agent_feedback_insert ON public.agent_feedback
FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
  AND institution_id = (SELECT p.institution_id FROM public.profiles p WHERE p.id = (select auth.uid()))
);

-- agent_evaluations (institutional quality staff read; writes service-role)
CREATE POLICY agent_evaluations_select ON public.agent_evaluations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid()) AND p.is_active = true
      AND p.institution_id = agent_evaluations.institution_id
      AND p.role IN ('admin','coordinator')
  )
);

-- learning_interventions (subject, course teacher, program coordinator, admin)
CREATE POLICY learning_interventions_select ON public.learning_interventions
FOR SELECT USING (
  student_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid()) AND p.is_active = true
      AND p.institution_id = learning_interventions.institution_id
      AND (
        p.role = 'admin'
        OR (p.role = 'coordinator' AND learning_interventions.program_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.programs pr
          WHERE pr.id = learning_interventions.program_id AND pr.coordinator_id = p.id
        ))
        OR (p.role = 'teacher' AND learning_interventions.course_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.courses co
          WHERE co.id = learning_interventions.course_id AND co.teacher_id = p.id
        ))
      )
  )
);

-- intervention_outcomes (same audience as its intervention)
CREATE POLICY intervention_outcomes_select ON public.intervention_outcomes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.learning_interventions li
    WHERE li.id = intervention_outcomes.intervention_id
      AND (
        li.student_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.is_active = true
            AND p.institution_id = intervention_outcomes.institution_id
            AND (
              p.role = 'admin'
              OR (p.role = 'coordinator' AND li.program_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.programs pr
                WHERE pr.id = li.program_id AND pr.coordinator_id = p.id
              ))
              OR (p.role = 'teacher' AND li.course_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.courses co
                WHERE co.id = li.course_id AND co.teacher_id = p.id
              ))
            )
        )
      )
  )
);

-- learning_state_events (subject + institutional staff)
CREATE POLICY learning_state_events_select ON public.learning_state_events
FOR SELECT USING (
  student_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid()) AND p.is_active = true
      AND p.institution_id = learning_state_events.institution_id
      AND p.role IN ('admin','coordinator')
  )
);

-- student_support_states (subject + institutional staff)
CREATE POLICY student_support_states_select ON public.student_support_states
FOR SELECT USING (
  student_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid()) AND p.is_active = true
      AND p.institution_id = student_support_states.institution_id
      AND p.role IN ('admin','coordinator')
  )
);