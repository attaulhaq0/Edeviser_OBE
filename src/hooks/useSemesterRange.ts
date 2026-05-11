import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { DateRange } from "@/types/habits";

/**
 * Resolves the current semester date range for the heatmap.
 * Tries to fetch from the `semesters` table first; falls back to
 * Jan 1 – Dec 31 of the current calendar year.
 */
export const useSemesterRange = (studentId: string | undefined) => {
  return useQuery({
    queryKey: [...queryKeys.semesters.all, "current", studentId ?? ""],
    enabled: !!studentId,
    staleTime: 1000 * 60 * 30, // 30 min — semester range rarely changes
    queryFn: async (): Promise<DateRange> => {
      const today = new Date().toISOString().slice(0, 10);

      // Attempt to find the active semester that contains today
      const { data, error } = await supabase
        .from("semesters")
        .select("start_date, end_date")
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.start_date && data?.end_date) {
        return {
          start: data.start_date as string,
          end: data.end_date as string,
        };
      }

      // Fallback: current calendar year
      const year = new Date().getFullYear();
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
    },
  });
};
