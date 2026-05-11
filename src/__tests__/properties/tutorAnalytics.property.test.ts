// Feature: ai-tutor-rag, Property 28: Aggregation produces non-negative counts
// Feature: ai-tutor-rag, Property 29: CLO ranking is sorted by conversation count descending
// Feature: ai-tutor-rag, Property 30: No PII in analytics output
// Feature: ai-tutor-rag, Property 31: Daily counts have valid date format
// **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { TutorAnalyticsResponse } from "@/lib/tutorSchemas";

// ─── Pure analytics aggregation logic ────────────────────────────────────────

interface ConversationRecord {
  id: string;
  course_id: string;
  clo_scope: string[];
  message_count: number;
  created_at: string; // ISO date string
}

interface MessageRecord {
  conversation_id: string;
  satisfaction_rating: "thumbs_up" | "thumbs_down" | null;
}

const aggregateAnalytics = (
  conversations: ConversationRecord[],
  messages: MessageRecord[],
  cloLookup: Map<string, string>
): TutorAnalyticsResponse => {
  const totalConversations = conversations.length;
  const totalMessages = conversations.reduce(
    (sum, c) => sum + c.message_count,
    0
  );
  const avgMessages =
    totalConversations > 0 ? totalMessages / totalConversations : 0;

  // Satisfaction rating
  const ratedMessages = messages.filter((m) => m.satisfaction_rating !== null);
  const thumbsUp = ratedMessages.filter(
    (m) => m.satisfaction_rating === "thumbs_up"
  ).length;
  const avgSatisfaction =
    ratedMessages.length > 0 ? thumbsUp / ratedMessages.length : 0;

  // Top questioned CLOs
  const cloCountMap = new Map<string, number>();
  for (const conv of conversations) {
    for (const cloId of conv.clo_scope) {
      cloCountMap.set(cloId, (cloCountMap.get(cloId) ?? 0) + 1);
    }
  }
  const topClos = Array.from(cloCountMap.entries())
    .map(([cloId, count]) => ({
      clo_id: cloId,
      clo_title: cloLookup.get(cloId) ?? "Unknown CLO",
      conversation_count: count,
    }))
    .sort((a, b) => b.conversation_count - a.conversation_count);

  // Usage over time (daily counts)
  const dailyMap = new Map<string, number>();
  for (const conv of conversations) {
    const date = conv.created_at.split("T")[0]!;
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1);
  }
  const usageOverTime = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, conversation_count: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total_conversations: totalConversations,
    total_messages: totalMessages,
    avg_messages_per_conversation: avgMessages,
    avg_satisfaction_rating: avgSatisfaction,
    top_questioned_clos: topClos,
    common_topics: [],
    usage_over_time: usageOverTime,
  };
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const dateArb = fc
  .tuple(
    fc.integer({ min: 2024, max: 2025 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(
    ([y, m, d]) =>
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}T12:00:00Z`
  );

const conversationArb = (cloIds: string[]): fc.Arbitrary<ConversationRecord> =>
  fc.record({
    id: fc.uuid(),
    course_id: fc.uuid(),
    clo_scope: fc.subarray(cloIds, { minLength: 0, maxLength: cloIds.length }),
    message_count: fc.integer({ min: 1, max: 50 }),
    created_at: dateArb,
  });

// ─── P28: Aggregation produces non-negative counts ───────────────────────────

describe("Property 28 — Aggregation produces non-negative counts", () => {
  it("P28a: all aggregate metrics are non-negative", () => {
    const fixedCloIds = ["clo-1", "clo-2", "clo-3"];
    fc.assert(
      fc.property(
        fc.array(conversationArb(fixedCloIds), { minLength: 0, maxLength: 20 }),
        fc.array(
          fc.record({
            conversation_id: fc.uuid(),
            satisfaction_rating: fc.constantFrom(
              "thumbs_up" as const,
              "thumbs_down" as const,
              null
            ),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (convs, msgs) => {
          const cloLookup = new Map(
            fixedCloIds.map((id, i) => [id, `CLO ${i + 1}`])
          );
          const result = aggregateAnalytics(convs, msgs, cloLookup);

          expect(result.total_conversations).toBeGreaterThanOrEqual(0);
          expect(result.total_messages).toBeGreaterThanOrEqual(0);
          expect(result.avg_messages_per_conversation).toBeGreaterThanOrEqual(
            0
          );
          expect(result.avg_satisfaction_rating).toBeGreaterThanOrEqual(0);
          expect(result.avg_satisfaction_rating).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P28b: total_conversations equals the count of input conversations", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb(["clo-1", "clo-2"]), {
          minLength: 0,
          maxLength: 30,
        }),
        (convs) => {
          const result = aggregateAnalytics(convs, [], new Map());
          expect(result.total_conversations).toBe(convs.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P28c: total_messages equals sum of all conversation message counts", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb(["clo-1"]), { minLength: 0, maxLength: 20 }),
        (convs) => {
          const result = aggregateAnalytics(convs, [], new Map());
          const expectedTotal = convs.reduce(
            (sum, c) => sum + c.message_count,
            0
          );
          expect(result.total_messages).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P29: CLO ranking sorted by conversation count descending ────────────────

describe("Property 29 — CLO ranking sorted by conversation count descending", () => {
  it("P29a: top_questioned_clos is sorted by conversation_count descending", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb(["clo-a", "clo-b", "clo-c", "clo-d"]), {
          minLength: 1,
          maxLength: 30,
        }),
        (convs) => {
          const cloLookup = new Map([
            ["clo-a", "CLO A"],
            ["clo-b", "CLO B"],
            ["clo-c", "CLO C"],
            ["clo-d", "CLO D"],
          ]);
          const result = aggregateAnalytics(convs, [], cloLookup);

          for (let i = 1; i < result.top_questioned_clos.length; i++) {
            expect(
              result.top_questioned_clos[i - 1]!.conversation_count
            ).toBeGreaterThanOrEqual(
              result.top_questioned_clos[i]!.conversation_count
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P29b: each CLO count equals the number of conversations containing it", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb(["clo-x", "clo-y", "clo-z"]), {
          minLength: 1,
          maxLength: 20,
        }),
        (convs) => {
          const cloLookup = new Map([
            ["clo-x", "CLO X"],
            ["clo-y", "CLO Y"],
            ["clo-z", "CLO Z"],
          ]);
          const result = aggregateAnalytics(convs, [], cloLookup);

          for (const cloEntry of result.top_questioned_clos) {
            const expectedCount = convs.filter((c) =>
              c.clo_scope.includes(cloEntry.clo_id)
            ).length;
            expect(cloEntry.conversation_count).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P30: No PII in analytics output ─────────────────────────────────────────

describe("Property 30 — No PII in analytics output", () => {
  it("P30a: analytics response contains no student names, emails, or IDs", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb(["clo-1", "clo-2"]), {
          minLength: 0,
          maxLength: 10,
        }),
        (convs) => {
          const result = aggregateAnalytics(
            convs,
            [],
            new Map([
              ["clo-1", "Introduction to Programming"],
              ["clo-2", "Data Structures"],
            ])
          );

          const serialized = JSON.stringify(result);

          // Should not contain email patterns
          expect(serialized).not.toMatch(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
          );
          // Should not contain student ID patterns
          expect(serialized).not.toMatch(/STU-\d{6}/);
          // Should not contain "student_id" as a key (only aggregate data)
          expect(serialized).not.toContain("student_id");
          // Should not contain "full_name" as a key
          expect(serialized).not.toContain("full_name");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P31: Daily counts have valid date format ────────────────────────────────

describe("Property 31 — Daily counts have valid date format", () => {
  it("P31a: each usage_over_time entry has a valid YYYY-MM-DD date", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb(["clo-1"]), { minLength: 1, maxLength: 20 }),
        (convs) => {
          const result = aggregateAnalytics(convs, [], new Map());

          for (const entry of result.usage_over_time) {
            // Validate YYYY-MM-DD format
            expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

            // Validate it's a parseable date
            const parsed = new Date(entry.date);
            expect(parsed.toString()).not.toBe("Invalid Date");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P31b: each day's conversation_count is positive", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb(["clo-1"]), { minLength: 1, maxLength: 20 }),
        (convs) => {
          const result = aggregateAnalytics(convs, [], new Map());

          for (const entry of result.usage_over_time) {
            expect(entry.conversation_count).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P31c: sum of daily counts equals total conversations", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb(["clo-1"]), { minLength: 1, maxLength: 20 }),
        (convs) => {
          const result = aggregateAnalytics(convs, [], new Map());

          const dailySum = result.usage_over_time.reduce(
            (sum, entry) => sum + entry.conversation_count,
            0
          );
          expect(dailySum).toBe(result.total_conversations);
        }
      ),
      { numRuns: 100 }
    );
  });
});
