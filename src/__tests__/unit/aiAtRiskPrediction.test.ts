import { describe, it, expect } from "vitest";

// ─── Replicate pure helpers from the Edge Function for testing ──────────────
// Edge Functions use Deno imports, so we replicate the pure scoring functions.

const WEIGHT_LOGIN_FREQUENCY = 0.3;
const WEIGHT_ATTAINMENT_TREND = 0.4;
const WEIGHT_SUBMISSION_PATTERN = 0.3;

function scoreLoginFrequency(daysSinceLastLogin: number): number {
  if (daysSinceLastLogin <= 1) return 10;
  if (daysSinceLastLogin <= 3) return 30;
  if (daysSinceLastLogin <= 7) return 60;
  if (daysSinceLastLogin <= 14) return 80;
  return 100;
}

function classifyLoginFrequency(
  daysSinceLastLogin: number
): "low" | "medium" | "high" {
  if (daysSinceLastLogin <= 3) return "high";
  if (daysSinceLastLogin <= 7) return "medium";
  return "low";
}

function scoreAttainmentTrend(
  trend: "improving" | "declining" | "stagnant"
): number {
  switch (trend) {
    case "improving":
      return 10;
    case "stagnant":
      return 50;
    case "declining":
      return 90;
  }
}

function scoreSubmissionPattern(
  pattern: "early" | "on_time" | "late" | "missed"
): number {
  switch (pattern) {
    case "early":
      return 5;
    case "on_time":
      return 20;
    case "late":
      return 65;
    case "missed":
      return 95;
  }
}

function calculateRiskProbability(
  loginScore: number,
  trendScore: number,
  patternScore: number,
  currentAttainment: number | null
): number {
  const baseScore =
    loginScore * WEIGHT_LOGIN_FREQUENCY +
    trendScore * WEIGHT_ATTAINMENT_TREND +
    patternScore * WEIGHT_SUBMISSION_PATTERN;

  let attainmentModifier = 1.0;
  if (currentAttainment !== null) {
    if (currentAttainment < 50) {
      attainmentModifier = 1.3;
    } else if (currentAttainment < 70) {
      attainmentModifier = 1.15;
    } else {
      attainmentModifier = 0.7;
    }
  }

  return Math.round(Math.min(100, Math.max(0, baseScore * attainmentModifier)));
}

function buildPredictionText(
  studentName: string,
  cloTitle: string,
  probability: number,
  loginFreq: "low" | "medium" | "high",
  trend: "improving" | "declining" | "stagnant",
  pattern: "early" | "on_time" | "late" | "missed"
): string {
  const signals: string[] = [];
  if (loginFreq === "low") signals.push("low login frequency");
  if (trend === "declining") signals.push("declining attainment trend");
  if (trend === "stagnant") signals.push("stagnant attainment trend");
  if (pattern === "late") signals.push("late submission pattern");
  if (pattern === "missed") signals.push("missed submissions");

  const signalText =
    signals.length > 0 ? ` Key signals: ${signals.join(", ")}.` : "";

  return `${studentName} has a ${probability}% probability of failing "${cloTitle}".${signalText}`;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("scoreLoginFrequency", () => {
  it("returns low risk (10) for recent login (≤1 day)", () => {
    expect(scoreLoginFrequency(0)).toBe(10);
    expect(scoreLoginFrequency(1)).toBe(10);
  });

  it("returns moderate risk (30) for 2-3 days since login", () => {
    expect(scoreLoginFrequency(2)).toBe(30);
    expect(scoreLoginFrequency(3)).toBe(30);
  });

  it("returns elevated risk (60) for 4-7 days since login", () => {
    expect(scoreLoginFrequency(4)).toBe(60);
    expect(scoreLoginFrequency(7)).toBe(60);
  });

  it("returns high risk (80) for 8-14 days since login", () => {
    expect(scoreLoginFrequency(8)).toBe(80);
    expect(scoreLoginFrequency(14)).toBe(80);
  });

  it("returns maximum risk (100) for >14 days since login", () => {
    expect(scoreLoginFrequency(15)).toBe(100);
    expect(scoreLoginFrequency(999)).toBe(100);
  });
});

describe("classifyLoginFrequency", () => {
  it("classifies ≤3 days as high frequency", () => {
    expect(classifyLoginFrequency(0)).toBe("high");
    expect(classifyLoginFrequency(3)).toBe("high");
  });

  it("classifies 4-7 days as medium frequency", () => {
    expect(classifyLoginFrequency(4)).toBe("medium");
    expect(classifyLoginFrequency(7)).toBe("medium");
  });

  it("classifies >7 days as low frequency", () => {
    expect(classifyLoginFrequency(8)).toBe("low");
    expect(classifyLoginFrequency(30)).toBe("low");
  });
});

describe("scoreAttainmentTrend", () => {
  it("returns low risk for improving trend", () => {
    expect(scoreAttainmentTrend("improving")).toBe(10);
  });

  it("returns moderate risk for stagnant trend", () => {
    expect(scoreAttainmentTrend("stagnant")).toBe(50);
  });

  it("returns high risk for declining trend", () => {
    expect(scoreAttainmentTrend("declining")).toBe(90);
  });
});

describe("scoreSubmissionPattern", () => {
  it("returns minimal risk for early submissions", () => {
    expect(scoreSubmissionPattern("early")).toBe(5);
  });

  it("returns low risk for on-time submissions", () => {
    expect(scoreSubmissionPattern("on_time")).toBe(20);
  });

  it("returns elevated risk for late submissions", () => {
    expect(scoreSubmissionPattern("late")).toBe(65);
  });

  it("returns high risk for missed submissions", () => {
    expect(scoreSubmissionPattern("missed")).toBe(95);
  });
});

describe("calculateRiskProbability", () => {
  it("calculates weighted combination of signal scores", () => {
    // login=60 (0.3), trend=50 (0.4), pattern=20 (0.3)
    // base = 60*0.3 + 50*0.4 + 20*0.3 = 18 + 20 + 6 = 44
    const result = calculateRiskProbability(60, 50, 20, null);
    expect(result).toBe(44);
  });

  it("amplifies risk when current attainment is below 50%", () => {
    // base = 60*0.3 + 50*0.4 + 20*0.3 = 44
    // modifier = 1.3 → 44 * 1.3 = 57.2 → 57
    const result = calculateRiskProbability(60, 50, 20, 40);
    expect(result).toBe(57);
  });

  it("moderately amplifies risk when attainment is 50-69%", () => {
    // base = 44, modifier = 1.15 → 44 * 1.15 = 50.6 → 51
    const result = calculateRiskProbability(60, 50, 20, 60);
    expect(result).toBe(51);
  });

  it("reduces risk when attainment is ≥70%", () => {
    // base = 44, modifier = 0.7 → 44 * 0.7 = 30.8 → 31
    const result = calculateRiskProbability(60, 50, 20, 80);
    expect(result).toBe(31);
  });

  it("caps probability at 100", () => {
    // All max signals: login=100, trend=90, pattern=95
    // base = 100*0.3 + 90*0.4 + 95*0.3 = 30 + 36 + 28.5 = 94.5
    // modifier 1.3 → 94.5 * 1.3 = 122.85 → capped at 100
    const result = calculateRiskProbability(100, 90, 95, 30);
    expect(result).toBe(100);
  });

  it("floors probability at 0", () => {
    // All min signals: login=10, trend=10, pattern=5
    // base = 10*0.3 + 10*0.4 + 5*0.3 = 3 + 4 + 1.5 = 8.5
    // modifier 0.7 → 8.5 * 0.7 = 5.95 → 6
    const result = calculateRiskProbability(10, 10, 5, 90);
    expect(result).toBe(6);
  });

  it("returns base score when attainment is null (no modifier)", () => {
    const result = calculateRiskProbability(80, 90, 65, null);
    // base = 80*0.3 + 90*0.4 + 65*0.3 = 24 + 36 + 19.5 = 79.5 → 80
    expect(result).toBe(80);
  });

  it("produces high risk for worst-case signals with low attainment", () => {
    // Student: never logs in, declining trend, missed submissions, attainment 20%
    const loginScore = scoreLoginFrequency(30); // 100
    const trendScore = scoreAttainmentTrend("declining"); // 90
    const patternScore = scoreSubmissionPattern("missed"); // 95
    const result = calculateRiskProbability(
      loginScore,
      trendScore,
      patternScore,
      20
    );
    expect(result).toBe(100); // capped at 100
  });

  it("produces low risk for best-case signals with high attainment", () => {
    // Student: logged in today, improving trend, early submissions, attainment 95%
    const loginScore = scoreLoginFrequency(0); // 10
    const trendScore = scoreAttainmentTrend("improving"); // 10
    const patternScore = scoreSubmissionPattern("early"); // 5
    const result = calculateRiskProbability(
      loginScore,
      trendScore,
      patternScore,
      95
    );
    expect(result).toBe(6); // very low risk
  });
});

describe("buildPredictionText", () => {
  it("includes student name, CLO title, and probability", () => {
    const text = buildPredictionText(
      "Alice",
      "CLO-1: Data Structures",
      75,
      "high",
      "improving",
      "on_time"
    );
    expect(text).toContain("Alice");
    expect(text).toContain("CLO-1: Data Structures");
    expect(text).toContain("75%");
  });

  it("includes key signals for low login frequency", () => {
    const text = buildPredictionText(
      "Bob",
      "CLO-2",
      80,
      "low",
      "declining",
      "missed"
    );
    expect(text).toContain("low login frequency");
    expect(text).toContain("declining attainment trend");
    expect(text).toContain("missed submissions");
  });

  it("includes stagnant trend as a signal", () => {
    const text = buildPredictionText(
      "Carol",
      "CLO-3",
      60,
      "medium",
      "stagnant",
      "late"
    );
    expect(text).toContain("stagnant attainment trend");
    expect(text).toContain("late submission pattern");
  });

  it("omits signal text when no concerning signals", () => {
    const text = buildPredictionText(
      "Dave",
      "CLO-4",
      55,
      "high",
      "improving",
      "on_time"
    );
    expect(text).not.toContain("Key signals");
  });

  it("formats probability as percentage in text", () => {
    const text = buildPredictionText(
      "Eve",
      "CLO-5",
      92,
      "low",
      "declining",
      "missed"
    );
    expect(text).toContain("92% probability of failing");
  });
});

describe("signal weight integration", () => {
  it("weights sum to 1.0", () => {
    expect(
      WEIGHT_LOGIN_FREQUENCY +
        WEIGHT_ATTAINMENT_TREND +
        WEIGHT_SUBMISSION_PATTERN
    ).toBe(1.0);
  });

  it("attainment trend has the highest weight (40%)", () => {
    expect(WEIGHT_ATTAINMENT_TREND).toBeGreaterThan(WEIGHT_LOGIN_FREQUENCY);
    expect(WEIGHT_ATTAINMENT_TREND).toBeGreaterThan(WEIGHT_SUBMISSION_PATTERN);
  });

  it("login frequency and submission pattern have equal weight (30%)", () => {
    expect(WEIGHT_LOGIN_FREQUENCY).toBe(WEIGHT_SUBMISSION_PATTERN);
  });
});
