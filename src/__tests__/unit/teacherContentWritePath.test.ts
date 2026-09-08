// =============================================================================
// publish_official_content — 7.10 AI question-draft write-path contracts
//
// Pins the protected write tool that turns an approved AI question-draft
// proposal into official question_bank rows (the QA OBE-14 root cause):
//   - registry: exact payload keys, per-draft question validation, receipt
//   - contracts: approver = teacher (assigned teacher)
//   - orchestrator dispatch → execute_approved_teacher_content_v1
//   - migration contract (SECURITY DEFINER, search_path='', service_role)
// =============================================================================

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  PROTECTED_ACTIONS,
  requiredApproverRole,
} from "../../../supabase/functions/_shared/ai/contracts";
import { PROTECTED_WRITE_REGISTRY } from "../../../supabase/functions/_shared/ai/write-tools/registry";

const orchestrator = readFileSync(
  "supabase/functions/agent-orchestrator/index.ts",
  "utf8"
);

const DRAFT = {
  id: "00000000-0000-4000-8000-00000000000a",
  clo_id: "00000000-0000-4000-8000-00000000000b",
  bloom_level: 3,
  question_type: "mcq",
  question_text: "Which option best analyzes the evidence?",
  options: [
    { key: "A", text: "Option A", is_correct: true },
    { key: "B", text: "Option B", is_correct: false },
  ],
  correct_answer: { value: "A", explanation: "Because the passage states it." },
  explanation: "Tests evidence analysis.",
  difficulty_rating: 3.5,
};

const VALID_PAYLOAD = {
  kind: "quiz_question_drafts",
  questions: [DRAFT],
};

describe("7.10 publish_official_content — registry contract", () => {
  const tool = PROTECTED_WRITE_REGISTRY["publish_official_content@1.0.0"];

  it("is registered as a teacher-approved protected write", () => {
    expect(tool).toBeDefined();
    expect(tool.approvalRequired).toBe(true);
    expect(tool.allowedApproverRoles).toEqual(["teacher"]);
  });

  it("accepts a valid quiz_question_drafts payload", () => {
    expect(() => tool.validateInput(VALID_PAYLOAD)).not.toThrow();
  });

  it("rejects wrong kind and unsupported fields", () => {
    expect(() =>
      tool.validateInput({ kind: "something_else", questions: [DRAFT] })
    ).toThrow(/kind/);
    expect(() =>
      tool.validateInput({ ...VALID_PAYLOAD, extra: 1 })
    ).toThrow(/unsupported field/);
  });

  it("rejects empty or oversized draft arrays", () => {
    expect(() =>
      tool.validateInput({ kind: "quiz_question_drafts", questions: [] })
    ).toThrow(/1-50 drafts/);
    expect(() =>
      tool.validateInput({
        kind: "quiz_question_drafts",
        questions: Array.from({ length: 51 }, () => DRAFT),
      })
    ).toThrow(/1-50 drafts/);
  });

  it("rejects drafts with invalid bloom/type/difficulty/clo_id", () => {
    expect(() =>
      tool.validateInput({
        kind: "quiz_question_drafts",
        questions: [{ ...DRAFT, bloom_level: 7 }],
      })
    ).toThrow(/bloom_level/);
    expect(() =>
      tool.validateInput({
        kind: "quiz_question_drafts",
        questions: [{ ...DRAFT, question_type: "essay" }],
      })
    ).toThrow(/question_type/);
    expect(() =>
      tool.validateInput({
        kind: "quiz_question_drafts",
        questions: [{ ...DRAFT, difficulty_rating: 9 }],
      })
    ).toThrow(/difficulty_rating/);
    expect(() =>
      tool.validateInput({
        kind: "quiz_question_drafts",
        questions: [{ ...DRAFT, clo_id: "not-a-uuid" }],
      })
    ).toThrow(/clo_id must be a UUID/);
  });

  it("rejects receipts whose count does not match questionIds", () => {
    const receipt = {
      executionId: "00000000-0000-4000-8000-00000000000a",
      questionIds: ["00000000-0000-4000-8000-00000000000b"],
      count: 3,
      alreadyExecuted: false,
    };
    expect(() => tool.validateOutput(receipt)).toThrow(/invalid receipt/);
    expect(() => tool.validateOutput({ ...receipt, count: 1 })).not.toThrow();
  });
});

describe("7.10 publish_official_content — contracts routing", () => {
  it("is a protected action approved by the teacher", () => {
    expect(PROTECTED_ACTIONS).toContain("publish_official_content");
    expect(requiredApproverRole("publish_official_content")).toBe("teacher");
  });

  it("routes execution to the dedicated teacher-content RPC", () => {
    expect(orchestrator).toMatch(
      /publish_official_content"\s*\n\s*\? "execute_approved_teacher_content_v1"/
    );
  });

  it("the execution RPC is versioned in the replay chain", () => {
    const sql = readFileSync(
      "supabase/migrations/20260908002253_execute_approved_teacher_content.sql",
      "utf8"
    );
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.execute_approved_teacher_content_v1"
    );
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = ''/);
    expect(sql).toMatch(/GRANT EXECUTE[\s\S]*TO service_role/);
    expect(sql).toMatch(/Teacher scope required/);
    // Scope re-check: assigned teacher of the course.
    expect(sql).toMatch(/c\.teacher_id = p_actor_id/);
    // Persists as approved AI-generated content.
    expect(sql).toMatch(/'approved'/);
    expect(sql).toMatch(/'ai'/);
  });
});