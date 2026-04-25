import { describe, it, expect } from "vitest";
import {
  sendMessageSchema,
  rateMessageSchema,
  tutorAnalyticsRequestSchema,
  autonomyLevelSchema,
  planUpdateResponseSchema,
  createHandoffSchema,
  respondToHandoffSchema,
} from "@/lib/tutorSchemas";

// ─── sendMessageSchema ──────────────────────────────────────────────────────

describe("sendMessageSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = sendMessageSchema.safeParse({ message: "Hello tutor" });
    expect(result.success).toBe(true);
  });

  it("accepts a full payload with all optional fields", () => {
    const result = sendMessageSchema.safeParse({
      conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      course_id: "550e8400-e29b-41d4-a716-446655440001",
      message: "Help me understand recursion",
      persona: "socratic_guide",
      image_urls: ["https://storage.example.com/img1.jpg"],
      document_url: "https://storage.example.com/doc.pdf",
      clo_scope: ["550e8400-e29b-41d4-a716-446655440002"],
      autonomy_override: "L1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    const result = sendMessageSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });

  it("rejects message exceeding 2000 characters", () => {
    const result = sendMessageSchema.safeParse({ message: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("rejects more than 2 image URLs", () => {
    const result = sendMessageSchema.safeParse({
      message: "Help",
      image_urls: [
        "https://a.com/1.jpg",
        "https://a.com/2.jpg",
        "https://a.com/3.jpg",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid persona", () => {
    const result = sendMessageSchema.safeParse({
      message: "Help",
      persona: "invalid_persona",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for conversation_id", () => {
    const result = sendMessageSchema.safeParse({
      message: "Help",
      conversation_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid autonomy override", () => {
    const result = sendMessageSchema.safeParse({
      message: "Help",
      autonomy_override: "L2",
    });
    expect(result.success).toBe(false);
  });
});

// ─── rateMessageSchema ──────────────────────────────────────────────────────

describe("rateMessageSchema", () => {
  it("accepts thumbs_up rating", () => {
    const result = rateMessageSchema.safeParse({
      message_id: "550e8400-e29b-41d4-a716-446655440000",
      rating: "thumbs_up",
    });
    expect(result.success).toBe(true);
  });

  it("accepts thumbs_down rating", () => {
    const result = rateMessageSchema.safeParse({
      message_id: "550e8400-e29b-41d4-a716-446655440000",
      rating: "thumbs_down",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid rating value", () => {
    const result = rateMessageSchema.safeParse({
      message_id: "550e8400-e29b-41d4-a716-446655440000",
      rating: "neutral",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing message_id", () => {
    const result = rateMessageSchema.safeParse({ rating: "thumbs_up" });
    expect(result.success).toBe(false);
  });
});

// ─── tutorAnalyticsRequestSchema ────────────────────────────────────────────

describe("tutorAnalyticsRequestSchema", () => {
  it("accepts valid course_id only", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({
      course_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts course_id with date range", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({
      course_id: "550e8400-e29b-41d4-a716-446655440000",
      start_date: "2025-01-01T00:00:00Z",
      end_date: "2025-06-30T23:59:59Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing course_id", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({
      course_id: "550e8400-e29b-41d4-a716-446655440000",
      start_date: "2025-01-01",
    });
    expect(result.success).toBe(false);
  });
});

// ─── autonomyLevelSchema ────────────────────────────────────────────────────

describe("autonomyLevelSchema", () => {
  it.each(["L1", "L2", "L3"])("accepts %s", (level) => {
    expect(autonomyLevelSchema.safeParse(level).success).toBe(true);
  });

  it("rejects invalid level", () => {
    expect(autonomyLevelSchema.safeParse("L4").success).toBe(false);
  });
});

// ─── createHandoffSchema ────────────────────────────────────────────────────

describe("createHandoffSchema", () => {
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
});

// ─── respondToHandoffSchema ─────────────────────────────────────────────────

describe("respondToHandoffSchema", () => {
  it("accepts valid response", () => {
    const result = respondToHandoffSchema.safeParse({
      handoff_id: "550e8400-e29b-41d4-a716-446655440000",
      response_message: "I will help with this topic in class.",
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

// ─── planUpdateResponseSchema ───────────────────────────────────────────────

describe("planUpdateResponseSchema", () => {
  it.each(["accepted", "modified", "dismissed"])(
    "accepts response: %s",
    (response) => {
      const result = planUpdateResponseSchema.safeParse({
        plan_update_id: "550e8400-e29b-41d4-a716-446655440000",
        response,
      });
      expect(result.success).toBe(true);
    }
  );

  it("rejects invalid response value", () => {
    const result = planUpdateResponseSchema.safeParse({
      plan_update_id: "550e8400-e29b-41d4-a716-446655440000",
      response: "ignored",
    });
    expect(result.success).toBe(false);
  });
});
