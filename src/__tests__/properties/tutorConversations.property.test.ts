// Feature: ai-tutor-rag, Property 13: Context window limited to last 10 messages
// Feature: ai-tutor-rag, Property 15: Persona switch doesn't lose conversation history
// Feature: ai-tutor-rag, Property 17: Conversations ordered by most recent activity
// **Validates: Requirements 6.4, 7.3, 9.1**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { TutorPersona } from "@/lib/tutorSchemas";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  persona: TutorPersona;
  updated_at: string;
  messages: Message[];
}

// ─── Pure logic functions ────────────────────────────────────────────────────

const CONTEXT_WINDOW_SIZE = 10;

/**
 * Selects the last N messages for the LLM context window.
 * Messages are ordered chronologically (oldest first).
 */
const selectContextMessages = (messages: Message[]): Message[] => {
  const sorted = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return sorted.slice(-CONTEXT_WINDOW_SIZE);
};

/**
 * Switches persona on a conversation without modifying existing messages.
 */
const switchPersona = (
  conversation: Conversation,
  newPersona: TutorPersona
): Conversation => {
  return {
    ...conversation,
    persona: newPersona,
    // Messages remain unchanged
  };
};

/**
 * Sorts conversations by most recent activity (updated_at descending).
 */
const sortConversationsByRecent = (
  conversations: Conversation[]
): Conversation[] => {
  return [...conversations].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const personaArb = fc.constantFrom<TutorPersona>(
  "socratic_guide",
  "step_by_step_coach",
  "quick_explainer"
);

const timestampArb = fc
  .integer({ min: 1700000000000, max: 1750000000000 })
  .map((ms) => new Date(ms).toISOString());

const messageArb = (conversationId: string): fc.Arbitrary<Message> =>
  fc.record({
    id: fc.uuid(),
    conversation_id: fc.constant(conversationId),
    role: fc.constantFrom<"user" | "assistant">("user", "assistant"),
    content: fc.lorem({ maxCount: 3, mode: "sentences" }),
    created_at: timestampArb,
  });

const conversationArb: fc.Arbitrary<Conversation> = fc.uuid().chain((id) =>
  fc.record({
    id: fc.constant(id),
    persona: personaArb,
    updated_at: timestampArb,
    messages: fc.array(messageArb(id), { minLength: 0, maxLength: 30 }),
  })
);

// ─── P13: Context window limited to last 10 messages ─────────────────────────

describe("Property 13 — Context window limited to last 10 messages", () => {
  it("P13a: context window contains at most 10 messages", () => {
    fc.assert(
      fc.property(
        fc
          .uuid()
          .chain((id) =>
            fc.array(messageArb(id), { minLength: 0, maxLength: 50 })
          ),
        (messages) => {
          const context = selectContextMessages(messages);
          expect(context.length).toBeLessThanOrEqual(CONTEXT_WINDOW_SIZE);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P13b: context window contains exactly min(N, 10) messages", () => {
    fc.assert(
      fc.property(
        fc
          .uuid()
          .chain((id) =>
            fc.array(messageArb(id), { minLength: 0, maxLength: 50 })
          ),
        (messages) => {
          const context = selectContextMessages(messages);
          const expected = Math.min(messages.length, CONTEXT_WINDOW_SIZE);
          expect(context.length).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P13c: context window contains the most recent messages", () => {
    fc.assert(
      fc.property(
        fc
          .uuid()
          .chain((id) =>
            fc.array(messageArb(id), { minLength: 1, maxLength: 50 })
          ),
        (messages) => {
          const context = selectContextMessages(messages);

          // Sort all messages by time
          const allSorted = [...messages].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );

          // The last message in the context should be the most recent overall
          const lastContext = context[context.length - 1]!;
          const lastOverall = allSorted[allSorted.length - 1]!;
          expect(lastContext.id).toBe(lastOverall.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P13d: context messages are ordered chronologically", () => {
    fc.assert(
      fc.property(
        fc
          .uuid()
          .chain((id) =>
            fc.array(messageArb(id), { minLength: 2, maxLength: 30 })
          ),
        (messages) => {
          const context = selectContextMessages(messages);

          for (let i = 1; i < context.length; i++) {
            const prevTime = new Date(context[i - 1]!.created_at).getTime();
            const currTime = new Date(context[i]!.created_at).getTime();
            expect(currTime).toBeGreaterThanOrEqual(prevTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P15: Persona switch doesn't lose conversation history ───────────────────

describe("Property 15 — Persona switch preserves conversation history", () => {
  it("P15a: switching persona preserves all existing messages", () => {
    fc.assert(
      fc.property(conversationArb, personaArb, (conversation, newPersona) => {
        const originalMessages = conversation.messages.map((m) => ({
          ...m,
        }));
        const updated = switchPersona(conversation, newPersona);

        // All messages should be identical
        expect(updated.messages.length).toBe(originalMessages.length);
        for (let i = 0; i < originalMessages.length; i++) {
          expect(updated.messages[i]!.id).toBe(originalMessages[i]!.id);
          expect(updated.messages[i]!.content).toBe(
            originalMessages[i]!.content
          );
          expect(updated.messages[i]!.role).toBe(originalMessages[i]!.role);
          expect(updated.messages[i]!.created_at).toBe(
            originalMessages[i]!.created_at
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  it("P15b: switching persona updates only the persona field", () => {
    fc.assert(
      fc.property(conversationArb, personaArb, (conversation, newPersona) => {
        const updated = switchPersona(conversation, newPersona);

        expect(updated.persona).toBe(newPersona);
        expect(updated.id).toBe(conversation.id);
        expect(updated.updated_at).toBe(conversation.updated_at);
      }),
      { numRuns: 100 }
    );
  });

  it("P15c: multiple persona switches preserve all messages", () => {
    fc.assert(
      fc.property(
        conversationArb,
        fc.array(personaArb, { minLength: 2, maxLength: 5 }),
        (conversation, personas) => {
          const originalMessageIds = conversation.messages.map((m) => m.id);

          let current = conversation;
          for (const persona of personas) {
            current = switchPersona(current, persona);
          }

          // After multiple switches, all original messages should still be there
          const finalMessageIds = current.messages.map((m) => m.id);
          expect(finalMessageIds).toEqual(originalMessageIds);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P17: Conversations ordered by most recent activity ──────────────────────

describe("Property 17 — Conversations ordered by most recent activity", () => {
  it("P17a: sorted conversations are in descending updated_at order", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 2, maxLength: 20 }),
        (conversations) => {
          const sorted = sortConversationsByRecent(conversations);

          for (let i = 1; i < sorted.length; i++) {
            const prevTime = new Date(sorted[i - 1]!.updated_at).getTime();
            const currTime = new Date(sorted[i]!.updated_at).getTime();
            expect(prevTime).toBeGreaterThanOrEqual(currTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P17b: sorting preserves all conversations (no data loss)", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 0, maxLength: 20 }),
        (conversations) => {
          const sorted = sortConversationsByRecent(conversations);

          expect(sorted.length).toBe(conversations.length);

          const originalIds = new Set(conversations.map((c) => c.id));
          const sortedIds = new Set(sorted.map((c) => c.id));
          expect(sortedIds).toEqual(originalIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P17c: the most recently updated conversation is first", () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 1, maxLength: 20 }),
        (conversations) => {
          const sorted = sortConversationsByRecent(conversations);

          // Find the conversation with the latest updated_at
          const mostRecent = conversations.reduce((latest, conv) =>
            new Date(conv.updated_at).getTime() >
            new Date(latest.updated_at).getTime()
              ? conv
              : latest
          );

          expect(sorted[0]!.id).toBe(mostRecent.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
