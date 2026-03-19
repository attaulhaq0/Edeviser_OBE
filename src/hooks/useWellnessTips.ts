import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import {
  WELLNESS_TIPS,
  getCurrentWellnessTip,
  getOnboardingTip,
} from '@/lib/wellnessTips';
import { useWellnessPreferences } from '@/hooks/useWellnessPreferences';
import type { WellnessHabitType, WellnessTip } from '@/types/habits';

/**
 * Returns the current tip for a given habit type.
 * Shows onboarding tip if not dismissed, otherwise the weekly rotating tip.
 */
export const useCurrentTip = (
  habitType: WellnessHabitType,
  studentId: string | undefined,
): { tip: WellnessTip | null; isOnboarding: boolean } => {
  const { data: preferences } = useWellnessPreferences(studentId);

  return useMemo(() => {
    const dismissed = preferences?.dismissedOnboardingTips ?? [];
    const isDismissed = dismissed.includes(habitType);

    if (!isDismissed) {
      const onboarding = getOnboardingTip(habitType, WELLNESS_TIPS);
      if (onboarding) return { tip: onboarding, isOnboarding: true };
    }

    const rotating = getCurrentWellnessTip(habitType, WELLNESS_TIPS);
    return { tip: rotating, isOnboarding: false };
  }, [habitType, preferences?.dismissedOnboardingTips]);
};

/**
 * Mutation to dismiss an onboarding tip for a specific habit type.
 */
export const useDismissOnboardingTip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      habitType,
    }: {
      studentId: string;
      habitType: WellnessHabitType;
    }) => {
      // Fetch current dismissed list
      const { data: current } = await supabase
        .from('student_wellness_preferences')
        .select('dismissed_onboarding_tips')
        .eq('student_id', studentId)
        .maybeSingle();

      const existing: string[] = (current?.dismissed_onboarding_tips as string[]) ?? [];
      if (existing.includes(habitType)) return;

      const updated = [...existing, habitType];

      const { error } = await supabase
        .from('student_wellness_preferences')
        .upsert(
          {
            student_id: studentId,
            dismissed_onboarding_tips: updated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id' },
        );

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.wellness.preferences(variables.studentId),
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to dismiss tip');
      console.error('Dismiss onboarding tip error:', error);
    },
  });
};
