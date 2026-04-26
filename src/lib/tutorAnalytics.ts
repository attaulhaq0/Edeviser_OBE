// ─── Tutor Analytics Aggregation Utilities ──────────────────────────────────
//
// Pure functions for computing anonymized aggregate analytics from
// conversation and message data. Used by the tutor-analytics Edge Function.

import type { TutorAnalyticsResponse } from '@/lib/tutorSchemas';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConversationRecord {
  id: string;
  clo_scope: string[];
  created_at: string; // ISO date string
  message_count: number;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  satisfaction_rating: 'thumbs_up' | 'thumbs_down' | null;
  created_at: string;
}

export interface CLOInfo {
  clo_id: string;
  clo_title: string;
}

// ─── Aggregation Functions ──────────────────────────────────────────────────

/**
 * Computes aggregate analytics from conversation and message records.
 * All output is anonymized — no student PII is included.
 */
export function aggregateAnalytics(
  conversations: ConversationRecord[],
  messages: MessageRecord[],
  cloLookup: Map<string, string>, // clo_id → clo_title
): Pick<
  TutorAnalyticsResponse,
  | 'total_conversations'
  | 'total_messages'
  | 'avg_messages_per_conversation'
  | 'avg_satisfaction_rating'
  | 'top_questioned_clos'
  | 'usage_over_time'
> {
  const totalConversations = conversations.length;
  const totalMessages = messages.length;
  const avgMessagesPerConversation =
    totalConversations > 0 ? totalMessages / totalConversations : 0;

  // Satisfaction rating: count thumbs_up as 1, thumbs_down as 0
  const rated = messages.filter((m) => m.satisfaction_rating !== null);
  const avgSatisfaction =
    rated.length > 0
      ? rated.filter((m) => m.satisfaction_rating === 'thumbs_up').length / rated.length
      : 0;

  // Top questioned CLOs by conversation count
  const cloCounts = new Map<string, number>();
  for (const conv of conversations) {
    // Deduplicate CLO IDs within a single conversation
    const uniqueClos = [...new Set(conv.clo_scope)];
    for (const cloId of uniqueClos) {
      cloCounts.set(cloId, (cloCounts.get(cloId) ?? 0) + 1);
    }
  }
  const topQuestionedClos = Array.from(cloCounts.entries())
    .map(([clo_id, conversation_count]) => ({
      clo_id,
      clo_title: cloLookup.get(clo_id) ?? clo_id,
      conversation_count,
    }))
    .sort((a, b) => b.conversation_count - a.conversation_count);

  // Usage over time: daily conversation counts
  const dailyCounts = new Map<string, number>();
  for (const conv of conversations) {
    const date = conv.created_at.split('T')[0]!;
    dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
  }
  const usageOverTime = Array.from(dailyCounts.entries())
    .map(([date, conversation_count]) => ({ date, conversation_count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total_conversations: totalConversations,
    total_messages: totalMessages,
    avg_messages_per_conversation: avgMessagesPerConversation,
    avg_satisfaction_rating: avgSatisfaction,
    top_questioned_clos: topQuestionedClos,
    usage_over_time: usageOverTime,
  };
}

/**
 * Checks that an analytics response contains no student PII.
 * Returns true if the response is clean (no PII detected).
 */
export function analyticsContainsNoPII(
  analytics: Pick<TutorAnalyticsResponse, 'top_questioned_clos' | 'usage_over_time'>,
): boolean {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

  // Check CLO titles for PII
  for (const clo of analytics.top_questioned_clos) {
    if (emailPattern.test(clo.clo_title) || uuidPattern.test(clo.clo_title)) {
      return false;
    }
  }

  return true;
}
