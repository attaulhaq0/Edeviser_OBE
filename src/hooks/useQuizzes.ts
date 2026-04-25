import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type {
  CreateQuizFormData,
  QuizQuestionFormData,
} from "@/lib/schemas/quiz";
import type { Database } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  clo_ids: string[];
  time_limit_minutes: number | null;
  max_attempts: number;
  is_published: boolean;
  due_date: string;
  is_adaptive: boolean;
  adaptation_config: Record<string, unknown> | null;
  practice_mode_enabled: boolean;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type:
    | "mcq_single"
    | "mcq_multi"
    | "true_false"
    | "short_answer"
    | "fill_blank";
  options: string[] | null;
  correct_answer: string | string[];
  points: number;
  sort_order: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: Record<string, string | string[]>;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
  attempt_number: number;
  grading_status: "auto_graded" | "pending_manual" | "fully_graded";
  auto_score: number | null;
  manual_score: number | null;
}

// ─── useQuiz — fetch a single quiz by ID ────────────────────────────────────

export const useQuiz = (quizId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(quizId ?? ""),
    queryFn: async (): Promise<Quiz | null> => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Cast through unknown since practice_mode_enabled isn't in generated types yet
      const row = data as unknown as Record<string, unknown>;
      return {
        id: row.id as string,
        course_id: row.course_id as string,
        title: row.title as string,
        description: row.description as string | null,
        clo_ids: (row.clo_ids ?? []) as string[],
        time_limit_minutes: row.time_limit_minutes as number | null,
        max_attempts: row.max_attempts as number,
        is_published: row.is_published as boolean,
        due_date: row.due_date as string,
        is_adaptive: row.is_adaptive as boolean,
        adaptation_config: row.adaptation_config as Record<
          string,
          unknown
        > | null,
        practice_mode_enabled: (row.practice_mode_enabled ?? false) as boolean,
        created_at: row.created_at as string,
      };
    },
    enabled: !!quizId,
  });
};

// ─── useCreateQuiz — insert a new quiz ──────────────────────────────────────

export const useCreateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuizFormData) => {
      // practice_mode_enabled isn't in generated types yet (task 16.11),
      // so we build the payload and cast through unknown for the insert.
      const payload = {
        course_id: input.course_id,
        title: input.title,
        description: input.description ?? null,
        clo_ids: input.clo_ids,
        time_limit_minutes: input.time_limit_minutes,
        max_attempts: input.max_attempts,
        is_published: input.is_published,
        due_date: input.due_date,
        is_adaptive: input.is_adaptive ?? false,
        adaptation_config: input.is_adaptive
          ? input.adaptation_config ?? {}
          : {},
        practice_mode_enabled: input.practice_mode_enabled ?? false,
      };

      const { data, error } = await (
        supabase.from("quizzes") as unknown as {
          insert: (v: unknown) => {
            select: () => {
              single: () => Promise<{ data: unknown; error: unknown }>;
            };
          };
        }
      )
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.lists() });
    },
  });
};

// ─── useUpdateQuiz — update an existing quiz ────────────────────────────────

export const useUpdateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<CreateQuizFormData> & { id: string }) => {
      const updatePayload: Database["public"]["Tables"]["quizzes"]["Update"] =
        {};
      if (input.title !== undefined) updatePayload.title = input.title;
      if (input.description !== undefined)
        updatePayload.description = input.description;
      if (input.clo_ids !== undefined) updatePayload.clo_ids = input.clo_ids;
      if (input.time_limit_minutes !== undefined)
        updatePayload.time_limit_minutes = input.time_limit_minutes;
      if (input.max_attempts !== undefined)
        updatePayload.max_attempts = input.max_attempts;
      if (input.is_published !== undefined)
        updatePayload.is_published = input.is_published;
      if (input.due_date !== undefined) updatePayload.due_date = input.due_date;
      if (input.is_adaptive !== undefined) {
        updatePayload.is_adaptive = input.is_adaptive;
        updatePayload.adaptation_config = input.is_adaptive
          ? input.adaptation_config ?? {}
          : {};
      }
      // practice_mode_enabled column not present in current generated types;
      // attach via cast until the schema migration is applied upstream.
      const finalPayload =
        input.practice_mode_enabled !== undefined
          ? ({
              ...updatePayload,
              practice_mode_enabled: input.practice_mode_enabled,
            } as never)
          : updatePayload;

      const { data, error } = await supabase
        .from("quizzes")
        .update(finalPayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizzes.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.practiceMode.config(variables.id),
      });
    },
  });
};

// ─── useQuizzes — list quizzes for a course ─────────────────────────────────

export const useQuizzes = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.quizzes.list({ courseId }),
    queryFn: async (): Promise<Quiz[]> => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("course_id", courseId!)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as Record<string, unknown>;
        return {
          id: r.id as string,
          course_id: r.course_id as string,
          title: r.title as string,
          description: r.description as string | null,
          clo_ids: (r.clo_ids ?? []) as string[],
          time_limit_minutes: r.time_limit_minutes as number | null,
          max_attempts: r.max_attempts as number,
          is_published: r.is_published as boolean,
          due_date: r.due_date as string,
          is_adaptive: r.is_adaptive as boolean,
          adaptation_config: r.adaptation_config as Record<
            string,
            unknown
          > | null,
          practice_mode_enabled: (r.practice_mode_enabled ?? false) as boolean,
          created_at: r.created_at as string,
        };
      });
    },
    enabled: !!courseId,
  });
};

// ─── useDeleteQuiz — delete a quiz ──────────────────────────────────────────

export const useDeleteQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.lists() });
    },
  });
};

// ─── Quiz Questions ─────────────────────────────────────────────────────────

export const useQuizQuestions = (quizId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.quizQuestions.list({ quizId }),
    queryFn: async (): Promise<QuizQuestion[]> => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId!)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as Record<string, unknown>;
        return {
          id: r.id as string,
          quiz_id: r.quiz_id as string,
          question_text: r.question_text as string,
          question_type: r.question_type as QuizQuestion["question_type"],
          options: r.options as string[] | null,
          correct_answer: r.correct_answer as string | string[],
          points: r.points as number,
          sort_order: r.sort_order as number,
          created_at: r.created_at as string,
        };
      });
    },
    enabled: !!quizId,
  });
};

export const useCreateQuizQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuizQuestionFormData & { quiz_id: string }) => {
      const { data, error } = await (
        supabase.from("quiz_questions") as unknown as {
          insert: (v: unknown) => {
            select: () => {
              single: () => Promise<{ data: unknown; error: unknown }>;
            };
          };
        }
      )
        .insert({
          quiz_id: input.quiz_id,
          question_text: input.question_text,
          question_type: input.question_type,
          options: input.options,
          correct_answer: input.correct_answer,
          points: input.points,
          sort_order: input.sort_order,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuizQuestion;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizQuestions.list({ quizId: variables.quiz_id }),
      });
    },
  });
};

export const useUpdateQuizQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      quiz_id: _quiz_id,
      ...input
    }: Partial<QuizQuestionFormData> & { id: string; quiz_id: string }) => {
      const updatePayload: Database["public"]["Tables"]["quiz_questions"]["Update"] =
        {};
      if (input.question_text !== undefined)
        updatePayload.question_text = input.question_text;
      if (input.question_type !== undefined)
        updatePayload.question_type = input.question_type;
      if (input.options !== undefined) updatePayload.options = input.options;
      if (input.correct_answer !== undefined)
        updatePayload.correct_answer = input.correct_answer;
      if (input.points !== undefined) updatePayload.points = input.points;
      if (input.sort_order !== undefined)
        updatePayload.sort_order = input.sort_order;

      const { data, error } = await supabase
        .from("quiz_questions")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizQuestions.list({ quizId: variables.quiz_id }),
      });
    },
  });
};

export const useDeleteQuizQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quiz_id }: { id: string; quiz_id: string }) => {
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { quiz_id };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizQuestions.list({ quizId: variables.quiz_id }),
      });
    },
  });
};

// ─── Quiz Attempts ──────────────────────────────────────────────────────────

export const useQuizAttempts = (
  quizId: string | undefined,
  studentId?: string
) => {
  return useQuery({
    queryKey: queryKeys.quizAttempts.list({ quizId, studentId }),
    queryFn: async (): Promise<QuizAttempt[]> => {
      let query = supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId!)
        .order("attempt_number", { ascending: true });

      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as Record<string, unknown>;
        return {
          id: r.id as string,
          quiz_id: r.quiz_id as string,
          student_id: r.student_id as string,
          answers: (r.answers ?? {}) as Record<string, string | string[]>,
          score: r.score as number | null,
          started_at: r.started_at as string,
          submitted_at: r.submitted_at as string | null,
          attempt_number: r.attempt_number as number,
          grading_status: (r.grading_status ??
            "auto_graded") as QuizAttempt["grading_status"],
          auto_score: r.auto_score as number | null,
          manual_score: r.manual_score as number | null,
        };
      });
    },
    enabled: !!quizId,
  });
};

export const useSubmitQuizAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      quiz_id: string;
      student_id: string;
      answers: Record<string, string | string[]>;
      started_at: string;
      attempt_number: number;
    }) => {
      const { data, error } = await (
        supabase.from("quiz_attempts") as unknown as {
          insert: (v: unknown) => {
            select: () => {
              single: () => Promise<{ data: unknown; error: unknown }>;
            };
          };
        }
      )
        .insert({
          quiz_id: input.quiz_id,
          student_id: input.student_id,
          answers: input.answers,
          started_at: input.started_at,
          submitted_at: new Date().toISOString(),
          attempt_number: input.attempt_number,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuizAttempt;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizAttempts.list({ quizId: variables.quiz_id }),
      });
    },
  });
};
