// =============================================================================
// useGradebook — TanStack Query hooks for grade categories & gradebook matrix
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { useAuth } from "@/hooks/useAuth";
import { mapToLetterGrade } from "@/lib/letterGradeMapper";
import { computeFinalWeightedGrade } from "@/lib/gradebookCalc";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Matrix computation helper
// ---------------------------------------------------------------------------

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GradeCategory {
  id: string;
  course_id: string;
  name: string;
  weight_percent: number;
  sort_order: number;
  created_at: string;
}

export interface CreateGradeCategoryInput {
  course_id: string;
  name: string;
  weight_percent: number;
  sort_order: number;
}

export interface UpdateGradeCategoryInput {
  name?: string;
  weight_percent?: number;
  sort_order?: number;
}

export interface GradebookAssessment {
  id: string;
  title: string;
  type: "assignment" | "quiz";
  score: number | null;
  max_score: number;
  /**
   * Submission id when a grade exists (assignments only) — used by the
   * gradebook matrix to deep-link into the read-only Grade Review page.
   */
  submission_id: string | null;
}

export interface GradebookCategoryEntry {
  category_id: string;
  category_name: string;
  weight_percent: number;
  assessments: GradebookAssessment[];
  subtotal_percent: number;
  /** Number of assessments with a graded score in this category. */
  graded_assessment_count: number;
}

export interface GradebookEntry {
  student_id: string;
  student_name: string;
  categories: GradebookCategoryEntry[];
  /**
   * Final weighted percent under the exclude-and-renormalize policy
   * (QA FAIL-04): categories with zero graded work are excluded from both
   * numerator and denominator. Null when nothing is graded yet.
   */
  final_weighted_grade: number | null;
  /** Letter grade; null when the final grade is not yet computable. */
  letter_grade: string | null;
  /** Weights excluded from the calculation because nothing was graded. */
  excluded_weight_total: number;
}

// ─── useGradeCategories — list categories for a course ──────────────────────

export const useGradeCategories = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.gradeCategories.list({ courseId }),
    queryFn: async (): Promise<GradeCategory[]> => {
      const { data, error } = await supabase
        .from("grade_categories")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []) as GradeCategory[];
    },
    enabled: !!courseId,
  });
};

// ─── useCreateGradeCategory — insert with audit logging ─────────────────────

export const useCreateGradeCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CreateGradeCategoryInput
    ): Promise<GradeCategory> => {
      const { data, error } = await supabase
        .from("grade_categories")
        .insert({
          course_id: input.course_id,
          name: input.name,
          weight_percent: input.weight_percent,
          sort_order: input.sort_order,
        })
        .select()
        .single();

      if (error) throw error;

      const category = data as GradeCategory;

      await logAuditEvent({
        action: "create",
        entity_type: "grade_category",
        entity_id: category.id,
        changes: { ...input },
        performed_by: user?.id ?? "unknown",
      });

      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.gradeCategories.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.gradebook.lists() });
      toast.success("Grade category created");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to create grade category"
      ),
  });
};

// ─── useUpdateGradeCategory — update with audit logging ─────────────────────

export const useUpdateGradeCategory = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: UpdateGradeCategoryInput
    ): Promise<GradeCategory> => {
      const { data, error } = await supabase
        .from("grade_categories")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: "update",
        entity_type: "grade_category",
        entity_id: id,
        changes: input as Record<string, unknown>,
        performed_by: user?.id ?? "unknown",
      });

      return data as GradeCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.gradeCategories.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.gradebook.lists() });
      toast.success("Grade category updated");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to update grade category"
      ),
  });
};

// ─── useDeleteGradeCategory — delete with audit logging ─────────────────────

export const useDeleteGradeCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("grade_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await logAuditEvent({
        action: "delete",
        entity_type: "grade_category",
        entity_id: id,
        changes: null,
        performed_by: user?.id ?? "unknown",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.gradeCategories.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.gradebook.lists() });
      toast.success("Grade category deleted");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to delete grade category"
      ),
  });
};

// ─── useGradebookMatrix — students × assessments matrix ─────────────────────
// Since assignments/quizzes don't yet have a grade_category_id FK, we distribute
// assessments across categories by type convention:
//   - Categories named with "quiz" → quizzes
//   - All other categories → assignments (split evenly if multiple)
//   - If only one category exists, all assessments go there
// When grade_category_id is added to the schema, this logic can be simplified.

export const useGradebookMatrix = (courseId?: string, sectionId?: string) => {
  return useQuery({
    queryKey: queryKeys.gradebook.list({ courseId, sectionId }),
    queryFn: async (): Promise<GradebookEntry[]> => {
      if (!courseId) return [];

      // 1. Fetch grade categories
      const { data: rawCategories, error: catError } = await supabase
        .from("grade_categories")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });

      if (catError) throw catError;
      const categories = (rawCategories ?? []) as GradeCategory[];

      // 2. Fetch enrolled students (optionally filtered by section)
      let enrollmentQuery = supabase
        .from("student_courses")
        .select(
          "student_id, profiles!student_courses_student_id_fkey(id, full_name)"
        )
        .eq("course_id", courseId)
        .eq("status", "active");

      if (sectionId) {
        enrollmentQuery = enrollmentQuery.eq("section_id", sectionId);
      }

      const { data: rawEnrollments, error: enrollError } =
        await enrollmentQuery;
      if (enrollError) throw enrollError;

      const enrollments = (rawEnrollments ?? []) as unknown as Array<{
        student_id: string;
        profiles: { id: string; full_name: string } | null;
      }>;

      if (enrollments.length === 0) return [];

      const studentIds = enrollments.map((e) => e.student_id);

      // 3. Fetch assignments
      const { data: rawAssignments, error: assignError } = await supabase
        .from("assignments")
        .select("id, title, total_marks")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });

      if (assignError) throw assignError;

      const assignments = (rawAssignments ?? []) as Array<{
        id: string;
        title: string;
        total_marks: number;
      }>;

      // 4. Fetch quizzes
      const { data: rawQuizzes, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("created_at", { ascending: true });

      if (quizError) throw quizError;

      const quizList = (rawQuizzes ?? []) as Array<{
        id: string;
        title: string;
      }>;

      // 5. Fetch grades via submissions (submission id kept for source links)
      const { data: rawGrades, error: gradeError } = await supabase
        .from("grades")
        .select(
          "total_score, score_percent, submissions!inner(id, student_id, assignment_id)"
        )
        .in("submissions.student_id", studentIds);

      if (gradeError) throw gradeError;

      const gradeMap = new Map<
        string,
        { totalScore: number; scorePercent: number; submissionId: string }
      >();
      for (const g of rawGrades ?? []) {
        const grade = g as unknown as {
          total_score: number;
          score_percent: number;
          submissions: {
            id: string;
            student_id: string;
            assignment_id: string;
          };
        };
        const key = `${grade.submissions.student_id}:${grade.submissions.assignment_id}`;
        gradeMap.set(key, {
          totalScore: grade.total_score,
          scorePercent: grade.score_percent,
          submissionId: grade.submissions.id,
        });
      }

      // 6. Fetch quiz attempts (best score per student per quiz)
      const quizIds = quizList.map((q) => q.id);
      let quizScoreMap = new Map<string, number>();

      if (quizIds.length > 0) {
        const { data: rawAttempts, error: attemptError } = await supabase
          .from("quiz_attempts")
          .select("quiz_id, student_id, score")
          .in("quiz_id", quizIds)
          .in("student_id", studentIds)
          .not("score", "is", null);

        if (attemptError) throw attemptError;

        quizScoreMap = new Map<string, number>();
        for (const a of rawAttempts ?? []) {
          const attempt = a as unknown as {
            quiz_id: string;
            student_id: string;
            score: number;
          };
          const key = `${attempt.student_id}:${attempt.quiz_id}`;
          const existing = quizScoreMap.get(key);
          if (existing === undefined || attempt.score > existing) {
            quizScoreMap.set(key, attempt.score);
          }
        }
      }

      // 7. Distribute assessments across categories
      // Convention: categories with "quiz" in name get quizzes, others get assignments
      // If no categories, create a single "All" category at 100%
      const effectiveCategories: Array<{
        id: string;
        name: string;
        weight_percent: number;
        assignmentIds: string[];
        quizIds: string[];
      }> = [];

      if (categories.length === 0) {
        effectiveCategories.push({
          id: "all",
          name: "All Assessments",
          weight_percent: 100,
          assignmentIds: assignments.map((a) => a.id),
          quizIds: quizList.map((q) => q.id),
        });
      } else {
        const quizCatIds = categories
          .filter((c) => c.name.toLowerCase().includes("quiz"))
          .map((c) => c.id);
        const assignCatIds = categories
          .filter((c) => !c.name.toLowerCase().includes("quiz"))
          .map((c) => c.id);

        for (const cat of categories) {
          const isQuizCat = quizCatIds.includes(cat.id);
          effectiveCategories.push({
            id: cat.id,
            name: cat.name,
            weight_percent: cat.weight_percent,
            assignmentIds: isQuizCat
              ? []
              : assignCatIds.length === 1 || assignCatIds[0] === cat.id
              ? assignments.map((a) => a.id)
              : [],
            quizIds: isQuizCat ? quizList.map((q) => q.id) : [],
          });
        }

        // If no quiz category exists, put quizzes in the first category
        const hasQuizCat = quizCatIds.length > 0;
        if (
          !hasQuizCat &&
          effectiveCategories.length > 0 &&
          quizList.length > 0
        ) {
          const first = effectiveCategories[0];
          if (first) first.quizIds = quizList.map((q) => q.id);
        }

        // If no assignment category got assignments, put them in the first non-quiz category
        const hasAssignments = effectiveCategories.some(
          (c) => c.assignmentIds.length > 0
        );
        if (!hasAssignments && assignments.length > 0) {
          const firstNonQuiz = effectiveCategories.find(
            (c) => !quizCatIds.includes(c.id)
          );
          if (firstNonQuiz) {
            firstNonQuiz.assignmentIds = assignments.map((a) => a.id);
          } else {
            const fallback = effectiveCategories[0];
            if (fallback) fallback.assignmentIds = assignments.map((a) => a.id);
          }
        }
      }

      // 8. Build gradebook entries
      const assignmentLookup = new Map(assignments.map((a) => [a.id, a]));
      const quizLookup = new Map(quizList.map((q) => [q.id, q]));

      const entries: GradebookEntry[] = enrollments.map((enrollment) => {
        const studentId = enrollment.student_id;
        const studentName = enrollment.profiles?.full_name ?? "Unknown";

        const catEntries: GradebookCategoryEntry[] = effectiveCategories.map(
          (cat) => {
            const assessments: GradebookAssessment[] = [
              ...cat.assignmentIds.map((aId) => {
                const assignment = assignmentLookup.get(aId);
                const gradeData = gradeMap.get(`${studentId}:${aId}`);
                let scoreVal: number | null = null;
                if (gradeData) {
                  if (
                    gradeData.scorePercent !== undefined &&
                    gradeData.scorePercent !== null
                  ) {
                    scoreVal = gradeData.scorePercent;
                  } else if (
                    gradeData.totalScore !== undefined &&
                    gradeData.totalScore !== null
                  ) {
                    const totalMarks = assignment?.total_marks || 100;
                    scoreVal = (gradeData.totalScore / totalMarks) * 100;
                  }
                }
                return {
                  id: aId,
                  title: assignment?.title ?? "Unknown",
                  type: "assignment" as const,
                  score:
                    scoreVal !== null ? Math.round(scoreVal * 100) / 100 : null,
                  max_score: 100,
                  submission_id: gradeData?.submissionId ?? null,
                };
              }),
              ...cat.quizIds.map((qId) => {
                const quiz = quizLookup.get(qId);
                const bestScore = quizScoreMap.get(`${studentId}:${qId}`);
                return {
                  id: qId,
                  title: quiz?.title ?? "Unknown",
                  type: "quiz" as const,
                  score: bestScore !== undefined ? bestScore : null,
                  max_score: 100,
                  submission_id: null,
                };
              }),
            ];

            const graded = assessments.filter((a) => a.score !== null);
            const subtotalPercent =
              graded.length > 0
                ? graded.reduce((sum, a) => sum + a.score!, 0) / graded.length
                : 0;

            return {
              category_id: cat.id,
              category_name: cat.name,
              weight_percent: cat.weight_percent,
              assessments,
              subtotal_percent: Math.round(subtotalPercent * 100) / 100,
              graded_assessment_count: graded.length,
            };
          }
        );

        // QA hardening FAIL-04: exclude-and-renormalize policy. Categories
        // with zero graded assessments are excluded from both numerator and
        // denominator (never counted as 0%); the final grade is null when
        // nothing at all is graded yet ("not yet gradable").
        const finalResult = computeFinalWeightedGrade(
          catEntries.map((cat) => ({
            weight_percent: cat.weight_percent,
            hasGradedWork: cat.graded_assessment_count > 0,
            subtotal_percent: cat.subtotal_percent,
          }))
        );

        return {
          student_id: studentId,
          student_name: studentName,
          categories: catEntries,
          final_weighted_grade: finalResult.finalPercent,
          letter_grade:
            finalResult.finalPercent !== null
              ? mapToLetterGrade(finalResult.finalPercent)
              : null,
          excluded_weight_total: finalResult.excludedWeightTotal,
        };
      });

      return entries;
    },
    enabled: !!courseId,
  });
};
