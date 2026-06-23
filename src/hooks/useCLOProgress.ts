// =============================================================================
// useCLOProgress — TanStack Query hook for student CLO attainment data
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { BloomsLevel, AttainmentLevel } from "@/types/app";
import { classifyAttainment } from "@/lib/attainmentClassifier";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CLOProgressEntry {
  clo_id: string;
  clo_title: string;
  blooms_level: BloomsLevel;
  attainment_percent: number | null;
  attainment_level: AttainmentLevel | null;
  sample_count: number;
  course_name: string;
  course_id: string;
}

export interface CLOProgressByCourse {
  course_id: string;
  course_name: string;
  entries: CLOProgressEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// classifyAttainment is now imported from @/lib/attainmentClassifier

// ─── useCLOProgress ──────────────────────────────────────────────────────────

export const useCLOProgress = (studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.outcomeAttainment.list({
      studentId,
      scope: "clo_progress",
    }),
    queryFn: async (): Promise<CLOProgressByCourse[]> => {
      if (!studentId) return [];

      // 1. Get enrolled courses for the student
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", studentId)
        .eq("status", "active");

      if (enrollError) throw enrollError;
      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e) => e.course_id);

      // 2. Get course names
      const { data: courses, error: courseError } = await supabase
        .from("courses")
        .select("id, name")
        .in("id", courseIds);

      if (courseError) throw courseError;

      const courseMap = new Map<string, string>();
      for (const c of courses ?? []) {
        courseMap.set(c.id, c.name);
      }

      // 3. Get CLOs for enrolled courses
      const { data: clos, error: cloError } = await supabase
        .from("learning_outcomes")
        .select("id, title, blooms_level, course_id")
        .eq("type", "CLO")
        .in("course_id", courseIds)
        .order("sort_order", { ascending: true });

      if (cloError) throw cloError;
      if (!clos || clos.length === 0) return [];

      const cloIds = clos.map((c) => c.id);

      // 4. Get attainment data for this student's CLOs
      const { data: attainments, error: attError } = await supabase
        .from("outcome_attainment")
        .select("outcome_id, attainment_percent, sample_count")
        .eq("student_id", studentId)
        .eq("scope", "student_course")
        .in("outcome_id", cloIds);

      if (attError) throw attError;

      const attainmentMap = new Map<
        string,
        { percent: number; samples: number }
      >();
      for (const a of attainments ?? []) {
        attainmentMap.set(a.outcome_id, {
          percent: a.attainment_percent,
          samples: a.sample_count,
        });
      }

      // 5. Build entries grouped by course
      const courseGroupMap = new Map<string, CLOProgressEntry[]>();

      for (const clo of clos) {
        const courseId = clo.course_id;
        if (!courseId) continue;

        const att = attainmentMap.get(clo.id);
        const entry: CLOProgressEntry = {
          clo_id: clo.id,
          clo_title: clo.title,
          blooms_level: (clo.blooms_level ?? "remembering") as BloomsLevel,
          attainment_percent: att?.percent ?? null,
          attainment_level: att ? classifyAttainment(att.percent) : null,
          sample_count: att?.samples ?? 0,
          course_name: courseMap.get(courseId) ?? "Unknown Course",
          course_id: courseId,
        };

        const existing = courseGroupMap.get(courseId) ?? [];
        existing.push(entry);
        courseGroupMap.set(courseId, existing);
      }

      // 6. Convert to array sorted by course name
      const result: CLOProgressByCourse[] = [];
      for (const [courseId, entries] of courseGroupMap) {
        result.push({
          course_id: courseId,
          course_name: courseMap.get(courseId) ?? "Unknown Course",
          entries,
        });
      }

      result.sort((a, b) => a.course_name.localeCompare(b.course_name));
      return result;
    },
    enabled: !!studentId,
    // CLO attainment changes only on grade/evidence events (which invalidate via
    // realtime); 2-min staleTime prevents the 4-query fan-out (student_courses +
    // courses + learning_outcomes + outcome_attainment) on every dashboard re-mount.
    staleTime: 120_000,
  });
};
