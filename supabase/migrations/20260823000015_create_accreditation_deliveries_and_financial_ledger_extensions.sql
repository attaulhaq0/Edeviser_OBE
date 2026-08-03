-- ============================================================
-- 20260823000015_create_accreditation_deliveries_and_financial_ledger_extensions.sql
-- Missing program accreditations, jobs, reports, deliveries, fee credits, and refunds
-- ============================================================

-- 1. Program Accreditations
CREATE TABLE IF NOT EXISTS public.program_accreditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id),
  program_id UUID NOT NULL REFERENCES public.programs(id) UNIQUE,
  framework VARCHAR(50) NOT NULL DEFAULT 'ABET',
  accreditation_body VARCHAR(100) NOT NULL DEFAULT 'Accreditation Board for Engineering and Technology',
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  current_stage VARCHAR(50) NOT NULL DEFAULT 'self_study',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_date DATE,
  owner_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.program_accreditations ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'self_study';
ALTER TABLE public.program_accreditations ADD COLUMN IF NOT EXISTS framework VARCHAR(50) DEFAULT 'ABET';
ALTER TABLE public.program_accreditations ADD COLUMN IF NOT EXISTS accreditation_body VARCHAR(100) DEFAULT 'Accreditation Board for Engineering and Technology';
ALTER TABLE public.program_accreditations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);

-- 2. Accreditation Report Jobs & Generated Reports
CREATE TABLE IF NOT EXISTS public.accreditation_report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  program_id UUID NOT NULL REFERENCES public.programs(id),
  semester_id UUID,
  template VARCHAR(50) NOT NULL DEFAULT 'ABET',
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  status VARCHAR(30) NOT NULL DEFAULT 'processing',
  storage_path TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accreditation_generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.accreditation_report_jobs(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  program_id UUID NOT NULL REFERENCES public.programs(id),
  template VARCHAR(50) NOT NULL DEFAULT 'ABET',
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL DEFAULT 'Accreditation_Report.pdf',
  mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- 3. Accreditation Report Deliveries
CREATE TABLE IF NOT EXISTS public.accreditation_report_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.accreditation_generated_reports(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  delivery_mode VARCHAR(30) NOT NULL DEFAULT 'sandbox_email',
  status VARCHAR(20) NOT NULL DEFAULT 'delivered',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT
);

-- 4. Fee Credits & Refunds
CREATE TABLE IF NOT EXISTS public.fee_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.fee_accounts(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.fee_invoices(id),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  approved_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.fee_payment_allocations(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.program_accreditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_report_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_report_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_refunds ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "program_accreditations_access" ON public.program_accreditations;
CREATE POLICY "program_accreditations_access" ON public.program_accreditations FOR SELECT TO authenticated
USING (program_id IN (SELECT id FROM public.programs WHERE institution_id = public.auth_institution_id()));

DROP POLICY IF EXISTS "accreditation_report_jobs_access" ON public.accreditation_report_jobs;
CREATE POLICY "accreditation_report_jobs_access" ON public.accreditation_report_jobs FOR ALL TO authenticated
USING (institution_id = public.auth_institution_id());

DROP POLICY IF EXISTS "accreditation_generated_reports_access" ON public.accreditation_generated_reports;
CREATE POLICY "accreditation_generated_reports_access" ON public.accreditation_generated_reports FOR SELECT TO authenticated
USING (institution_id = public.auth_institution_id());

DROP POLICY IF EXISTS "accreditation_deliveries_access" ON public.accreditation_report_deliveries;
CREATE POLICY "accreditation_deliveries_access" ON public.accreditation_report_deliveries FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "fee_credits_access" ON public.fee_credits;
CREATE POLICY "fee_credits_access" ON public.fee_credits FOR SELECT TO authenticated
USING (account_id IN (SELECT id FROM public.fee_accounts WHERE parent_id = (SELECT auth.uid()) OR (public.auth_user_role() = 'admin' AND institution_id = public.auth_institution_id())));

DROP POLICY IF EXISTS "fee_refunds_access" ON public.fee_refunds;
CREATE POLICY "fee_refunds_access" ON public.fee_refunds FOR SELECT TO authenticated
USING (payment_id IN (SELECT id FROM public.fee_payment_allocations WHERE paid_by = (SELECT auth.uid()) OR (public.auth_user_role() = 'admin')));
