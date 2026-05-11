import { describe, it, expect } from "vitest";
import {
  generateJournalPrompt,
  KOLB_STAGES,
  type JournalPromptContext,
  type KolbStage,
} from "@/lib/journalPromptGenerator";
import type { BloomsLevel } from "@/lib/schemas/clo";
import type { AttainmentLevel } from "@/types/app";

describe("generateJournalPrompt", () => {
  const baseContext: JournalPromptContext = {
    cloTitle: "Apply sorting algorithms to real datasets",
    bloomsLevel: "applying",
    attainmentLevel: "Satisfactory",
  };

  it("returns promptText and questions array", () => {
    const result = generateJournalPrompt(baseContext);
    expect(result).toHaveProperty("promptText");
    expect(result).toHaveProperty("questions");
    expect(typeof result.promptText).toBe("string");
    expect(Array.isArray(result.questions)).toBe(true);
  });

  it("generates 3 questions for Excellent attainment", () => {
    const result = generateJournalPrompt({
      ...baseContext,
      attainmentLevel: "Excellent",
    });
    expect(result.questions).toHaveLength(3);
  });

  it("generates 3 questions for Satisfactory attainment", () => {
    const result = generateJournalPrompt(baseContext);
    expect(result.questions).toHaveLength(3);
  });

  it("generates 4 questions for Developing attainment", () => {
    const result = generateJournalPrompt({
      ...baseContext,
      attainmentLevel: "Developing",
    });
    expect(result.questions).toHaveLength(4);
  });

  it("generates 4 questions for Not_Yet attainment", () => {
    const result = generateJournalPrompt({
      ...baseContext,
      attainmentLevel: "Not_Yet",
    });
    expect(result.questions).toHaveLength(4);
  });

  it("includes CLO title in promptText", () => {
    const result = generateJournalPrompt(baseContext);
    expect(result.promptText).toContain(baseContext.cloTitle);
  });

  it("includes rubric feedback summary when provided", () => {
    const result = generateJournalPrompt({
      ...baseContext,
      rubricFeedbackSummary: "Good use of examples but needs more analysis",
    });
    expect(result.promptText).toContain(
      "Good use of examples but needs more analysis"
    );
  });

  it("does not include feedback text when rubricFeedbackSummary is omitted", () => {
    const result = generateJournalPrompt(baseContext);
    expect(result.promptText).not.toContain("Your teacher noted");
  });

  it("each question has a valid Kolb stage", () => {
    const result = generateJournalPrompt(baseContext);
    for (const q of result.questions) {
      expect(KOLB_STAGES).toContain(q.stage);
    }
  });

  it("each question references the CLO title", () => {
    const result = generateJournalPrompt(baseContext);
    for (const q of result.questions) {
      expect(q.question).toContain(baseContext.cloTitle);
    }
  });

  it("includes Bloom's level label in promptText", () => {
    const result = generateJournalPrompt(baseContext);
    expect(result.promptText).toContain("Applying");
  });

  it("works for all Bloom's levels", () => {
    const levels: BloomsLevel[] = [
      "remembering",
      "understanding",
      "applying",
      "analyzing",
      "evaluating",
      "creating",
    ];
    for (const level of levels) {
      const result = generateJournalPrompt({
        ...baseContext,
        bloomsLevel: level,
      });
      expect(result.questions.length).toBeGreaterThanOrEqual(3);
      expect(result.questions.length).toBeLessThanOrEqual(4);
      expect(result.promptText.length).toBeGreaterThan(0);
    }
  });

  it("works for all attainment levels", () => {
    const levels: AttainmentLevel[] = [
      "Excellent",
      "Satisfactory",
      "Developing",
      "Not_Yet",
    ];
    for (const level of levels) {
      const result = generateJournalPrompt({
        ...baseContext,
        attainmentLevel: level,
      });
      expect(result.questions.length).toBeGreaterThanOrEqual(3);
      expect(result.promptText.length).toBeGreaterThan(0);
    }
  });

  it("Developing/Not_Yet include all 4 Kolb stages", () => {
    const stages = new Set<KolbStage>();
    const result = generateJournalPrompt({
      ...baseContext,
      attainmentLevel: "Developing",
    });
    for (const q of result.questions) {
      stages.add(q.stage);
    }
    expect(stages.size).toBe(4);
    for (const s of KOLB_STAGES) {
      expect(stages.has(s)).toBe(true);
    }
  });

  it("Excellent/Satisfactory skip Concrete Experience stage", () => {
    const result = generateJournalPrompt({
      ...baseContext,
      attainmentLevel: "Excellent",
    });
    const stages = result.questions.map((q) => q.stage);
    expect(stages).not.toContain("Concrete Experience");
    expect(stages).toContain("Reflective Observation");
    expect(stages).toContain("Abstract Conceptualization");
    expect(stages).toContain("Active Experimentation");
  });
});
