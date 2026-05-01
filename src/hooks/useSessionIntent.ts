// =============================================================================
// useSessionIntent — Save session intent + fetch auto-suggested intents
// from low-attainment CLOs (<70%) and upcoming deadlines.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { SessionIntent, SuggestedIntent } from "@/types/planner";
import type { SessionIntentInput } from "@/lib/schemas/planner";

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

function mapIntent(row: Record<string, unknown>): SessionIntent {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    studentId: row.student_id as string,
    concept: row.concept as string,
    successCriterion: row.success_criterion as string,
    isAutoSuggested: Boolean(row.is_auto_suggested),
    createdAt: (row.created_at as string) ?? "",
  };
}

// ─── useSaveSessionIntent ───────────────────────────────────────────────────

export const useSaveSessionIntent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: SessionIntentInput & { isAutoSuggested?: boolean }
    ): Promise<SessionIntent> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("session_intents" as never)
        .insert({
          session_id: input.sessionId,
          student_id: user.id,
          concept: input.concept,
          success_criterion: input.successCriterion,
          is_auto_suggested: input.isAutoSuggested ?? false,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return mapIntent(data as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessionIntents.detail(data.sessionId),
      });
    },
    onError: (error: Error) => {
      toast.error(`Couldn't save intent: ${error.message}`);
    },
  });
};

// ─── useSessionIntent — fetch single intent for a session ───────────────────

export const useSessionIntent = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.sessionIntents.detail(sessionId ?? ""),
    enabled: !!sessionId,
    queryFn: async (): Promise<SessionIntent | null> => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from("session_intents" as never)
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (error) throw error;
      return data ? mapIntent(data as Record<string, unknown>) : null;
    },
  });
};

// ─── useSuggestedIntents — fetch candidate concepts for a session ───────────
// Pulls from:
//   1. CLOs from the student's enrolled courses with attainment < 70%
//   2. Upcoming assignment deadlines in the next 7 days
// Returns up to 3 suggestions, prioritising the session's own course.

export const useSuggestedIntents = (sessionId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.suggestedIntents.detail(sessionId ?? ""),
    enabled: !!sessionId && !!user,
    queryFn: async (): Promise<SuggestedIntent[]> => {
      if (!sessionId || !user) return [];

      const suggestions: SuggestedIntent[] = [];

      // 0. Get the session's course_id so we can prioritise its CLOs
      const { data: sessionRow } = await supabase
        .from("study_sessions")
        .select("course_id, clo_ids")
        .eq("id", sessionId)
        .maybeSingle();

      const sessionCourseId =
        (sessionRow as { course_id?: string } | null)?.course_id ?? null;

      // 1. Get enrolled course IDs for the student
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", user.id);

      if (enrollError) throw enrollError;

      const courseIds = (enrollments ?? []).map((e) => e.course_id as string);

      if (courseIds.length === 0) return [];

      // 2. Get all CLOs for enrolled courses
      const { data: cloRows, error: cloError } = await supabase
        .from("learning_outcomes")
        .select("id, title, course_id")
        .eq("type", "CLO")
        .in("course_id", courseIds);

      if (cloError) throw cloError;

      const cloIds = (cloRows ?? []).map(
        (c: Record<string, unknown>) => c.id as string
      );

      // 3. Fetch attainment for those CLOs and filter < 70%
      if (cloIds.length > 0) {
        const { data: attainmentRows } = await supabase
          .from("outcome_attainment")
          .select("outcome_id, attainment_percent")
          .eq("student_id", user.id)
          .eq("scope", "student_course")
          .in("outcome_id", cloIds);

        const lowAttainmentIds = new Set(
          (attainmentRows ?? [])
            .filter(
              (r: Record<string, unknown>) =>
                (r.attainment_percent as number) < 70
            )
            .map((r: Record<string, unknown>) => r.outcome_id as string)
        );

        if (lowAttainmentIds.size > 0) {
          // Build a lookup from CLO id → title + courseId
          const cloMap = new Map<string, { title: string; courseId: string }>();
          for (const clo of cloRows ?? []) {
            const c = clo as Record<string, unknown>;
            cloMap.set(c.id as string, {
              title: c.title as string,
              courseId: c.course_id as string,
            });
          }

          // Sort: session's own course CLOs first, then others
          const lowCLOs = [...lowAttainmentIds]
            .map((id) => ({ id, ...cloMap.get(id)! }))
            .filter((c) => c.title) // guard against missing lookup
            .sort((a, b) => {
              const aOwn = a.courseId === sessionCourseId ? 0 : 1;
              const bOwn = b.courseId === sessionCourseId ? 0 : 1;
              return aOwn - bOwn;
            });

          for (const clo of lowCLOs.slice(0, 2)) {
            suggestions.push({
              concept: clo.title,
              successCriterion: `Solve 3 practice problems on ${clo.title} correctly`,
            });
          }
        }
      }

      // 4. Upcoming assignment deadlines in next 7 days (scoped to enrolled courses)
      const today = new Date().toISOString().split("T")[0] as string;
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysStr = sevenDaysFromNow
        .toISOString()
        .split("T")[0] as string;

      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, title, due_date")
        .in("course_id", courseIds)
        .gte("due_date", today)
        .lte("due_date", sevenDaysStr)
        .order("due_date", { ascending: true })
        .limit(2);

      for (const a of assignments ?? []) {
        const row = a as Record<string, unknown>;
        suggestions.push({
          concept: row.title as string,
          successCriterion: `Complete an outline / first draft for ${
            row.title as string
          }`,
        });
      }

      // Return at most 3 suggestions
      return suggestions.slice(0, 3);
    },
  });
};
