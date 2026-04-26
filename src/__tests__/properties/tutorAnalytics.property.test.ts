// Feature: ai-tutor-rag, Property 28: Aggregation correctness
// Feature: ai-tutor-rag, Property 29: CLO ranking by frequency
// Feature: ai-tutor-rag, Property 30: No PII in analytics output
// Feature: ai-tutor-rag, Property 31: Daily counts match date range
// **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  aggregateAnalytics,
  analyticsContainsNoPII,
  type ConversationRecord,
  type MessageRecord,
} from '@/lib/tutorAnalytics';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const cloIdArb = fc.constantFrom('clo-1', 'clo-2', 'clo-3', 'clo-4', 'clo-5');

const dateArb = fc.integer({ min: 1, max: 28 }).map((d) => {
  const day = String(d).padStart(2, '0');
  return `2025-06-${day}T10:00:00Z`;
});

const conversationArb: fc.Arbitrary<ConversationRecord> = fc.record({
  id: fc.uuid(),
  clo_scope: fc.array(cloIdArb, { minLength: 0, maxLength: 3 }),
  created_at: dateArb,
  message_count: fc.integer({ min: 1, max: 20 }),
});

const messageArb: fc.Arbitrary<MessageRecord> = fc.record({
  id: fc.uuid(),
  conversation_id: fc.uuid(),
  role: fc.constantFrom<'user' | 'assistant'>('user', 'assistant'),
  satisfaction_rating: fc.constantFrom<'thumbs_up' | 'thumbs_down' | null>(
    'thumbs_up',
    'thumbs_down',
    null,
  ),
  created_at: dateArb,
});

const cloLookup = new Map([
  ['clo-1', 'Introduction to Algorithms'],
  ['clo-2', 'Data Structures'],
  ['clo-3', 'Database Design'],
  ['clo-4', 'Software Engineering'],
  ['clo-5', 'Computer Networks'],
]);

// ─── Property 28: Aggregation correctness ───────────────────────────────────

describe('Property 28 — Aggregation correctness', () => {
  it('P28: total_conversations, total_messages, and avg are correct', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 1, maxLength: 20 }),
        fc.array(messageArb, { minLength: 1, maxLength: 50 }),
        (conversations, messages) => {
          const result = aggregateAnalytics(conversations, messages, cloLookup);

          expect(result.total_conversations).toBe(conversations.length);
          expect(result.total_messages).toBe(messages.length);
          expect(result.avg_messages_per_conversation).toBeCloseTo(
            messages.length / conversations.length,
            10,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P28b: empty conversations produce zero totals', () => {
    const result = aggregateAnalytics([], [], cloLookup);
    expect(result.total_conversations).toBe(0);
    expect(result.total_messages).toBe(0);
    expect(result.avg_messages_per_conversation).toBe(0);
  });
});

// ─── Property 29: CLO ranking by frequency ──────────────────────────────────

describe('Property 29 — CLO ranking by frequency', () => {
  it('P29: top_questioned_clos is sorted by conversation_count descending', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 1, maxLength: 20 }),
        (conversations) => {
          const result = aggregateAnalytics(conversations, [], cloLookup);

          // Verify descending order
          for (let i = 0; i < result.top_questioned_clos.length - 1; i++) {
            expect(result.top_questioned_clos[i]!.conversation_count).toBeGreaterThanOrEqual(
              result.top_questioned_clos[i + 1]!.conversation_count,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P29b: each CLO count matches the number of conversations that include it', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 1, maxLength: 20 }),
        (conversations) => {
          const result = aggregateAnalytics(conversations, [], cloLookup);

          for (const clo of result.top_questioned_clos) {
            const expectedCount = conversations.filter((c) =>
              c.clo_scope.includes(clo.clo_id),
            ).length;
            expect(clo.conversation_count).toBe(expectedCount);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 30: No PII in analytics output ────────────────────────────────

describe('Property 30 — No PII in analytics output', () => {
  it('P30: analytics response contains no student PII', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 0, maxLength: 15 }),
        fc.array(messageArb, { minLength: 0, maxLength: 30 }),
        (conversations, messages) => {
          const result = aggregateAnalytics(conversations, messages, cloLookup);
          expect(analyticsContainsNoPII(result)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 31: Daily counts match date range ─────────────────────────────

describe('Property 31 — Daily counts match date range', () => {
  it('P31: each day count equals the number of conversations created on that date', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 1, maxLength: 20 }),
        (conversations) => {
          const result = aggregateAnalytics(conversations, [], cloLookup);

          // Build expected daily counts
          const expectedCounts = new Map<string, number>();
          for (const conv of conversations) {
            const date = conv.created_at.split('T')[0]!;
            expectedCounts.set(date, (expectedCounts.get(date) ?? 0) + 1);
          }

          // Verify each entry in usage_over_time
          for (const entry of result.usage_over_time) {
            expect(entry.conversation_count).toBe(expectedCounts.get(entry.date));
          }

          // Verify all dates are covered
          expect(result.usage_over_time.length).toBe(expectedCounts.size);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P31b: usage_over_time is sorted chronologically', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 2, maxLength: 20 }),
        (conversations) => {
          const result = aggregateAnalytics(conversations, [], cloLookup);

          for (let i = 0; i < result.usage_over_time.length - 1; i++) {
            expect(result.usage_over_time[i]!.date <= result.usage_over_time[i + 1]!.date).toBe(
              true,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
