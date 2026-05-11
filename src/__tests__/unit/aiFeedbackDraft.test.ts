import { describe, it, expect } from "vitest";

// ─── Replicate pure helpers from the Edge Function for unit testing ──────────
// Edge Functions run on Deno and can't be imported directly in Vitest.
// We test the core logic by replicating the pure functions here.

// ─── Types ──────────────────────────────────────────────────────────────────

interface CriterionLevel {
  label: string;
  description: string;
  points: number;
}

interface CLOContext {
  title: string;
  blooms_level: string | null;
}

interface HistoricalFeedback {
  overall_feedback: string | null;
  rubric_selections: unknown;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BLOOMS_LABELS: Record<string, string> = {
  remembering: "Remembering",
  understanding: "Understanding",
  applying: "Applying",
  analyzing: "Analyzing",
  evaluating: "Evaluating",
  creating: "Creating",
};

const BLOOMS_ACTION_PHRASES: Record<string, string> = {
  remembering: "recalling and identifying key concepts",
  understanding: "explaining and interpreting ideas",
  applying: "applying concepts to new situations",
  analyzing: "breaking down and examining relationships",
  evaluating: "making judgments and defending positions",
  creating: "producing original and innovative work",
};

// ─── Replicated Pure Functions ──────────────────────────────────────────────

function getPerformanceTier(
  levelIndex: number,
  totalLevels: number
): "top" | "upper" | "mid" | "low" {
  if (totalLevels <= 1) return "top";
  const ratio = levelIndex / (totalLevels - 1);
  if (ratio >= 0.9) return "top";
  if (ratio >= 0.6) return "upper";
  if (ratio >= 0.3) return "mid";
  return "low";
}

function buildCriterionDraft(
  criterionName: string,
  selectedLevel: CriterionLevel,
  levelIndex: number,
  totalLevels: number,
  cloContext: CLOContext | null,
  historicalThemes: string[]
): string {
  const tier = getPerformanceTier(levelIndex, totalLevels);
  const parts: string[] = [];

  switch (tier) {
    case "top":
      parts.push(
        `Excellent work on ${criterionName}. Your response demonstrates strong mastery at the "${selectedLevel.label}" level.`
      );
      break;
    case "upper":
      parts.push(
        `Good effort on ${criterionName}. You've reached the "${selectedLevel.label}" level, showing solid understanding.`
      );
      break;
    case "mid":
      parts.push(
        `Adequate work on ${criterionName}. At the "${selectedLevel.label}" level, there is room for growth.`
      );
      break;
    case "low":
      parts.push(
        `${criterionName} needs improvement. At the "${selectedLevel.label}" level, significant development is needed.`
      );
      break;
  }

  if (selectedLevel.description) {
    parts.push(`Specifically: ${selectedLevel.description}`);
  }

  if (cloContext) {
    const bloomsKey = cloContext.blooms_level?.toLowerCase() ?? "";
    const actionPhrase = BLOOMS_ACTION_PHRASES[bloomsKey];
    if (actionPhrase && (tier === "mid" || tier === "low")) {
      parts.push(
        `To improve, focus on ${actionPhrase} as required by the "${cloContext.title}" learning outcome.`
      );
    } else if (actionPhrase && (tier === "top" || tier === "upper")) {
      parts.push(
        `This aligns well with the "${cloContext.title}" outcome's focus on ${actionPhrase}.`
      );
    }
  }

  if (historicalThemes.length > 0) {
    const theme = historicalThemes[0];
    if (tier === "mid" || tier === "low") {
      parts.push(
        `Note: Previous feedback has highlighted similar areas — "${theme}". Consider reviewing past guidance.`
      );
    }
  }

  return parts.join(" ");
}

function buildOverallDraft(
  criterionResults: Array<{
    criterionName: string;
    tier: "top" | "upper" | "mid" | "low";
    levelLabel: string;
  }>,
  cloContext: CLOContext | null
): string {
  const strengths = criterionResults.filter(
    (c) => c.tier === "top" || c.tier === "upper"
  );
  const improvements = criterionResults.filter(
    (c) => c.tier === "mid" || c.tier === "low"
  );

  const parts: string[] = [];

  if (strengths.length > 0) {
    const names = strengths.map((s) => s.criterionName).join(", ");
    parts.push(`Strengths: Strong performance in ${names}.`);
  }

  if (improvements.length > 0) {
    const names = improvements.map((s) => s.criterionName).join(", ");
    parts.push(
      `Areas for improvement: ${names} need${
        improvements.length === 1 ? "s" : ""
      } further development.`
    );
  }

  if (cloContext) {
    const bloomsLabel =
      BLOOMS_LABELS[cloContext.blooms_level?.toLowerCase() ?? ""] ?? "";
    if (bloomsLabel) {
      parts.push(
        `This assessment targets the "${cloContext.title}" outcome at the ${bloomsLabel} level of Bloom's Taxonomy.`
      );
    }
  }

  if (strengths.length === criterionResults.length) {
    parts.push(
      "Overall, this is a well-executed submission. Keep up the excellent work."
    );
  } else if (improvements.length === criterionResults.length) {
    parts.push(
      "Overall, this submission needs significant revision. Please review the rubric criteria and resubmit if possible."
    );
  } else {
    parts.push(
      "Continue building on your strengths while addressing the identified areas for improvement."
    );
  }

  return parts.join(" ");
}

function extractHistoricalThemes(
  historicalFeedback: HistoricalFeedback[]
): string[] {
  const feedbackTexts = historicalFeedback
    .map((h) => h.overall_feedback)
    .filter((f): f is string => !!f && f.trim().length > 0);

  if (feedbackTexts.length === 0) return [];

  const sentenceMap = new Map<string, number>();

  for (const text of feedbackTexts) {
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 10 && s.length < 200);

    const seen = new Set<string>();
    for (const sentence of sentences) {
      if (!seen.has(sentence)) {
        seen.add(sentence);
        sentenceMap.set(sentence, (sentenceMap.get(sentence) ?? 0) + 1);
      }
    }
  }

  return Array.from(sentenceMap.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sentence]) => sentence);
}

// ─── Test Data ──────────────────────────────────────────────────────────────

const sampleLevels: CriterionLevel[] = [
  { label: "Beginning", description: "Minimal understanding shown", points: 1 },
  {
    label: "Developing",
    description: "Partial understanding with gaps",
    points: 2,
  },
  {
    label: "Proficient",
    description: "Solid understanding demonstrated",
    points: 3,
  },
  { label: "Exemplary", description: "Exceptional mastery shown", points: 4 },
];

const sampleCLO: CLOContext = {
  title: "Apply data structures to solve problems",
  blooms_level: "applying",
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ai-feedback-draft helpers", () => {
  describe("getPerformanceTier", () => {
    it('should return "top" for the highest level in a 4-level rubric', () => {
      expect(getPerformanceTier(3, 4)).toBe("top");
    });

    it('should return "low" for the lowest level in a 4-level rubric', () => {
      expect(getPerformanceTier(0, 4)).toBe("low");
    });

    it('should return "upper" for level 2 in a 4-level rubric', () => {
      expect(getPerformanceTier(2, 4)).toBe("upper");
    });

    it('should return "mid" for level 1 in a 4-level rubric', () => {
      expect(getPerformanceTier(1, 4)).toBe("mid");
    });

    it('should return "top" when there is only 1 level', () => {
      expect(getPerformanceTier(0, 1)).toBe("top");
    });

    it('should return "top" for the highest level in a 2-level rubric', () => {
      expect(getPerformanceTier(1, 2)).toBe("top");
    });

    it('should return "low" for the lowest level in a 2-level rubric', () => {
      expect(getPerformanceTier(0, 2)).toBe("low");
    });
  });

  describe("buildCriterionDraft", () => {
    it('should generate "Excellent" opening for top-tier performance', () => {
      const result = buildCriterionDraft(
        "Critical Thinking",
        sampleLevels[3]!,
        3,
        4,
        null,
        []
      );
      expect(result).toContain("Excellent work on Critical Thinking");
      expect(result).toContain('"Exemplary"');
    });

    it('should generate "Good effort" opening for upper-tier performance', () => {
      const result = buildCriterionDraft(
        "Research Quality",
        sampleLevels[2]!,
        2,
        4,
        null,
        []
      );
      expect(result).toContain("Good effort on Research Quality");
      expect(result).toContain('"Proficient"');
    });

    it('should generate "Adequate" opening for mid-tier performance', () => {
      const result = buildCriterionDraft(
        "Writing Clarity",
        sampleLevels[1]!,
        1,
        4,
        null,
        []
      );
      expect(result).toContain("Adequate work on Writing Clarity");
      expect(result).toContain('"Developing"');
    });

    it('should generate "needs improvement" opening for low-tier performance', () => {
      const result = buildCriterionDraft(
        "Organization",
        sampleLevels[0]!,
        0,
        4,
        null,
        []
      );
      expect(result).toContain("Organization needs improvement");
      expect(result).toContain('"Beginning"');
    });

    it("should include level description when present", () => {
      const result = buildCriterionDraft(
        "Analysis",
        sampleLevels[2]!,
        2,
        4,
        null,
        []
      );
      expect(result).toContain(
        "Specifically: Solid understanding demonstrated"
      );
    });

    it("should include CLO improvement guidance for low-tier with CLO context", () => {
      const result = buildCriterionDraft(
        "Problem Solving",
        sampleLevels[0]!,
        0,
        4,
        sampleCLO,
        []
      );
      expect(result).toContain(
        "To improve, focus on applying concepts to new situations"
      );
      expect(result).toContain('"Apply data structures to solve problems"');
    });

    it("should include CLO alignment note for top-tier with CLO context", () => {
      const result = buildCriterionDraft(
        "Problem Solving",
        sampleLevels[3]!,
        3,
        4,
        sampleCLO,
        []
      );
      expect(result).toContain("This aligns well with");
      expect(result).toContain("applying concepts to new situations");
    });

    it("should include historical theme note for low-tier performance", () => {
      const result = buildCriterionDraft(
        "Citations",
        sampleLevels[0]!,
        0,
        4,
        null,
        ["needs more supporting evidence"]
      );
      expect(result).toContain(
        "Previous feedback has highlighted similar areas"
      );
      expect(result).toContain("needs more supporting evidence");
    });

    it("should NOT include historical theme note for top-tier performance", () => {
      const result = buildCriterionDraft(
        "Citations",
        sampleLevels[3]!,
        3,
        4,
        null,
        ["needs more supporting evidence"]
      );
      expect(result).not.toContain("Previous feedback");
    });

    it("should handle null CLO context gracefully", () => {
      const result = buildCriterionDraft(
        "Criterion A",
        sampleLevels[1]!,
        1,
        4,
        null,
        []
      );
      expect(result).not.toContain("learning outcome");
      expect(result).toContain("Adequate work on Criterion A");
    });

    it("should handle empty level description", () => {
      const emptyDescLevel: CriterionLevel = {
        label: "Pass",
        description: "",
        points: 1,
      };
      const result = buildCriterionDraft(
        "Test",
        emptyDescLevel,
        0,
        2,
        null,
        []
      );
      expect(result).not.toContain("Specifically:");
    });
  });

  describe("buildOverallDraft", () => {
    it("should list strengths when top/upper criteria exist", () => {
      const result = buildOverallDraft(
        [
          { criterionName: "Analysis", tier: "top", levelLabel: "Exemplary" },
          { criterionName: "Writing", tier: "upper", levelLabel: "Proficient" },
        ],
        null
      );
      expect(result).toContain(
        "Strengths: Strong performance in Analysis, Writing"
      );
      expect(result).toContain("well-executed submission");
    });

    it("should list areas for improvement when mid/low criteria exist", () => {
      const result = buildOverallDraft(
        [
          { criterionName: "Research", tier: "low", levelLabel: "Beginning" },
          { criterionName: "Citations", tier: "mid", levelLabel: "Developing" },
        ],
        null
      );
      expect(result).toContain("Areas for improvement: Research, Citations");
      expect(result).toContain("significant revision");
    });

    it("should include both strengths and improvements for mixed results", () => {
      const result = buildOverallDraft(
        [
          { criterionName: "Analysis", tier: "top", levelLabel: "Exemplary" },
          { criterionName: "Writing", tier: "low", levelLabel: "Beginning" },
        ],
        null
      );
      expect(result).toContain("Strengths");
      expect(result).toContain("Areas for improvement");
      expect(result).toContain("Continue building on your strengths");
    });

    it('should use singular "needs" for single improvement area', () => {
      const result = buildOverallDraft(
        [
          { criterionName: "Analysis", tier: "top", levelLabel: "Exemplary" },
          { criterionName: "Writing", tier: "low", levelLabel: "Beginning" },
        ],
        null
      );
      expect(result).toContain("Writing needs further development");
    });

    it('should use plural "need" for multiple improvement areas', () => {
      const result = buildOverallDraft(
        [
          { criterionName: "Research", tier: "low", levelLabel: "Beginning" },
          { criterionName: "Citations", tier: "mid", levelLabel: "Developing" },
        ],
        null
      );
      expect(result).toContain("need further development");
    });

    it("should include CLO context with Bloom's level when provided", () => {
      const result = buildOverallDraft(
        [{ criterionName: "Analysis", tier: "top", levelLabel: "Exemplary" }],
        sampleCLO
      );
      expect(result).toContain('"Apply data structures to solve problems"');
      expect(result).toContain("Applying level");
      expect(result).toContain("Bloom's Taxonomy");
    });

    it("should handle null CLO context", () => {
      const result = buildOverallDraft(
        [{ criterionName: "Analysis", tier: "top", levelLabel: "Exemplary" }],
        null
      );
      expect(result).not.toContain("Bloom's Taxonomy");
    });

    it("should handle empty criterion results", () => {
      const result = buildOverallDraft([], null);
      // With 0 criteria, strengths === total (both 0), so it's treated as all-strengths
      expect(result).toContain("well-executed submission");
    });
  });

  describe("extractHistoricalThemes", () => {
    it("should return empty array when no feedback exists", () => {
      expect(extractHistoricalThemes([])).toEqual([]);
    });

    it("should return empty array when all feedback is null", () => {
      const feedback: HistoricalFeedback[] = [
        { overall_feedback: null, rubric_selections: null },
        { overall_feedback: null, rubric_selections: null },
      ];
      expect(extractHistoricalThemes(feedback)).toEqual([]);
    });

    it("should extract recurring sentences from multiple feedback entries", () => {
      const feedback: HistoricalFeedback[] = [
        {
          overall_feedback:
            "Good work overall. Needs more supporting evidence in arguments.",
          rubric_selections: null,
        },
        {
          overall_feedback:
            "Solid effort. Needs more supporting evidence in arguments.",
          rubric_selections: null,
        },
        {
          overall_feedback: "Improving steadily. Keep it up.",
          rubric_selections: null,
        },
      ];
      const themes = extractHistoricalThemes(feedback);
      expect(themes.length).toBeGreaterThan(0);
      expect(themes[0]).toContain(
        "needs more supporting evidence in arguments"
      );
    });

    it("should not return sentences that appear only once", () => {
      const feedback: HistoricalFeedback[] = [
        {
          overall_feedback: "Unique feedback sentence one here.",
          rubric_selections: null,
        },
        {
          overall_feedback: "Completely different feedback two here.",
          rubric_selections: null,
        },
      ];
      const themes = extractHistoricalThemes(feedback);
      expect(themes).toEqual([]);
    });

    it("should return at most 3 themes", () => {
      const repeatedSentence = (n: number) =>
        `This is recurring theme number ${n} in feedback`;
      const feedback: HistoricalFeedback[] = [
        {
          overall_feedback: `${repeatedSentence(1)}. ${repeatedSentence(
            2
          )}. ${repeatedSentence(3)}. ${repeatedSentence(4)}.`,
          rubric_selections: null,
        },
        {
          overall_feedback: `${repeatedSentence(1)}. ${repeatedSentence(
            2
          )}. ${repeatedSentence(3)}. ${repeatedSentence(4)}.`,
          rubric_selections: null,
        },
      ];
      const themes = extractHistoricalThemes(feedback);
      expect(themes.length).toBeLessThanOrEqual(3);
    });

    it("should ignore very short sentences", () => {
      const feedback: HistoricalFeedback[] = [
        { overall_feedback: "Good. Needs work.", rubric_selections: null },
        { overall_feedback: "Good. Needs work.", rubric_selections: null },
      ];
      const themes = extractHistoricalThemes(feedback);
      // "Good" and "Needs work" are both < 10 chars, so no themes
      expect(themes).toEqual([]);
    });

    it("should handle empty string feedback", () => {
      const feedback: HistoricalFeedback[] = [
        { overall_feedback: "", rubric_selections: null },
        { overall_feedback: "   ", rubric_selections: null },
      ];
      expect(extractHistoricalThemes(feedback)).toEqual([]);
    });
  });
});
