// Feature: Teacher copilot & parent summary parsers (tasks.md 5.1 + 6.1).
// Fail-closed contract properties: draft-only teacher sections with mandatory
// evidence citations; parent summaries scoped to verified children only, with
// privacy-violating keys (rankings/peer comparisons) rejected anywhere.
import { describe, expect, it } from "vitest";

import {
  parseParentChildSummary,
  parseTeacherCopilotOutput,
} from "../../../supabase/functions/_shared/ai/specialists/protocols";

const EVIDENCE = new Set(["ev-1", "ev-9"]);

const teacherItem = (overrides: Record<string, unknown> = {}) => ({
  topic: "quadratic factoring",
  content: "Student confuses sign rules; draft hint provided.",
  evidenceIds: ["ev-1"],
  ...overrides,
});

describe("parseTeacherCopilotOutput (5.1)", () => {
  it("parses a valid multi-section draft output", () => {
    const parsed = parseTeacherCopilotOutput(
      JSON.stringify({
        misconceptions: [teacherItem()],
        feedbackDrafts: [
          teacherItem({ topic: "homework 3", content: "Great progress on X." }),
        ],
      }),
      EVIDENCE
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.misconceptions?.[0]?.evidenceIds).toEqual(["ev-1"]);
    expect(parsed?.feedbackDrafts?.length).toBe(1);
  });

  it("rejects unknown sections and unknown item fields", () => {
    expect(
      parseTeacherCopilotOutput(
        JSON.stringify({ publishedAssignments: [teacherItem()] }),
        EVIDENCE
      )
    ).toBeNull();
    expect(
      parseTeacherCopilotOutput(
        JSON.stringify({
          misconceptions: [teacherItem({ status: "published" })],
        }),
        EVIDENCE
      )
    ).toBeNull();
  });

  it("rejects items citing ids outside the authorized evidence packet", () => {
    expect(
      parseTeacherCopilotOutput(
        JSON.stringify({
          misconceptions: [teacherItem({ evidenceIds: ["invented-evidence"] })],
        }),
        EVIDENCE
      )
    ).toBeNull();
  });

  it("rejects whitespace-only citation ids (fail-closed)", () => {
    // Discriminating fixture: the blank id IS present in the authorized
    // packet, so only the trim guard in requiredCitationIds can reject it -
    // packet membership alone would let it through.
    expect(
      parseTeacherCopilotOutput(
        JSON.stringify({
          misconceptions: [teacherItem({ evidenceIds: ["   "] })],
        }),
        new Set([...EVIDENCE, "   "])
      )
    ).toBeNull();
  });

  it("rejects items without evidence citations or empty text", () => {
    expect(
      parseTeacherCopilotOutput(
        JSON.stringify({ misconceptions: [teacherItem({ evidenceIds: [] })] }),
        EVIDENCE
      )
    ).toBeNull();
    expect(
      parseTeacherCopilotOutput(
        JSON.stringify({ feedbackDrafts: [teacherItem({ content: "   " })] }),
        EVIDENCE
      )
    ).toBeNull();
  });

  it("rejects an empty object and malformed JSON", () => {
    expect(parseTeacherCopilotOutput(JSON.stringify({}), EVIDENCE)).toBeNull();
    expect(parseTeacherCopilotOutput("not json", EVIDENCE)).toBeNull();
  });
});

describe("parseParentChildSummary (6.1)", () => {
  const authorized = new Set(["child-1", "child-2"]);
  const entry = (overrides: Record<string, unknown> = {}) => ({
    childId: "child-1",
    progressSummary: "Steady progress in math; two deadlines next week.",
    citations: ["ev-9"],
    ...overrides,
  });
  const payload = (summaries: unknown) => JSON.stringify({ summaries });

  it("parses a valid summary for a verified child", () => {
    const parsed = parseParentChildSummary(
      payload([entry()]),
      authorized,
      EVIDENCE
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.summaries[0]?.childId).toBe("child-1");
  });

  it("rejects unverified child ids (fail-closed scope)", () => {
    expect(
      parseParentChildSummary(
        payload([entry({ childId: "other-kid" })]),
        authorized,
        EVIDENCE
      )
    ).toBeNull();
    expect(
      parseParentChildSummary(payload([entry()]), new Set(), EVIDENCE)
    ).toBeNull();
  });

  it("rejects citations outside the authorized evidence packet", () => {
    expect(
      parseParentChildSummary(
        payload([entry({ citations: ["hallucinated-id"] })]),
        authorized,
        EVIDENCE
      )
    ).toBeNull();
  });

  it("rejects whitespace-only citations (fail-closed)", () => {
    // Same discriminating fixture as the teacher case: blank id present in
    // the authorized packet - only the trim guard rejects it.
    expect(
      parseParentChildSummary(
        payload([entry({ citations: ["   "] })]),
        authorized,
        new Set([...EVIDENCE, "   "])
      )
    ).toBeNull();
  });

  it("rejects privacy-violating keys anywhere in the structure", () => {
    expect(
      parseParentChildSummary(
        payload([entry({ classRank: 3 })]),
        authorized,
        EVIDENCE
      )
    ).toBeNull();
    expect(
      parseParentChildSummary(
        JSON.stringify({ summaries: [entry()], peerComparison: "top 10%" }),
        authorized,
        EVIDENCE
      )
    ).toBeNull();
  });

  it("rejects uncited summaries and extra top-level keys", () => {
    expect(
      parseParentChildSummary(
        payload([entry({ citations: [] })]),
        authorized,
        EVIDENCE
      )
    ).toBeNull();
    expect(
      parseParentChildSummary(
        JSON.stringify({ summaries: [entry()], institutionStats: {} }),
        authorized,
        EVIDENCE
      )
    ).toBeNull();
  });
});
