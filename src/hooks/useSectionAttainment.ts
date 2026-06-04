// =============================================================================
// useSectionAttainment — Coordinator Section Comparison real data (Req 10)
// -----------------------------------------------------------------------------
// Feature: qa-partner-review-remediation — Req 10.1, 10.2, 10.3
//
// Computes, per `course_sections` row of a given course:
//   • real attainment  — mean of `outcome_attainment.attainment_percent` for the
//     students enrolled in that section, scope = 'student_course'
//   • actual enrolled student count — count of active `student_courses` rows for
//     the section (NOT the section capacity)
//
// All access is via explicit column selects (no `*`, no `as never`) so the
// generated `Insert`/`Row` types stay in force and `tsc` does not hit the
// deep-instantiation ceiling (TS2589).
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { BloomsLevel } from "@/types/app";

// ─── Types ──────────────────────────────────────────────────────────────────

/** One row per section in the comparison chart. */
export interface SectionAttainmentRow {
  section_id: string;
  section_code: string;
  /** Mean attainment across enrolled students; 0 when no evidence exists. */
  attainment_percent: number;
  /** Actual count of active enrollments for the section. */
  student_count: number;
  /** Number of attainment records contributing — 0 means "no evidence yet". */
  sample_count: number;
}

/** Per-CLO attainment row shown inside the section drill-down. */
export interface SectionCLOAttainment {
  clo_id: string;
  clo_title: string;
  blooms_level: BloomsLevel | null;
  attainment_percent: number;
  sample_count: number;
}

/** Full drill-down payload for a single section. */
export interface SectionDrillDown {
  section_id: string;
  section_code: string;
  teacher_name: string | null;
  student_count: number;
  clos: SectionCLOAttainment[];
}

// ─── Internal row shapes (explicit selects) ─────────────────────────────────

interface SectionEnrollmentRow {
  section_id: string | null;
  student_id: string;
}

interface AttainmentRow {
  student_id: string | null;
  attainment_percent: number;
}

const mean = (values: number[]): number =>
  values.length > 0
    ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
    : 0;

// ─── useSectionAttainment — per-section attainment + enrolled count ──────────

export const useSectionAttainment = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.sectionAttainment.list({ courseId }),
    queryFn: async (): Promise<SectionAttainmentRow[]> => {
      if (!courseId) return [];

      // 1. Sections for the course.
      const { data: sections, error: sectionsError } = await supabase
        .from("course_sections")
        .select("id, section_code")
        .eq("course_id", courseId)
        .order("section_code", { ascending: true });
      if (sectionsError) throw sectionsError;

      const sectionRows = sections ?? [];
      if (sectionRows.length === 0) return [];

      // 2. Active enrollments → maps section → student ids (single round trip).
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("section_id, student_id")
        .eq("course_id", courseId)
        .eq("status", "active");
      if (enrollError) throw enrollError;

      const studentsBySection = new Map<string, Set<string>>();
      const studentToSection = new Map<string, string>();
      for (const row of (enrollments ?? []) as SectionEnrollmentRow[]) {
        if (!row.section_id) continue;
        let set = studentsBySection.get(row.section_id);
        if (!set) {
          set = new Set<string>();
          studentsBySection.set(row.section_id, set);
        }
        set.add(row.student_id);
        studentToSection.set(row.student_id, row.section_id);
      }

      // 3. Student-scoped attainment for the course (single round trip).
      const { data: attainment, error: attainError } = await supabase
        .from("outcome_attainment")
        .select("student_id, attainment_percent")
        .eq("course_id", courseId)
        .eq("scope", "student_course");
      if (attainError) throw attainError;

      const scoresBySection = new Map<string, number[]>();
      for (const row of (attainment ?? []) as AttainmentRow[]) {
        if (!row.student_id) continue;
        const sectionId = studentToSection.get(row.student_id);
        if (!sectionId) continue;
        const arr = scoresBySection.get(sectionId) ?? [];
        arr.push(row.attainment_percent);
        scoresBySection.set(sectionId, arr);
      }

      // 4. Assemble one row per section.
      return sectionRows.map((section) => {
        const scores = scoresBySection.get(section.id) ?? [];
        return {
          section_id: section.id,
          section_code: section.section_code,
          attainment_percent: mean(scores),
          student_count: studentsBySection.get(section.id)?.size ?? 0,
          sample_count: scores.length,
        };
      });
    },
    enabled: !!courseId,
    staleTime: 30_000,
  });
};

// ─── Drill-down row shapes (explicit selects) ───────────────────────────────

interface SectionTeacherRow {
  id: string;
  section_code: string;
  profiles: { full_name: string } | null;
}

interface CLORow {
  id: string;
  title: string;
  blooms_level: BloomsLevel | null;
}

interface CLOAttainmentRow {
  outcome_id: string;
  attainment_percent: number;
}

// ─── useSectionDrillDown — teacher + per-CLO attainment for one section ──────

export const useSectionDrillDown = (courseId?: string, sectionId?: string) => {
  return useQuery({
    queryKey: queryKeys.sectionAttainment.detail(
      `${courseId ?? ""}:${sectionId ?? ""}`
    ),
    queryFn: async (): Promise<SectionDrillDown | null> => {
      if (!courseId || !sectionId) return null;

      // 1. Section + its teacher.
      const { data: section, error: sectionError } = await supabase
        .from("course_sections")
        .select(
          "id, section_code, profiles!course_sections_teacher_id_fkey(full_name)"
        )
        .eq("id", sectionId)
        .maybeSingle();
      if (sectionError) throw sectionError;
      if (!section) return null;

      const sectionRow = section as SectionTeacherRow;

      // 2. Active enrollments in the section.
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("student_id")
        .eq("section_id", sectionId)
        .eq("status", "active");
      if (enrollError) throw enrollError;

      const studentIds = [
        ...new Set((enrollments ?? []).map((e) => e.student_id)),
      ];

      // 3. CLOs for the course.
      const { data: clos, error: closError } = await supabase
        .from("learning_outcomes")
        .select("id, title, blooms_level")
        .eq("type", "CLO")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });
      if (closError) throw closError;

      const cloRows = (clos ?? []) as CLORow[];
      const cloIds = cloRows.map((c) => c.id);

      // 4. Student-scoped attainment for those CLOs and section students.
      const scoresByCLO = new Map<string, number[]>();
      if (cloIds.length > 0 && studentIds.length > 0) {
        const { data: attainment, error: attainError } = await supabase
          .from("outcome_attainment")
          .select("outcome_id, attainment_percent")
          .in("outcome_id", cloIds)
          .in("student_id", studentIds)
          .eq("scope", "student_course");
        if (attainError) throw attainError;

        for (const row of (attainment ?? []) as CLOAttainmentRow[]) {
          const arr = scoresByCLO.get(row.outcome_id) ?? [];
          arr.push(row.attainment_percent);
          scoresByCLO.set(row.outcome_id, arr);
        }
      }

      return {
        section_id: sectionRow.id,
        section_code: sectionRow.section_code,
        teacher_name: sectionRow.profiles?.full_name ?? null,
        student_count: studentIds.length,
        clos: cloRows.map((clo) => {
          const scores = scoresByCLO.get(clo.id) ?? [];
          return {
            clo_id: clo.id,
            clo_title: clo.title,
            blooms_level: clo.blooms_level,
            attainment_percent: mean(scores),
            sample_count: scores.length,
          };
        }),
      };
    },
    enabled: !!courseId && !!sectionId,
    staleTime: 30_000,
  });
};
