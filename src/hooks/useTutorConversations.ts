// =============================================================================
// useTutorConversations — TanStack Query hooks for tutor conversation CRUD
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { TutorConversation, TutorPersona } from "@/lib/tutorSchemas";
import { planUpdateResponseSchema } from "@/lib/tutorSchemas";
import { autoSelectPersona } from "@/lib/tutorPersonaAutoSelect";
import type { Database } from "@/types/database";

type TutorConversationRow =
  Database["public"]["Tables"]["tutor_conversations"]["Row"];

// ─── Row mapper ──────────────────────────────────────────────────────────────

const isTutorPersona = (value: string): value is TutorPersona =>
  value === "socratic_guide" ||
  value === "step_by_step_coach" ||
  value === "quick_explainer";

/**
 * Narrows a loosely-typed `tutor_conversations` row (string `persona`,
 * string `autonomy_override`) into the strict `TutorConversation` domain type.
 */
const mapTutorConversationRow = (
  row: Pick<
    TutorConversationRow,
    | "id"
    | "student_id"
    | "institution_id"
    | "course_id"
    | "persona"
    | "title"
    | "clo_scope"
    | "message_count"
    | "xp_awarded"
    | "is_active"
    | "autonomy_override"
    | "created_at"
    | "updated_at"
  >
): TutorConversation => ({
  id: row.id,
  student_id: row.student_id,
  institution_id: row.institution_id,
  course_id: row.course_id,
  persona: isTutorPersona(row.persona) ? row.persona : "socratic_guide",
  title: row.title,
  clo_scope: row.clo_scope ?? [],
  message_count: row.message_count,
  xp_awarded: row.xp_awarded,
  is_active: row.is_active,
  autonomy_override:
    row.autonomy_override === "L1" || row.autonomy_override === "L3"
      ? row.autonomy_override
      : null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateConversationInput {
  course_id?: string;
  persona?: TutorPersona;
  clo_scope?: string[];
  /** Big Five profile for persona auto-recommendation */
  big_five_profile?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  } | null;
}

interface CreateConversationResult extends TutorConversation {
  /** Persona recommended by Big Five auto-selection (null if no profile) */
  recommendedPersona: TutorPersona | null;
}

// ─── useTutorConversations — list student's conversations ────────────────────

export const useTutorConversations = (courseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseId
      ? queryKeys.tutorConversations.byCourse(courseId)
      : queryKeys.tutorConversations.lists(),
    queryFn: async (): Promise<TutorConversation[]> => {
      if (!user) return [];

      let query = supabase
        .from("tutor_conversations")
        .select(
          "id, student_id, institution_id, course_id, persona, title, clo_scope, message_count, xp_awarded, is_active, autonomy_override, created_at, updated_at"
        )
        .eq("student_id", user.id);

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query.order("updated_at", {
        ascending: false,
      });
      if (error) throw error;
      return (data ?? []).map(mapTutorConversationRow);
    },
    enabled: !!user,
    staleTime: 30_000,
  });
};

// ─── useCreateConversation — create a new conversation ───────────────────────

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { user, institutionId } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CreateConversationInput
    ): Promise<CreateConversationResult> => {
      if (!user) throw new Error("Not authenticated");
      if (!institutionId) throw new Error("No institution context");

      // Auto-select persona from Big Five profile if no persona specified
      let resolvedPersona = input.persona ?? "socratic_guide";
      let recommendedPersona: TutorPersona | null = null;

      if (!input.persona && input.big_five_profile) {
        const autoResult = autoSelectPersona(input.big_five_profile);
        if (autoResult) {
          resolvedPersona = autoResult.persona;
          recommendedPersona = autoResult.persona;
        }
      }

      const { data, error } = await supabase
        .from("tutor_conversations")
        .insert({
          student_id: user.id,
          institution_id: institutionId,
          course_id: input.course_id ?? null,
          persona: resolvedPersona,
          clo_scope: input.clo_scope ?? [],
          recommended_persona: recommendedPersona,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...mapTutorConversationRow(data),
        recommendedPersona,
      };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tutorConversations.lists(),
      });
      if (variables.course_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tutorConversations.byCourse(variables.course_id),
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create conversation");
    },
  });
};

// ─── useDeleteConversation — delete a conversation by id ─────────────────────

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      const { error } = await supabase
        .from("tutor_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tutorConversations.lists(),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete conversation");
    },
  });
};

// ─── useRespondToPlanUpdate — accept/modify/dismiss a learning plan update ──

interface RespondToPlanUpdateInput {
  plan_update_id: string;
  response: "accepted" | "modified" | "dismissed";
  modifications?: string;
}

export const useRespondToPlanUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RespondToPlanUpdateInput): Promise<void> => {
      // Validate input with Zod schema
      const parsed = planUpdateResponseSchema.parse(input);

      const { error } = await supabase
        .from("tutor_plan_updates")
        .update({
          response: parsed.response,
          modifications: parsed.modifications ?? null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", parsed.plan_update_id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate conversations and messages to reflect updated state
      queryClient.invalidateQueries({
        queryKey: queryKeys.tutorConversations.lists(),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to respond to plan update");
    },
  });
};
