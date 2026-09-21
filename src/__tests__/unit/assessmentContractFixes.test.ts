import { describe, expect, it, vi } from "vitest";

import {
  resolvePolicy,
  type SelectedPercentGradeScale,
} from "@/lib/canonicalPolicyResolver";
import {
  toReportingResult,
  normalizePercent,
  type GradeScaleBand,
} from "@/lib/assessmentStrategyEngine";
import { getAssessmentStrategy } from "../../../supabase/functions/_shared/ai/strategies/assessment-strategy";
import { buildFrameworkContext } from "../../../supabase/functions/_shared/ai/context/framework-context-builder";
import { getFrameworkSpecialistHints } from "../../../supabase/functions/_shared/ai/specialists/framework-protocols";
import { getAgenticConfig } from "../../../supabase/functions/_shared/ai/config";
import { runAgentOrchestrator } from "../../../supabase/functions/_shared/ai/orchestrator";
import type { AgentExecutionContext } from "../../../supabase/functions/_shared/ai/contracts";
import type { AIProvider } from "../../../supabase/functions/_shared/ai/provider";
import type { ProposalStore } from "../../../supabase/functions/_shared/ai/proposals";

// Synthetic school-local percent scale; NOT IB or Cambridge grade boundaries.
const selectedScale = {
  id: "school-percent-scale",
  version: "policy-v2",
  domain: "percent",
  bands: [
    { letter: "MEETS", min_percent: 60, max_percent: 100, gpa_points: 0 },
    { letter: "DEVELOPING", min_percent: 0, max_percent: 60, gpa_points: 0 },
  ] as const,
} satisfies SelectedPercentGradeScale;
const selectedCourse = {
  assessmentModel: "percent",
  gradeScaleId: selectedScale.id,
  gradeScaleVersion: selectedScale.version,
};

async function capturedPrompt(
  source: Parameters<typeof buildFrameworkContext>[0]
) {
  const context: AgentExecutionContext = {
    requestId: "11111111-1111-4111-8111-111111111111",
    runId: "22222222-2222-4222-8222-222222222222",
    sessionId: "33333333-3333-4333-8333-333333333333",
    identity: {
      userId: "44444444-4444-4444-8444-444444444444",
      institutionId: "55555555-5555-4555-8555-555555555555",
      role: "teacher",
    },
    specialist: "teacher",
    page: {
      route: "/teacher/gradebook",
      courseId: "66666666-6666-4666-8666-666666666666",
    },
    framework: buildFrameworkContext(source),
  };
  const complete = vi.fn<AIProvider["complete"]>().mockResolvedValue({
    content: "Insufficient rubric evidence.",
    model: "deepseek-v4-flash",
    finishReason: "stop",
    toolCalls: [],
  });
  const executeRead = vi
    .fn()
    .mockRejectedValue(new Error("No data reads expected"));
  const create = vi
    .fn<ProposalStore["create"]>()
    .mockRejectedValue(new Error("No writes expected"));
  const environment: Record<string, string> = {
    AI_FEATURE_ENABLED: "true",
    AI_DAILY_BUDGET_USD: "1",
  };
  await runAgentOrchestrator({
    config: getAgenticConfig({ get: (name) => environment[name] }),
    provider: { name: "deepseek", complete },
    dataSource: {
      authorizeScope: vi.fn().mockResolvedValue(false),
      executeRead,
    },
    proposalAuthorizer: {
      authorizeProposal: vi
        .fn()
        .mockRejectedValue(new Error("No proposals expected")),
    },
    proposalStore: { create },
    audit: { toolAttempt: vi.fn().mockResolvedValue(undefined) },
    request: { message: "Explain the selected course evidence.", context },
  });
  expect(executeRead).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
  const call = complete.mock.calls[0];
  if (!call) throw new Error("Expected a provider invocation");
  const systemMessage = call[0].messages.find(
    (message) => message.role === "system"
  );
  if (!systemMessage)
    throw new Error("Expected a system message in the provider request");
  return systemMessage.content;
}

describe("production orchestrator framework context → specialist prompt", () => {
  it("does not identify a generic criterion course as IB even in a mixed-framework institution", async () => {
    const prompt = await capturedPrompt({
      course: {
        assessment_model: "criterion",
        curriculum_code: "LOCAL-CRITERION",
      },
      institutionSettings: {
        accreditation_bodies: ["IB", "CIS"],
        accreditation_body: "IB",
      },
    });
    expect(prompt).toContain("Curriculum: LOCAL-CRITERION");
    expect(prompt).toContain("This course uses criterion assessment");
    expect(prompt).not.toContain("This is an IB MYP criterion course");
    expect(prompt).not.toContain("You are advising an IB MYP teacher");
    expect(prompt).toContain(
      "If the applicable rubric is absent, say it is unavailable"
    );
  });

  it.each(["MYP-MATH-7", "MYP-INDIVIDUALS-SOCIETIES-7", "MYP-DESIGN-7"])(
    "preserves %s without borrowing another subject's criterion labels",
    async (curriculumCode) => {
      const prompt = await capturedPrompt({
        course: {
          assessment_model: "criterion",
          curriculum_code: curriculumCode,
          key_stage: "MYP",
        },
        institutionSettings: { accreditation_body: "IB" },
      });
      expect(prompt).toContain(`Curriculum: ${curriculumCode}`);
      expect(prompt).toContain("selected curriculum, subject and year/phase");
      expect(prompt).not.toContain("B: Investigating");
      expect(prompt).not.toContain("D: Thinking Critically");
      expect(prompt).not.toContain("0-8 per criterion");
      expect(prompt).not.toContain("total /32");
    }
  );

  it("does not invent Cambridge objectives, scale or thresholds from band_grade", async () => {
    const prompt = await capturedPrompt({
      course: { assessment_model: "band_grade", curriculum_code: "0580" },
    });
    expect(prompt).toContain("Curriculum: 0580");
    expect(prompt).toContain(
      "component, tier, exam series and versioned scale"
    );
    expect(prompt).not.toContain("AO1: Knowledge");
    expect(prompt).not.toContain("AO3: Analysis");
    expect(prompt).not.toContain("This is an IGCSE band-grade course");
    expect(prompt).toContain("any externally awarded grade");
  });

  it("does not display invalid/missing model context as percent", async () => {
    const prompt = await capturedPrompt({
      course: { assessment_model: "not-supported" },
      institutionSettings: { accreditation_body: "IB" },
    });
    expect(prompt).toContain("assessmentModel=unconfigured");
    expect(prompt).not.toContain("assessmentModel=percent");
  });

  it("treats configured quality frameworks as labels, not awarded accreditations", () => {
    const hints = getFrameworkSpecialistHints(
      "coordinator",
      buildFrameworkContext({
        institutionSettings: { accreditation_bodies: ["IB", "QNSA", "BSO"] },
      })
    ).join("\n");
    expect(hints).toContain(
      "configured quality/accreditation frameworks, not verified authorization"
    );
    expect(hints).toContain("programme, process, edition");
    expect(hints).not.toContain("holds multiple accreditations");
  });

  it("retains the no-context/no-specialist hints behavior", () => {
    expect(getFrameworkSpecialistHints("teacher")).toEqual([]);
    expect(
      getFrameworkSpecialistHints("unknown", { assessmentModel: "criterion" })
    ).toEqual([]);
  });
});

describe("assessment helper rejects explicit unsupported strategy", () => {
  it.each(["unsupported", "", "Criterion", "percent "])(
    "rejects %j instead of percent fallback",
    (model) => {
      expect(() => getAssessmentStrategy(model)).toThrow(
        "Unsupported assessment model"
      );
      expect(() => resolvePolicy({ assessmentModel: model }, {})).toThrow(
        "Unsupported assessment model"
      );
    }
  );
  it.each(["percent", "criterion", "band_grade", "component"])(
    "retains explicit supported %s",
    (model) => {
      expect(getAssessmentStrategy(model).model).toBe(model);
    }
  );
  it("does not advertise a generic strategy as an official curriculum engine", () => {
    expect(getAssessmentStrategy("criterion").name).not.toContain("IB");
    expect(getAssessmentStrategy("band_grade").name).not.toContain("IGCSE");
    expect(
      getAssessmentStrategy("percent").normalizeToPercent({ percentage: 85 })
    ).toBe(85);
  });
});

describe("pure policy helper honors explicit selected percent scale", () => {
  it("uses selected identity/version over institution defaults and passes its scale to the real mapper", () => {
    const resolved = resolvePolicy(
      selectedCourse,
      {
        grade_scales: [
          { letter: "WRONG", min_percent: 0, max_percent: 100, gpa_points: 4 },
        ],
      },
      selectedScale
    );
    expect(resolved.gradeScaleSource).toBe("selected");
    expect(resolved.gradeScaleId).toBe(selectedScale.id);
    expect(resolved.gradeScaleVersion).toBe("policy-v2");
    expect(
      toReportingResult(
        normalizePercent({ score: 60, maxScore: 100 }),
        resolved.gradeScale
      ).displayGrade
    ).toBe("MEETS");
    expect(
      toReportingResult(
        normalizePercent({ score: 59, maxScore: 100 }),
        resolved.gradeScale
      ).displayGrade
    ).toBe("DEVELOPING");
    expect(resolved.gradeScale).not.toBe(selectedScale.bands);
  });

  it("does not ignore an explicit selected ID when data is unavailable", () => {
    expect(() =>
      resolvePolicy(selectedCourse, { grade_scales: [...selectedScale.bands] })
    ).toThrow("Explicit grade scale is unavailable");
  });
  it("rejects a different scale's data", () => {
    expect(() =>
      resolvePolicy(selectedCourse, {}, { ...selectedScale, id: "other-track" })
    ).toThrow("selected ID");
  });
  it.each(["", "wrong-version"])(
    "rejects missing/mismatched scale version %j",
    (version) => {
      expect(() =>
        resolvePolicy(selectedCourse, {}, { ...selectedScale, version })
      ).toThrow("mismatched version");
    }
  );
  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 101])(
    "rejects invalid percent bounds %s",
    (max_percent) => {
      expect(() =>
        resolvePolicy(
          selectedCourse,
          {},
          {
            ...selectedScale,
            bands: [
              { letter: "INVALID", min_percent: 0, max_percent, gpa_points: 0 },
            ],
          }
        )
      ).toThrow("Invalid selected percent");
    }
  );
  it("rejects a native-domain boundary table at this percent-only helper", () => {
    expect(() =>
      resolvePolicy(
        selectedCourse,
        {},
        {
          ...selectedScale,
          domain: "native_marks" as SelectedPercentGradeScale["domain"],
        }
      )
    ).toThrow("unsupported domain");
  });
  it("preserves the selected scale version and snapshot when another policy is resolved", () => {
    const first = resolvePolicy(selectedCourse, {}, selectedScale);
    const next = {
      ...selectedScale,
      version: "policy-v3",
      bands: [
        { ...selectedScale.bands[0], min_percent: 70 },
        { ...selectedScale.bands[1], max_percent: 70 },
      ],
    };
    const second = resolvePolicy(
      { ...selectedCourse, gradeScaleVersion: "policy-v3" },
      {},
      next
    );
    expect(first.gradeScaleVersion).toBe("policy-v2");
    expect(second.gradeScaleVersion).toBe("policy-v3");
    const value = normalizePercent({ score: 65, maxScore: 100 });
    expect(toReportingResult(value, first.gradeScale).displayGrade).toBe(
      "MEETS"
    );
    expect(toReportingResult(value, second.gradeScale).displayGrade).toBe(
      "DEVELOPING"
    );
  });
  it("rejects overlapping scales rather than silently choosing an arbitrary band", () => {
    expect(() =>
      resolvePolicy(
        selectedCourse,
        {},
        {
          ...selectedScale,
          bands: [
            selectedScale.bands[0],
            { ...selectedScale.bands[1], max_percent: 70 },
          ],
        }
      )
    ).toThrow("overlap");
  });
  it("rejects empty and duplicate-label bands", () => {
    expect(() =>
      resolvePolicy(selectedCourse, {}, { ...selectedScale, bands: [] })
    ).toThrow("no bands");
    expect(() =>
      resolvePolicy(
        selectedCourse,
        {},
        {
          ...selectedScale,
          bands: [selectedScale.bands[0], selectedScale.bands[0]],
        }
      )
    ).toThrow("Invalid selected");
  });
  it.each(["IB", "MYP", "IGCSE", "MOEHE"])(
    "does not silently select branded %s boundaries",
    (frameworkCode) => {
      expect(() =>
        resolvePolicy({ assessmentModel: "criterion", frameworkCode }, {})
      ).toThrow("explicit versioned grade scale");
      expect(() => resolvePolicy({ frameworkCode }, {})).toThrow(
        "Assessment model is required"
      );
    }
  );
  it("preserves bounded unconfigured percent fallback with honest provenance", () => {
    const resolved = resolvePolicy({}, {});
    expect(resolved.assessmentModel).toBe("percent");
    expect(resolved.gradeScaleSource).toBe("legacy_default");
    expect(resolved.gradeScaleVersion).toBeUndefined();
    expect(
      resolvePolicy(
        { assessmentModel: "percent" },
        { grade_scales: [...selectedScale.bands] }
      ).gradeScaleSource
    ).toBe("legacy_institution");
  });
  it("does not accept unselected data/version", () => {
    expect(() =>
      resolvePolicy({ assessmentModel: "percent" }, {}, selectedScale)
    ).toThrow("explicit selected ID");
    expect(() =>
      resolvePolicy({ assessmentModel: "percent", gradeScaleVersion: "v1" }, {})
    ).toThrow("explicit selected ID");
  });
});

// Review F1: test the actual helper -> normalization -> reporting consumer,
// not a copied mapper. These are synthetic continuous-percent partitions.
const band = (
  letter: string,
  min_percent: number,
  max_percent: number,
  gpa_points = 0
): GradeScaleBand => ({ letter, min_percent, max_percent, gpa_points });
const permutations = (bands: readonly GradeScaleBand[]): GradeScaleBand[][] =>
  bands.length === 0
    ? [[]]
    : bands.flatMap((entry, index) =>
        permutations(bands.filter((_, other) => other !== index)).map(
          (rest) => [entry, ...rest]
        )
      );
const reportSelected = (
  bands: readonly GradeScaleBand[],
  score: number,
  maxScore = 100
) => {
  const policy = resolvePolicy(selectedCourse, {}, { ...selectedScale, bands });
  return toReportingResult(
    normalizePercent({ score, maxScore }),
    policy.gradeScale
  );
};

describe("review F1: complete selected percent domain without extrapolation", () => {
  it.each([0, 59, 60, 100])(
    "rejects a sole PASS[60,100] before reporting score %s",
    (score) => {
      expect(() => reportSelected([band("PASS", 60, 100, 4)], score)).toThrow(
        "complete 0-100 percent domain"
      );
    }
  );

  it.each([0, 90, 91, 100])(
    "rejects uncovered upper domain before reporting score %s",
    (score) => {
      expect(() => reportSelected([band("ONLY", 0, 90)], score)).toThrow(
        "complete 0-100 percent domain"
      );
    }
  );

  it.each([20, 25, 30])(
    "rejects internal gaps before reporting score %s",
    (score) => {
      for (const bands of permutations([
        band("LOW", 0, 20),
        band("HIGH", 30, 100),
      ])) {
        expect(() => reportSelected(bands, score)).toThrow("unsupported gap");
      }
    }
  );

  it("does not invent hundredth/whole-percent rounding to fill a discrete-looking gap", () => {
    expect(() =>
      reportSelected([band("LOW", 0, 59.99), band("HIGH", 60, 100)], 59.99)
    ).toThrow("unsupported gap");
  });

  it("rejects LOW/POINT/HIGH in all six permutations, including the previously accepted order", () => {
    const arrangements = permutations([
      band("LOW", 0, 60),
      band("POINT", 60, 60),
      band("HIGH", 60, 100),
    ]);
    expect(arrangements).toHaveLength(6);
    for (const bands of arrangements) {
      expect(() => reportSelected(bands, 60)).toThrow(
        "Invalid selected percent grade-scale band"
      );
    }
  });

  it("rejects zero-width bands at either domain edge and tied positive minima in every order", () => {
    for (const bands of [
      [band("POINT", 0, 0), band("REST", 0, 100)],
      [band("REST", 0, 100), band("POINT", 100, 100)],
      [band("LOW", 0, 60), band("TIED", 0, 100)],
    ]) {
      for (const order of permutations(bands))
        expect(() => reportSelected(order, 0)).toThrow();
    }
  });

  it("returns order-invariant labels/GPA at every hundredth for a supported complete partition", () => {
    const arrangements = permutations([
      band("LOW", 0, 30, 1),
      band("MID", 30, 60, 2),
      band("HIGH", 60, 100, 3),
    ]);
    expect(arrangements).toHaveLength(6);
    for (const bands of arrangements) {
      const policy = resolvePolicy(
        selectedCourse,
        {},
        { ...selectedScale, bands }
      );
      for (let hundredths = 0; hundredths <= 10_000; hundredths += 1) {
        const report = toReportingResult(
          normalizePercent({ score: hundredths, maxScore: 10_000 }),
          policy.gradeScale
        );
        const expected =
          hundredths >= 6000
            ? ["HIGH", 3]
            : hundredths >= 3000
            ? ["MID", 2]
            : ["LOW", 1];
        expect([report.displayGrade, report.gpaPoints]).toEqual(expected);
      }
    }
  });

  it("preserves existing valid max-score normalization and higher-minimum endpoint precedence", () => {
    const bands = [band("LOW", 0, 60, 1), band("HIGH", 60, 100, 2)];
    expect(reportSelected(bands, 0, 25)).toMatchObject({
      displayPercent: 0,
      displayGrade: "LOW",
      gpaPoints: 1,
    });
    expect(reportSelected(bands, 15, 25)).toMatchObject({
      displayPercent: 60,
      displayGrade: "HIGH",
      gpaPoints: 2,
    });
    expect(reportSelected(bands, 25, 25)).toMatchObject({
      displayPercent: 100,
      displayGrade: "HIGH",
      gpaPoints: 2,
    });
    expect(reportSelected(bands, 59.994)).toMatchObject({
      displayPercent: 59.99,
      displayGrade: "LOW",
    });
    expect(reportSelected(bands, 59.996)).toMatchObject({
      displayPercent: 60,
      displayGrade: "HIGH",
    });
  });

  it("accepts a single positive-width full-domain band without changing its supplied meaning", () => {
    for (const score of [0, 50, 100]) {
      expect(
        reportSelected([band("CONFIGURED", 0, 100, 2)], score)
      ).toMatchObject({
        displayPercent: score,
        displayGrade: "CONFIGURED",
        gpaPoints: 2,
      });
    }
  });

  it("leaves explicitly labelled unconfigured legacy scale resolution untouched", () => {
    const partialLegacy = [band("LEGACY", 60, 100, 4)];
    const policy = resolvePolicy({}, { grade_scales: partialLegacy });
    expect(policy.gradeScaleSource).toBe("legacy_institution");
    expect(policy.gradeScale).toEqual(partialLegacy);
    expect(policy.gradeScaleId).toBeUndefined();
    expect(policy.gradeScaleVersion).toBeUndefined();
    expect(resolvePolicy({}, {}).gradeScaleSource).toBe("legacy_default");
    // Legacy acceptance is compatibility, NOT certification of extrapolation.
    expect(() => reportSelected(partialLegacy, 0)).toThrow(
      "complete 0-100 percent domain"
    );
  });
});
