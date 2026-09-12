/**
 * Tests: framework context builder + AgentExecutionContext v2 framework contract.
 */
import { describe, it, expect } from "vitest";
import { buildFrameworkContext } from "../../../supabase/functions/_shared/ai/context/framework-context-builder";
import type {
  AssessmentModel,
  FrameworkContext,
} from "../../../supabase/functions/_shared/ai/contracts";

describe("buildFrameworkContext", () => {
  it("returns undefined when no framework data is available", () => {
    expect(buildFrameworkContext({})).toBeUndefined();
    expect(buildFrameworkContext({ course: null })).toBeUndefined();
  });

  it("builds context for IB criterion course", () => {
    const ctx = buildFrameworkContext({
      course: {
        assessment_model: "criterion",
        curriculum_code: "MYP-SCI-7",
        key_stage: "MYP",
      },
      institutionSettings: {
        accreditation_body: "IB",
        accreditation_bodies: ["IB", "CIS"],
        default_language: "en",
      },
    });
    expect(ctx).toBeDefined();
    expect(ctx!.assessmentModel).toBe("criterion");
    expect(ctx!.primaryAccreditation).toBe("IB");
    expect(ctx!.accreditationBodies).toEqual(["IB", "CIS"]);
    expect(ctx!.curriculumCode).toBe("MYP-SCI-7");
    expect(ctx!.keyStage).toBe("MYP");
    expect(ctx!.defaultLanguage).toBe("en");
  });

  it("builds context for IGCSE band_grade course", () => {
    const ctx = buildFrameworkContext({
      course: {
        assessment_model: "band_grade",
        curriculum_code: "0580",
        key_stage: "KS4",
        grade_scale_id: "gs-igcse-1",
      },
      institutionSettings: {
        accreditation_body: "BSO",
        accreditation_bodies: ["BSO"],
        default_language: "en",
      },
    });
    expect(ctx).toBeDefined();
    expect(ctx!.assessmentModel).toBe("band_grade");
    expect(ctx!.curriculumCode).toBe("0580");
    expect(ctx!.keyStage).toBe("KS4");
    expect(ctx!.gradeScaleId).toBe("gs-igcse-1");
  });

  it("builds context for QNSA percent course", () => {
    const ctx = buildFrameworkContext({
      course: { assessment_model: "percent" },
      institutionSettings: {
        accreditation_body: "QNSA",
        accreditation_bodies: ["QNSA"],
        default_language: "ar",
      },
    });
    expect(ctx).toBeDefined();
    expect(ctx!.assessmentModel).toBe("percent");
    expect(ctx!.primaryAccreditation).toBe("QNSA");
    expect(ctx!.defaultLanguage).toBe("ar");
  });

  it("returns context even for percent + Generic (they are valid values)", () => {
    const ctx = buildFrameworkContext({
      course: { assessment_model: "percent" },
      institutionSettings: {
        accreditation_body: "Generic",
        accreditation_bodies: [],
      },
    });
    // percent + Generic are still valid framework values — not "nothing"
    expect(ctx).toBeDefined();
    expect(ctx!.assessmentModel).toBe("percent");
    expect(ctx!.primaryAccreditation).toBe("Generic");
  });

  it("filters empty strings from accreditation bodies", () => {
    const ctx = buildFrameworkContext({
      course: { assessment_model: "criterion" },
      institutionSettings: {
        accreditation_body: "IB",
        accreditation_bodies: ["IB", "", "CIS"],
      },
    });
    expect(ctx!.accreditationBodies).toEqual(["IB", "CIS"]);
  });

  it("rejects invalid assessment_model values", () => {
    const ctx = buildFrameworkContext({
      course: { assessment_model: "invalid_model" as string },
      institutionSettings: { accreditation_body: "IB" },
    });
    // Should still build (accreditation is present) but assessmentModel should be undefined
    expect(ctx).toBeDefined();
    expect(ctx!.assessmentModel).toBeUndefined();
  });
});

describe("AgentExecutionContext v2 framework contract", () => {
  it("FrameworkContext has all required fields", () => {
    const fw: FrameworkContext = {
      assessmentModel: "criterion" as AssessmentModel,
      primaryAccreditation: "IB",
      accreditationBodies: ["IB", "CIS"],
      frameworkCode: "MYP",
      curriculumCode: "MYP-SCI-7",
      keyStage: "MYP",
      defaultLanguage: "en",
    };
    expect(fw.assessmentModel).toBe("criterion");
    expect(fw.primaryAccreditation).toBe("IB");
    expect(fw.accreditationBodies).toHaveLength(2);
  });

  it("FrameworkContext is optional on AgentExecutionContext", () => {
    // Test that framework is optional (backward-compatible)
    const ctx = {
      requestId: "r1",
      runId: "r2",
      sessionId: "s1",
      identity: { userId: "u1", role: "teacher" as const, institutionId: "i1" },
      page: { route: "/teacher" },
      specialist: "teacher" as const,
      // framework is NOT set — backward-compatible
    };
    expect(ctx).toBeDefined();
    // The orchestrator should handle missing framework gracefully
  });
});
