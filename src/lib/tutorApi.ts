import { supabase } from "@/lib/supabase";
import type {
  SendMessageInput,
  RateMessageInput,
  TutorAnalyticsRequest,
  TutorAnalyticsResponse,
  SSEEvent,
  SourceCitation,
  LearningPlanUpdate,
} from "@/lib/tutorSchemas";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SSECallbacks {
  onToken: (token: string) => void;
  onCitations: (citations: SourceCitation[]) => void;
  onDone: (data: { message_id: string; tokens_used: number }) => void;
  onError: (error: { code: string; message: string }) => void;
  onPlanUpdate?: (data: LearningPlanUpdate) => void;
  onIndependenceNudge?: (data: { message: string }) => void;
  onHandoffSuggestion?: (data: { reason: string; message: string }) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getEdgeFunctionUrl = (functionName: string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is not set");
  }
  return `${supabaseUrl}/functions/v1/${functionName}`;
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
};

// ─── SSE Stream Parser ──────────────────────────────────────────────────────

export const parseSSELine = (line: string): SSEEvent | null => {
  if (!line.startsWith("data: ")) return null;
  const jsonStr = line.slice(6).trim();
  if (!jsonStr || jsonStr === "[DONE]") return null;

  try {
    const parsed: SSEEvent = JSON.parse(jsonStr);
    return parsed;
  } catch {
    return null;
  }
};

// ─── Send Message (SSE Streaming) ────────────────────────────────────────────

export const sendTutorMessage = async (
  input: SendMessageInput,
  callbacks: SSECallbacks,
  signal?: AbortSignal
): Promise<void> => {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl("chat-with-tutor");

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      code: "unknown",
      message: "An unexpected error occurred",
    }));
    callbacks.onError({
      code: errorBody.code ?? String(response.status),
      message: errorBody.message ?? response.statusText,
    });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError({
      code: "no_stream",
      message: "Response body is not readable",
    });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const event = parseSSELine(trimmed);
        if (!event) continue;

        switch (event.type) {
          case "token":
            callbacks.onToken(event.data);
            break;
          case "citations":
            callbacks.onCitations(event.data);
            break;
          case "done":
            callbacks.onDone(event.data);
            break;
          case "error":
            callbacks.onError(event.data);
            break;
          case "plan_update":
            callbacks.onPlanUpdate?.(event.data);
            break;
          case "independence_nudge":
            callbacks.onIndependenceNudge?.(event.data);
            break;
          case "handoff_suggestion":
            callbacks.onHandoffSuggestion?.(event.data);
            break;
        }
      }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
      const event = parseSSELine(buffer.trim());
      if (event) {
        switch (event.type) {
          case "token":
            callbacks.onToken(event.data);
            break;
          case "citations":
            callbacks.onCitations(event.data);
            break;
          case "done":
            callbacks.onDone(event.data);
            break;
          case "error":
            callbacks.onError(event.data);
            break;
          case "plan_update":
            callbacks.onPlanUpdate?.(event.data);
            break;
          case "independence_nudge":
            callbacks.onIndependenceNudge?.(event.data);
            break;
          case "handoff_suggestion":
            callbacks.onHandoffSuggestion?.(event.data);
            break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};

// ─── Rate Message ────────────────────────────────────────────────────────────

export const rateTutorMessage = async (
  input: RateMessageInput
): Promise<void> => {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl("chat-with-tutor");

  const response = await fetch(`${url}/rate`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: "Failed to rate message",
    }));
    throw new Error(errorBody.message ?? "Failed to rate message");
  }
};

// ─── Fetch Tutor Analytics ───────────────────────────────────────────────────

export const fetchTutorAnalytics = async (
  input: TutorAnalyticsRequest
): Promise<TutorAnalyticsResponse> => {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl("tutor-analytics");

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: "Failed to fetch analytics",
    }));
    throw new Error(errorBody.message ?? "Failed to fetch analytics");
  }

  return response.json() as Promise<TutorAnalyticsResponse>;
};

// ─── Retry Helper ────────────────────────────────────────────────────────────

export const calculateBackoffDelay = (attempt: number): number => {
  // Attempt 1 → 1000ms, Attempt 2 → 2000ms, Attempt 3 → 4000ms
  return 1000 * Math.pow(2, attempt - 1);
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt <= maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};
