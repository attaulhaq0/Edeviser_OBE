import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { classifyAttainment } from "@/lib/attainmentClassifier";
import type { LearningOutcome, Course } from "@/types/app";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Sentinel for a cell that has mapped CLOs but no measurable attainment yet. */
export const CELL_ATTAINMENT_UNMEASURED = -1;

export interface CellData {
  cloCount: number;
  coveragePercent: number;
  /**
   * Real mean attainment across the CLOs mapped into this PLO×course cell,
   * derived from `outcome_attainment.attainment_percent` at `student_course`
   * scope (C-2 — replaces the prior CLO-count placeholder). Equals
   * `CELL_ATTAINMENT_UNMEASURED` (-1) when CLOs are mapped but no attainment
   * evidence exists, and 0 when no CLOs are mapped.
   */
  attainmentPercent: number;
  status: "green" | "yellow" | "red" | "gray";
}

const mean = (values: number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, v) => sum + v, 0) / values.length;

export interface CurriculumMatrixData {
  plos: LearningOutcome[];
  courses: Course[];
  matrix: Record<string, Record<string, CellData>>;
}

interface OutcomeMappingRow {
  source_outcome_id: string;
  target_outcome_id: string;
}

// ─── Status helper ──────────────────────────────────────────────────────────

/**
 * Computes the cell status from mapped-CLO count and real attainment (C-2).
 *
 * - No CLOs mapped → "gray" (no coverage)
 * - CLOs mapped but no attainment evidence yet → "gray" (unmeasured)
 * - Mapped + measured → color by attainment level:
 *     Excellent/Satisfactory (≥70%) → "green"
 *     Developing (50–69%)           → "yellow"
 *     Not Yet (<50%)                → "red"
 */
function computeCellStatus(
  cloCount: number,
  attainmentPercent: number
): CellData["status"] {
  if (cloCount === 0) return "gray";
  if (attainmentPercent < 0) return "gray";
  const level = classifyAttainment(attainmentPercent);
  if (level === "Excellent" || level === "Satisfactory") return "green";
  if (level === "Developing") return "yellow";
  return "red";
}

// ─── CellDetailData ─────────────────────────────────────────────────────────

export interface CellDetailData {
  plo: LearningOutcome;
  course: Course;
  clos: LearningOutcome[];
}

// ─── useCellDetail ──────────────────────────────────────────────────────────

export const useCellDetail = (
  ploId: string | undefined,
  courseId: string | undefined
) => {
  return useQuery({
    queryKey: queryKeys.outcomeMappings.list({
      ploId,
      courseId,
      view: "cellDetail",
    }),
    queryFn: async (): Promise<CellDetailData> => {
      // 1. Fetch PLO details
      const { data: plo, error: ploError } = await supabase
        .from("learning_outcomes")
        .select("*")
        .eq("id", ploId!)
        .single();

      if (ploError) throw ploError;

      // 2. Fetch course details
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId!)
        .single();

      if (courseError) throw courseError;

      // 3. Fetch outcome_mappings where parent = this PLO
      const { data: mappings, error: mapError } = await supabase
        .from("outcome_mappings")
        .select("target_outcome_id")
        .eq("source_outcome_id", ploId!);

      if (mapError) throw mapError;

      const childIds = (mappings ?? []).map((m) => m.target_outcome_id);

      if (childIds.length === 0) {
        return {
          plo: plo as LearningOutcome,
          course: course as Course,
          clos: [],
        };
      }

      // 4. Fetch CLOs that are in this course AND mapped to this PLO
      const { data: clos, error: cloError } = await supabase
        .from("learning_outcomes")
        .select("*")
        .eq("type", "CLO")
        .eq("course_id", courseId!)
        .in("id", childIds)
        .order("sort_order", { ascending: true });

      if (cloError) throw cloError;

      return {
        plo: plo as LearningOutcome,
        course: course as Course,
        clos: (clos as LearningOutcome[]) ?? [],
      };
    },
    enabled: !!ploId && !!courseId,
  });
};

// ─── useCurriculumMatrix ────────────────────────────────────────────────────

export const useCurriculumMatrix = (programId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.outcomeMappings.list({
      programId,
      view: "curriculumMatrix",
    }),
    queryFn: async (): Promise<CurriculumMatrixData> => {
      // 1. Fetch PLOs for the program
      const { data: plos, error: ploError } = await supabase
        .from("learning_outcomes")
        .select("*")
        .eq("type", "PLO")
        .eq("program_id", programId!)
        .order("sort_order", { ascending: true });

      if (ploError) throw ploError;

      // 2. Fetch courses for the program
      const { data: courses, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("program_id", programId!)
        .order("code", { ascending: true });

      if (courseError) throw courseError;

      const typedPlos = plos as LearningOutcome[];
      const typedCourses = courses as Course[];

      // Early return if no PLOs or courses
      if (typedPlos.length === 0 || typedCourses.length === 0) {
        return { plos: typedPlos, courses: typedCourses, matrix: {} };
      }

      const courseIds = typedCourses.map((c) => c.id);
      const ploIds = typedPlos.map((p) => p.id);

      // 3. Fetch CLOs for all courses in this program
      const { data: clos, error: cloError } = await supabase
        .from("learning_outcomes")
        .select("id, course_id")
        .eq("type", "CLO")
        .in("course_id", courseIds);

      if (cloError) throw cloError;

      const typedClos = clos ?? [];

      // 4. Fetch outcome_mappings: PLO (parent) ← CLO (child)
      const cloIds = typedClos.map((c) => c.id);

      let typedMappings: OutcomeMappingRow[] = [];

      if (cloIds.length > 0) {
        const { data: mappings, error: mapError } = await supabase
          .from("outcome_mappings")
          .select("source_outcome_id, target_outcome_id")
          .in("source_outcome_id", ploIds)
          .in("target_outcome_id", cloIds);

        if (mapError) throw mapError;
        typedMappings = mappings as OutcomeMappingRow[];
      }

      // 5. Build a lookup: cloId → courseId
      const cloToCourse = new Map<string, string>();
      for (const clo of typedClos) {
        if (clo.course_id) {
          cloToCourse.set(clo.id, clo.course_id);
        }
      }

      // 6. Fetch real CLO attainment for all mapped CLOs (C-2 — replaces the
      //    CLO-count placeholder). Mirrors the `useAdminPLOHeatmap` /
      //    `useSectionAttainment` aggregation: CLO attainment is written at
      //    `student_course` scope keyed by `outcome_id`. A single batched query
      //    (no per-cell N+1), then average per CLO.
      const mappedCloIds = Array.from(
        new Set(typedMappings.map((m) => m.target_outcome_id))
      );
      const cloAttainmentById = new Map<string, number>();

      if (mappedCloIds.length > 0) {
        const { data: attRows, error: attError } = await supabase
          .from("outcome_attainment")
          .select("outcome_id, attainment_percent")
          .eq("scope", "student_course")
          .in("outcome_id", mappedCloIds);

        if (attError) throw attError;

        const attListsByClo = new Map<string, number[]>();
        for (const row of attRows ?? []) {
          if (row.attainment_percent == null) continue;
          const list = attListsByClo.get(row.outcome_id) ?? [];
          list.push(row.attainment_percent);
          attListsByClo.set(row.outcome_id, list);
        }
        for (const [cloId, list] of attListsByClo) {
          cloAttainmentById.set(cloId, mean(list));
        }
      }

      // Pre-compute per-cell mapping counts AND attainment samples in one pass:
      //   `${ploId}_${courseId}` → { count, attainmentSamples }
      // This prevents an O(P * C * M) nested loop bottleneck.
      interface CellAccumulator {
        count: number;
        attainmentSamples: number[];
      }
      const cellAccumulators = new Map<string, CellAccumulator>();
      for (const m of typedMappings) {
        const courseId = cloToCourse.get(m.target_outcome_id);
        if (!courseId) continue;
        const key = `${m.source_outcome_id}_${courseId}`;
        const acc = cellAccumulators.get(key) ?? {
          count: 0,
          attainmentSamples: [],
        };
        acc.count += 1;
        const cloAttainment = cloAttainmentById.get(m.target_outcome_id);
        if (cloAttainment !== undefined) {
          acc.attainmentSamples.push(cloAttainment);
        }
        cellAccumulators.set(key, acc);
      }

      // 7. Compute the matrix with real attainment per cell.
      const matrix: Record<string, Record<string, CellData>> = {};

      for (const plo of typedPlos) {
        const row: Record<string, CellData> = {};
        for (const course of typedCourses) {
          const acc = cellAccumulators.get(`${plo.id}_${course.id}`);
          const cloCount = acc?.count ?? 0;
          // Real attainment: mean of the contributing CLOs' attainment. When CLOs
          // are mapped but no evidence exists, surface the unmeasured sentinel so
          // the cell renders grey (distinct from a real 0%).
          const attainmentPercent =
            cloCount === 0
              ? 0
              : acc && acc.attainmentSamples.length > 0
              ? Math.round(mean(acc.attainmentSamples))
              : CELL_ATTAINMENT_UNMEASURED;

          row[course.id] = {
            cloCount,
            coveragePercent: cloCount > 0 ? 100 : 0,
            attainmentPercent,
            status: computeCellStatus(cloCount, attainmentPercent),
          };
        }
        matrix[plo.id] = row;
      }

      return { plos: typedPlos, courses: typedCourses, matrix };
    },
    enabled: !!programId,
  });
};
