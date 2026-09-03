// =============================================================================
// useStudentAcademicInfo — Me page (T30/E3.I) academic info card
// =============================================================================
// Resolves the student's real program(s)/faculty from enrollment data:
//   student_courses → courses (code, name, program_id) → programs (name)
// plus the faculty (institution) name via profiles.institution_id.
// All joins are live-schema verified; RLS scopes the rows.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface StudentAcademicInfo {
  programs: string[];
  faculty: string | null;
  courses: Array<{ code: string; name: string }>;
}

export const useStudentAcademicInfo = (studentId: string | undefined) => {
  return useQuery({
    queryKey: [...queryKeys.outcomeAttainment.all, "academicInfo", studentId ?? ""] as const,
    enabled: !!studentId,
    queryFn: async (): Promise<StudentAcademicInfo> => {
      const { data: enrollments, error } = await supabase
        .from("student_courses")
        .select("courses(code, name, program_id)")
        .eq("student_id", studentId!);
      if (error) throw error;

      const courses = (enrollments ?? []).flatMap((row) =>
        row.courses ? [row.courses] : []
      );

      const programIds = [
        ...new Set(
          courses.map((c) => c.program_id).filter((id): id is string => !!id)
        ),
      ];

      let programs: string[] = [];
      if (programIds.length > 0) {
        const { data: programRows, error: programError } = await supabase
          .from("programs")
          .select("name")
          .in("id", programIds);
        if (programError) throw programError;
        programs = (programRows ?? []).map((p) => p.name);
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("institution_id")
        .eq("id", studentId!)
        .maybeSingle();
      if (profileError) throw profileError;

      let faculty: string | null = null;
      const institutionId = profileRow?.institution_id;
      if (institutionId) {
        const { data: instRow, error: instError } = await supabase
          .from("institutions")
          .select("name")
          .eq("id", institutionId)
          .maybeSingle();
        if (instError) throw instError;
        faculty = instRow?.name ?? null;
      }

      return {
        programs,
        faculty,
        courses: courses.map((c) => ({ code: c.code, name: c.name })),
      };
    },
  });
};