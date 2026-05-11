// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import {
  sendMessageSchema,
  rateMessageSchema,
  tutorAnalyticsRequestSchema,
} from "@/lib/tutorSchemas";

// ── sendMessageSchema ───────────────────────────────────────────────

describe("sendMessageSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = sendMessageSchema.safeParse({ message: "Hello tutor" });
    expect(result.success).toBe(true);
  });

  it("accepts a fully populated payload", () => {
    const result = sendMessageSchema.safeParse({
      conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      course_id: "550e8400-e29b-41d4-a716-446655440001",
      message: "Explain CLO 3 please",
      persona: "socratic_guide",
      image_urls: [
        "https://example.com/img1.png",
        "https://example.com/img2.png",
      ],
      document_url: "https://example.com/doc.pdf",
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

  it("accepts message at exactly 2000 characters", () => {
    const result = sendMessageSchema.safeParse({ message: "a".repeat(2000) });
    expect(result.success).toBe(true);
  });

  it("accepts message at exactly 1 character", () => {
    const result = sendMessageSchema.safeParse({ message: "x" });
    expect(result.success).toBe(true);
  });

  it("rejects missing message field", () => {
    const result = sendMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid conversation_id (not UUID)", () => {
    const result = sendMessageSchema.safeParse({
      message: "hi",
      conversation_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid course_id (not UUID)", () => {
    const result = sendMessageSchema.safeParse({
      message: "hi",
      course_id: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid persona value", () => {
    const result = sendMessageSchema.safeParse({
      message: "hi",
      persona: "invalid_persona",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid persona values", () => {
    for (const persona of [
      "socratic_guide",
      "step_by_step_coach",
      "quick_explainer",
    ]) {
      const result = sendMessageSchema.safeParse({ message: "hi", persona });
      expect(result.success).toBe(true);
    }
  });

  it("rejects more than 2 image URLs", () => {
    const result = sendMessageSchema.safeParse({
      message: "hi",
      image_urls: [
        "https://example.com/1.png",
        "https://example.com/2.png",
        "https://example.com/3.png",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid image URL format", () => {
    const result = sendMessageSchema.safeParse({
      message: "hi",
      image_urls: ["not-a-url"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid document_url format", () => {
    const result = sendMessageSchema.safeParse({
      message: "hi",
      document_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid clo_scope entries (not UUIDs)", () => {
    const result = sendMessageSchema.safeParse({
      message: "hi",
      clo_scope: ["not-uuid"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid autonomy_override value", () => {
    const result = sendMessageSchema.safeParse({
      message: "hi",
      autonomy_override: "L2",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid autonomy_override values (L1, L3)", () => {
    for (const level of ["L1", "L3"]) {
      const result = sendMessageSchema.safeParse({
        message: "hi",
        autonomy_override: level,
      });
      expect(result.success).toBe(true);
    }
  });

  it("strips extra fields via parse", () => {
    const result = sendMessageSchema.safeParse({
      message: "hi",
      extraField: "should be ignored",
    });
    expect(result.success).toBe(true);
  });
});

// ── rateMessageSchema ───────────────────────────────────────────────

describe("rateMessageSchema", () => {
  it("accepts valid thumbs_up rating", () => {
    const result = rateMessageSchema.safeParse({
      message_id: "550e8400-e29b-41d4-a716-446655440000",
      rating: "thumbs_up",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid thumbs_down rating", () => {
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

  it("rejects missing rating", () => {
    const result = rateMessageSchema.safeParse({
      message_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid message_id (not UUID)", () => {
    const result = rateMessageSchema.safeParse({
      message_id: "bad-id",
      rating: "thumbs_up",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty string rating", () => {
    const result = rateMessageSchema.safeParse({
      message_id: "550e8400-e29b-41d4-a716-446655440000",
      rating: "",
    });
    expect(result.success).toBe(false);
  });
});

// ── tutorAnalyticsRequestSchema ─────────────────────────────────────

describe("tutorAnalyticsRequestSchema", () => {
  it("accepts valid course_id only", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({
      course_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid payload with date range", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({
      course_id: "550e8400-e29b-41d4-a716-446655440000",
      start_date: "2024-01-01T00:00:00Z",
      end_date: "2024-12-31T23:59:59Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing course_id", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid course_id (not UUID)", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({
      course_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid start_date format", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({
      course_id: "550e8400-e29b-41d4-a716-446655440000",
      start_date: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid end_date format", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({
      course_id: "550e8400-e29b-41d4-a716-446655440000",
      end_date: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("accepts course_id with only start_date", () => {
    const result = tutorAnalyticsRequestSchema.safeParse({
      course_id: "550e8400-e29b-41d4-a716-446655440000",
      start_date: "2024-06-15T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});
