import { z } from 'zod';

// ─── Core Quiz Generation Schemas ────────────────────────────────────────────

export const generateQuestionsSchema = z.object({
  course_id: z.string().uuid(),
  clo_ids: z.array(z.string().uuid()).min(1).max(5),
  bloom_levels: z.array(z.number().int().min(1).max(6)).min(1),
  question_count: z.number().int().min(1).max(50),
  question_types: z.array(z.enum(['mcq', 'true_false', 'short_answer', 'fill_in_blank'])).min(1),
});

export const questionBankEntrySchema = z.object({
  course_id: z.string().uuid(),
  clo_id: z.string().uuid(),
  bloom_level: z.number().int().min(1).max(6),
  question_type: z.enum(['mcq', 'true_false', 'short_answer', 'fill_in_blank']),
  question_text: z.string().min(1).max(5000),
  options: z.array(z.object({
    key: z.string(),
    text: z.string().min(1),
    is_correct: z.boolean(),
  })).nullable(),
  correct_answer: z.object({
    value: z.union([z.string(), z.array(z.string())]),
    explanation: z.string(),
  }),
  explanation: z.string().optional(),
  difficulty_rating: z.number().min(1.0).max(5.0),
  labels: z.array(z.string()).optional(),
});

export const adaptiveQuizConfigSchema = z.object({
  is_adaptive: z.boolean(),
  initial_difficulty: z.number().min(1.0).max(5.0).optional(),
  difficulty_step_up: z.number().default(0.3),
  difficulty_step_down: z.number().default(0.5),
  difficulty_range: z.number().default(0.5),
});


// ─── Gap Analysis Additions ──────────────────────────────────────────────────

export const recoverySessionSchema = z.object({
  student_id: z.string().uuid(),
  clo_id: z.string().uuid(),
  course_id: z.string().uuid(),
  status: z.enum(['active', 'completed', 'expired']),
  ai_tutor_completed: z.boolean(),
  practice_completed: z.boolean(),
  peer_suggestion_shown: z.boolean(),
});

export const verifiedExplanationSchema = z.object({
  question_id: z.string().uuid(),
  explanation_text: z.string().min(1).max(5000),
  source: z.enum(['teacher_approved', 'teacher_edited']),
  verified_by: z.string().uuid(),
});

export const practiceModeConfigSchema = z.object({
  practice_mode_enabled: z.boolean(),
});

export const bloomsClimbStateSchema = z.object({
  current_bloom_level: z.number().int().min(1).max(6),
  consecutive_correct_at_level: z.number().int().min(0).max(3),
  bloom_transitions: z.array(z.object({
    from_level: z.number().int().min(1).max(6),
    to_level: z.number().int().min(1).max(6),
    question_number: z.number().int().min(1),
  })),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type GenerateQuestionsInput = z.infer<typeof generateQuestionsSchema>;
export type QuestionBankEntry = z.infer<typeof questionBankEntrySchema>;
export type AdaptiveQuizConfig = z.infer<typeof adaptiveQuizConfigSchema>;
export type RecoverySession = z.infer<typeof recoverySessionSchema>;
export type VerifiedExplanation = z.infer<typeof verifiedExplanationSchema>;
export type PracticeModeConfig = z.infer<typeof practiceModeConfigSchema>;
export type BloomsClimbState = z.infer<typeof bloomsClimbStateSchema>;
