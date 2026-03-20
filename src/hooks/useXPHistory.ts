// =============================================================================
// useXPHistory — TanStack Query hooks for XP transaction history
// Requirements: 45.3, 45.5
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

export type XPFilterPeriod = 'today' | 'this_week' | 'this_month' | 'all_time';

export interface XPTransaction {
  id: string;
  source: string;
  xp_amount: number;
  reference_id: string | null;
  note: string | null;
  created_at: string;
}

export interface XPTransactionDisplay extends XPTransaction {
  source_label: string;
  reference_description: string;
}

export interface XPCategorySummary {
  source: string;
  source_label: string;
  total_xp: number;
  count: number;
}

// ─── Source Label Map ────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  login: 'Daily Login',
  submission: 'On-time Submission',
  grade: 'Grade Released',
  journal: 'Journal Entry',
  streak_milestone: 'Streak Milestone',
  perfect_day: 'Perfect Day',
  first_attempt_bonus: 'First Attempt Bonus',
  perfect_rubric: 'Perfect Rubric Score',
  badge_earned: 'Badge Earned',
  level_up: 'Level Up',
  streak_freeze_purchase: 'Streak Freeze Purchase',
  discussion_question: 'Discussion Question',
  discussion_answer: 'Discussion Answer',
  survey_completion: 'Survey Completion',
  quiz_completion: 'Quiz Completion',
  onboarding_personality: 'Personality Assessment',
  onboarding_learning_style: 'Learning Style Assessment',
  onboarding_baseline: 'Baseline Test',
  onboarding_complete: 'Onboarding Complete',
  onboarding_self_efficacy: 'Self-Efficacy Assessment',
  onboarding_study_strategy: 'Study Strategy Assessment',
  micro_assessment: 'Micro Assessment',
  profile_complete: 'Profile Complete',
  starter_session_complete: 'Starter Session Complete',
};

export function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Period Filter Helper ────────────────────────────────────────────────────

function getPeriodStart(period: XPFilterPeriod): string | null {
  const now = new Date();
  switch (period) {
    case 'today':
      return startOfDay(now).toISOString();
    case 'this_week':
      return startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    case 'this_month':
      return startOfMonth(now).toISOString();
    case 'all_time':
      return null;
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useXPHistory = (studentId: string | undefined, period: XPFilterPeriod = 'all_time') => {
  return useQuery({
    queryKey: queryKeys.xpTransactions.list({ studentId, period }),
    queryFn: async (): Promise<XPTransactionDisplay[]> => {
      let query = supabase
        .from('xp_transactions')
        .select('id, source, xp_amount, reference_id, note, created_at')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });

      const periodStart = getPeriodStart(period);
      if (periodStart) {
        query = query.gte('created_at', periodStart);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((tx) => ({
        ...tx,
        source_label: getSourceLabel(tx.source),
        reference_description: tx.note ?? '',
      }));
    },
    enabled: !!studentId,
  });
};

export const useXPCategorySummary = (studentId: string | undefined, period: XPFilterPeriod = 'all_time') => {
  return useQuery({
    queryKey: queryKeys.xpTransactions.list({ studentId, period, type: 'summary' }),
    queryFn: async (): Promise<{ categories: XPCategorySummary[]; runningTotal: number }> => {
      let query = supabase
        .from('xp_transactions')
        .select('source, xp_amount')
        .eq('student_id', studentId!);

      const periodStart = getPeriodStart(period);
      if (periodStart) {
        query = query.gte('created_at', periodStart);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data ?? [];
      const runningTotal = rows.reduce((sum, tx) => sum + tx.xp_amount, 0);

      const categoryMap = new Map<string, { total_xp: number; count: number }>();
      for (const tx of rows) {
        const existing = categoryMap.get(tx.source);
        if (existing) {
          existing.total_xp += tx.xp_amount;
          existing.count += 1;
        } else {
          categoryMap.set(tx.source, { total_xp: tx.xp_amount, count: 1 });
        }
      }

      const categories: XPCategorySummary[] = Array.from(categoryMap.entries())
        .map(([source, stats]) => ({
          source,
          source_label: getSourceLabel(source),
          ...stats,
        }))
        .sort((a, b) => b.total_xp - a.total_xp);

      return { categories, runningTotal };
    },
    enabled: !!studentId,
  });
};
