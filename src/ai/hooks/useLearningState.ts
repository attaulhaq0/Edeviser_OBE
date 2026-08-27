// Feature: Digital Twin — Student Learning State (frontend-plan.md useLearningState).
// Hook: reads the authenticated student's own digital-twin row from
// student_learning_states.
//
// RLS (live-verified via MCP pg_policies 2026-08-27): a student can read ONLY
// their own row (student_learning_states_student_read → student_id = auth.uid()
// AND institution match). A direct .select is therefore authorized and returns
// exactly this student's twin data.
//
// DISPLAY/HINT ONLY — this is a read of the digital-twin summary used to render
// the LearningStateSummary surface. It is never an authorization boundary; the
// backend remains authoritative. JSONB payloads are validated defensively and
// FAIL CLOSED (null) when they do not match the documented contract so a
// malformed snapshot can never render garbage.

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";

// ─── Defensive JSONB schemas (per backend contract) ─────────────────────────

const masterySchema = z
  .object({
    percent: z.number(),
    previousPercent: z.number().nullable().optional(),
    trend: z.enum(["improving", "declining", "stagnant"]).optional(),
  })
  .passthrough();

const habitsSchema = z
  .object({
    streak: z.number().optional(),
    consistency: z.number().optional(),
    sessionsCompleted: z.number().optional(),
  })
  .passthrough();

const riskSignalsSchema = z
  .object({
    severity: z.enum(["none", "attention", "urgent"]).optional(),
    notice: z.string().optional(),
  })
  .passthrough();

export const learningStateRowSchema = z.object({
  student_id: z.string(),
  calculated_at: z.string().optional(),
  fresh_until: z.string().optional(),
  mastery: masterySchema.optional(),
  habits: habitsSchema.optional(),
  risk_signals: riskSignalsSchema.optional(),
});

export type LearningStateRow = z.infer<typeof learningStateRowSchema>;

/**
 * Reads the current student's digital-twin row, or null when none has been
 * calculated yet. Fails closed on malformed JSONB (returns null, not garbage).
 */
export const useLearningState = (studentId?: string) =>
  useQuery({
    queryKey: queryKeys.studentLearningState.detail(studentId ?? ""),
    queryFn: async (): Promise<LearningStateRow | null> => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from("student_learning_states")
        .select(
          "student_id, calculated_at, fresh_until, mastery, habits, risk_signals"
        )
        .eq("student_id", studentId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const parsed = learningStateRowSchema.safeParse(data);
      return parsed.success ? parsed.data : null;
    },
    enabled: Boolean(studentId),
    staleTime: 60_000,
  });
