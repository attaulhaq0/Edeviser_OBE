import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { LearningOutcome, Course } from '@/types/app';

// Bridge the generated types gap until database.ts is regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CellData {
  cloCount: number;
  coveragePercent: number;
  status: 'green' | 'yellow' | 'red' | 'gray';
}

export interface CurriculumMatrixData {
  plos: LearningOutcome[];
  courses: Course[];
  matrix: Record<string, Record<string, CellData>>;
}

interface OutcomeMappingRow {
  parent_outcome_id: string;
  child_outcome_id: string;
}

// ─── Status helper ──────────────────────────────────────────────────────────

function computeCellStatus(cloCount: number): CellData['status'] {
  // Placeholder logic until attainment data is available:
  // Gray = no CLOs mapped, Green = 1+ CLOs mapped
  if (cloCount === 0) return 'gray';
  return 'green';
}

// ─── CellDetailData ─────────────────────────────────────────────────────────

export interface CellDetailData {
  plo: LearningOutcome;
  course: Course;
  clos: LearningOutcome[];
}

// ─── useCellDetail ──────────────────────────────────────────────────────────

export const useCellDetail = (ploId: string | undefined, courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.outcomeMappings.list({ ploId, courseId, view: 'cellDetail' }),
    queryFn: async (): Promise<CellDetailData> => {
      // 1. Fetch PLO details
      const { data: plo, error: ploError } = await db
        .from('learning_outcomes')
        .select('*')
        .eq('id', ploId!)
        .single();

      if (ploError) throw ploError;

      // 2. Fetch course details
      const { data: course, error: courseError } = await db
        .from('courses')
        .select('*')
        .eq('id', courseId!)
        .single();

      if (courseError) throw courseError;

      // 3. Fetch outcome_mappings where parent = this PLO
      const { data: mappings, error: mapError } = await db
        .from('outcome_mappings')
        .select('child_outcome_id')
        .eq('parent_outcome_id', ploId!);

      if (mapError) throw mapError;

      const childIds = (mappings as Array<{ child_outcome_id: string }>).map(
        (m) => m.child_outcome_id,
      );

      if (childIds.length === 0) {
        return { plo: plo as LearningOutcome, course: course as Course, clos: [] };
      }

      // 4. Fetch CLOs that are in this course AND mapped to this PLO
      const { data: clos, error: cloError } = await db
        .from('learning_outcomes')
        .select('*')
        .eq('type', 'CLO')
        .eq('course_id', courseId!)
        .in('id', childIds)
        .order('sort_order', { ascending: true });

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
    queryKey: queryKeys.outcomeMappings.list({ programId, view: 'curriculumMatrix' }),
    queryFn: async (): Promise<CurriculumMatrixData> => {
      // 1. Fetch PLOs for the program
      const { data: plos, error: ploError } = await db
        .from('learning_outcomes')
        .select('*')
        .eq('type', 'PLO')
        .eq('program_id', programId!)
        .order('sort_order', { ascending: true });

      if (ploError) throw ploError;

      // 2. Fetch courses for the program
      const { data: courses, error: courseError } = await db
        .from('courses')
        .select('*')
        .eq('program_id', programId!)
        .order('code', { ascending: true });

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
      const { data: clos, error: cloError } = await db
        .from('learning_outcomes')
        .select('id, course_id')
        .eq('type', 'CLO')
        .in('course_id', courseIds);

      if (cloError) throw cloError;

      const typedClos = clos as Array<{ id: string; course_id: string }>;

      // 4. Fetch outcome_mappings: PLO (parent) ← CLO (child)
      const cloIds = typedClos.map((c) => c.id);

      let typedMappings: OutcomeMappingRow[] = [];

      if (cloIds.length > 0) {
        const { data: mappings, error: mapError } = await db
          .from('outcome_mappings')
          .select('parent_outcome_id, child_outcome_id')
          .in('parent_outcome_id', ploIds)
          .in('child_outcome_id', cloIds);

        if (mapError) throw mapError;
        typedMappings = mappings as OutcomeMappingRow[];
      }

      // 5. Build a lookup: cloId → courseId
      const cloToCourse = new Map<string, string>();
      for (const clo of typedClos) {
        cloToCourse.set(clo.id, clo.course_id);
      }

      // 6. Compute the matrix
      const matrix: Record<string, Record<string, CellData>> = {};

      for (const plo of typedPlos) {
        const row: Record<string, CellData> = {};
        for (const course of typedCourses) {
          // Count CLOs in this course that map to this PLO
          const cloCount = typedMappings.filter(
            (m) =>
              m.parent_outcome_id === plo.id &&
              cloToCourse.get(m.child_outcome_id) === course.id,
          ).length;

          row[course.id] = {
            cloCount,
            coveragePercent: cloCount > 0 ? 100 : 0,
            status: computeCellStatus(cloCount),
          };
        }
        matrix[plo.id] = row;
      }

      return { plos: typedPlos, courses: typedCourses, matrix };
    },
    enabled: !!programId,
  });
};
