import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { streamChatMessage } from '@/lib/tutorApi';
import type {
  TutorMessage,
  SendMessageInput,
  RateMessageInput,
  SourceCitation,
  LearningPlanUpdate,
} from '@/lib/tutorSchemas';
import { useCallback, useRef, useState } from 'react';

// ─── useTutorMessages — message history for a conversation ──────────────────

export const useTutorMessages = (conversationId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.tutorMessages.detail(conversationId ?? ''),
    queryFn: async (): Promise<TutorMessage[]> => {
      if (!user || !conversationId) throw new Error('Not authenticated or missing conversation ID');

      const { data, error } = await supabase
        .from('tutor_messages')
        .select('id, conversation_id, role, content, source_citations, image_urls, document_url, token_count, satisfaction_rating, flagged_integrity, autonomy_level, nudge_type, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as TutorMessage[];
    },
    enabled: !!user && !!conversationId,
  });
};

// ─── Streaming State ────────────────────────────────────────────────────────

export interface StreamingState {
  isStreaming: boolean;
  streamedContent: string;
  citations: SourceCitation[];
  planUpdate: LearningPlanUpdate | null;
  independenceNudge: string | null;
  handoffSuggestion: { reason: string; message: string } | null;
  error: { code: string; message: string } | null;
}

// ─── useSendMessage — send message with SSE streaming ───────────────────────

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamedContent: '',
    citations: [],
    planUpdate: null,
    independenceNudge: null,
    handoffSuggestion: null,
    error: null,
  });

  const resetStreamingState = useCallback(() => {
    setStreamingState({
      isStreaming: false,
      streamedContent: '',
      citations: [],
      planUpdate: null,
      independenceNudge: null,
      handoffSuggestion: null,
      error: null,
    });
  }, []);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamingState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const sendMessage = useCallback(
    async (input: SendMessageInput): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      // Reset state for new message
      setStreamingState({
        isStreaming: true,
        streamedContent: '',
        citations: [],
        planUpdate: null,
        independenceNudge: null,
        handoffSuggestion: null,
        error: null,
      });

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await streamChatMessage(
          input,
          {
            onToken: (token) => {
              setStreamingState((prev) => ({
                ...prev,
                streamedContent: prev.streamedContent + token,
              }));
            },
            onCitations: (citations) => {
              setStreamingState((prev) => ({
                ...prev,
                citations: citations as SourceCitation[],
              }));
            },
            onDone: () => {
              setStreamingState((prev) => ({ ...prev, isStreaming: false }));

              // Invalidate messages and conversations to refresh data
              if (input.conversation_id) {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.tutorMessages.detail(input.conversation_id),
                });
              }
              queryClient.invalidateQueries({
                queryKey: queryKeys.tutorConversations.lists(),
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.tutorUsage.all,
              });
            },
            onError: (error) => {
              setStreamingState((prev) => ({
                ...prev,
                isStreaming: false,
                error,
              }));
            },
            onPlanUpdate: (planUpdate) => {
              setStreamingState((prev) => ({
                ...prev,
                planUpdate: planUpdate as LearningPlanUpdate,
              }));
            },
            onIndependenceNudge: (nudge) => {
              setStreamingState((prev) => ({
                ...prev,
                independenceNudge: nudge.message,
              }));
            },
            onHandoffSuggestion: (suggestion) => {
              setStreamingState((prev) => ({
                ...prev,
                handoffSuggestion: suggestion,
              }));
            },
          },
          abortController.signal,
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setStreamingState((prev) => ({
            ...prev,
            isStreaming: false,
            error: {
              code: 'STREAM_ERROR',
              message: (err as Error).message,
            },
          }));
        }
      }
    },
    [user, queryClient],
  );

  return {
    sendMessage,
    cancelStream,
    resetStreamingState,
    ...streamingState,
  };
};

// ─── useRateMessage — thumbs up/down on assistant messages ──────────────────

export const useRateMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: RateMessageInput): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tutor_messages')
        .update({ satisfaction_rating: input.rating })
        .eq('id', input.message_id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all message queries to refresh ratings
      queryClient.invalidateQueries({ queryKey: queryKeys.tutorMessages.lists() });
    },
  });
};
