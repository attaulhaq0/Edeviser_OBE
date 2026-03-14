import { z } from 'zod';

// ── Response Schemas ────────────────────────────────────────────────

export const likertResponseSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.number().int().min(1).max(5),
});

export const varkResponseSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.number().int().min(0).max(3),
});

export const baselineResponseSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.number().int().min(0).max(3),
});

export const selfEfficacyResponseSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.number().int().min(1).max(5),
});

export const studyStrategyResponseSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.number().int().min(1).max(5),
});

// ── Edge Function Payload Schemas ───────────────────────────────────

export const saveResponsesSchema = z.object({
  student_id: z.string().uuid(),
  assessment_type: z.enum([
    'personality',
    'learning_style',
    'baseline',
    'self_efficacy',
    'study_strategy',
  ]),
  assessment_version: z.number().int().min(1),
  course_id: z.string().uuid().optional(),
  responses: z
    .array(
      z.union([likertResponseSchema, varkResponseSchema, baselineResponseSchema]),
    )
    .min(1),
});

export const processOnboardingSchema = z.object({
  student_id: z.string().uuid(),
  assessment_version: z.number().int().min(1),
  skipped_sections: z.array(
    z.enum([
      'personality',
      'learning_style',
      'baseline',
      'self_efficacy',
      'study_strategy',
    ]),
  ),
  baseline_course_ids: z.array(z.string().uuid()),
  is_day1: z.boolean().default(false),
});

// ── Baseline Configuration Schemas ──────────────────────────────────

export const baselineQuestionSchema = z.object({
  question_text: z.string().min(10).max(1000),
  options: z.array(z.string().min(1).max(500)).length(4),
  correct_option: z.number().int().min(0).max(3),
  clo_id: z.string().uuid(),
  difficulty_level: z.enum(['easy', 'medium', 'hard']),
});

export const baselineTestConfigSchema = z.object({
  course_id: z.string().uuid(),
  time_limit_minutes: z.number().int().min(5).max(60).default(15),
  is_active: z.boolean(),
});

// ── Starter Week & Goal Schemas ─────────────────────────────────────

export const starterWeekSessionSchema = z.object({
  course_id: z.string().uuid().nullable(),
  session_type: z.enum(['reading', 'practice', 'review', 'exploration']),
  suggested_date: z.string().date(),
  suggested_time_slot: z.enum(['morning', 'afternoon', 'evening']),
  duration_minutes: z.number().int().min(25).max(50),
  description: z.string().min(10).max(500),
});

export const goalSuggestionSchema = z.object({
  goal_text: z.string().min(10).max(500),
  smart_specific: z.string().optional(),
  smart_measurable: z.string().optional(),
  smart_achievable: z.string().optional(),
  smart_relevant: z.string().optional(),
  smart_timebound: z.string().date().optional(),
  difficulty: z.enum(['easy', 'moderate', 'ambitious']),
});

export const smartGoalTemplateSchema = z.object({
  specific: z.string().min(5).max(200),
  measurable: z.string().min(5).max(200),
  achievable: z.string().min(5).max(200),
  relevant: z.string().min(1).max(200),
  timebound: z.string().date(),
});

// ── Inferred Types ──────────────────────────────────────────────────

export type LikertResponse = z.infer<typeof likertResponseSchema>;
export type VARKResponse = z.infer<typeof varkResponseSchema>;
export type BaselineResponse = z.infer<typeof baselineResponseSchema>;
export type SelfEfficacyResponse = z.infer<typeof selfEfficacyResponseSchema>;
export type StudyStrategyResponse = z.infer<typeof studyStrategyResponseSchema>;
export type SaveResponsesInput = z.infer<typeof saveResponsesSchema>;
export type ProcessOnboardingInput = z.infer<typeof processOnboardingSchema>;
export type BaselineQuestion = z.infer<typeof baselineQuestionSchema>;
export type BaselineTestConfig = z.infer<typeof baselineTestConfigSchema>;
export type StarterWeekSession = z.infer<typeof starterWeekSessionSchema>;
export type GoalSuggestion = z.infer<typeof goalSuggestionSchema>;
export type SmartGoalTemplate = z.infer<typeof smartGoalTemplateSchema>;
