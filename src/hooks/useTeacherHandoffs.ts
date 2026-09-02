// =============================================================================
// useTeacherHandoffs — CRUD hooks for teacher handoff requests
// Task 18.4
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TeacherHandoffRequest } from "@/lib/tutorSchemas";

// ─── Query Keys ──────────────────────────────────────────────────────────────

const handoffKeys = {
  all: ["teacherHandoffs"] as const,
  list: (courseId: string) => ["teacherHandoffs", "list", courseId] as const,
  detail: (id: string) => ["teacherHandoffs", "detail", id] as const,
};

// ─── useTeacherHandoffs — Teacher reads pending handoff requests ─────────────

export const useTeacherHandoffs = (courseId: string) => {
  return useQuery({
    queryKey: handoffKeys.list(courseId),
    queryFn: async () => {
      // E1.10: `teacher_handoff_requests` is now generated in
      // src/types/database.ts — the typed client replaces the former
      // `as any` escape hatch.
      const { data, error } = await supabase
        .from("teacher_handoff_requests")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as TeacherHandoffRequest[];
    },
    enabled: !!courseId,
  });
};

// ─── useRespondToHandoff — Teacher responds to a handoff request ─────────────

export const useRespondToHandoff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      handoff_id,
      response_message,
      status = "resolved",
    }: {
      handoff_id: string;
      response_message: string;
      status?: "resolved" | "dismissed";
    }) => {
      const { data, error } = await supabase
        .from("teacher_handoff_requests")
        .update({
          teacher_response: response_message,
          status,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", handoff_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Handoff request not found after update");
      return data as TeacherHandoffRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
};

// ─── useCreateHandoff — Student creates a handoff request (with consent) ─────

export type HandoffTriggerReason =
  | "low_rag_confidence"
  | "repeated_question"
  | "low_satisfaction";

export const useCreateHandoff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      conversation_id: string;
      student_id: string;
      teacher_id: string;
      institution_id: string;
      course_id: string;
      clo_id?: string;
      conversation_summary: string;
      suggested_intervention: string;
      trigger_reason: HandoffTriggerReason;
      student_consent: boolean;
    }) => {
      const { data, error } = await supabase
        .from("teacher_handoff_requests")
        .insert({
          conversation_id: payload.conversation_id,
          student_id: payload.student_id,
          teacher_id: payload.teacher_id,
          institution_id: payload.institution_id,
          course_id: payload.course_id,
          clo_id: payload.clo_id ?? null,
          conversation_summary: payload.conversation_summary,
          suggested_intervention: payload.suggested_intervention,
          trigger_reason: payload.trigger_reason,
          student_consent: payload.student_consent,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Handoff request was not created");
      const handoff = data as TeacherHandoffRequest;

      // Notify the teacher (fire-and-forget — a notification failure must
      // never block the handoff request itself). Mirrors the pattern in
      // useDeadlineExtensions.
      try {
        await supabase.from("notifications").insert({
          user_id: handoff.teacher_id,
          type: "tutor_handoff",
          title: "New Tutor Handoff Request",
          body: `A student requested teacher help with their AI tutor conversation (reason: ${handoff.trigger_reason}). Open the handoff queue to respond.`,
          metadata: {
            handoff_id: handoff.id,
            conversation_id: handoff.conversation_id,
            student_id: handoff.student_id,
          },
        });
      } catch {
        // Non-blocking by design.
      }

      return handoff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
};

// ─── useHandoffContext — resolve course teacher + institution for a handoff ──

export interface HandoffResolutionContext {
  course_id: string;
  teacher_id: string;
  institution_id: string;
}

/**
 * Resolves the teacher and institution a handoff request must target for the
 * given course. Returns `null` when the course (or its owning program) has no
 * complete handoff routing — the UI then keeps the consent action disabled.
 */
export const useHandoffContext = (courseId: string | undefined) => {
  return useQuery({
    queryKey: ["teacher_handoff_requests", "context", courseId ?? ""],
    enabled: !!courseId,
    queryFn: async (): Promise<HandoffResolutionContext | null> => {
      if (!courseId) return null;
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, teacher_id, programs(institution_id)")
        .eq("id", courseId)
        .maybeSingle();
      if (courseError) throw courseError;
      if (!course) return null;

      const program = Array.isArray(course.programs)
        ? course.programs[0]
        : course.programs;
      if (!course.teacher_id || !program?.institution_id) return null;

      return {
        course_id: course.id,
        teacher_id: course.teacher_id,
        institution_id: program.institution_id,
      };
    },
  });
};
