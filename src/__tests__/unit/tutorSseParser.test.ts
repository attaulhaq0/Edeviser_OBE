// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { parseSSELine } from "@/lib/tutorApi";

describe("parseSSELine", () => {
  it("parses a token event", () => {
    const line = 'data: {"type":"token","data":"Hello"}';
    const result = parseSSELine(line);
    expect(result).toEqual({ type: "token", data: "Hello" });
  });

  it("parses a citations event", () => {
    const citations = [
      {
        chunk_id: "chunk-1",
        chunk_text: "Arrays are contiguous.",
        source_filename: "lecture.pdf",
        material_type: "lecture_notes",
        similarity_score: 0.92,
      },
    ];
    const line = `data: ${JSON.stringify({
      type: "citations",
      data: citations,
    })}`;
    const result = parseSSELine(line);
    expect(result).toEqual({ type: "citations", data: citations });
  });

  it("parses a done event", () => {
    const doneData = { message_id: "msg-123", tokens_used: 450 };
    const line = `data: ${JSON.stringify({ type: "done", data: doneData })}`;
    const result = parseSSELine(line);
    expect(result).toEqual({ type: "done", data: doneData });
  });

  it("parses an error event", () => {
    const errorData = { code: "rate_limited", message: "Daily limit reached" };
    const line = `data: ${JSON.stringify({ type: "error", data: errorData })}`;
    const result = parseSSELine(line);
    expect(result).toEqual({ type: "error", data: errorData });
  });

  it('returns null for lines not starting with "data: "', () => {
    expect(parseSSELine("event: message")).toBeNull();
    expect(parseSSELine("id: 123")).toBeNull();
    expect(parseSSELine(": comment")).toBeNull();
    expect(parseSSELine("")).toBeNull();
  });

  it("returns null for the [DONE] sentinel", () => {
    expect(parseSSELine("data: [DONE]")).toBeNull();
  });

  it("returns null for empty data payload", () => {
    expect(parseSSELine("data: ")).toBeNull();
    expect(parseSSELine("data:  ")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseSSELine("data: {invalid json}")).toBeNull();
    expect(parseSSELine("data: not-json-at-all")).toBeNull();
  });

  it("returns null for partial JSON", () => {
    expect(parseSSELine('data: {"type":"token"')).toBeNull();
  });

  it("parses a plan_update event", () => {
    const planData = {
      id: "plan-1",
      clo_id: "clo-1",
      clo_title: "Data Structures",
      study_time_recommendation: "Increase to 3 hours/week",
      recommended_materials: [],
      suggested_planner_sessions: 2,
      interaction_count: 5,
    };
    const line = `data: ${JSON.stringify({
      type: "plan_update",
      data: planData,
    })}`;
    const result = parseSSELine(line);
    expect(result).toEqual({ type: "plan_update", data: planData });
  });

  it("parses an independence_nudge event", () => {
    const nudgeData = { message: "Try solving this on your own first!" };
    const line = `data: ${JSON.stringify({
      type: "independence_nudge",
      data: nudgeData,
    })}`;
    const result = parseSSELine(line);
    expect(result).toEqual({ type: "independence_nudge", data: nudgeData });
  });

  it("parses a handoff_suggestion event", () => {
    const handoffData = {
      reason: "low_rag_confidence",
      message: "Consider asking your teacher.",
    };
    const line = `data: ${JSON.stringify({
      type: "handoff_suggestion",
      data: handoffData,
    })}`;
    const result = parseSSELine(line);
    expect(result).toEqual({ type: "handoff_suggestion", data: handoffData });
  });

  it('handles data with extra whitespace after "data: "', () => {
    const line = 'data:   {"type":"token","data":"Hi"}';
    // The implementation trims after slicing, so this should still parse
    const result = parseSSELine(line);
    expect(result).toEqual({ type: "token", data: "Hi" });
  });
});
