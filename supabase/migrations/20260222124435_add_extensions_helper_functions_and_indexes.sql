-- ============================================
-- Migration 1: Extensions, Helper Functions, Performance Indexes
-- ============================================

-- Enable pg_cron (requires Supabase Pro plan)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper functions for RLS policies
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.auth_institution_id()
RETURNS UUID AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Performance indexes on existing tables
CREATE UNIQUE INDEX IF NOT EXISTS idx_attainment_unique ON outcome_attainment(
  outcome_id,
  COALESCE(student_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(course_id, '00000000-0000-0000-0000-000000000000'),
  scope
);

CREATE INDEX IF NOT EXISTS idx_gamification_leaderboard ON student_gamification(xp_total DESC, student_id);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_student ON xp_transactions(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_student ON evidence(student_id, created_at DESC);
;
