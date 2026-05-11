// =============================================================================
// useMostImprovedLeaderboard — TanStack Query hook for Most Improved data
// Task 147.3 | Requirements: 130.1
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  rankMostImproved,
  type MostImprovedEntry,
} from "@/lib/mostImprovedLeaderboard";

/**
 * Fetches xp_transactions for all students in a course (or all) over the last 8 weeks,
 * splits into current 4-week and previous 4-week periods, and ranks by improvement.
 */
export const useMostImprovedLeaderboard = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.mostImproved.list({ courseId: courseId ?? "all" }),
    queryFn: async (): Promise<MostImprovedEntry[]> => {
      const now = new Date();
      const fourWeeksAgo = new Date(now);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const eightWeeksAgo = new Date(now);
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

      // Scope to course students if courseId provided
      let studentIds: string[] | null = null;
      if (courseId) {
        const { data: enrollments, error: enrollError } = await supabase
          .from("student_courses")
          .select("student_id")
          .eq("course_id", courseId)
          .eq("status", "active");

        if (enrollError) throw enrollError;
        studentIds = (enrollments ?? []).map((e) => e.student_id);
        if (studentIds.length === 0) return [];
      }

      // Fetch transactions for the 8-week window
      let query = supabase
        .from("xp_transactions")
        .select("student_id, xp_amount, created_at")
        .gte("created_at", eightWeeksAgo.toISOString())
        .order("created_at", { ascending: true });

      if (studentIds) {
        query = query.in("student_id", studentIds);
      }

      const { data: transactions, error } = await query;
      if (error) throw error;

      // Group by student into current and previous 4-week buckets
      const studentMap = new Map<
        string,
        { current: number; previous: number }
      >();

      for (const txn of transactions ?? []) {
        const d = new Date(txn.created_at);
        const sid = txn.student_id as string;

        if (!studentMap.has(sid)) {
          studentMap.set(sid, { current: 0, previous: 0 });
        }

        const entry = studentMap.get(sid)!;
        if (d >= fourWeeksAgo) {
          entry.current += txn.xp_amount;
        } else {
          entry.previous += txn.xp_amount;
        }
      }

      // Fetch names for all students in the map
      const allStudentIds = [...studentMap.keys()];
      if (allStudentIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allStudentIds);

      if (profileError) throw profileError;

      const nameMap = new Map<string, string>();
      for (const p of profiles ?? []) {
        nameMap.set(p.id, p.full_name);
      }

      // Build entries for ranking
      const entries = allStudentIds.map((sid) => {
        const data = studentMap.get(sid)!;
        return {
          student_id: sid,
          student_name: nameMap.get(sid) ?? "Unknown",
          current_4_week_xp: data.current,
          previous_4_week_xp: data.previous,
        };
      });

      return rankMostImproved(entries);
    },
    staleTime: 60_000,
  });
};
