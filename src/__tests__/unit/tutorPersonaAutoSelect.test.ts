// Feature: ai-tutor-rag — Big Five mapping edge cases
// **Validates: Requirements 26.1, 26.2, 26.4**

import { describe, it, expect } from "vitest";
import { autoSelectPersona } from "@/lib/tutorPersonaAutoSelect";
import type { BigFiveTraits } from "@/lib/scoreCalculator";

describe("tutorPersonaAutoSelect — autoSelectPersona", () => {
  // ─── Null / undefined fallback ────────────────────────────────────────

  it("returns null for null profile", () => {
    expect(autoSelectPersona(null)).toBeNull();
  });

  it("returns null for undefined profile", () => {
    expect(autoSelectPersona(undefined)).toBeNull();
  });

  // ─── High Openness → socratic_guide ───────────────────────────────────

  it("maps high openness (≥70) to socratic_guide when it is the dominant trait", () => {
    const profile: BigFiveTraits = {
      openness: 85,
      conscientiousness: 50,
      extraversion: 60,
      agreeableness: 55,
      neuroticism: 40,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.persona).toBe("socratic_guide");
  });

  // ─── High Conscientiousness → step_by_step_coach ──────────────────────

  it("maps high conscientiousness (≥70) to step_by_step_coach when it is the dominant trait", () => {
    const profile: BigFiveTraits = {
      openness: 50,
      conscientiousness: 80,
      extraversion: 60,
      agreeableness: 55,
      neuroticism: 40,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.persona).toBe("step_by_step_coach");
  });

  // ─── Neither high → quick_explainer ───────────────────────────────────

  it("defaults to quick_explainer when neither openness nor conscientiousness is ≥70", () => {
    const profile: BigFiveTraits = {
      openness: 60,
      conscientiousness: 65,
      extraversion: 90,
      agreeableness: 80,
      neuroticism: 50,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.persona).toBe("quick_explainer");
  });

  // ─── Multiple high traits — highest percentile wins ───────────────────

  it("selects socratic_guide when openness > conscientiousness and both ≥70", () => {
    const profile: BigFiveTraits = {
      openness: 90,
      conscientiousness: 75,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.persona).toBe("socratic_guide");
  });

  it("selects step_by_step_coach when conscientiousness > openness and both ≥70", () => {
    const profile: BigFiveTraits = {
      openness: 72,
      conscientiousness: 88,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.persona).toBe("step_by_step_coach");
  });

  // ─── High Neuroticism tone modifier ───────────────────────────────────

  it("adds tone modifier when neuroticism ≥70", () => {
    const profile: BigFiveTraits = {
      openness: 85,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 75,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.toneModifier).toBeDefined();
    expect(result!.toneModifier).toContain("warm");
    expect(result!.toneModifier).toContain("encouraging");
  });

  it("does not add tone modifier when neuroticism < 70", () => {
    const profile: BigFiveTraits = {
      openness: 85,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 60,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.toneModifier).toBeUndefined();
  });

  // ─── Boundary values ─────────────────────────────────────────────────

  it("treats exactly 70 as high (≥70 threshold)", () => {
    const profile: BigFiveTraits = {
      openness: 70,
      conscientiousness: 69,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.persona).toBe("socratic_guide");
  });

  it("treats 69 as not high (below threshold)", () => {
    const profile: BigFiveTraits = {
      openness: 69,
      conscientiousness: 69,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.persona).toBe("quick_explainer");
  });

  // ─── All zeros ────────────────────────────────────────────────────────

  it("returns quick_explainer for all-zero profile", () => {
    const profile: BigFiveTraits = {
      openness: 0,
      conscientiousness: 0,
      extraversion: 0,
      agreeableness: 0,
      neuroticism: 0,
    };
    const result = autoSelectPersona(profile);
    expect(result).not.toBeNull();
    expect(result!.persona).toBe("quick_explainer");
    expect(result!.toneModifier).toBeUndefined();
  });
});
