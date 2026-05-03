// Feature: ai-tutor-rag — Handoff trigger detection logic
// **Validates: Requirements 30.1, 30.4**

import { describe, it, expect } from "vitest";
import { createHandoffSchema, respondToHandoffSchema } from "@/lib/tutorSchemas";

// ─── Pure logic helper (replicated from Edge Function) ──────────────────────

interface HandoffSignals {
  avgSimilarityLast3: number;
  repeatedQuestionCount: number;
  consecutiveThumbsDown: number;
}

function shouldSuggestHandoff(signals: HandoffSignals): boolean {
  return (
    signals.avgSimilarityLast3 < 0.7 ||
    signals.repeatedQuestionCount >= 3 ||
    signals.consecutiveThumbsDown >= 3
  );
}

function getHandoffReason(
  signals: HandoffSignals,
): "low_rag_confidence" | "repeated_question" | "low_satisfaction" | null {
  if (signals.avgSimilarityLast3 < 0.7) return "low_rag_confidence";
  if (signals.repeatedQuestionCount >= 3) return "repeated_question";
  if (signals.consecutiveThumbsDown >= 3) return "low_satisfaction";
  return null;
}

// ─── Handoff trigger detection ──────────────────────────────────────────────

describe("tutorHandoffTrigger — shouldSuggestHandoff", () => {
  it("triggers on low RAG confidence (avg similarity < 0.7)", () => {
    expect(
      shouldSuggestHandoff({
        avgSimilarityLast3: 0.5,
        repeatedQuestionCount: 0,
        consecutiveThumbsDown: 0,
      }),
    ).toBe(true);
  });

  it("triggers on repeated questions (>= 3)", () => {
    expect(
      shouldSuggestHandoff({
        avgSimilarityLast3: 0.9,
        repeatedQuestionCount: 3,
        consecutiveThumbsDown: 0,
      }),
    ).toBe(true);
  });

  it("triggers on low satisfaction (>= 3 consecutive thumbs down)", () => {
    expect(
      shouldSuggestHandoff({
        avgSimilarityLast3: 0.9,
        repeatedQuestionCount: 0,
        consecutiveThumbsDown: 3,
      }),
    ).toBe(true);
  });

  it("does not trigger when all signals are healthy", () => {
    expect(
      shouldSuggestHandoff({
        avgSimilarityLast3: 0.85,
        repeatedQuestionCount: 1,
        consecutiveThumbsDown: 1,
      }),
    ).toBe(false);
  });

  it("triggers when multiple conditions are met simultaneously", () => {
    expect(
      shouldSuggestHandoff({
        avgSimilarityLast3: 0.4,
        repeatedQuestionCount: 5,
        consecutiveThumbsDown: 4,
      }),
    ).toBe(true);
  });

  it("does not trigger at exact boundary (similarity = 0.7)", () => {
    expect(
      shouldSuggestHandoff({
        avgSimilarityLast3: 0.7,
        repeatedQuestionCount: 2,
        consecutiveThumbsDown: 2,
      }),
    ).toBe(false);
  });

  it("triggers just below boundary (similarity = 0.699)", () => {
    expect(
      shouldSuggestHandoff({
        avgSimilarityLast3: 0.699,
        repeatedQuestionCount: 0,
        consecutiveThumbsDown: 0,
      }),
    ).toBe(true);
  });
});

// ─── Handoff reason detection ───────────────────────────────────────────────

describe("tutorHandoffTrigger — getHandoffReason", () => {
  it("returns low_rag_confidence for low similarity", () => {
    expect(
      getHandoffReason({
        avgSimilarityLast3: 0.5,
        repeatedQuestionCount: 0,
        consecutiveThumbsDown: 0,
      }),
    ).toBe("low_rag_confidence");
  });

  it("returns repeated_question for repeated questions", () => {
    expect(
      getHandoffReason({
        avgSimilarityLast3: 0.9,
        repeatedQuestionCount: 3,
        consecutiveThumbsDown: 0,
      }),
    ).toBe("repeated_question");
  });

  it("returns low_satisfaction for consecutive thumbs down", () => {
    expect(
      getHandoffReason({
        avgSimilarityLast3: 0.9,
        repeatedQuestionCount: 0,
        consecutiveThumbsDown: 3,
      }),
    ).toBe("low_satisfaction");
  });

  it("returns null when no trigger condition is met", () => {
    expect(
      getHandoffReason({
        avgSimilarityLast3: 0.9,
        repeatedQuestionCount: 1,
        consecutiveThumbsDown: 1,
      }),
    ).toBeNull();
  });

  it("prioritizes low_rag_confidence when multiple conditions met", () => {
    expect(
      getHandoffReason({
        avgSimilarityLast3: 0.3,
        repeatedQuestionCount: 5,
        consecutiveThumbsDown: 5,
      }),
    ).toBe("low_rag_confidence");
  });
});

// ─── Schema validation — createHandoffSchema ────────────────────────────────

describe("tutorHandoffTrigger — createHandoffSchema", () => {
  it("accepts valid handoff with consent true", () => {
    const result = createHandoffSchema.safeParse({
      conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      student_consent: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects handoff with consent false", () => {
    const result = createHandoffSchema.safeParse({
      conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      student_consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects handoff with missing conversation_id", () => {
    const result = createHandoffSchema.safeParse({
      student_consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects handoff with invalid conversation_id", () => {
    const result = createHandoffSchema.safeParse({
      conversation_id: "not-a-uuid",
      student_consent: true,
    });
    expect(result.success).toBe(false);
  });
});

// ─── Schema validation — respondToHandoffSchema ─────────────────────────────

describe("tutorHandoffTrigger — respondToHandoffSchema", () => {
  it("accepts valid response", () => {
    const result = respondToHandoffSchema.safeParse({
      handoff_id: "550e8400-e29b-41d4-a716-446655440000",
      response_message: "I will schedule a meeting to discuss this topic.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty response message", () => {
    const result = respondToHandoffSchema.safeParse({
      handoff_id: "550e8400-e29b-41d4-a716-446655440000",
      response_message: "",
    });
    expect(result.success).toBe(false);
  });
});
