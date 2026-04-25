// =============================================================================
// Weekly Planner & Today View — Zod Validation Schemas
// =============================================================================

import { z } from "zod";

/** Schema for creating a new study session. */
export const createStudySessionSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  plannedStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  plannedDurationMinutes: z
    .number()
    .int()
    .min(15, "Minimum duration is 15 minutes")
    .max(240, "Maximum duration is 240 minutes")
    .refine((v) => v % 15 === 0, "Duration must be in 15-minute increments"),
  courseId: z.string().uuid("Invalid course"),
  timerMode: z.enum(["pomodoro", "custom"]),
  description: z.string().max(2000).nullable().optional(),
  cloIds: z.array(z.string().uuid()).nullable().optional(),
});

export type CreateStudySessionInput = z.infer<typeof createStudySessionSchema>;

/** Schema for creating a new planner task. */
export const createPlannerTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  courseId: z.string().uuid().nullable().optional(),
});

export type CreatePlannerTaskInput = z.infer<typeof createPlannerTaskSchema>;

/** Schema for creating/updating weekly goals. */
export const createWeeklyGoalSchema = z.object({
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  goalType: z.enum(["study_hours", "sessions_completed", "tasks_completed"]),
  targetValue: z.number().positive("Target must be greater than 0"),
});

export type CreateWeeklyGoalInput = z.infer<typeof createWeeklyGoalSchema>;

/** Schema for session completion data. */
export const sessionCompletionSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().max(5000).nullable().optional(),
  satisfactionRating: z.number().int().min(1).max(5).nullable().optional(),
});

export type SessionCompletionInput = z.infer<typeof sessionCompletionSchema>;

/** Helper: word count validation. */
const wordCountMin = (min: number) =>
  z.string().refine(
    (text) =>
      text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length >= min,
    { message: `Reflection must be at least ${min} words` }
  );

/** Schema for session reflection (minimum 30 words). */
export const sessionReflectionSchema = z.object({
  sessionId: z.string().uuid(),
  content: wordCountMin(30),
});

export type SessionReflectionInput = z.infer<typeof sessionReflectionSchema>;

/** Schema for weekly reflection (minimum 50 words). */
export const weeklyReflectionSchema = z.object({
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  content: wordCountMin(50),
});

export type WeeklyReflectionInput = z.infer<typeof weeklyReflectionSchema>;

// -----------------------------------------------------------------------------
// Flow Check-In Schema
// -----------------------------------------------------------------------------

/** Schema for flow check-in responses during Pomodoro breaks. */
export const flowCheckInSchema = z.object({
  sessionId: z.string().uuid(),
  intervalNumber: z.number().int().min(1),
  response: z.enum(["in_the_zone", "stuck", "too_easy"]),
});

export type FlowCheckInInput = z.infer<typeof flowCheckInSchema>;

// -----------------------------------------------------------------------------
// Session Intent Schema
// -----------------------------------------------------------------------------

/** Schema for session intent (concept + success criterion). */
export const sessionIntentSchema = z.object({
  sessionId: z.string().uuid(),
  concept: z.string().min(5).max(200),
  successCriterion: z.string().min(5).max(200),
});

export type SessionIntentInput = z.infer<typeof sessionIntentSchema>;

// -----------------------------------------------------------------------------
// Quick Thought Schema
// -----------------------------------------------------------------------------

/** Schema for quick thought capture (1-280 chars). */
export const quickThoughtSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().min(1).max(280),
});

export type QuickThoughtInput = z.infer<typeof quickThoughtSchema>;
