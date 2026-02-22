import { z } from "zod";

export const quizQuestionSchema = z.object({
  question_text: z.string().min(1, "Question text is required"),
  question_type: z.enum(["mcq_single", "mcq_multi", "true_false", "short_answer", "fill_blank"]),
  options: z.array(z.string()).nullable(),
  correct_answer: z.union([z.string(), z.array(z.string())]),
  points: z.number().min(0),
  sort_order: z.number().int().min(0),
});

export const createQuizSchema = z.object({
  course_id: z.uuid(),
  title: z.string().min(1, "Quiz title is required").max(255),
  description: z.string().optional(),
  clo_ids: z.array(z.uuid()).min(1, "At least 1 CLO required"),
  time_limit_minutes: z.number().int().min(1).nullable(),
  max_attempts: z.number().int().min(1).default(1),
  is_published: z.boolean().default(false),
  due_date: z.iso.datetime(),
  questions: z.array(quizQuestionSchema).min(1, "At least 1 question required"),
});

export const quizAttemptSchema = z.object({
  quiz_id: z.uuid(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

export type QuizQuestionFormData = z.infer<typeof quizQuestionSchema>;
export type CreateQuizFormData = z.infer<typeof createQuizSchema>;
export type QuizAttemptFormData = z.infer<typeof quizAttemptSchema>;
