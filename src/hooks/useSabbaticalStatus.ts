import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Fetches whether Streak Sabbatical is enabled for a student from
 * the student_gamification table. Returns false when no data is found
 * or the query fails.
 */
export const useSabbaticalStatus = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.sabbatical(studentId ?? ""),
    enabled: !!studentId,
    queryFn: async (): Promise<boolean> => {
      if (!studentId) return false;

      try {
        const { data, error } = await supabase
          .from("student_gamification")
          .select("sabbatical_enabled" as never)
          .eq("student_id", studentId)
          .maybeSingle();

        if (error) throw error;

        if (!data) return false;

        const row = data as unknown as Record<string, unknown>;
        return row.sabbatical_enabled === true;
      } catch {
        // Column may not exist yet — return disabled
        return false;
      }
    },
  });
};
