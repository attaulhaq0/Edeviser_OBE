import { supabase } from '@/lib/supabase';
import type { SendMessageInput, SSEEvent } from '@/lib/tutorSchemas';

// ─── SSE Stream Parser ──────────────────────────────────────────────────────

/**
 * Parse a single SSE line into an SSEEvent object.
 * Returns null for non-data lines (comments, empty lines).
 */
export function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith('data: ')) return null;
  const jsonStr = line.slice(6).trim();
  if (!jsonStr || jsonStr === '[DONE]') return null;
  try {
    return JSON.parse(jsonStr) as SSEEvent;
  } catch {
    return null;
  }
}

// ─── Edge Function Helpers ──────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  };
}

function getEdgeFunctionUrl(name: string): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
  return `${baseUrl}/functions/v1/${name}`;
}

// ─── Chat with Tutor (SSE Streaming) ────────────────────────────────────────

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onCitations: (citations: SSEEvent extends { type: 'citations' } ? SSEEvent['data'] : never) => void;
  onDone: (data: { message_id: string; tokens_used: number }) => void;
  onError: (error: { code: string; message: string }) => void;
  onPlanUpdate?: (data: SSEEvent extends { type: 'plan_update' } ? SSEEvent['data'] : never) => void;
  onIndependenceNudge?: (data: { message: string }) => void;
  onHandoffSuggestion?: (data: { reason: string; message: string }) => void;
}

export async function streamChatMessage(
  input: SendMessageInput,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl('chat-with-tutor');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    callbacks.onError({
      code: String(response.status),
      message: errorBody.error ?? `HTTP ${response.status}`,
    });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError({ code: 'NO_STREAM', message: 'No response stream available' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const event = parseSSELine(line);
        if (!event) continue;

        switch (event.type) {
          case 'token':
            callbacks.onToken(event.data);
            break;
          case 'citations':
            callbacks.onCitations(event.data);
            break;
          case 'done':
            callbacks.onDone(event.data);
            break;
          case 'error':
            callbacks.onError(event.data);
            break;
          case 'plan_update':
            callbacks.onPlanUpdate?.(event.data);
            break;
          case 'independence_nudge':
            callbacks.onIndependenceNudge?.(event.data);
            break;
          case 'handoff_suggestion':
            callbacks.onHandoffSuggestion?.(event.data);
            break;
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const event = parseSSELine(buffer);
      if (event) {
        if (event.type === 'done') callbacks.onDone(event.data);
        else if (event.type === 'error') callbacks.onError(event.data);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Embed Course Material ──────────────────────────────────────────────────

export interface EmbedMaterialInput {
  file_url: string;
  course_id: string;
  clo_ids?: string[];
  bloom_level?: string;
  material_type: 'lecture_notes' | 'slides' | 'assignment_description' | 'rubric_criteria' | 'other';
  source_filename: string;
}

export async function embedCourseMaterial(input: EmbedMaterialInput): Promise<{ success: boolean }> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl('embed-course-material');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorBody.error ?? `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Tutor Analytics ────────────────────────────────────────────────────────

export async function fetchTutorAnalytics(
  courseId: string,
  startDate?: string,
  endDate?: string,
): Promise<unknown> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl('tutor-analytics');

  const body: Record<string, unknown> = { course_id: courseId };
  if (startDate) body.start_date = startDate;
  if (endDate) body.end_date = endDate;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorBody.error ?? `HTTP ${response.status}`);
  }

  return response.json();
}
