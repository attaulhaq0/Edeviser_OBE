import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { TutorUsage } from '@/lib/tutorSchemas';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_DAILY_MESSAGE_LIMIT = 50;
const DEFAULT_DAILY_TOKEN_BUDGET = 50_000;
const WARNING_THRESHOLD = 0.8;

// ─── useTutorUsage — daily usage status for the current student ─────────────

export const useTutorUsage = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0]!;

  return useQuery({
    queryKey: queryKeys.tutorUsage.daily(user?.id ?? '', today),
    queryFn: async (): Promise<TutorUsage> => {
      if (!user) throw new Error('Not authenticated');

      // Fetch today's usage record
      const { data, error } = await supabase
        .from('tutor_usage_limits')
        .select('message_count, token_count')
        .eq('student_id', user.id)
        .eq('usage_date', today)
        .maybeSingle();

      if (error) throw error;

      const messageCount = data?.message_count ?? 0;
      const tokenCount = data?.token_count ?? 0;

      // Fetch institution-level limits if configured
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .maybeSingle();

      let dailyMessageLimit = DEFAULT_DAILY_MESSAGE_LIMIT;
      let dailyTokenBudget = DEFAULT_DAILY_TOKEN_BUDGET;

      if (profile?.institution_id) {
        const { data: settings } = await supabase
          .from('institution_settings')
          .select('settings')
          .eq('institution_id', profile.institution_id)
          .maybeSingle();

        if (settings?.settings) {
          const s = settings.settings as Record<string, unknown>;
          if (typeof s.tutor_daily_message_limit === 'number') {
            dailyMessageLimit = s.tutor_daily_message_limit;
          }
          if (typeof s.tutor_daily_token_budget === 'number') {
            dailyTokenBudget = s.tutor_daily_token_budget;
          }
        }
      }

      const remainingMessages = Math.max(0, dailyMessageLimit - messageCount);
      const isWarning = messageCount >= dailyMessageLimit * WARNING_THRESHOLD;
      const isBlocked = messageCount >= dailyMessageLimit || tokenCount >= dailyTokenBudget;

      return {
        message_count: messageCount,
        token_count: tokenCount,
        daily_message_limit: dailyMessageLimit,
        daily_token_budget: dailyTokenBudget,
        is_warning: isWarning,
        is_blocked: isBlocked,
        remaining_messages: remainingMessages,
      };
    },
    enabled: !!user,
    // Refetch every 30 seconds to keep usage data fresh
    refetchInterval: 30_000,
  });
};
