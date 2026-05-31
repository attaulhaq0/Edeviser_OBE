// =============================================================================
// useTutorUsage — TanStack Query hook for daily tutor usage status
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import type { TutorUsageStatus } from "@/lib/tutorSchemas";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_DAILY_MESSAGE_LIMIT = 50;
const DEFAULT_DAILY_TOKEN_BUDGET = 50_000;
const WARNING_THRESHOLD = 0.8;

// ─── useTutorUsage — fetch current student's daily usage status ──────────────

export const useTutorUsage = () => {
  const { user } = useAuth();

  const today = new Date().toISOString().split("T")[0] as string;

  return useQuery({
    queryKey: queryKeys.tutorUsage.daily(user?.id ?? "", today),
    queryFn: async (): Promise<TutorUsageStatus> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("tutor_usage_limits")
        .select("message_count, token_count")
        .eq("student_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      if (error) throw error;

      const messageCount = data?.message_count ?? 0;
      const tokenCount = data?.token_count ?? 0;
      const remainingMessages = Math.max(
        0,
        DEFAULT_DAILY_MESSAGE_LIMIT - messageCount
      );
      const warningThreshold = Math.floor(
        DEFAULT_DAILY_MESSAGE_LIMIT * WARNING_THRESHOLD
      );
      const showWarning = messageCount >= warningThreshold;

      return {
        message_count: messageCount,
        token_count: tokenCount,
        daily_message_limit: DEFAULT_DAILY_MESSAGE_LIMIT,
        daily_token_budget: DEFAULT_DAILY_TOKEN_BUDGET,
        warning: showWarning,
        remaining_messages: remainingMessages,
      };
    },
    enabled: !!user,
    staleTime: 15_000, // Refresh more frequently since usage changes with each message
  });
};
