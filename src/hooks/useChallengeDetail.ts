// =============================================================================
// useChallengeDetail — TanStack Query hook for a single social challenge
// Task 7.7: zero-or-one row query via `.maybeSingle()`.
//
// Relocated from the in-page hook in `ChallengeDetailPage.tsx`, which used the
// strict `.single()` (throws on zero rows). Using `.maybeSingle()` lets a
// missing challenge resolve to `null` (a graceful not-found state) while a real
// query failure still throws and surfaces as the query's error state. Consumers
// therefore distinguish:
//   - `data === null`         → not-found (no row matched the id)   [R27.2]
//   - `isError` / `error`     → query failure (error state + toast) [R28.2]
// _Requirements: 27.1, 27.2, 28.2_
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { SocialChallenge } from "@/hooks/useChallenges";

/**
 * Fetch a single social challenge by id.
 *
 * Uses `.maybeSingle()` so a query that matches zero rows resolves to `null`
 * (graceful not-found) instead of throwing. A genuine query error is rethrown
 * and exposed through the query's `error`/`isError`, keeping not-found and
 * failure as two distinct, separately-handleable states.
 */
export const useChallengeDetail = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.challenges.detail(challengeId ?? ""),
    queryFn: async (): Promise<SocialChallenge | null> => {
      const { data, error } = await supabase
        .from("social_challenges")
        .select("*")
        .eq("id", challengeId!)
        .maybeSingle();
      // A real failure (network, RLS, etc.) throws → surfaces as error state.
      if (error) throw error;
      // Zero rows → `data` is null → graceful not-found (never throws).
      return (data as SocialChallenge | null) ?? null;
    },
    enabled: !!challengeId,
  });
};
