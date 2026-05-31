// =============================================================================
// useTransactionHistory — Unified XP transaction history with real pagination
//
// Backed by the `get_xp_transactions_page` RPC (Requirements 33.1, 33.2, 33.3):
// a STABLE/SECURITY-INVOKER SQL UNION of earnings (`xp_transactions`) and
// non-refunded spending (`xp_purchases`), ordered by `occurred_at DESC`, that
// returns a single page plus an exact `total_count`. Pagination happens at the
// source — there is no `.range(0, 200)` cap and no client-side truncation.
//
// On RPC failure the query throws, so the consuming view surfaces an error and
// refuses to display any transactions rather than falling back to a fixed cap
// (Requirement 33.1a).
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { hasMore as hasMorePages } from "@/lib/pagination";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionFilter = "all" | "earnings" | "spending";

export interface TransactionEntry {
  id: string;
  type: "earning" | "spending";
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

/**
 * Paginated unified XP transaction history for a single student.
 *
 * @param studentId - the student whose history to read (query disabled when empty).
 * @param filter - `all | earnings | spending`.
 * @param page - zero-based page index (matches the consuming page's nuqs state).
 */
export const useTransactionHistory = (
  studentId: string,
  filter: TransactionFilter = "all",
  page: number = 0
) => {
  return useQuery({
    queryKey: queryKeys.marketplace.transactions(filter, page),
    queryFn: async (): Promise<TransactionHistoryResult> => {
      const offset = page * PAGE_SIZE;

      // Source-level pagination via the unified RPC. RLS restricts rows to the
      // caller, so a student only ever sees their own transactions.
      const { data, error } = await supabase.rpc("get_xp_transactions_page", {
        p_student_id: studentId,
        p_filter: filter,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });

      // Surface the failure so the view refuses to show transactions rather
      // than silently truncating (R33.1a). No `.range(0, 200)` fallback.
      if (error) throw error;

      const rows = data ?? [];

      // The RPC repeats the exact `total_count` on every row. An empty page
      // (offset beyond the end) yields no rows and therefore a count of 0.
      const [firstRow] = rows;
      const totalCount = firstRow?.total_count ?? 0;

      const entries: TransactionEntry[] = rows.map((row) => {
        const type: TransactionEntry["type"] =
          row.kind === "spending" ? "spending" : "earning";
        return {
          id: row.id,
          type,
          amount: row.amount,
          label: type === "earning" ? formatSource(row.category) : row.label,
          category: row.category,
          date: row.occurred_at,
        };
      });

      return {
        entries,
        totalCount,
        // `hasMore` uses 1-based pages; the consumer page index is zero-based.
        hasMore: hasMorePages(page + 1, PAGE_SIZE, totalCount),
      };
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Maps an earning source key to a human-readable label. Spending labels come
 * straight from the RPC (the marketplace item name). This client-side mapping
 * is interim; localization keyed by `category` moves to the UI under R29.
 */
function formatSource(source: string): string {
  const labels: Record<string, string> = {
    login: "Login Bonus",
    submission: "Assignment Submission",
    grade: "Grade Released",
    journal: "Journal Entry",
    streak_milestone: "Streak Milestone",
    perfect_day: "Perfect Day",
    first_attempt_bonus: "First Attempt Bonus",
    perfect_rubric: "Perfect Rubric Score",
    badge_earned: "Badge Earned",
    quiz_completion: "Quiz Completion",
    bonus_event: "Bonus XP Event",
    practice_mode: "Practice Mode",
    habit_completion: "Habit Completion",
    wellness: "Wellness Activity",
    onboarding: "Onboarding",
    challenge: "Challenge Reward",
    team_bonus: "Team Bonus",
  };

  return labels[source] ?? source;
}
