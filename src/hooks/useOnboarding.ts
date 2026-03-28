// =============================================================================
// useOnboarding — Query & mutate onboarding status from profiles table
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ── Query Keys ───────────────────────────────────────────────────────────────

const onboardingKeys = {
  status: (userId: string) => ['onboarding', 'status', userId] as const,
};

// ── useOnboardingStatus — fetch onboarding_completed from profiles ───────────

export const useOnboardingStatus = () => {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: onboardingKeys.status(userId),
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.onboarding_completed ?? false;
    },
    enabled: !!userId,
  });
};

// ── useCompleteOnboarding — set onboarding_completed = true ──────────────────

export const useCompleteOnboarding = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(onboardingKeys.status(userId), true);
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};
