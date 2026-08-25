// Feature: Task 7.4 threshold wiring (edeviser-agentic-intelligence).
// Contract: parseEvaluationThresholds is the ONLY path from
// institution_autonomy_settings.evaluation_thresholds to the harness, and it
// must fail closed — unconfigured/malformed payloads never loosen or tighten
// scoring silently; they disable evaluation for that institution.
import { describe, expect, it } from "vitest";
import { parseEvaluationThresholds } from "../../../supabase/functions/_shared/ai/evaluation/thresholds";

describe("parseEvaluationThresholds", () => {
  it("returns null for non-object payloads (unconfigured)", () => {
    expect(parseEvaluationThresholds(null)).toBeNull();
    expect(parseEvaluationThresholds(undefined)).toBeNull();
    expect(parseEvaluationThresholds("0.9")).toBeNull();
    expect(parseEvaluationThresholds(42)).toBeNull();
    expect(parseEvaluationThresholds(["overall"])).toBeNull();
  });

  it("returns null when no dimension is configured", () => {
    expect(parseEvaluationThresholds({})).toBeNull();
    // Unknown keys alone do not configure evaluation.
    expect(parseEvaluationThresholds({ minScore: 0.5 })).toBeNull();
    // Explicit nulls are treated as absent.
    expect(parseEvaluationThresholds({ overall: null })).toBeNull();
  });

  it("honours explicit enabled:false as a kill switch", () => {
    expect(
      parseEvaluationThresholds({ enabled: false, overall: 0.8 })
    ).toBeNull();
  });

  it("accepts valid partial configurations", () => {
    expect(parseEvaluationThresholds({ overall: 0.75 })).toEqual({
      overall: 0.75,
    });
    expect(
      parseEvaluationThresholds({
        citation: 1,
        integrity: 0,
        toolCorrectness: 0.5,
      })
    ).toEqual({ citation: 1, integrity: 0, toolCorrectness: 0.5 });
    expect(
      parseEvaluationThresholds({ enabled: true, overall: 0.7 })
    ).toEqual({ overall: 0.7 });
  });

  it("rejects any out-of-range or non-numeric dimension value", () => {
    expect(parseEvaluationThresholds({ overall: -0.1 })).toBeNull();
    expect(parseEvaluationThresholds({ overall: 1.01 })).toBeNull();
    expect(parseEvaluationThresholds({ citation: "high" })).toBeNull();
    expect(parseEvaluationThresholds({ integrity: Number.NaN })).toBeNull();
    expect(parseEvaluationThresholds({ toolCorrectness: Infinity })).toBeNull();
  });
});
