// =============================================================================
// useTutorMessages — TanStack Query hooks for tutor message history & streaming
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { sendTutorMessage, rateTutorMessage } from "@/lib/tutorApi";
import { toast } from "sonner";
import type {
  TutorMessage,
  SendMessageInput,
  SatisfactionRating,
  SourceCitation,
  LearningPlanUpdate,
} from "@/lib/tutorSchemas";
import type { SSECallbacks } from "@/lib/tutorApi";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendMessageOptions {
  input: SendMessageInput;
  onToken?: (token: string) => void;
  onCitations?: (citations: SourceCitation[]) => void;
  onDone?: (data: { message_id: string; tokens_used: number }) => void;
  onPlanUpdate?: (data: LearningPlanUpdate) => void;
  signal?: AbortSignal;
}

// ─── useTutorMessages — fetch message history for a conversation ─────────────

export const useTutorMessages = (conversationId: string) => {
  return useQuery({
    queryKey: queryKeys.tutorMessages.byConversation(conversationId),
    queryFn: async (): Promise<TutorMessage[]> => {
      // NOTE: tutor_messages table exists in DB but database.ts types have not been
      // regenerated yet. Using type assertion until `scripts/regen-types.ps1` is run.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("tutor_messages")
        .select(
          "id, conversation_id, role, content, source_citations, image_urls, document_url, token_count, satisfaction_rating, flagged_integrity, autonomy_level, nudge_type, created_at"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as TutorMessage[];
    },
    enabled: !!conversationId,
    staleTime: 30_000,
  });
};

// ─── useSendMessage — send message via SSE streaming Edge Function ───────────

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: SendMessageOptions): Promise<void> => {
      const { input, onToken, onCitations, onDone, onPlanUpdate, signal } =
        options;

      // Optimistically append user message to cache
      if (input.conversation_id) {
        const conversationId = input.conversation_id;
        const optimisticUserMessage: TutorMessage = {
          id: `temp-${Date.now()}`,
          conversation_id: conversationId,
          role: "user",
          content: input.message,
          source_citations: [],
          image_urls: input.image_urls ?? [],
          document_url: input.document_url ?? null,
          token_count: 0,
          satisfaction_rating: null,
          flagged_integrity: false,
          autonomy_level: null,
          nudge_type: null,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<TutorMessage[]>(
          queryKeys.tutorMessages.byConversation(conversationId),
          (old) => [...(old ?? []), optimisticUserMessage]
        );
      }

      const callbacks: SSECallbacks = {
        onToken: onToken ?? (() => {}),
        onCitations: onCitations ?? (() => {}),
        onDone: (data) => {
          // Invalidate messages to get the persisted version from DB
          if (input.conversation_id) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.tutorMessages.byConversation(
                input.conversation_id
              ),
            });
          }
          // Invalidate conversations list to update message_count and updated_at
          queryClient.invalidateQueries({
            queryKey: queryKeys.tutorConversations.lists(),
          });
          // Invalidate usage to reflect updated counts
          queryClient.invalidateQueries({
            queryKey: queryKeys.tutorUsage.all,
          });
          onDone?.(data);
        },
        onError: (error) => {
          // Revert optimistic update on error
          if (input.conversation_id) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.tutorMessages.byConversation(
                input.conversation_id
              ),
            });
          }
          toast.error(error.message || "Failed to send message");
        },
        onPlanUpdate: onPlanUpdate,
      };

      await sendTutorMessage(input, callbacks, signal);
    },
  });
};

// ─── useRateMessage — thumbs up/down on an assistant message ─────────────────

export const useRateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      messageId: string;
      conversationId: string;
      rating: SatisfactionRating;
    }): Promise<void> => {
      await rateTutorMessage({
        message_id: variables.messageId,
        rating: variables.rating,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tutorMessages.byConversation(
          variables.conversationId
        ),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to rate message");
    },
  });
};
