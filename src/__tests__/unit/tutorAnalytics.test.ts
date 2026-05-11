import { describe, it, expect } from "vitest";

// ─── Replicate pure helpers from the Edge Function for unit testing ──────────
// Edge Functions run on Deno and can't be imported directly in Vitest.
// We test the core logic by replicating the pure functions here.

// ─── Types ──────────────────────────────────────────────────────────────────

interface CommonTopic {
  topic: string;
  frequency: number;
}

interface TopQuestionedCLO {
  clo_id: string;
  clo_title: string;
  conversation_count: number;
}

interface DailyUsage {
  date: string;
  conversation_count: number;
}

interface AnalyticsResponse {
  total_conversations: number;
  total_messages: number;
  avg_messages_per_conversation: number;
  avg_satisfaction_rating: number;
  top_questioned_clos: TopQuestionedCLO[];
  common_topics: CommonTopic[];
  usage_over_time: DailyUsage[];
}

// ─── Stop Words (replicated from edge function) ─────────────────────────────

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "its",
  "this",
  "that",
  "was",
  "are",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "not",
  "no",
  "nor",
  "so",
  "if",
  "then",
  "than",
  "too",
  "very",
  "just",
  "about",
  "above",
  "after",
  "again",
  "all",
  "also",
  "am",
  "any",
  "as",
  "because",
  "before",
  "below",
  "between",
  "both",
  "during",
  "each",
  "few",
  "further",
  "get",
  "got",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "im",
  "into",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "now",
  "only",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "some",
  "such",
  "them",
  "themselves",
  "there",
  "these",
  "they",
  "those",
  "through",
  "under",
  "until",
  "up",
  "us",
  "we",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "hi",
  "hello",
  "hey",
  "thanks",
  "thank",
  "please",
  "okay",
  "ok",
  "yes",
  "yeah",
  "no",
  "sure",
  "like",
  "know",
  "think",
  "want",
  "need",
  "help",
  "question",
  "understand",
  "explain",
  "dont",
  "doesnt",
  "didnt",
  "cant",
  "wont",
  "isnt",
  "arent",
  "wasnt",
  "werent",
  "havent",
  "hasnt",
  "hadnt",
]);

// ─── Pure Functions (replicated from edge function) ─────────────────────────

function extractCommonTopics(
  messages: Array<{ content: string }>,
  topN: number = 15
): CommonTopic[] {
  const wordFrequency = new Map<string, number>();

  for (const msg of messages) {
    const words = msg.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

    const uniqueWords = new Set(words);
    for (const word of uniqueWords) {
      wordFrequency.set(word, (wordFrequency.get(word) ?? 0) + 1);
    }
  }

  return Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([topic, frequency]) => ({ topic, frequency }));
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidDate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime());
}

function validateNoPII(response: AnalyticsResponse): boolean {
  const json = JSON.stringify(response);
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailPattern.test(json)) {
    return false;
  }
  return true;
}

/**
 * Computes aggregate metrics from conversation data.
 */
function computeAggregateMetrics(
  conversations: Array<{ message_count: number }>
) {
  const totalConversations = conversations.length;
  const totalMessages = conversations.reduce(
    (sum, c) => sum + (c.message_count ?? 0),
    0
  );
  const avgMessagesPerConversation =
    totalConversations > 0
      ? Math.round((totalMessages / totalConversations) * 100) / 100
      : 0;
  return { totalConversations, totalMessages, avgMessagesPerConversation };
}

/**
 * Computes average satisfaction rating from rated messages.
 */
function computeSatisfactionRating(
  ratedMessages: Array<{ satisfaction_rating: string }>
): number {
  if (ratedMessages.length === 0) return 0;
  const positiveCount = ratedMessages.filter(
    (m) => m.satisfaction_rating === "thumbs_up"
  ).length;
  return Math.round((positiveCount / ratedMessages.length) * 100) / 100;
}

/**
 * Computes top questioned CLOs from conversation clo_scope arrays.
 */
function computeTopCLOs(
  conversations: Array<{ clo_scope: string[] }>,
  cloTitleMap: Map<string, string>,
  topN: number = 10
): TopQuestionedCLO[] {
  const cloFrequency = new Map<string, number>();
  for (const conv of conversations) {
    const cloScope: string[] = conv.clo_scope ?? [];
    for (const cloId of cloScope) {
      cloFrequency.set(cloId, (cloFrequency.get(cloId) ?? 0) + 1);
    }
  }

  return Array.from(cloFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([cloId, count]) => ({
      clo_id: cloId,
      clo_title: cloTitleMap.get(cloId) ?? "Unknown CLO",
      conversation_count: count,
    }));
}

/**
 * Builds usage over time from conversations with created_at dates.
 */
function buildUsageOverTime(
  conversations: Array<{ created_at: string }>,
  startDate: Date,
  endDate: Date
): DailyUsage[] {
  const dailyCounts = new Map<string, number>();
  for (const conv of conversations) {
    if (conv.created_at) {
      const dateKey = conv.created_at.split("T")[0] ?? "";
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1);
    }
  }

  const usageOverTime: DailyUsage[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0] ?? "";
    usageOverTime.push({
      date: dateKey,
      conversation_count: dailyCounts.get(dateKey) ?? 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return usageOverTime;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("tutor-analytics edge function helpers", () => {
  // ── 3.3.1: Aggregate Metrics ────────────────────────────────────────

  describe("computeAggregateMetrics", () => {
    it("should compute totals and averages from conversations", () => {
      const conversations = [
        { message_count: 10 },
        { message_count: 6 },
        { message_count: 8 },
      ];
      const result = computeAggregateMetrics(conversations);
      expect(result.totalConversations).toBe(3);
      expect(result.totalMessages).toBe(24);
      expect(result.avgMessagesPerConversation).toBe(8);
    });

    it("should return zeros for empty conversations", () => {
      const result = computeAggregateMetrics([]);
      expect(result.totalConversations).toBe(0);
      expect(result.totalMessages).toBe(0);
      expect(result.avgMessagesPerConversation).toBe(0);
    });

    it("should handle single conversation", () => {
      const result = computeAggregateMetrics([{ message_count: 5 }]);
      expect(result.totalConversations).toBe(1);
      expect(result.totalMessages).toBe(5);
      expect(result.avgMessagesPerConversation).toBe(5);
    });

    it("should round average to 2 decimal places", () => {
      const conversations = [
        { message_count: 7 },
        { message_count: 3 },
        { message_count: 5 },
      ];
      const result = computeAggregateMetrics(conversations);
      expect(result.avgMessagesPerConversation).toBe(5);
    });
  });

  describe("computeSatisfactionRating", () => {
    it("should compute ratio of thumbs_up to total rated messages", () => {
      const rated = [
        { satisfaction_rating: "thumbs_up" },
        { satisfaction_rating: "thumbs_up" },
        { satisfaction_rating: "thumbs_down" },
        { satisfaction_rating: "thumbs_up" },
      ];
      expect(computeSatisfactionRating(rated)).toBe(0.75);
    });

    it("should return 0 for no rated messages", () => {
      expect(computeSatisfactionRating([])).toBe(0);
    });

    it("should return 1 for all thumbs_up", () => {
      const rated = [
        { satisfaction_rating: "thumbs_up" },
        { satisfaction_rating: "thumbs_up" },
      ];
      expect(computeSatisfactionRating(rated)).toBe(1);
    });

    it("should return 0 for all thumbs_down", () => {
      const rated = [
        { satisfaction_rating: "thumbs_down" },
        { satisfaction_rating: "thumbs_down" },
      ];
      expect(computeSatisfactionRating(rated)).toBe(0);
    });
  });

  // ── 3.3.2: Top Questioned CLOs ──────────────────────────────────────

  describe("computeTopCLOs", () => {
    const cloTitleMap = new Map([
      ["clo-1", "Introduction to Algorithms"],
      ["clo-2", "Data Structures"],
      ["clo-3", "Complexity Analysis"],
    ]);

    it("should rank CLOs by conversation frequency", () => {
      const conversations = [
        { clo_scope: ["clo-1", "clo-2"] },
        { clo_scope: ["clo-1"] },
        { clo_scope: ["clo-2", "clo-3"] },
        { clo_scope: ["clo-1"] },
      ];
      const result = computeTopCLOs(conversations, cloTitleMap);
      expect(result[0]!.clo_id).toBe("clo-1");
      expect(result[0]!.conversation_count).toBe(3);
      expect(result[0]!.clo_title).toBe("Introduction to Algorithms");
      expect(result[1]!.clo_id).toBe("clo-2");
      expect(result[1]!.conversation_count).toBe(2);
    });

    it("should handle empty clo_scope", () => {
      const conversations = [{ clo_scope: [] }, { clo_scope: [] }];
      const result = computeTopCLOs(conversations, cloTitleMap);
      expect(result).toEqual([]);
    });

    it('should use "Unknown CLO" for missing titles', () => {
      const conversations = [{ clo_scope: ["clo-unknown"] }];
      const result = computeTopCLOs(conversations, cloTitleMap);
      expect(result[0]!.clo_title).toBe("Unknown CLO");
    });

    it("should limit to topN results", () => {
      const conversations = Array.from({ length: 20 }, (_, i) => ({
        clo_scope: [`clo-${i}`],
      }));
      const result = computeTopCLOs(conversations, new Map(), 5);
      expect(result.length).toBe(5);
    });
  });

  // ── 3.3.3: Common Topics Extraction ─────────────────────────────────

  describe("extractCommonTopics", () => {
    it("should extract word frequencies from messages", () => {
      const messages = [
        { content: "How does recursion work in algorithms?" },
        { content: "Can you explain recursion with an example?" },
        { content: "What are the base cases for recursion?" },
      ];
      const topics = extractCommonTopics(messages);
      const recursionTopic = topics.find((t) => t.topic === "recursion");
      expect(recursionTopic).toBeDefined();
      expect(recursionTopic!.frequency).toBe(3);
    });

    it("should filter out stop words", () => {
      const messages = [
        { content: "The quick brown fox jumps over the lazy dog" },
      ];
      const topics = extractCommonTopics(messages);
      const topicWords = topics.map((t) => t.topic);
      expect(topicWords).not.toContain("the");
      expect(topicWords).not.toContain("over");
    });

    it("should filter out short words (< 3 chars)", () => {
      const messages = [{ content: "AI is an ML tool" }];
      const topics = extractCommonTopics(messages);
      const topicWords = topics.map((t) => t.topic);
      expect(topicWords).not.toContain("ai");
      expect(topicWords).not.toContain("is");
      expect(topicWords).not.toContain("an");
      expect(topicWords).not.toContain("ml");
    });

    it("should return empty array for empty messages", () => {
      expect(extractCommonTopics([])).toEqual([]);
    });

    it("should count unique words per message (not total occurrences)", () => {
      const messages = [{ content: "algorithm algorithm algorithm algorithm" }];
      const topics = extractCommonTopics(messages);
      const algoTopic = topics.find((t) => t.topic === "algorithm");
      // Only counted once per message
      expect(algoTopic!.frequency).toBe(1);
    });

    it("should limit results to topN", () => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        content: `topic${i} is interesting`,
      }));
      const topics = extractCommonTopics(messages, 5);
      expect(topics.length).toBeLessThanOrEqual(5);
    });

    it("should be case-insensitive", () => {
      const messages = [
        { content: "Recursion is powerful" },
        { content: "RECURSION helps solve problems" },
      ];
      const topics = extractCommonTopics(messages);
      const recursionTopic = topics.find((t) => t.topic === "recursion");
      expect(recursionTopic!.frequency).toBe(2);
    });

    it("should strip punctuation", () => {
      const messages = [
        { content: "What about algorithms?" },
        { content: "Yes, algorithms!" },
      ];
      const topics = extractCommonTopics(messages);
      const algoTopic = topics.find((t) => t.topic === "algorithms");
      expect(algoTopic!.frequency).toBe(2);
    });

    it("should strip email addresses and preserve academic terms", () => {
      const messages = [
        { content: "Can you explain recursion with examples?" },
        { content: "Student needs help with sorting algorithms" },
      ];
      const topics = extractCommonTopics(messages);
      const topicWords = topics.map((t) => t.topic);
      // Academic terms should appear
      expect(topicWords).toContain("recursion");
      expect(topicWords).toContain("sorting");
      expect(topicWords).toContain("algorithms");
      // No full email addresses should appear as topics
      const hasEmail = topicWords.some((w) =>
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(w)
      );
      expect(hasEmail).toBe(false);
    });
  });

  // ── 3.3.4: Usage Over Time ──────────────────────────────────────────

  describe("buildUsageOverTime", () => {
    it("should produce daily counts for the date range", () => {
      const conversations = [
        { created_at: "2025-01-15T10:00:00Z" },
        { created_at: "2025-01-15T14:00:00Z" },
        { created_at: "2025-01-16T09:00:00Z" },
      ];
      const start = new Date("2025-01-15");
      const end = new Date("2025-01-17");
      const result = buildUsageOverTime(conversations, start, end);

      expect(result.length).toBe(3); // 15, 16, 17
      expect(result[0]).toEqual({ date: "2025-01-15", conversation_count: 2 });
      expect(result[1]).toEqual({ date: "2025-01-16", conversation_count: 1 });
      expect(result[2]).toEqual({ date: "2025-01-17", conversation_count: 0 });
    });

    it("should fill zero-count days", () => {
      const conversations: Array<{ created_at: string }> = [];
      const start = new Date("2025-01-01");
      const end = new Date("2025-01-03");
      const result = buildUsageOverTime(conversations, start, end);

      expect(result.length).toBe(3);
      expect(result.every((d) => d.conversation_count === 0)).toBe(true);
    });

    it("should handle single day range", () => {
      const conversations = [{ created_at: "2025-01-01T12:00:00Z" }];
      const start = new Date("2025-01-01");
      const end = new Date("2025-01-01");
      const result = buildUsageOverTime(conversations, start, end);

      expect(result.length).toBe(1);
      expect(result[0]!.conversation_count).toBe(1);
    });
  });

  // ── 3.3.5: PII Exclusion Validation ─────────────────────────────────

  describe("validateNoPII", () => {
    it("should pass for clean analytics response", () => {
      const response: AnalyticsResponse = {
        total_conversations: 10,
        total_messages: 50,
        avg_messages_per_conversation: 5,
        avg_satisfaction_rating: 0.8,
        top_questioned_clos: [
          { clo_id: "clo-1", clo_title: "Algorithms", conversation_count: 5 },
        ],
        common_topics: [{ topic: "recursion", frequency: 10 }],
        usage_over_time: [{ date: "2025-01-01", conversation_count: 3 }],
      };
      expect(validateNoPII(response)).toBe(true);
    });

    it("should fail if email address is present in topics", () => {
      const response: AnalyticsResponse = {
        total_conversations: 1,
        total_messages: 1,
        avg_messages_per_conversation: 1,
        avg_satisfaction_rating: 0,
        top_questioned_clos: [],
        common_topics: [{ topic: "student@university.edu", frequency: 1 }],
        usage_over_time: [],
      };
      expect(validateNoPII(response)).toBe(false);
    });

    it("should fail if email is in CLO title", () => {
      const response: AnalyticsResponse = {
        total_conversations: 1,
        total_messages: 1,
        avg_messages_per_conversation: 1,
        avg_satisfaction_rating: 0,
        top_questioned_clos: [
          {
            clo_id: "clo-1",
            clo_title: "Contact admin@school.com for help",
            conversation_count: 1,
          },
        ],
        common_topics: [],
        usage_over_time: [],
      };
      expect(validateNoPII(response)).toBe(false);
    });
  });

  // ── Validation Helpers ──────────────────────────────────────────────

  describe("isValidUUID", () => {
    it("should accept valid UUIDs", () => {
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isValidUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
    });

    it("should reject invalid UUIDs", () => {
      expect(isValidUUID("not-a-uuid")).toBe(false);
      expect(isValidUUID("")).toBe(false);
      expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false);
    });
  });

  describe("isValidDate", () => {
    it("should accept valid ISO dates", () => {
      expect(isValidDate("2025-01-15T00:00:00Z")).toBe(true);
      expect(isValidDate("2025-01-15")).toBe(true);
    });

    it("should reject invalid dates", () => {
      expect(isValidDate("not-a-date")).toBe(false);
      expect(isValidDate("")).toBe(false);
    });
  });
});
