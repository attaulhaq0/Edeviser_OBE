import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Fetches whether Streak Sabbatical is enabled for the student's institution.
 * The setting lives on `institution_settings.streak_sabbatical_enabled` —
 * NOT on `student_gamification` as previously assumed. This was a critical
 * silent-failure bug.
 */
export const useSabbaticalStatus = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.sabbatical(studentId ?? ""),
    enabled: !!studentId,
    queryFn: async (): Promise<boolean> => {
      if (!studentId) return false;

      try {
        // 1. Look up the student's institution
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("institution_id")
          .eq("id", studentId)
          .maybeSingle();

        if (profileErr || !profile?.institution_id) return false;

        // 2. Read the institution-level setting
        const { data: settings, error: settingsErr } = await supabase
          .from("institution_settings")
          .select("streak_sabbatical_enabled")
          .eq("institution_id", profile.institution_id)
          .maybeSingle();

        if (settingsErr || !settings) return false;
        return settings.streak_sabbatical_enabled === true;
      } catch {
        return false;
      }
    },
  });
};
