// =============================================================================
// useTransactionHistory — Unified XP transaction history with pagination
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionFilter = 'all' | 'earnings' | 'spending';

export interface TransactionEntry {
  id: string;
  type: 'earning' | 'spending';
  amount: number;
  label: string;
  category: string;
  date: string;
}

export interface TransactionHistoryResult {
  entries: TransactionEntry[];
  totalCount: number;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

// ─── useTransactionHistory — combined earnings + spending ────────────────────

export const useTransactionHistory = (
  studentId: string,
  filter: TransactionFilter = 'all',
  page: number = 0,
) => {
  return useQuery({
    queryKey: queryKeys.marketplace.transactions(filter, page),
    queryFn: async (): Promise<TransactionHistoryResult> => {
      const entries: TransactionEntry[] = [];
      const offset = page * PAGE_SIZE;

      if (filter === 'all' || filter === 'earnings') {
        const { data: earnings, error: earningsError } = await supabase
          .from('xp_transactions')
          .select('id, xp_amount, source, note, created_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .range(0, 200);

        if (earningsError) throw earningsError;

        for (const row of earnings ?? []) {
          entries.push({
            id: `earn-${row.id}`,
            type: 'earning',
            amount: row.xp_amount,
            label: formatSource(row.source, row.note),
            category: row.source,
            date: row.created_at,
          });
        }
      }

      if (filter === 'all' || filter === 'spending') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: spending, error: spendingError } = await (supabase as any)
          .from('xp_purchases')
          .select(`
            id,
            xp_cost,
            purchased_at,
            marketplace_items:item_id (name, category)
          `)
          .eq('student_id', studentId)
          .neq('status', 'refunded')
          .order('purchased_at', { ascending: false })
          .range(0, 200);

        if (spendingError) throw spendingError;

        for (const row of (spending ?? []) as Array<Record<string, unknown>>) {
          const item = row.marketplace_items as Record<string, unknown> | null;
          entries.push({
            id: `spend-${row.id}`,
            type: 'spending',
            amount: row.xp_cost as number,
            label: (item?.name as string) ?? 'Marketplace Purchase',
            category: (item?.category as string) ?? 'purchase',
            date: row.purchased_at as string,
          });
        }
      }

      // Sort by date descending
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const totalCount = entries.length;
      const paged = entries.slice(offset, offset + PAGE_SIZE);

      return {
        entries: paged,
        totalCount,
        hasMore: offset + PAGE_SIZE < totalCount,
      };
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSource(source: string, note: string | null): string {
  const labels: Record<string, string> = {
    login: 'Login Bonus',
    submission: 'Assignment Submission',
    grade: 'Grade Released',
    journal: 'Journal Entry',
    streak_milestone: 'Streak Milestone',
    perfect_day: 'Perfect Day',
    first_attempt_bonus: 'First Attempt Bonus',
    perfect_rubric: 'Perfect Rubric Score',
    badge_earned: 'Badge Earned',
    quiz_completion: 'Quiz Completion',
    bonus_event: 'Bonus XP Event',
    practice_mode: 'Practice Mode',
    habit_completion: 'Habit Completion',
    wellness: 'Wellness Activity',
    onboarding: 'Onboarding',
    challenge: 'Challenge Reward',
    team_bonus: 'Team Bonus',
  };

  return labels[source] ?? note ?? source;
}
