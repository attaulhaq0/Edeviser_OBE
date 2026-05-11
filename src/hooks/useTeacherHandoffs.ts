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
      // Table not in database.ts yet. Using type assertion until `scripts/regen-types.ps1` is run.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
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
      return data as TeacherHandoffRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
};

// ─── useCreateHandoff — Student creates a handoff request (with consent) ─────

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
      trigger_reason:
        | "low_rag_confidence"
        | "repeated_question"
        | "low_satisfaction";
      student_consent: boolean;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
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
      return data as TeacherHandoffRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
};
