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
import type { Database } from "@/types/database";

type TutorMessageRow = Database["public"]["Tables"]["tutor_messages"]["Row"];

// ─── Citation narrowing ──────────────────────────────────────────────────────

/**
 * Type guard validating that an unknown value matches the `SourceCitation`
 * shape. The DB stores citations as `Json`, so each element is validated before
 * it is surfaced to the UI — no unsafe cast is used.
 */
const isSourceCitation = (value: unknown): value is SourceCitation => {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.chunk_id === "string" &&
    typeof c.chunk_text === "string" &&
    typeof c.source_filename === "string" &&
    typeof c.material_type === "string" &&
    typeof c.similarity_score === "number"
  );
};

/** Narrows a `Json | null` citations column into a `SourceCitation[]`. */
const parseSourceCitations = (value: unknown): SourceCitation[] =>
  Array.isArray(value) ? value.filter(isSourceCitation) : [];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendMessageOptions {
  input: SendMessageInput;
  onToken?: (token: string) => void;
  onCitations?: (citations: SourceCitation[]) => void;
  onDone?: (data: { message_id: string; tokens_used: number }) => void;
  onPlanUpdate?: (data: LearningPlanUpdate) => void;
  /**
   * Surfaces the raw backend failure signal (HTTP status / SSE error code /
   * network-error flag) so the caller can map it to a `TutorUiState` via
   * `mapTutorError`. Called in addition to the default error toast.
   */
  onErrorSignal?: (signal: {
    code: string;
    message: string;
    httpStatus?: number;
    networkError?: boolean;
  }) => void;
  signal?: AbortSignal;
}

// ─── Row mapper ──────────────────────────────────────────────────────────────

/**
 * Narrows a loosely-typed `tutor_messages` row (string columns + `Json`
 * citations) into the strict `TutorMessage` domain type. The DB stores `role`,
 * `satisfaction_rating`, `autonomy_level`, and `nudge_type` as plain strings;
 * this mapper restores the discriminated-union shape the UI relies on.
 */
const mapTutorMessageRow = (row: TutorMessageRow): TutorMessage => ({
  id: row.id,
  conversation_id: row.conversation_id,
  role: row.role === "user" ? "user" : "assistant",
  content: row.content,
  source_citations: parseSourceCitations(row.source_citations),
  image_urls: row.image_urls ?? [],
  document_url: row.document_url,
  token_count: row.token_count,
  satisfaction_rating: row.satisfaction_rating as SatisfactionRating | null,
  flagged_integrity: row.flagged_integrity,
  autonomy_level:
    row.autonomy_level === "L1" ||
    row.autonomy_level === "L2" ||
    row.autonomy_level === "L3"
      ? row.autonomy_level
      : null,
  nudge_type: row.nudge_type === "independence" ? "independence" : null,
  created_at: row.created_at,
});

// ─── useTutorMessages — fetch message history for a conversation ─────────────

export const useTutorMessages = (conversationId: string) => {
  return useQuery({
    queryKey: queryKeys.tutorMessages.byConversation(conversationId),
    queryFn: async (): Promise<TutorMessage[]> => {
      const { data, error } = await supabase
        .from("tutor_messages")
        .select(
          "id, conversation_id, role, content, source_citations, image_urls, document_url, token_count, satisfaction_rating, flagged_integrity, autonomy_level, nudge_type, created_at"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapTutorMessageRow);
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
      const {
        input,
        onToken,
        onCitations,
        onDone,
        onPlanUpdate,
        onErrorSignal,
        signal,
      } = options;

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
          // Surface the raw signal so the page can render a distinct state.
          onErrorSignal?.({
            code: error.code,
            message: error.message,
            httpStatus: error.httpStatus,
            networkError: error.networkError,
          });
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
