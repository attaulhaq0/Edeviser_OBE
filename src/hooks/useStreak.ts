import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface StreakData {
  streak_count: number;
  last_login_date: string | null;
  streak_freezes_available: number;
}

export const useStreak = () => {
  return useQuery({
    queryKey: queryKeys.studentGamification.list({ scope: "streak" }),
    queryFn: async (): Promise<StreakData | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("student_gamification")
        .select("streak_current, last_login_date, streak_freezes_available")
        .eq("student_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Map streak_current → streak_count for the public StreakData interface
      // so existing consumers stay backward-compatible.
      return {
        streak_count: data.streak_current,
        last_login_date: data.last_login_date,
        streak_freezes_available: data.streak_freezes_available,
      };
    },
  });
};
