// Feature: Specialist protocols + strict parsers (tasks.md 4.3-4.6).
// Guardrail properties: derived-alignment-only ILO labeling, no invented habit
// metrics (every signal cites evidence), numeric risk scores forbidden, and
// intervention drafts always approval-gated.
import { describe, expect, it } from "vitest";

import {
  extractJsonObject,
  parseHabitAnalysis,
  parseInterventionPlan,
  parseMasteryAnalysis,
  parseRiskAssessment,
  SPECIALIST_PROTOCOLS,
} from "../../../supabase/functions/_shared/ai/specialists/protocols";

describe("SPECIALIST_PROTOCOLS", () => {
  it("covers every governed specialist role surface", () => {
    for (const key of [
      "mastery",
      "habit",
      "risk",
      "intervention",
      "teacher",
      "parent",
      "admin",
    ]) {
      expect(SPECIALIST_PROTOCOLS[key]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("extractJsonObject", () => {
  it("extracts the first JSON object embedded in model prose", () => {
    const parsed = extractJsonObject('Note: {"a":1} trailing text');
    expect(parsed).toEqual({ a: 1 });
  });

  it("returns null when no complete object exists", () => {
    expect(extractJsonObject("no json at all")).toBeNull();
    expect(extractJsonObject('{"broken": ')).toBeNull();
  });
});

describe("parseMasteryAnalysis", () => {
  const validAnalysis = {
    outcomes: [
      {
        outcomeId: "ilo-1",
        outcomeType: "ILO",
        alignmentLabel: "Derived Alignment",
        attainmentPercent: 74,
        evidenceIds: ["ev-1", "ev-2"],
      },
      {
        outcomeId: "clo-1",
        outcomeType: "CLO",
        alignmentLabel: "directly assessed",
        evidenceIds: ["ev-3"],
      },
    ],
    chainExplanation:
      "CLO attainment contributes upward through canonical mappings.",
    prerequisiteGapSummary: "One prerequisite gap detected.",
  };

  it("accepts an analysis whose ILO rows are labeled derived alignment", () => {
    const parsed = parseMasteryAnalysis(JSON.stringify(validAnalysis));
    expect(parsed).not.toBeNull();
    expect(parsed!.outcomes[0]!.alignmentLabel.toLowerCase()).toBe(
      "derived alignment"
    );
  });

  it("parses content where JSON is embedded in prose", () => {
    const wrapped = "Here is my analysis: " + JSON.stringify(validAnalysis);
    expect(parseMasteryAnalysis(wrapped)).not.toBeNull();
  });

  it("REJECTS ILO rows claiming official attainment labeling", () => {
    const violating = {
      ...validAnalysis,
      outcomes: [
        {
          outcomeId: "ilo-1",
          outcomeType: "ILO",
          alignmentLabel: "official ILO mastery",
          evidenceIds: ["ev-1"],
        },
      ],
    };
    expect(parseMasteryAnalysis(JSON.stringify(violating))).toBeNull();
  });

  it("REJECTS rows without evidence citations", () => {
    const uncited = {
      ...validAnalysis,
      outcomes: [
        { outcomeId: "clo-1", outcomeType: "CLO", alignmentLabel: "x" },
      ],
    };
    expect(parseMasteryAnalysis(JSON.stringify(uncited))).toBeNull();
  });

  it("requires chain explanation and gap summary", () => {
    const missing = { outcomes: validAnalysis.outcomes };
    expect(parseMasteryAnalysis(JSON.stringify(missing))).toBeNull();
  });
});

describe("parseHabitAnalysis", () => {
  const validHabit = {
    windowDays: 14,
    signals: [
      {
        signal: "study_consistency",
        observation: "5 active days out of 14",
        evidenceIds: ["habit-ev-1"],
      },
    ],
    recoverySteps: ["Schedule two short sessions this week"],
  };

  it("accepts fully cited deterministic signals", () => {
    expect(parseHabitAnalysis(JSON.stringify(validHabit))).not.toBeNull();
  });

  it("REJECTS signals without any evidence citation (no invented metrics)", () => {
    const invented = {
      ...validHabit,
      signals: [{ signal: "streak", observation: "about 6 days" }],
    };
    expect(parseHabitAnalysis(JSON.stringify(invented))).toBeNull();
  });

  it("rejects non-positive windows", () => {
    expect(
      parseHabitAnalysis(JSON.stringify({ ...validHabit, windowDays: 0 }))
    ).toBeNull();
  });
});

describe("parseRiskAssessment", () => {
  const finding = {
    signal: "late_submission_pattern",
    level: "moderate",
    basis: "3 late submissions in current course",
    evidenceIds: ["ev-risk-1"],
    escalation: "notify_teacher",
  };

  it("accepts categorical findings citing deterministic evidence", () => {
    const parsed = parseRiskAssessment(
      JSON.stringify({
        findings: [finding],
        overallLevel: "moderate",
        summary: "Monitor.",
      })
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.findings[0]!.escalation).toBe("notify_teacher");
  });

  it("FORBIDS numeric score fields in agent output", () => {
    for (const key of ["score", "riskScore", "probability"]) {
      const violating = { ...finding, [key]: 0.83 };
      expect(
        parseRiskAssessment(
          JSON.stringify({
            findings: [violating],
            overallLevel: "low",
            summary: "s",
          })
        )
      ).toBeNull();
    }
  });

  it("rejects unknown levels and escalations", () => {
    expect(
      parseRiskAssessment(
        JSON.stringify({
          findings: [{ ...finding, level: "critical" }],
          overallLevel: "high",
          summary: "s",
        })
      )
    ).toBeNull();
    expect(
      parseRiskAssessment(
        JSON.stringify({
          findings: [{ ...finding, escalation: "auto_execute" }],
          overallLevel: "high",
          summary: "s",
        })
      )
    ).toBeNull();
  });

  it("rejects uncited findings", () => {
    expect(
      parseRiskAssessment(
        JSON.stringify({
          findings: [{ ...finding, evidenceIds: [] }],
          overallLevel: "low",
          summary: "s",
        })
      )
    ).toBeNull();
  });
});

describe("parseInterventionPlan", () => {
  const draftAction = {
    actionType: "schedule_practice_set",
    payload: { courseId: "course-1", topic: "quadratic equations" },
    rationale: "Positive measured effect previously",
    expectedEffectBasis: "measured_intervention_effects row mi-7 (+12%)",
    evidenceIds: ["mi-7"],
    approvalRequired: true,
  };

  it("accepts plans whose drafts are explicitly approval-gated", () => {
    const parsed = parseInterventionPlan(
      JSON.stringify({
        selectedBecause: "best measured effect",
        draftActions: [draftAction],
      })
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.draftActions[0]!.approvalRequired).toBe(true);
  });

  it("REJECTS draft actions that omit or falsify approvalRequired", () => {
    const ungated = { ...draftAction } as Record<string, unknown>;
    delete ungated.approvalRequired;
    expect(
      parseInterventionPlan(
        JSON.stringify({ selectedBecause: "x", draftActions: [ungated] })
      )
    ).toBeNull();
    expect(
      parseInterventionPlan(
        JSON.stringify({
          selectedBecause: "x",
          draftActions: [{ ...draftAction, approvalRequired: false }],
        })
      )
    ).toBeNull();
  });

  it("rejects drafts without measured-effect basis or citations", () => {
    expect(
      parseInterventionPlan(
        JSON.stringify({
          selectedBecause: "x",
          draftActions: [{ ...draftAction, expectedEffectBasis: "" }],
        })
      )
    ).toBeNull();
    expect(
      parseInterventionPlan(
        JSON.stringify({
          selectedBecause: "x",
          draftActions: [{ ...draftAction, evidenceIds: [] }],
        })
      )
    ).toBeNull();
  });
});
