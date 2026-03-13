import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ── Types ────────────────────────────────────────────────────────────

export interface ProfileCompletenessData {
  profile_completeness: number;
  day1_completed: boolean;
}

// ── useProfileCompleteness — fetch completeness % ────────────────────

export const useProfileCompleteness = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.onboarding.profileCompleteness(studentId),
    queryFn: async (): Promise<ProfileCompletenessData | null> => {
      // First try student_profiles for the authoritative completeness value
      const { data: profile, error: profileError } = await supabase
        .from('student_profiles')
        .select('profile_completeness')
        .eq('student_id', studentId)
        .order('assessment_version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileError) throw profileError;

      // Also fetch progress for day1_completed flag
      const { data: progress, error: progressError } = await supabase
        .from('onboarding_progress')
        .select('profile_completeness, day1_completed')
        .eq('student_id', studentId)
        .maybeSingle();

      if (progressError) throw progressError;

      if (!profile && !progress) return null;

      return {
        profile_completeness: profile?.profile_completeness ?? progress?.profile_completeness ?? 0,
        day1_completed: progress?.day1_completed ?? false,
      };
    },
    enabled: !!studentId,
  });
};
