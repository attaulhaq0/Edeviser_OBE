-- ============================================================
-- 20260823000013_create_global_golden_graph_production_workflows.sql
-- Missing production tables, RLS policies, and RPCs for Edeviser
-- ============================================================

-- 1. Parent Saved Support Actions
CREATE TABLE IF NOT EXISTS public.parent_saved_support_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  action_key VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'completed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Parent Reminders
CREATE TABLE IF NOT EXISTS public.parent_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  reminder_time TIMESTAMPTZ NOT NULL,
  is_delivered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Parent Encouragements
CREATE TABLE IF NOT EXISTS public.parent_encouragements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  badge_key VARCHAR(100),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Communication Threads & Messages
CREATE TABLE IF NOT EXISTS public.communication_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  course_id UUID REFERENCES public.courses(id),
  subject TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  role VARCHAR(30) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.communication_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- 5. Institution Contacts
CREATE TABLE IF NOT EXISTS public.institution_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  department VARCHAR(50) NOT NULL CHECK (department IN ('attendance', 'finance', 'academic_support', 'wellbeing', 'general')),
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Fee Accounts & Billing
CREATE TABLE IF NOT EXISTS public.fee_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  student_id UUID NOT NULL REFERENCES public.profiles(id) UNIQUE,
  parent_id UUID REFERENCES public.profiles(id),
  total_billed NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'QAR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_account_id UUID NOT NULL REFERENCES public.fee_accounts(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fee_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
  payment_amount NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'card',
  paid_by UUID NOT NULL REFERENCES public.profiles(id),
  transaction_reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_allocation_id UUID NOT NULL REFERENCES public.fee_payment_allocations(id) ON DELETE CASCADE,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. AI Assistance Events
CREATE TABLE IF NOT EXISTS public.ai_assistance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('generated', 'accepted', 'edited', 'rejected')),
  feature_context VARCHAR(100) NOT NULL,
  prompt_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.parent_saved_support_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_encouragements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistance_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies with Institution & Role Scoping
DROP POLICY IF EXISTS "parent_support_actions_own" ON public.parent_saved_support_actions;
CREATE POLICY "parent_support_actions_own" ON public.parent_saved_support_actions FOR ALL TO authenticated USING (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "parent_reminders_own" ON public.parent_reminders;
CREATE POLICY "parent_reminders_own" ON public.parent_reminders FOR ALL TO authenticated USING (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "parent_encouragements_access" ON public.parent_encouragements;
CREATE POLICY "parent_encouragements_access" ON public.parent_encouragements FOR ALL TO authenticated USING (parent_id = (select auth.uid()) OR student_id = (select auth.uid()));

DROP POLICY IF EXISTS "communication_threads_access" ON public.communication_threads;
CREATE POLICY "communication_threads_access" ON public.communication_threads FOR SELECT TO authenticated USING (institution_id = public.auth_institution_id());

DROP POLICY IF EXISTS "communication_messages_access" ON public.communication_messages;
CREATE POLICY "communication_messages_access" ON public.communication_messages FOR ALL TO authenticated USING (
  thread_id IN (SELECT id FROM public.communication_threads WHERE institution_id = public.auth_institution_id())
);

DROP POLICY IF EXISTS "communication_reads_access" ON public.communication_reads;
CREATE POLICY "communication_reads_access" ON public.communication_reads FOR ALL TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "institution_contacts_read" ON public.institution_contacts;
CREATE POLICY "institution_contacts_read" ON public.institution_contacts FOR SELECT TO authenticated USING (institution_id = public.auth_institution_id());

DROP POLICY IF EXISTS "fee_accounts_access" ON public.fee_accounts;
CREATE POLICY "fee_accounts_access" ON public.fee_accounts FOR SELECT TO authenticated USING (
  parent_id = (select auth.uid()) OR student_id = (select auth.uid()) OR (public.auth_user_role() = 'admin' AND institution_id = public.auth_institution_id())
);

DROP POLICY IF EXISTS "fee_invoices_access" ON public.fee_invoices;
CREATE POLICY "fee_invoices_access" ON public.fee_invoices FOR SELECT TO authenticated USING (
  fee_account_id IN (SELECT id FROM public.fee_accounts WHERE parent_id = (select auth.uid()) OR student_id = (select auth.uid()) OR (public.auth_user_role() = 'admin' AND institution_id = public.auth_institution_id()))
);

DROP POLICY IF EXISTS "fee_invoice_items_access" ON public.fee_invoice_items;
CREATE POLICY "fee_invoice_items_access" ON public.fee_invoice_items FOR SELECT TO authenticated USING (
  invoice_id IN (SELECT id FROM public.fee_invoices WHERE fee_account_id IN (SELECT id FROM public.fee_accounts WHERE parent_id = (select auth.uid()) OR student_id = (select auth.uid()) OR (public.auth_user_role() = 'admin' AND institution_id = public.auth_institution_id())))
);

DROP POLICY IF EXISTS "fee_payment_allocations_access" ON public.fee_payment_allocations;
CREATE POLICY "fee_payment_allocations_access" ON public.fee_payment_allocations FOR ALL TO authenticated USING (
  paid_by = (select auth.uid()) OR invoice_id IN (SELECT id FROM public.fee_invoices WHERE fee_account_id IN (SELECT id FROM public.fee_accounts WHERE parent_id = (select auth.uid()) OR (public.auth_user_role() = 'admin' AND institution_id = public.auth_institution_id())))
);

DROP POLICY IF EXISTS "receipts_access" ON public.receipts;
CREATE POLICY "receipts_access" ON public.receipts FOR SELECT TO authenticated USING (
  payment_allocation_id IN (SELECT id FROM public.fee_payment_allocations WHERE paid_by = (select auth.uid()) OR (public.auth_user_role() = 'admin'))
);

DROP POLICY IF EXISTS "ai_assistance_events_access" ON public.ai_assistance_events;
CREATE POLICY "ai_assistance_events_access" ON public.ai_assistance_events FOR ALL TO authenticated USING (
  user_id = (select auth.uid()) OR (public.auth_user_role() = 'admin' AND institution_id = public.auth_institution_id())
);

-- ============================================================
-- Authenticated Admin Analytics RPC: get_admin_analytics()
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_inst_id uuid := public.auth_institution_id();
  v_result jsonb;
BEGIN
  IF v_inst_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT jsonb_build_object(
    'totalLearners', (SELECT count(*) FROM public.profiles WHERE institution_id = v_inst_id AND role = 'student'),
    'activeLearners', (SELECT count(*) FROM public.profiles WHERE institution_id = v_inst_id AND role = 'student' AND is_active = true),
    'departmentPerformance', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'program_id', prog.id,
          'program_name', prog.name,
          'avg_attainment', COALESCE(round(avg(oa.attainment_percent)), 0),
          'at_risk_count', (
            SELECT count(DISTINCT sc.student_id)
            from public.student_courses sc
            JOIN public.courses c ON c.id = sc.course_id
            WHERE c.program_id = prog.id AND sc.status = 'active'
          )
        )
      )
      FROM public.programs prog
      LEFT JOIN public.courses c ON c.program_id = prog.id
      LEFT JOIN public.outcome_attainment oa ON oa.course_id = c.id
      WHERE prog.institution_id = v_inst_id
      GROUP BY prog.id, prog.name
    ), '[]'::jsonb),
    'aiTelemetry', (
      SELECT jsonb_build_object(
        'total_events', (SELECT count(*) FROM public.ai_assistance_events WHERE institution_id = v_inst_id),
        'accepted_events', (SELECT count(*) FROM public.ai_assistance_events WHERE institution_id = v_inst_id AND event_type = 'accepted'),
        'rejected_events', (SELECT count(*) FROM public.ai_assistance_events WHERE institution_id = v_inst_id AND event_type = 'rejected')
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics() FROM public;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated;
